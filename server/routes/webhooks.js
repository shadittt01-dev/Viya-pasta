// Payment provider webhooks and the development-only sandbox checkout page.
import { readBody, rateLimit } from '../http/app.js';
import { handleWebhook } from '../payments/index.js';
import { sandbox, signSandbox } from '../payments/sandbox.js';
import { config } from '../config.js';
import { one, run } from '../db/db.js';
import { formatMoney } from '../../shared/money.js';
import crypto from 'node:crypto';

const hookLimit = rateLimit({ name: 'webhook', limit: 300, windowMs: 60000 });

export function registerWebhooks(app) {
  app.post('/webhooks/:provider', async (req, res) => {
    hookLimit(req);
    const raw = await readBody(req, 256 * 1024);
    try {
      const result = await handleWebhook(req.params.provider, raw, req.headers);
      res.json(200, { received: true, outcome: result.outcome });
    } catch (e) {
      // 401 for bad signatures; 5xx for transient failures so the provider retries.
      res.json(e.status || 500, { error: e.message === 'WEBHOOK_AUTH_FAILED' ? 'UNAUTHORIZED' : 'WEBHOOK_FAILED' });
    }
  });

  if (config.isProd) return;

  // ---- DEVELOPMENT ONLY: simulated hosted payment page ----
  app.get('/dev/sandbox-pay/:providerRef', async (req, res) => {
    const p = await one("SELECT p.*, o.ref, o.lang FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.provider = 'sandbox' AND p.provider_ref = ?", req.params.providerRef);
    if (!p) return res.html(404, '<p>Unknown sandbox payment</p>');
    const n = res.locals.nonce;
    res.html(200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>SANDBOX payment</title>
<style nonce="${n}">body{font-family:system-ui,sans-serif;max-width:420px;margin:40px auto;padding:0 16px;color:#222}.warn{background:#fff3cd;border:1px solid #c9a227;padding:12px;border-radius:8px}button{display:block;width:100%;margin:10px 0;padding:14px;font-size:16px;border-radius:8px;border:1px solid #888;cursor:pointer}</style></head>
<body><p class="warn"><strong>DEVELOPMENT SANDBOX.</strong> No real money moves. This page imitates a payment provider so the order flow can be tested.</p>
<h1>Pay ${formatMoney(p.amount_minor, p.currency, 'en')}</h1><p>Order ${p.ref}</p>
<form method="post"><button name="action" value="paid">Approve payment</button><button name="action" value="failed">Decline payment</button><button name="action" value="cancelled">Cancel and go back</button><button name="action" value="pending">Leave pending (no webhook)</button></form></body></html>`);
  });

  app.post('/dev/sandbox-pay/:providerRef', async (req, res) => {
    const raw = await readBody(req, 4096);
    const action = new URLSearchParams(raw.toString()).get('action');
    const p = await one("SELECT p.*, o.ref FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.provider = 'sandbox' AND p.provider_ref = ?", req.params.providerRef);
    if (!p || !['paid', 'failed', 'cancelled', 'pending'].includes(action)) return res.html(400, '<p>Bad request</p>');
    if (action !== 'pending') {
      await sandbox.setProviderState(p.provider_ref, action);
      const body = JSON.stringify({ id: `evt_${crypto.randomBytes(6).toString('hex')}`, type: `payment_${action}`, created_at: new Date().toISOString(), data: { invoice_id: p.provider_ref, amount: p.amount_minor, currency: p.currency, metadata: { order_ref: p.ref } } });
      await handleWebhook('sandbox', Buffer.from(body), { 'x-sandbox-signature': signSandbox(Buffer.from(body)) });
    }
    res.redirect(`/pay/return?order=${p.ref}`, 303);
  });

  void run;
}
