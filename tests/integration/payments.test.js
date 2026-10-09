// Online payment lifecycle against the development sandbox provider: success,
// decline, cancel, pending, signed webhooks, duplicate and out-of-order
// delivery, amount tampering, redirect spoofing, expiry and paid-after-expiry.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { isolatedEnv, startApp, json, menu, orderBody } from '../helpers.js';

isolatedEnv({ PAYMENT_PROVIDER: 'sandbox' });
let app, base, items, db, setSetting, getSetting, signSandbox, sandbox, expireUnpaid, reconcileOrder;

before(async () => {
  app = await startApp();
  base = app.base;
  db = await import('../../server/db/db.js');
  ({ setSetting, getSetting } = await import('../../server/domain/settings.js'));
  ({ signSandbox, sandbox } = await import('../../server/payments/sandbox.js'));
  ({ expireUnpaid } = await import('../../server/domain/orders.js'));
  ({ reconcileOrder } = await import('../../server/payments/index.js'));
  await db.run('DELETE FROM opening_hours');
  for (let d = 0; d < 7; d++) await db.run("INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (1, ?, '00:00', '00:00', 1)", d);
  const p = await getSetting('payments');
  await setSetting('payments', { ...p, online: { ...p.online, enabled: true } });
  items = await menu(base);
});
after(async () => { await app.close(); });

async function onlineOrder() {
  const r = await json(base, 'POST', '/api/orders', orderBody(items, { paymentMethod: 'online', lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 2 }] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.next.type, 'pay');
  const order = await db.one('SELECT * FROM orders WHERE ref = ?', r.body.ref);
  const payment = await db.one('SELECT * FROM payments WHERE order_id = ?', order.id);
  return { r, order, payment };
}

function hook(payload, { sign = true, tamper = false } = {}) {
  const body = JSON.stringify(payload);
  const sig = signSandbox(Buffer.from(body));
  return fetch(`${base}/webhooks/sandbox`, { method: 'POST', headers: { 'content-type': 'application/json', ...(sign ? { 'x-sandbox-signature': tamper ? sig.replace(/^./, sig[0] === 'a' ? 'b' : 'a') : sig } : {}) }, body });
}
const evt = (type, payment, id = `evt_${Math.random().toString(36).slice(2)}`) => ({ id, type, created_at: new Date().toISOString(), data: { invoice_id: payment.provider_ref, amount: payment.amount_minor, currency: payment.currency } });

test('online order starts awaiting payment, invisible to the kitchen, with a checkout URL', async () => {
  const { r, order, payment } = await onlineOrder();
  assert.equal(order.order_status, 'awaiting_payment');
  assert.equal(order.payment_status, 'pending');
  assert.ok(r.body.next.url.startsWith('/dev/sandbox-pay/'));
  assert.equal(payment.amount_minor, 5000);
  assert.ok(order.expires_at);
});

test('browser redirect alone never marks an order paid', async () => {
  const { order } = await onlineOrder();
  const res = await fetch(`${base}/pay/return?order=${order.ref}&status=paid&id=fake`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.equal((await db.one('SELECT payment_status FROM orders WHERE id = ?', order.id)).payment_status, 'pending');
});

test('webhooks need a valid signature', async () => {
  const { payment, order } = await onlineOrder();
  await sandbox.setProviderState(payment.provider_ref, 'paid');
  assert.equal((await hook(evt('payment_paid', payment), { sign: false })).status, 401);
  assert.equal((await hook(evt('payment_paid', payment), { tamper: true })).status, 401);
  assert.equal((await db.one('SELECT payment_status FROM orders WHERE id = ?', order.id)).payment_status, 'pending');
});

test('successful payment: verified with the provider, order moves to the kitchen; duplicates are ignored', async () => {
  const { payment, order } = await onlineOrder();
  await sandbox.setProviderState(payment.provider_ref, 'paid');
  const e = evt('payment_paid', payment, 'evt_dup_1');
  const first = await (await hook(e)).json();
  const second = await (await hook(e)).json();
  assert.equal(first.outcome, 'paid');
  assert.equal(second.outcome, 'duplicate');
  const o = await db.one('SELECT * FROM orders WHERE id = ?', order.id);
  assert.deepEqual([o.order_status, o.payment_status, o.expires_at], ['awaiting_acceptance', 'paid', null]);
  assert.equal((await db.one("SELECT count(*) n FROM order_events WHERE order_id = ? AND field = 'payment_status' AND to_value = 'paid'", order.id)).n, 1);
});

test('a forged "paid" event is not trusted: status is re-checked with the provider', async () => {
  const { payment, order } = await onlineOrder();
  // provider still says "initiated" — the signed event body claims paid
  const out = await (await hook(evt('payment_paid', payment))).json();
  assert.equal(out.outcome, 'pending');
  assert.equal((await db.one('SELECT payment_status FROM orders WHERE id = ?', order.id)).payment_status, 'pending');
});

test('amount mismatch at the provider is rejected', async () => {
  const { payment, order } = await onlineOrder();
  await db.run("UPDATE payments SET raw = json_set(raw, '$.amount', 1, '$.sandbox_status', 'paid') WHERE id = ?", payment.id);
  const out = await (await hook(evt('payment_paid', payment))).json();
  assert.equal(out.outcome, 'amount_mismatch');
  assert.notEqual((await db.one('SELECT payment_status FROM orders WHERE id = ?', order.id)).payment_status, 'paid');
});

test('declined then retried then paid; a late "failed" event cannot undo a payment (out of order)', async () => {
  const { payment, order, r } = await onlineOrder();
  await sandbox.setProviderState(payment.provider_ref, 'failed');
  assert.equal((await (await hook(evt('payment_failed', payment))).json()).outcome, 'failed');
  assert.equal((await db.one('SELECT payment_status FROM orders WHERE id = ?', order.id)).payment_status, 'failed');
  const retry = await json(base, 'POST', `/api/orders/${order.ref}/pay`, { token: r.body.token });
  assert.equal(retry.status, 200);
  const p2 = await db.one('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1', order.id);
  assert.notEqual(p2.provider_ref, payment.provider_ref);
  await sandbox.setProviderState(p2.provider_ref, 'paid');
  assert.equal((await (await hook(evt('payment_paid', p2))).json()).outcome, 'paid');
  await sandbox.setProviderState(p2.provider_ref, 'failed');
  const late = await (await hook(evt('payment_failed', p2))).json();
  assert.equal(late.outcome, 'ignored_after_paid');
  assert.equal((await db.one('SELECT payment_status FROM orders WHERE id = ?', order.id)).payment_status, 'paid');
});

test('cancelled at checkout leaves the order retryable; pending stays pending', async () => {
  const { payment, order } = await onlineOrder();
  await sandbox.setProviderState(payment.provider_ref, 'cancelled');
  await hook(evt('payment_cancelled', payment));
  assert.equal((await db.one('SELECT payment_status, order_status FROM orders WHERE id = ?', order.id)).payment_status, 'failed');
  const pend = await onlineOrder();
  const out = await reconcileOrder(pend.order);
  assert.equal(out.outcome, 'pending');
});

test('the sandbox checkout page drives the same verified path', async () => {
  const { order, payment } = await onlineOrder();
  const res = await fetch(`${base}/dev/sandbox-pay/${payment.provider_ref}`, { method: 'POST', body: 'action=paid', headers: { 'content-type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  assert.equal(res.status, 303);
  assert.equal((await db.one('SELECT payment_status FROM orders WHERE id = ?', order.id)).payment_status, 'paid');
});

test('unpaid orders expire, release holds; a payment arriving after expiry is recorded for refund', async () => {
  await db.run('UPDATE items SET stock_qty = 5 WHERE id = ?', items['spaghetti-bolognese'].id);
  const { payment, order } = await onlineOrder();
  assert.equal((await db.one('SELECT stock_qty FROM items WHERE id = ?', items['spaghetti-bolognese'].id)).stock_qty, 3);
  await db.run("UPDATE orders SET expires_at = '2000-01-01T00:00:00Z' WHERE id = ?", order.id);
  assert.equal(await expireUnpaid(), 1);
  const o = await db.one('SELECT * FROM orders WHERE id = ?', order.id);
  assert.deepEqual([o.order_status, o.payment_status], ['failed', 'cancelled']);
  assert.equal((await db.one('SELECT stock_qty FROM items WHERE id = ?', items['spaghetti-bolognese'].id)).stock_qty, 5);
  await sandbox.setProviderState(payment.provider_ref, 'paid');
  const late = await (await hook(evt('payment_paid', payment))).json();
  assert.equal(late.outcome, 'paid_after_close');
  assert.equal((await db.one('SELECT payment_status FROM orders WHERE id = ?', order.id)).payment_status, 'paid');
  assert.ok(await db.one("SELECT 1 FROM order_events WHERE order_id = ? AND note LIKE '%refund required%'", order.id));
  await db.run('UPDATE items SET stock_qty = NULL WHERE id = ?', items['spaghetti-bolognese'].id);
});

test('online payment is not offered when no provider is configured', async () => {
  const { allowedPaymentMethods } = await import('../../server/domain/orders.js');
  const { config } = await import('../../server/config.js');
  const prev = config.payments.provider;
  config.payments.provider = 'none';
  assert.deepEqual(await allowedPaymentMethods('pickup'), ['pay_at_pickup']);
  const r = await json(base, 'POST', '/api/orders', orderBody(items, { paymentMethod: 'online' }));
  assert.equal(r.body.error, 'PAYMENT_METHOD_INVALID');
  config.payments.provider = prev;
});
