// Coupon validation and discount allocation. Redemption limits are enforced
// again inside the order transaction, so concurrent checkouts cannot exceed them.
import { one, parseJson } from '../db/db.js';
import { applyRateBp } from '../../shared/money.js';

export async function findCoupon(code) {
  if (!code) return null;
  const c = await one('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE', String(code).trim().slice(0, 40));
  if (!c) return null;
  return { ...c, eligible_item_ids: parseJson(c.eligible_item_ids, null), branch_ids: parseJson(c.branch_ids, null) };
}

export async function redemptionCounts(couponId, customerKey) {
  const total = (await one('SELECT count(*) n FROM coupon_redemptions WHERE coupon_id = ? AND released = 0', couponId)).n;
  const mine = customerKey ? (await one('SELECT count(*) n FROM coupon_redemptions WHERE coupon_id = ? AND customer_key = ? AND released = 0', couponId, customerKey)).n : 0;
  return { total, mine };
}

/**
 * Evaluate a coupon against priced lines.
 * lines: [{ key, itemId, lineTotal }]
 * Returns { ok, error?, coupon, discount, lineDiscounts: Map(key→minor), freeDelivery }
 */
export async function evaluateCoupon(coupon, { lines, subtotal, branchId, nowMs = Date.now(), customerKey = null, fulfillment = 'pickup' }) {
  const fail = (error, extra = {}) => ({ ok: false, error, coupon, discount: 0, lineDiscounts: new Map(), freeDelivery: false, ...extra });
  if (!coupon || !coupon.active) return fail('COUPON_INVALID');
  if (coupon.starts_at && nowMs < Date.parse(coupon.starts_at)) return fail('COUPON_NOT_STARTED');
  if (coupon.ends_at && nowMs >= Date.parse(coupon.ends_at)) return fail('COUPON_EXPIRED');
  if (coupon.branch_ids && !coupon.branch_ids.includes(branchId)) return fail('COUPON_BRANCH');
  if (subtotal < coupon.min_subtotal_minor) return fail('COUPON_MIN_SUBTOTAL', { minSubtotal: coupon.min_subtotal_minor });
  const counts = await redemptionCounts(coupon.id, customerKey);
  if (coupon.usage_limit !== null && counts.total >= coupon.usage_limit) return fail('COUPON_USED_UP');
  if (customerKey && coupon.per_customer_limit !== null && counts.mine >= coupon.per_customer_limit) return fail('COUPON_CUSTOMER_LIMIT');

  if (coupon.kind === 'free_delivery') {
    if (fulfillment !== 'delivery') return { ok: true, coupon, discount: 0, lineDiscounts: new Map(), freeDelivery: false, pendingFreeDelivery: true };
    return { ok: true, coupon, discount: 0, lineDiscounts: new Map(), freeDelivery: true };
  }

  const eligible = lines.filter((l) => !coupon.eligible_item_ids || coupon.eligible_item_ids.includes(l.itemId));
  const base = eligible.reduce((a, l) => a + l.lineTotal, 0);
  if (!base) return fail('COUPON_NO_ELIGIBLE_ITEMS');
  let discount = coupon.kind === 'percent' ? applyRateBp(base, coupon.value) : Math.min(coupon.value, base);
  if (coupon.max_discount_minor !== null && coupon.max_discount_minor !== undefined) discount = Math.min(discount, coupon.max_discount_minor);
  discount = Math.max(0, Math.min(discount, base));
  return { ok: true, coupon, discount, lineDiscounts: allocate(discount, eligible), freeDelivery: false };
}

/** Largest-remainder allocation of a discount across lines (sums exactly). */
export function allocate(amount, lines) {
  const total = lines.reduce((a, l) => a + l.lineTotal, 0);
  const out = new Map();
  if (!total || !amount) return out;
  let used = 0;
  const parts = lines.map((l) => {
    const exact = (amount * l.lineTotal) / total;
    const floor = Math.floor(exact);
    used += floor;
    return { key: l.key, floor, rem: exact - floor };
  });
  parts.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < amount - used; i++) parts[i % parts.length].floor += 1;
  for (const p of parts) out.set(p.key, p.floor);
  return out;
}
