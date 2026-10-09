// Order creation and lifecycle. Order, fulfillment and payment statuses are
// separate state machines; every change is recorded in order_events.
import crypto from 'node:crypto';
import { tx, one, all, run, parseJson } from '../db/db.js';
import { config } from '../config.js';
import { quote } from './pricing.js';
import { getSetting, allSettings } from './settings.js';
import { branchById, branchHours, branchClosures } from './catalog.js';
import { orderSlots } from '../../shared/hours.js';
import { normalizePhone, customerKey } from './phone.js';
import { enqueue } from './notify.js';
import { publish } from './events.js';

export class OrderError extends Error {
  constructor(code, status = 422, details = {}) { super(code); this.code = code; this.status = status; this.details = details; }
}

export const ORDER_STATUSES = ['awaiting_payment', 'awaiting_acceptance', 'accepted', 'completed', 'rejected', 'cancelled', 'failed'];
export const FULFILLMENT_STATUSES = ['not_started', 'preparing', 'ready', 'collected', 'dispatched', 'delivered', 'delivery_failed'];
export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed', 'cancelled', 'refunded'];

const ORDER_FLOW = {
  awaiting_payment: ['awaiting_acceptance', 'accepted', 'failed', 'cancelled'],
  awaiting_acceptance: ['accepted', 'rejected', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  completed: [], rejected: [], cancelled: [], failed: [],
};
const FULFILLMENT_FLOW = {
  not_started: ['preparing'],
  preparing: ['ready'],
  ready: ['collected', 'dispatched'],
  dispatched: ['delivered', 'delivery_failed'],
  delivery_failed: ['dispatched'],
  collected: [], delivered: [],
};
const PAYMENT_FLOW = {
  unpaid: ['paid', 'cancelled'],
  pending: ['paid', 'failed', 'cancelled'],
  failed: ['pending', 'paid'],
  paid: ['refunded'],
  cancelled: [], refunded: [],
};
const FLOWS = { order_status: ORDER_FLOW, fulfillment_status: FULFILLMENT_FLOW, payment_status: PAYMENT_FLOW };
const TERMINAL_ORDER = new Set(['completed', 'rejected', 'cancelled', 'failed']);

export function canTransition(field, from, to) {
  return Boolean(FLOWS[field]?.[from]?.includes(to));
}

const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
function newRef() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[bytes[i] % REF_ALPHABET.length];
  return `H${s}`;
}
export function hashToken(t) { return crypto.createHash('sha256').update(String(t)).digest('hex'); }

function canonical(obj) {
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(',')}]`;
  if (obj && typeof obj === 'object') return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
  return JSON.stringify(obj ?? null);
}

export async function allowedPaymentMethods(fulfillmentType, p = null) {
  p = p || await getSetting('payments');
  const out = [];
  if (fulfillmentType === 'pickup' && p.pay_at_pickup.enabled) out.push('pay_at_pickup');
  if (fulfillmentType === 'delivery' && p.pay_on_delivery.enabled) out.push('pay_on_delivery');
  if (p.online.enabled && config.payments.provider !== 'none') out.push('online');
  return out;
}

function validateCustomer(c) {
  const name = String(c?.name || '').trim().replace(/\s+/g, ' ');
  const phone = normalizePhone(c?.phone);
  const errs = {};
  if (name.length < 2 || name.length > 60) errs.name = 'NAME_INVALID';
  if (!phone) errs.phone = 'PHONE_INVALID';
  if (Object.keys(errs).length) throw new OrderError('CUSTOMER_INVALID', 422, { fields: errs });
  return { name, phone, note: String(c?.note || '').trim().slice(0, 280) };
}

function validateAddress(a) {
  const out = {
    district: String(a?.district || '').trim().slice(0, 80),
    street: String(a?.street || '').trim().slice(0, 120),
    building: String(a?.building || '').trim().slice(0, 40),
    unit: String(a?.unit || '').trim().slice(0, 40),
    instructions: String(a?.instructions || '').trim().slice(0, 200),
    lat: Number(a?.lat), lng: Number(a?.lng),
  };
  if (!out.street || !out.district) throw new OrderError('ADDRESS_INVALID', 422, { fields: { street: !out.street ? 'REQUIRED' : undefined, district: !out.district ? 'REQUIRED' : undefined } });
  if (!Number.isFinite(out.lat) || !Number.isFinite(out.lng)) throw new OrderError('LOCATION_REQUIRED', 422);
  return out;
}

/**
 * Create an order. Idempotent on input.idempotencyKey.
 * Returns { order, token|null, replayed }
 */
export async function createOrder(input, { nowMs = Date.now() } = {}) {
  const key = String(input.idempotencyKey || '');
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(key)) throw new OrderError('IDEMPOTENCY_KEY_INVALID', 400);

  const fulfillmentType = input.fulfillment === 'delivery' ? 'delivery' : 'pickup';
  const requestHash = crypto.createHash('sha256').update(canonical({
    lines: (input.lines || []).map((l) => ({ i: Number(l.itemId), o: [...(l.optionIds || [])].map(Number).sort(), q: Number(l.qty), n: String(l.note || '') })),
    f: fulfillmentType, s: input.scheduledFor || null, c: input.customer || {}, p: input.paymentMethod, k: input.couponCode || null, a: input.address || null, b: Number(input.branchId),
  })).digest('hex');

  const existing = await one('SELECT * FROM orders WHERE idempotency_key = ?', key);
  if (existing) {
    if (existing.request_hash !== requestHash) throw new OrderError('IDEMPOTENCY_CONFLICT', 409);
    return { order: existing, token: null, replayed: true };
  }

  const settings = await allSettings();
  const ordering = settings.ordering;
  if (!ordering.enabled) throw new OrderError('ORDERING_PAUSED', 503);
  const branch = await branchById(Number(input.branchId));
  if (!branch) throw new OrderError('BRANCH_INVALID', 422);
  const customer = validateCustomer(input.customer);
  const address = fulfillmentType === 'delivery' ? validateAddress(input.address) : null;

  // timing
  const fcfg = settings.fulfillment[fulfillmentType];
  const [hours, closures] = await Promise.all([branchHours(branch.id), branchClosures(branch.id)]);
  const slots = orderSlots(hours, closures, nowMs, branch.timezone, {
    prepMinutes: fcfg.prep_minutes, slotMinutes: ordering.slot_minutes, daysAhead: ordering.scheduling ? ordering.days_ahead : 0,
    cutoffMinutes: ordering.cutoff_minutes, asap: ordering.asap,
  });
  let scheduledFor = null;
  if (input.scheduledFor) {
    const t = Date.parse(input.scheduledFor);
    if (!ordering.scheduling || !slots.slots.includes(t)) throw new OrderError('SLOT_UNAVAILABLE', 409, { slots: slots.slots.slice(0, 12) });
    scheduledFor = new Date(t).toISOString();
  } else if (!slots.asapAvailable) {
    throw new OrderError('CLOSED_NOW', 409, { opensAt: slots.status.opensAt, slots: slots.slots.slice(0, 12) });
  }

  const paymentMethod = String(input.paymentMethod || '');
  if (!(await allowedPaymentMethods(fulfillmentType, settings.payments)).includes(paymentMethod)) throw new OrderError('PAYMENT_METHOD_INVALID', 422);

  const ckey = customerKey(customer.phone, config.sessionSecret);
  const priced = await quote({ settings, branch, lines: input.lines, couponCode: input.couponCode, fulfillment: fulfillmentType, location: address, customerKey: ckey, nowMs });
  // Report the real reason (e.g. sold out) before "empty": a cart whose only line is invalid prices to zero lines.
  if (priced.errors.length) throw new OrderError('CART_INVALID', 422, { errors: priced.errors, quote: priced });
  if (priced.empty) throw new OrderError('CART_EMPTY', 422);
  if (input.couponCode && !priced.coupon?.ok) throw new OrderError('COUPON_REJECTED', 422, { coupon: priced.coupon, quote: priced });
  if (input.expectedTotal !== undefined && Number(input.expectedTotal) !== priced.totals.total) {
    throw new OrderError('PRICE_CHANGED', 409, { quote: priced });
  }

  const online = paymentMethod === 'online';
  const autoAccept = ordering.accept_mode === 'auto';
  const whatsapp = settings.whatsapp;
  const token = crypto.randomBytes(24).toString('base64url');

  return tx(async () => {
    // re-check idempotency inside the write lock (two identical requests racing)
    const raced = await one('SELECT * FROM orders WHERE idempotency_key = ?', key);
    if (raced) {
      if (raced.request_hash !== requestHash) throw new OrderError('IDEMPOTENCY_CONFLICT', 409);
      return { order: raced, token: null, replayed: true };
    }
    // reserve stock atomically
    const perItem = new Map();
    for (const l of priced.lines) perItem.set(l.itemId, (perItem.get(l.itemId) || 0) + l.qty);
    for (const [itemId, n] of perItem) {
      const tracked = await one('SELECT stock_qty FROM items WHERE id = ?', itemId);
      if (tracked && tracked.stock_qty !== null) {
        const r = await run('UPDATE items SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty IS NOT NULL AND stock_qty >= ?', n, itemId, n);
        if (r.changes !== 1) throw new OrderError('CART_INVALID', 409, { errors: [{ key: null, itemId, code: 'STOCK_LOW', available: tracked.stock_qty }] });
      }
    }
    // coupon limits under the same lock
    if (priced.coupon?.ok) {
      const c = await one('SELECT usage_limit, per_customer_limit FROM coupons WHERE id = ?', priced.coupon.id);
      const total = (await one('SELECT count(*) n FROM coupon_redemptions WHERE coupon_id = ? AND released = 0', priced.coupon.id)).n;
      const mine = (await one('SELECT count(*) n FROM coupon_redemptions WHERE coupon_id = ? AND customer_key = ? AND released = 0', priced.coupon.id, ckey)).n;
      if (c.usage_limit !== null && total >= c.usage_limit) throw new OrderError('COUPON_REJECTED', 409, { coupon: { ...priced.coupon, ok: false, error: 'COUPON_USED_UP' } });
      if (c.per_customer_limit !== null && mine >= c.per_customer_limit) throw new OrderError('COUPON_REJECTED', 409, { coupon: { ...priced.coupon, ok: false, error: 'COUPON_CUSTOMER_LIMIT' } });
    }

    let ref;
    for (let i = 0; i < 10; i++) { ref = newRef(); if (!(await one('SELECT 1 AS x FROM orders WHERE ref = ?', ref))) break; }
    const orderStatus = online ? 'awaiting_payment' : autoAccept ? 'accepted' : 'awaiting_acceptance';
    const now = new Date(nowMs).toISOString();
    const expiresAt = online ? new Date(nowMs + config.payments.unpaidOrderTtlMinutes * 60000).toISOString() : null;
    const wa = whatsapp.mode === 'order_copy' || whatsapp.mode === 'whatsapp_required' ? 'offered' : 'none';
    const res = await run(`INSERT INTO orders (ref, access_hash, idempotency_key, request_hash, branch_id, lang, order_status, fulfillment_status, payment_status,
      fulfillment_type, scheduled_for, customer_name, customer_phone, customer_note, address, delivery_zone_id, payment_method, currency,
      subtotal_minor, discount_minor, delivery_fee_minor, service_fee_minor, tax_minor, tax_mode, total_minor, coupon_id, coupon_code,
      whatsapp_handoff, created_at, updated_at, expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ref, hashToken(token), key, requestHash, branch.id, input.lang === 'en' ? 'en' : 'ar', orderStatus, 'not_started', online ? 'pending' : 'unpaid',
      fulfillmentType, scheduledFor, customer.name, customer.phone, customer.note, address ? JSON.stringify(address) : null, priced.fulfillment.zoneId,
      paymentMethod, priced.currency, priced.totals.subtotal, priced.totals.discount, priced.totals.deliveryFee, priced.totals.serviceFee,
      priced.totals.tax, priced.totals.taxMode, priced.totals.total, priced.coupon?.ok ? priced.coupon.id : null, priced.coupon?.ok ? priced.coupon.code : null,
      wa, now, now, expiresAt,
    );
    const orderId = Number(res.lastInsertRowid);
    for (const l of priced.lines) {
      await run(`INSERT INTO order_items (order_id, item_id, name_en, name_ar, unit_price_minor, qty, options, note, discount_minor, line_total_minor, kcal)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`, orderId, l.itemId, l.name_en, l.name_ar, l.unit, l.qty, JSON.stringify(l.options), l.note, l.discount || 0, l.lineTotal, l.kcal);
    }
    if (priced.coupon?.ok) {
      await run('INSERT INTO coupon_redemptions (coupon_id, order_id, customer_key) VALUES (?,?,?)', priced.coupon.id, orderId, ckey);
    }
    await run('INSERT INTO order_events (order_id, field, from_value, to_value, actor, note) VALUES (?,?,?,?,?,?)', orderId, 'order_status', null, orderStatus, 'customer', 'created');
    const order = await one('SELECT * FROM orders WHERE id = ?', orderId);
    if (!online) await enqueue('order.created', order, `order:${orderId}:created`);
    publish({ type: 'order.created', orderId, ref, visible: !online });
    return { order, token, replayed: false };
  });
}

export async function getOrderByRef(ref) {
  return one('SELECT * FROM orders WHERE ref = ?', String(ref || '').toUpperCase().slice(0, 12));
}

export function verifyAccess(order, token) {
  if (!order || !token) return false;
  const a = Buffer.from(order.access_hash, 'hex');
  const b = Buffer.from(hashToken(token), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function orderItems(orderId) {
  return (await all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', orderId)).map((r) => ({ ...r, options: parseJson(r.options, []) }));
}

export async function orderEvents(orderId) {
  return all('SELECT * FROM order_events WHERE order_id = ? ORDER BY id', orderId);
}

async function releaseHolds(order) {
  if (order.stock_released) return;
  for (const it of await all('SELECT item_id, qty FROM order_items WHERE order_id = ?', order.id)) {
    await run('UPDATE items SET stock_qty = stock_qty + ? WHERE id = ? AND stock_qty IS NOT NULL', it.qty, it.item_id);
  }
  await run('UPDATE coupon_redemptions SET released = 1 WHERE order_id = ?', order.id);
  await run('UPDATE orders SET stock_released = 1 WHERE id = ?', order.id);
}

/**
 * Apply one status change atomically. actor: 'system' | 'customer' | 'user:<id>' | 'provider:<name>'
 */
export async function transition(orderId, field, to, { actor = 'system', note = '', extra = {} } = {}) {
  if (!FLOWS[field]) throw new OrderError('FIELD_INVALID', 400);
  return tx(async () => {
    const order = await one('SELECT * FROM orders WHERE id = ?', orderId);
    if (!order) throw new OrderError('ORDER_NOT_FOUND', 404);
    const from = order[field];
    if (from === to) return { order, changed: false };
    if (!canTransition(field, from, to)) throw new OrderError('TRANSITION_INVALID', 409, { field, from, to });
    if (field === 'fulfillment_status') {
      if (order.order_status !== 'accepted') throw new OrderError('ORDER_NOT_ACCEPTED', 409);
      if (to === 'collected' && order.fulfillment_type !== 'pickup') throw new OrderError('TRANSITION_INVALID', 409);
      if (to === 'dispatched' && order.fulfillment_type !== 'delivery') throw new OrderError('TRANSITION_INVALID', 409);
    }
    const sets = [`${field} = ?`, `updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`];
    const vals = [to];
    if (extra.promised_at) { sets.push('promised_at = ?'); vals.push(extra.promised_at); }
    if (extra.reject_reason) { sets.push('reject_reason = ?'); vals.push(extra.reject_reason.slice(0, 200)); }
    await run(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, ...vals, orderId);
    await run('INSERT INTO order_events (order_id, field, from_value, to_value, actor, note) VALUES (?,?,?,?,?,?)', orderId, field, from, to, actor, String(note).slice(0, 300));

    // consequences
    if (field === 'order_status' && ['cancelled', 'rejected', 'failed'].includes(to)) {
      await releaseHolds(order);
      if (order.payment_status === 'pending') {
        await run("UPDATE orders SET payment_status = 'cancelled' WHERE id = ?", orderId);
        await run('INSERT INTO order_events (order_id, field, from_value, to_value, actor, note) VALUES (?,?,?,?,?,?)', orderId, 'payment_status', 'pending', 'cancelled', 'system', `order ${to}`);
      }
    }
    if (field === 'fulfillment_status' && (to === 'collected' || to === 'delivered')) {
      await run("UPDATE orders SET order_status = 'completed' WHERE id = ?", orderId);
      await run('INSERT INTO order_events (order_id, field, from_value, to_value, actor, note) VALUES (?,?,?,?,?,?)', orderId, 'order_status', 'accepted', 'completed', 'system', `fulfillment ${to}`);
    }
    const updated = await one('SELECT * FROM orders WHERE id = ?', orderId);
    await enqueue('order.status', updated, `order:${orderId}:${field}:${to}`);
    publish({ type: 'order.updated', orderId, ref: order.ref, field, to });
    return { order: updated, changed: true };
  });
}

/** Payment confirmed by the provider (server-verified). Moves the order into the kitchen queue. */
export async function markPaid(orderId, actor, note = '') {
  return tx(async () => {
    const order = await one('SELECT * FROM orders WHERE id = ?', orderId);
    if (!order) throw new OrderError('ORDER_NOT_FOUND', 404);
    if (order.payment_status === 'paid' || order.payment_status === 'refunded') return { order, changed: false };
    if (TERMINAL_ORDER.has(order.order_status)) {
      // Paid after the order was cancelled/expired: record it so staff can refund.
      await run("UPDATE orders SET payment_status = 'paid', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", orderId);
      await run('INSERT INTO order_events (order_id, field, from_value, to_value, actor, note) VALUES (?,?,?,?,?,?)', orderId, 'payment_status', order.payment_status, 'paid', actor, 'paid after order closed — refund required');
      await enqueue('order.paid_after_close', order, `order:${orderId}:paid_after_close`);
      publish({ type: 'order.updated', orderId, ref: order.ref, field: 'payment_status', to: 'paid' });
      return { order: await one('SELECT * FROM orders WHERE id = ?', orderId), changed: true, needsRefund: true };
    }
    await transition(orderId, 'payment_status', 'paid', { actor, note });
    if (order.order_status === 'awaiting_payment') {
      const auto = (await getSetting('ordering')).accept_mode === 'auto';
      await transition(orderId, 'order_status', auto ? 'accepted' : 'awaiting_acceptance', { actor: 'system', note: 'payment confirmed' });
      await run('UPDATE orders SET expires_at = NULL WHERE id = ?', orderId);
      const fresh = await one('SELECT * FROM orders WHERE id = ?', orderId);
      await enqueue('order.created', fresh, `order:${orderId}:created`);
      publish({ type: 'order.created', orderId, ref: order.ref, visible: true });
    }
    return { order: await one('SELECT * FROM orders WHERE id = ?', orderId), changed: true };
  });
}

export async function markPaymentFailed(orderId, actor, status = 'failed', note = '') {
  return tx(async () => {
    const order = await one('SELECT * FROM orders WHERE id = ?', orderId);
    if (!order) throw new OrderError('ORDER_NOT_FOUND', 404);
    if (order.payment_status === 'paid' || order.payment_status === status) return { order, changed: false };
    if (canTransition('payment_status', order.payment_status, status)) await transition(orderId, 'payment_status', status, { actor, note });
    return { order: await one('SELECT * FROM orders WHERE id = ?', orderId), changed: true };
  });
}

/** Unpaid online orders past their expiry are failed and their holds released. */
export async function expireUnpaid(nowMs = Date.now()) {
  const due = await all("SELECT id FROM orders WHERE order_status = 'awaiting_payment' AND expires_at IS NOT NULL AND expires_at < ?", new Date(nowMs).toISOString());
  for (const o of due) {
    try { await transition(o.id, 'order_status', 'failed', { actor: 'system', note: 'payment window expired' }); } catch { /* concurrent change */ }
  }
  return due.length;
}

export async function recordWhatsappOpened(orderId) {
  await run("UPDATE orders SET whatsapp_handoff = 'opened' WHERE id = ? AND whatsapp_handoff = 'offered'", orderId);
}

/** Customer-safe status view. */
export async function publicOrder(order, lang) {
  const [items, branch] = await Promise.all([orderItems(order.id), one('SELECT * FROM branches WHERE id = ?', order.branch_id)]);
  const ar = lang === 'ar';
  return {
    ref: order.ref, orderStatus: order.order_status, fulfillmentStatus: order.fulfillment_status, paymentStatus: order.payment_status,
    fulfillmentType: order.fulfillment_type, scheduledFor: order.scheduled_for, promisedAt: order.promised_at, createdAt: order.created_at,
    paymentMethod: order.payment_method, currency: order.currency, whatsapp: order.whatsapp_handoff, rejectReason: order.reject_reason,
    totals: { subtotal: order.subtotal_minor, discount: order.discount_minor, deliveryFee: order.delivery_fee_minor, serviceFee: order.service_fee_minor, tax: order.tax_minor, taxMode: order.tax_mode, total: order.total_minor },
    coupon: order.coupon_code,
    customerName: order.customer_name.split(' ')[0],
    branch: branch ? { name: ar ? branch.name_ar : branch.name_en, address: ar ? branch.address_ar : branch.address_en, mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`, phone: branch.phone, note: ar ? branch.pickup_note_ar : branch.pickup_note_en } : null,
    items: items.map((i) => ({ name: ar ? i.name_ar : i.name_en, qty: i.qty, unit: i.unit_price_minor, lineTotal: i.line_total_minor, options: i.options.map((o) => (ar ? o.name_ar : o.name_en)), note: i.note })),
    updatedAt: order.updated_at,
  };
}
