// Moyasar (Saudi payment gateway) adapter using hosted invoices.
// Docs: https://docs.moyasar.com — invoices take `amount` in the smallest unit
// (halalas), webhooks carry { id, type, secret_token, live, data }.
// Verification: the webhook secret_token is compared in constant time AND the
// invoice is re-fetched from the API before anything is marked paid.
// STATUS: implemented against the public docs; must be exercised with a
// Moyasar test account (sk_test_…) before going live.
import crypto from 'node:crypto';
import { config } from '../config.js';

function authHeader() {
  return `Basic ${Buffer.from(`${config.payments.moyasarSecretKey}:`).toString('base64')}`;
}

async function api(method, path, body) {
  const r = await fetch(`${config.payments.moyasarApiBase}${path}`, {
    method,
    headers: { authorization: authHeader(), 'content-type': 'application/json', accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON error */ }
  if (!r.ok) {
    const err = new Error(`Moyasar ${method} ${path} → HTTP ${r.status}`);
    err.status = r.status; err.body = json;
    throw err;
  }
  return json;
}

export const moyasar = {
  name: 'moyasar',
  configured() { return Boolean(config.payments.moyasarSecretKey && config.payments.moyasarWebhookSecret); },

  async createCheckout({ order, successUrl, backUrl, callbackUrl, description, expiresAt }) {
    const inv = await api('POST', '/invoices', {
      amount: order.total_minor,
      currency: order.currency,
      description,
      callback_url: callbackUrl,
      success_url: successUrl,
      back_url: backUrl,
      expired_at: expiresAt,
      metadata: { order_ref: order.ref },
    });
    return { providerRef: inv.id, checkoutUrl: inv.url, status: 'initiated', raw: { id: inv.id, status: inv.status } };
  },

  /** Server-to-server status check. Returns normalised { status, amount, currency }. */
  async fetchStatus(providerRef) {
    const inv = await api('GET', `/invoices/${encodeURIComponent(providerRef)}`);
    const map = { paid: 'paid', initiated: 'pending', expired: 'failed', failed: 'failed', canceled: 'cancelled', refunded: 'refunded', voided: 'cancelled' };
    return { status: map[inv.status] || 'pending', amount: inv.amount, currency: inv.currency, raw: { id: inv.id, status: inv.status } };
  },

  /** Authenticate and normalise an incoming webhook. Throws on bad auth. */
  parseWebhook(rawBody) {
    const evt = JSON.parse(rawBody.toString('utf8'));
    const expected = Buffer.from(config.payments.moyasarWebhookSecret);
    const got = Buffer.from(String(evt.secret_token || ''));
    if (!expected.length || expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) {
      const e = new Error('WEBHOOK_AUTH_FAILED'); e.status = 401; throw e;
    }
    if (config.isProd && evt.live === false) { const e = new Error('WEBHOOK_TEST_EVENT_IN_PRODUCTION'); e.status = 400; throw e; }
    const data = evt.data || {};
    return {
      eventId: String(evt.id), type: String(evt.type), occurredAt: evt.created_at || null,
      providerRef: data.invoice_id || null, orderRef: data.metadata?.order_ref || null,
      amount: data.amount, currency: data.currency,
    };
  },
};
