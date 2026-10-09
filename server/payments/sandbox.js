// DEVELOPMENT-ONLY simulated gateway. It mimics a hosted checkout page and
// signed webhooks so the full payment lifecycle can be tested without a real
// merchant account. It refuses to load in production (see config.js).
import crypto from 'node:crypto';
import { config } from '../config.js';
import { one, run, parseJson } from '../db/db.js';

export function signSandbox(body) {
  return crypto.createHmac('sha256', config.payments.sandboxSecret).update(body).digest('hex');
}

export const sandbox = {
  name: 'sandbox',
  configured() { return !config.isProd; },

  async createCheckout({ order }) {
    const providerRef = `sbx_${crypto.randomBytes(8).toString('hex')}`;
    return { providerRef, checkoutUrl: `/dev/sandbox-pay/${providerRef}`, status: 'initiated', raw: { sandbox_status: 'initiated', amount: order.total_minor, currency: order.currency } };
  },

  async fetchStatus(providerRef) {
    const p = await one("SELECT raw, amount_minor, currency FROM payments WHERE provider = 'sandbox' AND provider_ref = ?", providerRef);
    if (!p) throw new Error('unknown sandbox payment');
    const raw = parseJson(p.raw, {});
    const map = { initiated: 'pending', paid: 'paid', failed: 'failed', cancelled: 'cancelled', refunded: 'refunded' };
    return { status: map[raw.sandbox_status] || 'pending', amount: raw.amount ?? p.amount_minor, currency: raw.currency ?? p.currency };
  },

  /** Simulated provider-side state change (the "bank" decides). */
  async setProviderState(providerRef, status) {
    const p = await one("SELECT raw FROM payments WHERE provider = 'sandbox' AND provider_ref = ?", providerRef);
    if (!p) return false;
    const raw = { ...parseJson(p.raw, {}), sandbox_status: status };
    await run("UPDATE payments SET raw = ? WHERE provider = 'sandbox' AND provider_ref = ?", JSON.stringify(raw), providerRef);
    return true;
  },

  parseWebhook(rawBody, headers) {
    const sig = String(headers['x-sandbox-signature'] || '');
    const expected = signSandbox(rawBody);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      const e = new Error('WEBHOOK_AUTH_FAILED'); e.status = 401; throw e;
    }
    const evt = JSON.parse(rawBody.toString('utf8'));
    return { eventId: evt.id, type: evt.type, occurredAt: evt.created_at, providerRef: evt.data?.invoice_id, orderRef: evt.data?.metadata?.order_ref, amount: evt.data?.amount, currency: evt.data?.currency };
  },
};
