// End-to-end ordering through the real HTTP server and database:
// authoritative pricing, validation, idempotency, concurrency, stock, coupons,
// delivery zones, scheduling, status access control, and the staff workflow.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { isolatedEnv, startApp, json, key, menu, orderBody, adminClient, spawnSecondServer } from '../helpers.js';

isolatedEnv();
let app, base, items, db, setSetting, getSetting, owner;

before(async () => {
  app = await startApp();
  base = app.base;
  db = await import('../../server/db/db.js');
  ({ setSetting, getSetting } = await import('../../server/domain/settings.js'));
  const { createUser } = await import('../../server/domain/auth.js');
  await createUser({ email: 'owner@t.test', name: 'Owner', role: 'owner', password: 'owner-password-123' });
  await createUser({ email: 'staff@t.test', name: 'Staff', role: 'staff', password: 'staff-password-123' });
  // Open 24h for deterministic tests (overnight rule still exercised: 00:00–00:00 = full day)
  await db.run('DELETE FROM opening_hours');
  for (let d = 0; d < 7; d++) await db.run("INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (1, ?, '00:00', '00:00', 1)", d);
  items = await menu(base);
  owner = await adminClient(base, 'owner@t.test', 'owner-password-123');
});
after(async () => { await app.close(); });

const fries = () => items.alfredo; // required single-choice protein group
const seasoned = () => fries().groups[0].options.find((o) => /Chicken/.test(o.name)).id;
const regular = () => fries().groups[0].options.find((o) => /Vegetable/.test(o.name)).id;

test('menu prices match the owner-published menu (minor units)', () => {
  const expect = { alfredo: 2100, mex: 2100, pesto: 2100, fettuccine: 2500, 'spaghetti-bolognese': 2500, 'tona-rosso': 2100, 'three-cheese-pasta': 2100, 'pasta-ball': 1900, 'potato-wedges': 900, 'mozzarella-sticks': 1200, 'soft-drink': 300, water: 100 };
  for (const [slug, price] of Object.entries(expect)) assert.equal(items[slug].price, price, slug);
  // every protein combination matches the listing: Vegetable 21, Chicken 25, Shrimp 32
  for (const slug of ['alfredo', 'mex', 'pesto']) {
    const opts = Object.fromEntries(items[slug].groups[0].options.map((o) => [o.name, items[slug].price + o.price]));
    assert.deepEqual(opts, { Vegetable: 2100, Chicken: 2500, Shrimp: 3200 }, slug);
  }
  const fet = Object.fromEntries(items.fettuccine.groups[0].options.map((o) => [o.name, items.fettuccine.price + o.price]));
  assert.deepEqual(fet, { Chicken: 2500, Shrimp: 3200 });
});

test('quote: one item and five items give matching counts and totals', async () => {
  const one = await json(base, 'POST', '/api/quote', { lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 1 }] });
  assert.equal(one.body.itemCount, 1);
  assert.equal(one.body.totals.total, 2500);
  const five = await json(base, 'POST', '/api/quote', { lines: Array.from({ length: 5 }, () => ({ itemId: items['spaghetti-bolognese'].id, qty: 1 })) });
  assert.equal(five.body.lines.length, 1, 'identical lines merge');
  assert.equal(five.body.lines[0].qty, 5);
  assert.equal(five.body.totals.total, 12500);
});

test('quote: modifiers price correctly and different variants stay separate', async () => {
  const q = await json(base, 'POST', '/api/quote', { lines: [
    { itemId: fries().id, optionIds: [regular()], qty: 1 }, { itemId: fries().id, optionIds: [seasoned()], qty: 2 },
    { itemId: items.fettuccine.id, optionIds: [items.fettuccine.groups[0].options.find((o) => o.name === 'Shrimp').id], qty: 1 },
  ] });
  assert.equal(q.body.ok, true);
  assert.equal(q.body.lines.length, 3);
  assert.equal(q.body.totals.subtotal, 2100 + 2 * 2500 + 3200);
});

test('quote: required options, invalid options and too many options are rejected', async () => {
  const missing = await json(base, 'POST', '/api/quote', { lines: [{ itemId: fries().id, qty: 1 }] });
  assert.equal(missing.body.ok, false);
  assert.equal(missing.body.errors[0].code, 'OPTION_REQUIRED');
  const both = await json(base, 'POST', '/api/quote', { lines: [{ itemId: fries().id, optionIds: [regular(), seasoned()], qty: 1 }] });
  assert.equal(both.body.errors[0].code, 'OPTION_TOO_MANY');
  const foreign = await json(base, 'POST', '/api/quote', { lines: [{ itemId: items['spaghetti-bolognese'].id, optionIds: [seasoned()], qty: 1 }] });
  assert.equal(foreign.body.errors[0].code, 'OPTION_INVALID');
  const qty = await json(base, 'POST', '/api/quote', { lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 21 }] });
  assert.equal(qty.body.errors[0].code, 'QTY_INVALID');
});

test('server ignores any price sent by the browser', async () => {
  const body = orderBody(items, { lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 2, price: 1, unit: 1, lineTotal: 1 }], total: 1, subtotal_minor: 1 });
  const r = await json(base, 'POST', '/api/orders', body);
  assert.equal(r.status, 201);
  const o = await db.one('SELECT total_minor FROM orders WHERE ref = ?', r.body.ref);
  assert.equal(o.total_minor, 5000);
});

test('expectedTotal mismatch returns PRICE_CHANGED with a fresh quote and creates nothing', async () => {
  const before = (await db.one('SELECT count(*) n FROM orders')).n;
  const r = await json(base, 'POST', '/api/orders', orderBody(items, { expectedTotal: 2300 }));
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'PRICE_CHANGED');
  assert.equal(r.body.quote.totals.total, 2500);
  assert.equal((await db.one('SELECT count(*) n FROM orders')).n, before);
});

test('idempotency: double-click / retry returns the same order; reuse with different content is refused', async () => {
  const body = orderBody(items, { expectedTotal: 2500 });
  const results = await Promise.all(Array.from({ length: 6 }, () => json(base, 'POST', '/api/orders', body)));
  const refs = new Set(results.map((r) => r.body.ref));
  assert.equal(refs.size, 1);
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal((await db.one('SELECT count(*) n FROM orders WHERE idempotency_key = ?', body.idempotencyKey)).n, 1);
  const retry = await json(base, 'POST', '/api/orders', body);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.replayed, true);
  const changed = await json(base, 'POST', '/api/orders', { ...body, lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 3 }] });
  assert.equal(changed.status, 409);
  assert.equal(changed.body.error, 'IDEMPOTENCY_CONFLICT');
});

test('idempotency holds across two server processes sharing the database', async () => {
  const second = await spawnSecondServer();
  try {
    const body = orderBody(items);
    const [a, b] = await Promise.all([json(base, 'POST', '/api/orders', body), json(second.base, 'POST', '/api/orders', body)]);
    assert.equal(a.body.ref, b.body.ref);
    assert.equal((await db.one('SELECT count(*) n FROM orders WHERE idempotency_key = ?', body.idempotencyKey)).n, 1);
  } finally { second.kill(); }
});

test('order snapshot keeps the price paid even after the menu price changes', async () => {
  const r = await json(base, 'POST', '/api/orders', orderBody(items, { lines: [{ itemId: items['mozzarella-sticks'].id, qty: 1 }] }));
  await db.run('UPDATE items SET price_minor = 9900 WHERE id = ?', items['mozzarella-sticks'].id);
  const snap = await db.one('SELECT oi.unit_price_minor, o.total_minor FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.ref = ?', r.body.ref);
  assert.deepEqual([snap.unit_price_minor, snap.total_minor], [1200, 1200]);
  await db.run('UPDATE items SET price_minor = 1200 WHERE id = ?', items['mozzarella-sticks'].id);
});

test('sold-out items and sold-out options cannot be ordered', async () => {
  await db.run('UPDATE items SET sold_out = 1 WHERE id = ?', items.water.id);
  const r = await json(base, 'POST', '/api/orders', orderBody(items, { lines: [{ itemId: items.water.id, qty: 1 }] }));
  assert.equal(r.status, 422, JSON.stringify(r.body));
  assert.equal(r.body.errors[0].code, 'SOLD_OUT');
  await db.run('UPDATE items SET sold_out = 0 WHERE id = ?', items.water.id);
  await db.run('UPDATE modifiers SET sold_out = 1 WHERE id = ?', seasoned());
  const o = await json(base, 'POST', '/api/quote', { lines: [{ itemId: fries().id, optionIds: [seasoned()], qty: 1 }] });
  assert.equal(o.body.errors?.[0]?.code, 'OPTION_UNAVAILABLE', JSON.stringify(o));
  await db.run('UPDATE modifiers SET sold_out = 0 WHERE id = ?', seasoned());
});

test('concurrent purchases cannot oversell tracked stock', async () => {
  await db.run('UPDATE items SET stock_qty = 3 WHERE id = ?', items['potato-wedges'].id);
  const bodies = Array.from({ length: 6 }, (_, i) => orderBody(items, { customer: { name: `Buyer ${i}`, phone: `05512345${String(10 + i)}` }, lines: [{ itemId: items['potato-wedges'].id, qty: 1 }] }));
  const res = await Promise.all(bodies.map((b) => json(base, 'POST', '/api/orders', b)));
  assert.equal(res.filter((r) => r.status === 201).length, 3);
  assert.equal((await db.one('SELECT stock_qty FROM items WHERE id = ?', items['potato-wedges'].id)).stock_qty, 0);
  // cancelling one returns its stock
  const ok = res.find((r) => r.status === 201);
  const id = (await db.one('SELECT id FROM orders WHERE ref = ?', ok.body.ref)).id;
  const c = await owner.call('POST', `/orders/${id}/action`, { action: 'reject', reason: 'test' });
  assert.equal(c.status, 200);
  assert.equal((await db.one('SELECT stock_qty FROM items WHERE id = ?', items['potato-wedges'].id)).stock_qty, 1);
  await db.run('UPDATE items SET stock_qty = NULL WHERE id = ?', items['potato-wedges'].id);
});

test('coupons: discount math, minimums, single-use under concurrency, per-customer limit', async () => {
  await db.run("INSERT INTO coupons (code, kind, value, min_subtotal_minor, max_discount_minor, usage_limit, per_customer_limit) VALUES ('TEN', 'percent', 1000, 2000, 500, 100, 1)");
  await db.run("INSERT INTO coupons (code, kind, value, usage_limit) VALUES ('ONCE', 'fixed', 500, 1)");
  await db.run("INSERT INTO coupons (code, kind, value, ends_at) VALUES ('OLD', 'fixed', 500, '2020-01-01T00:00:00Z')");
  const q = await json(base, 'POST', '/api/quote', { couponCode: 'ten', lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 3 }] });
  assert.equal(q.body.totals.discount, 500, '10% of 75 = 7.50 capped at 5');
  assert.equal(q.body.totals.total, 7000);
  const small = await json(base, 'POST', '/api/quote', { couponCode: 'TEN', lines: [{ itemId: items.water.id, qty: 1 }] });
  assert.equal(small.body.coupon.error, 'COUPON_MIN_SUBTOTAL');
  const old = await json(base, 'POST', '/api/quote', { couponCode: 'OLD', lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 1 }] });
  assert.equal(old.body.coupon.error, 'COUPON_EXPIRED');
  const tries = await Promise.all(Array.from({ length: 5 }, (_, i) => json(base, 'POST', '/api/orders', orderBody(items, { couponCode: 'ONCE', customer: { name: `C ${i}`, phone: `05599999${10 + i}` } }))));
  assert.equal(tries.filter((r) => r.status === 201).length, 1, 'single-use coupon redeemed exactly once');
  const first = await json(base, 'POST', '/api/orders', orderBody(items, { couponCode: 'TEN', lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 1 }], customer: { name: 'Repeat', phone: '0551112223' } }));
  assert.equal(first.status, 201);
  const again = await json(base, 'POST', '/api/orders', orderBody(items, { couponCode: 'TEN', lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 1 }], customer: { name: 'Repeat', phone: '+966551112223' } }));
  assert.equal(again.status, 422);
  assert.equal(again.body.coupon.error, 'COUPON_CUSTOMER_LIMIT', 'same phone in another format is the same customer');
});

test('delivery: disabled by default; in-zone, out-of-zone, minimum and free-delivery threshold', async () => {
  const off = await json(base, 'POST', '/api/quote', { fulfillment: 'delivery', location: { lat: 24.1, lng: 38.02 }, lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 1 }] });
  assert.equal(off.body.errors[0].code, 'DELIVERY_DISABLED');
  const f = await getSetting('fulfillment');
  await setSetting('fulfillment', { ...f, delivery: { ...f.delivery, enabled: true } });
  await db.run(`INSERT INTO delivery_zones (branch_id, name_en, name_ar, kind, geometry, fee_minor, min_order_minor, free_over_minor) VALUES (1, 'Near', 'قريب', 'radius', '{"km":3}', 1000, 3000, 8000)`);
  const inZone = await json(base, 'POST', '/api/quote', { fulfillment: 'delivery', location: { lat: 24.095, lng: 38.09 }, lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 2 }] });
  assert.equal(inZone.body.ok, true, JSON.stringify(inZone.body.errors));
  assert.equal(inZone.body.totals.deliveryFee, 1000);
  assert.equal(inZone.body.totals.total, 6000);
  const below = await json(base, 'POST', '/api/quote', { fulfillment: 'delivery', location: { lat: 24.095, lng: 38.09 }, lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 1 }] });
  assert.equal(below.body.errors[0].code, 'BELOW_MINIMUM');
  const free = await json(base, 'POST', '/api/quote', { fulfillment: 'delivery', location: { lat: 24.095, lng: 38.09 }, lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 4 }] });
  assert.equal(free.body.totals.deliveryFee, 0);
  const far = await json(base, 'POST', '/api/quote', { fulfillment: 'delivery', location: { lat: 24.3, lng: 38.2 }, lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 2 }] });
  assert.equal(far.body.errors[0].code, 'OUT_OF_ZONE');
  const noAddr = await json(base, 'POST', '/api/orders', orderBody(items, { fulfillment: 'delivery', lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 2 }], paymentMethod: 'online' }));
  assert.equal(noAddr.status, 422);
  await setSetting('fulfillment', f);
});

test('closed hours and scheduled pickup: ASAP refused when closed, valid slots accepted, invalid slots refused', async () => {
  await db.run('DELETE FROM opening_hours');
  // open only far from "now": Riyadh weekday after tomorrow 17:00–03:00 — slots exist only via scheduling window
  const { zonedParts } = await import('../../shared/hours.js');
  const today = zonedParts(new Date(), 'Asia/Riyadh').weekday;
  const nowH = zonedParts(new Date(), 'Asia/Riyadh').h;
  const open = `${String((nowH + 3) % 24).padStart(2, '0')}:00`, close = `${String((nowH + 6) % 24).padStart(2, '0')}:00`;
  await db.run('INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (1, ?, ?, ?, 1)', today, open, close);
  await db.run('INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (1, ?, ?, ?, 1)', (today + 1) % 7, open, close);
  const asap = await json(base, 'POST', '/api/orders', orderBody(items));
  assert.equal(asap.status, 409);
  assert.equal(asap.body.error, 'CLOSED_NOW');
  assert.ok(asap.body.slots.length > 0);
  const slot = new Date(asap.body.slots[0]).toISOString();
  const ok = await json(base, 'POST', '/api/orders', orderBody(items, { scheduledFor: slot }));
  assert.equal(ok.status, 201);
  assert.equal((await db.one('SELECT scheduled_for FROM orders WHERE ref = ?', ok.body.ref)).scheduled_for, slot);
  const bad = await json(base, 'POST', '/api/orders', orderBody(items, { scheduledFor: new Date(Date.parse(slot) + 7 * 60000).toISOString() }));
  assert.equal(bad.body.error, 'SLOT_UNAVAILABLE');
  await db.run('DELETE FROM opening_hours');
  for (let d = 0; d < 7; d++) await db.run("INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (1, ?, '00:00', '00:00', 1)", d);
});

test('customer validation: name and Saudi mobile formats', async () => {
  for (const phone of ['0551234567', '+966551234567', '00966551234567', '٠٥٥١٢٣٤٥٦٧', '055 123 4567']) {
    const r = await json(base, 'POST', '/api/orders', orderBody(items, { customer: { name: 'Ali', phone } }));
    assert.equal(r.status, 201, phone);
  }
  for (const phone of ['12345', '0112345678', '+96611234567', '']) {
    const r = await json(base, 'POST', '/api/orders', orderBody(items, { customer: { name: 'Ali', phone } }));
    assert.equal(r.status, 422, phone);
    assert.equal(r.body.fields.phone, 'PHONE_INVALID');
  }
  const noName = await json(base, 'POST', '/api/orders', orderBody(items, { customer: { name: ' ', phone: '0551234567' } }));
  assert.equal(noName.body.fields.name, 'NAME_INVALID');
});

test('order status is private: needs the order token; wrong token looks identical to a missing order', async () => {
  const r = await json(base, 'POST', '/api/orders', orderBody(items));
  const token = r.body.token;
  assert.ok(token && token.length >= 30);
  const cookie = r.headers.getSetCookie().find((c) => c.startsWith(`hb_o_${r.body.ref}=`));
  assert.match(cookie, /HttpOnly/);
  const good = await json(base, 'POST', `/api/orders/${r.body.ref}/status`, { token });
  assert.equal(good.status, 200);
  assert.equal(good.body.orderStatus, 'awaiting_acceptance');
  assert.ok(!('customerPhone' in good.body), 'status view does not expose the phone number');
  const wrong = await json(base, 'POST', `/api/orders/${r.body.ref}/status`, { token: 'A'.repeat(32) });
  const missing = await json(base, 'POST', '/api/orders/HZZZZZZ/status', { token: 'A'.repeat(32) });
  assert.deepEqual([wrong.status, wrong.body], [missing.status, missing.body]);
  const viaCookie = await fetch(`${base}/api/orders/${r.body.ref}/status`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookie.split(';')[0] }, body: '{}' });
  assert.equal(viaCookie.status, 200);
});

test('staff workflow: accept → preparing → ready → collected; illegal transitions are refused; customer sees each step', async () => {
  const r = await json(base, 'POST', '/api/orders', orderBody(items));
  const id = (await db.one('SELECT id FROM orders WHERE ref = ?', r.body.ref)).id;
  const staff = await adminClient(base, 'staff@t.test', 'staff-password-123');
  const early = await staff.call('POST', `/orders/${id}/action`, { action: 'ready' });
  assert.equal(early.status, 409);
  for (const action of ['accept', 'preparing', 'ready']) {
    const s = await staff.call('POST', `/orders/${id}/action`, { action, prepMinutes: 10 });
    assert.equal(s.status, 200, action);
  }
  const mid = await json(base, 'POST', `/api/orders/${r.body.ref}/status`, { token: r.body.token });
  assert.deepEqual([mid.body.orderStatus, mid.body.fulfillmentStatus], ['accepted', 'ready']);
  assert.ok(mid.body.promisedAt);
  const paid = await staff.call('POST', `/orders/${id}/action`, { action: 'mark_paid', method: 'cash' });
  assert.equal(paid.status, 200);
  const done = await staff.call('POST', `/orders/${id}/action`, { action: 'collected' });
  assert.equal(done.body.order.orderStatus, 'completed');
  assert.equal(done.body.order.paymentStatus, 'paid');
  const refund = await staff.call('POST', `/orders/${id}/action`, { action: 'mark_refunded' });
  assert.equal(refund.status, 403, 'staff cannot record refunds');
  const events = await db.all('SELECT field, to_value, actor FROM order_events WHERE order_id = ? ORDER BY id', id);
  assert.ok(events.length >= 6);
  assert.ok(events.every((e) => e.actor === 'customer' || e.actor === 'system' || e.actor.startsWith('user:')));
});

test('orders appear in the owner inbox; analytics events never store personal data', async () => {
  const r = await json(base, 'POST', '/api/orders', orderBody(items, { customer: { name: 'Visible Person', phone: '0557778889' } }));
  const inbox = await owner.call('GET', '/orders?view=active');
  assert.ok(inbox.body.orders.some((o) => o.ref === r.body.ref));
  const ev = await fetch(`${base}/api/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'order_placed', path: `/en/order/${r.body.ref}?x=1`, props: { name: 'Visible Person', phone: '0557778889', qty: 2, fulfillment: 'pickup' } }) });
  assert.equal(ev.status, 204);
  const row = await db.one('SELECT * FROM analytics_events ORDER BY id DESC LIMIT 1');
  assert.equal(row.path, '/en/order/:ref');
  assert.ok(!row.props.includes('Visible') && !row.props.includes('0557'));
  const unknown = await json(base, 'POST', '/api/events', { name: 'steal_data' });
  assert.equal(unknown.status, 422);
});

test('ordering can be paused by the owner', async () => {
  const o = await getSetting('ordering');
  await setSetting('ordering', { ...o, enabled: false });
  const r = await json(base, 'POST', '/api/orders', orderBody(items));
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'ORDERING_PAUSED');
  await setSetting('ordering', o);
});
