// Notification outbox. Messages are written in the same transaction as the
// order change (dedupe_key UNIQUE prevents duplicates) and delivered by a
// worker with exponential backoff. Only configured channels send anything.
import crypto from 'node:crypto';
import { run, all, one } from '../db/db.js';
import { config } from '../config.js';
import { getSetting } from './settings.js';

const MAX_ATTEMPTS = 6;

export async function enqueue(event, order, dedupeKey) {
  const ns = await getSetting('notifications');
  const payload = {
    event, ref: order.ref, orderStatus: order.order_status, fulfillmentStatus: order.fulfillment_status,
    paymentStatus: order.payment_status, fulfillmentType: order.fulfillment_type, total: order.total_minor,
    currency: order.currency, scheduledFor: order.scheduled_for, lang: order.lang,
  };
  const channels = ['log'];
  if (ns.webhook_enabled && config.notifications.webhookUrl) channels.push('webhook');
  if (ns.whatsapp_cloud_enabled && config.notifications.whatsappCloudToken && event === 'order.status') channels.push('whatsapp_cloud');
  for (const ch of channels) {
    const p = ch === 'whatsapp_cloud' ? { ...payload, to: order.customer_phone } : payload; // phone only where required to deliver
    await run('INSERT OR IGNORE INTO notification_outbox (channel, dedupe_key, payload) VALUES (?,?,?)', ch, `${ch}:${dedupeKey}`, JSON.stringify(p));
  }
}

async function deliver(row) {
  const payload = JSON.parse(row.payload);
  if (row.channel === 'log') return 'sent';
  if (row.channel === 'webhook') {
    const body = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', config.notifications.webhookSecret || '').update(body).digest('hex');
    const r = await fetch(config.notifications.webhookUrl, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-viapasta-signature': `sha256=${sig}`, 'x-viapasta-delivery': String(row.id) },
      body, signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`webhook HTTP ${r.status}`);
    return 'sent';
  }
  if (row.channel === 'whatsapp_cloud') {
    // Requires an approved WhatsApp Business template named "order_update" with
    // two body parameters: {{1}} order reference, {{2}} status text.
    const r = await fetch(`https://graph.facebook.com/v21.0/${config.notifications.whatsappPhoneNumberId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.notifications.whatsappCloudToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: payload.to.replace('+', ''), type: 'template',
        template: { name: 'order_update', language: { code: payload.lang === 'en' ? 'en' : 'ar' }, components: [{ type: 'body', parameters: [{ type: 'text', text: payload.ref }, { type: 'text', text: payload.fulfillmentStatus }] }] },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`whatsapp HTTP ${r.status}`);
    return 'sent';
  }
  return 'skipped';
}

let running = false;
export async function processOutbox(nowMs = Date.now()) {
  if (running) return 0;
  running = true;
  let n = 0;
  try {
    const due = await all("SELECT * FROM notification_outbox WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY id LIMIT 25", new Date(nowMs).toISOString());
    for (const row of due) {
      // Lease the row first so two server instances never send the same message.
      const lease = await run("UPDATE notification_outbox SET next_attempt_at = ? WHERE id = ? AND status = 'pending' AND next_attempt_at = ?",
        new Date(nowMs + 120000).toISOString(), row.id, row.next_attempt_at);
      if (!lease.changes) continue;
      try {
        const status = await deliver(row);
        await run('UPDATE notification_outbox SET status = ?, attempts = attempts + 1, last_error = NULL WHERE id = ?', status, row.id);
        n++;
      } catch (e) {
        const attempts = row.attempts + 1;
        const delay = Math.min(3600, 30 * 2 ** attempts) * 1000;
        await run('UPDATE notification_outbox SET attempts = ?, status = ?, next_attempt_at = ?, last_error = ? WHERE id = ?',
          attempts, attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', new Date(nowMs + delay).toISOString(), String(e.message).slice(0, 300), row.id);
      }
    }
  } finally { running = false; }
  return n;
}

export async function outboxStats() {
  return one(`SELECT sum(status='pending') pending, sum(status='sent') sent, sum(status='failed') failed FROM notification_outbox`);
}
