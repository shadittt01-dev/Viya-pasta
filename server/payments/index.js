// Payment orchestration. An order is marked paid ONLY after a server-side
// check with the provider (webhook re-verification or return-page lookup) —
// never because the browser was redirected to a success page.
import { one, run, tx } from '../db/db.js';
import { config } from '../config.js';
import { moyasar } from './moyasar.js';
import { sandbox } from './sandbox.js';
import { markPaid, markPaymentFailed, transition, OrderError } from '../domain/orders.js';
import { getSetting } from '../domain/settings.js';

const PROVIDERS = { moyasar, sandbox };

export function activeProvider() {
  const name = config.payments.provider;
  if (name === 'none') return null;
  if (name === 'sandbox' && config.isProd) return null;
  const p = PROVIDERS[name];
  return p && p.configured() ? p : null;
}

export function providerByName(name) {
  const p = PROVIDERS[name];
  if (!p || (name === 'sandbox' && config.isProd)) return null;
  return p;
}

/** Create (or reuse) a hosted checkout for an order awaiting payment. */
export async function startCheckout(order) {
  const provider = activeProvider();
  if (!provider) throw new OrderError('PAYMENTS_UNAVAILABLE', 503);
  if (order.order_status !== 'awaiting_payment') throw new OrderError('ORDER_NOT_AWAITING_PAYMENT', 409);
  const existing = await one("SELECT * FROM payments WHERE order_id = ? AND provider = ? AND status IN ('initiated','pending') ORDER BY id DESC LIMIT 1", order.id, provider.name);
  if (existing?.checkout_url) return existing;
  if (order.payment_status === 'failed') await transition(order.id, 'payment_status', 'pending', { actor: 'customer', note: 'payment retry' });
  const business = await getSetting('business');
  const lang = order.lang;
  const base = config.publicUrl;
  const created = await provider.createCheckout({
    order,
    description: `${lang === 'ar' ? business.name_ar : business.name_en} — ${order.ref}`,
    successUrl: `${base}/pay/return?order=${order.ref}`,
    backUrl: `${base}/${lang}/order/${order.ref}`,
    callbackUrl: `${base}/webhooks/${provider.name}`,
    expiresAt: order.expires_at,
  });
  await run(`INSERT INTO payments (order_id, provider, provider_ref, status, amount_minor, currency, checkout_url, raw) VALUES (?,?,?,?,?,?,?,?)`,
    order.id, provider.name, created.providerRef, 'initiated', order.total_minor, order.currency, created.checkoutUrl, JSON.stringify(created.raw || {}));
  return await one('SELECT * FROM payments WHERE provider = ? AND provider_ref = ?', provider.name, created.providerRef);
}

/** Apply a provider-verified status to the payment row and the order. */
export async function applyVerifiedStatus(payment, verified, actor) {
  const order = await one('SELECT * FROM orders WHERE id = ?', payment.order_id);
  if (!order) return { outcome: 'order_missing' };
  if (verified.status === 'paid') {
    if (Number(verified.amount) !== payment.amount_minor || verified.currency !== payment.currency) {
      await run("UPDATE payments SET status = 'failed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", payment.id);
      return { outcome: 'amount_mismatch' };
    }
    await run("UPDATE payments SET status = 'paid', last_event_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", payment.id);
    const r = await markPaid(order.id, actor, `verified with ${payment.provider}`);
    return { outcome: r.needsRefund ? 'paid_after_close' : r.changed ? 'paid' : 'already_paid' };
  }
  if (verified.status === 'refunded') {
    await run("UPDATE payments SET status = 'refunded', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", payment.id);
    if (order.payment_status === 'paid') await transition(order.id, 'payment_status', 'refunded', { actor, note: 'refund confirmed by provider' });
    return { outcome: 'refunded' };
  }
  if (verified.status === 'failed' || verified.status === 'cancelled') {
    // A late "failed" must never override a confirmed payment (out-of-order delivery).
    if (payment.status === 'paid' || order.payment_status === 'paid') return { outcome: 'ignored_after_paid' };
    await run('UPDATE payments SET status = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?', verified.status, payment.id);
    // Both map to payment_status "failed" so the customer can retry until the order expires.
    await markPaymentFailed(order.id, actor, 'failed', verified.status === 'cancelled' ? 'cancelled at checkout' : 'declined');
    return { outcome: verified.status };
  }
  return { outcome: 'pending' };
}

/** Webhook entry point. Idempotent per provider event id. */
export async function handleWebhook(providerName, rawBody, headers) {
  const provider = providerByName(providerName);
  if (!provider) { const e = new Error('PROVIDER_UNKNOWN'); e.status = 404; throw e; }
  const evt = provider.parseWebhook(rawBody, headers); // throws 401 on bad auth
  const fresh = await tx(async () => {
    const seen = await one('SELECT id FROM webhook_events WHERE provider = ? AND event_id = ?', providerName, evt.eventId);
    if (seen) return false;
    await run('INSERT INTO webhook_events (provider, event_id, type, occurred_at) VALUES (?,?,?,?)', providerName, evt.eventId, evt.type, evt.occurredAt);
    return true;
  });
  if (!fresh) return { outcome: 'duplicate' };
  let payment = evt.providerRef ? await one('SELECT * FROM payments WHERE provider = ? AND provider_ref = ?', providerName, evt.providerRef) : null;
  if (!payment && evt.orderRef) {
    payment = await one('SELECT p.* FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.ref = ? AND p.provider = ? ORDER BY p.id DESC LIMIT 1', evt.orderRef, providerName);
  }
  if (!payment) {
    await run("UPDATE webhook_events SET outcome = 'no_matching_payment' WHERE provider = ? AND event_id = ?", providerName, evt.eventId);
    return { outcome: 'no_matching_payment' };
  }
  // Re-verify with the provider rather than trusting the event body.
  const verified = await provider.fetchStatus(payment.provider_ref);
  const result = await applyVerifiedStatus(payment, verified, `provider:${providerName}`);
  await run('UPDATE webhook_events SET outcome = ? WHERE provider = ? AND event_id = ?', result.outcome, providerName, evt.eventId);
  return result;
}

/** Customer returned from the hosted page: check with the provider, never trust the redirect. */
export async function reconcileOrder(order) {
  const payment = await one('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1', order.id);
  if (!payment) return { outcome: 'no_payment' };
  const provider = providerByName(payment.provider);
  if (!provider) return { outcome: 'provider_unavailable' };
  try {
    const verified = await provider.fetchStatus(payment.provider_ref);
    return await applyVerifiedStatus(payment, verified, `provider:${payment.provider}`);
  } catch (e) {
    return { outcome: 'verify_failed', error: e.message };
  }
}
