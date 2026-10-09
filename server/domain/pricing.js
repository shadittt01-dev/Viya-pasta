// Authoritative pricing. The browser sends only item ids, option ids and
// quantities; every amount below is computed here from the database.
import { lineKey, MAX_QTY_PER_LINE } from '../../shared/cart.js';
import { inclusiveTaxPortion, applyRateBp } from '../../shared/money.js';
import { loadCatalog } from './catalog.js';
import { allSettings } from './settings.js';
import { findCoupon, evaluateCoupon } from './coupons.js';
import { matchZone } from './zones.js';

/**
 * input: { branch, lines:[{itemId, optionIds, qty, note}], couponCode, fulfillment:'pickup'|'delivery',
 *          location:{lat,lng}|null, customerKey, nowMs, preview }
 */
export async function quote(input) {
  const { branch, couponCode = null, fulfillment = 'pickup', location = null, customerKey = null, nowMs = Date.now(), preview = false } = input;
  const [settings, catalog] = await Promise.all([input.settings || allSettings(), loadCatalog(branch.id, { nowMs, tz: branch.timezone, preview })]);
  const { business, ordering, tax, fees } = settings;
  const fulfillmentCfg = settings.fulfillment;
  const currency = business.currency;

  const errors = [];
  const priced = [];
  const merged = new Map();
  let count = 0;

  for (const raw of Array.isArray(input.lines) ? input.lines.slice(0, 100) : []) {
    const itemId = Number(raw.itemId);
    const optionIds = Array.isArray(raw.optionIds) ? [...new Set(raw.optionIds.map(Number))].filter(Number.isInteger) : [];
    const qty = Number(raw.qty);
    const note = String(raw.note || '').trim().slice(0, ordering.note_max_chars);
    const key = lineKey(itemId, optionIds, note);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) { errors.push({ key, code: 'QTY_INVALID' }); continue; }
    const item = catalog.itemsById.get(itemId);
    if (!item) { errors.push({ key, code: 'ITEM_NOT_FOUND' }); continue; }
    if (item.sold_out) { errors.push({ key, code: 'SOLD_OUT', itemId }); continue; }
    if (!item.category_open) { errors.push({ key, code: 'CATEGORY_CLOSED', itemId }); continue; }
    if (!item.available) { errors.push({ key, code: 'ITEM_UNAVAILABLE', itemId }); continue; }

    const chosen = [];
    let optError = null;
    const optionToGroup = new Map();
    for (const g of item.groups) for (const o of g.options) optionToGroup.set(o.id, { g, o });
    for (const oid of optionIds) {
      const hit = optionToGroup.get(oid);
      if (!hit) { optError = { code: 'OPTION_INVALID', optionId: oid }; break; }
      if (!hit.o.available) { optError = { code: 'OPTION_UNAVAILABLE', optionId: oid }; break; }
      chosen.push(hit);
    }
    if (!optError) {
      for (const g of item.groups) {
        const n = chosen.filter((c) => c.g.id === g.id).length;
        if (n < g.min_select) { optError = { code: 'OPTION_REQUIRED', groupId: g.id }; break; }
        if (n > g.max_select) { optError = { code: 'OPTION_TOO_MANY', groupId: g.id, max: g.max_select }; break; }
      }
    }
    if (optError) { errors.push({ key, itemId, ...optError }); continue; }

    const optionsTotal = chosen.reduce((a, c) => a + c.o.price_minor, 0);
    const unit = item.price_minor + optionsTotal;
    const kcal = item.kcal === null ? null : item.kcal + chosen.reduce((a, c) => a + (c.o.kcal || 0), 0);
    if (merged.has(key)) {
      const m = merged.get(key);
      m.qty = Math.min(MAX_QTY_PER_LINE, m.qty + qty);
      m.lineTotal = m.unit * m.qty;
    } else {
      const line = {
        key, itemId, qty, note, unit, lineTotal: unit * qty, kcal,
        name_en: item.name_en, name_ar: item.name_ar, slug: item.slug, stockQty: item.stock_qty,
        options: chosen.map((c) => ({ id: c.o.id, groupId: c.g.id, name_en: c.o.name_en, name_ar: c.o.name_ar, price_minor: c.o.price_minor })),
      };
      merged.set(key, line);
      priced.push(line);
    }
    count += qty;
  }

  // stock check across merged lines of the same item
  const perItem = new Map();
  for (const l of priced) perItem.set(l.itemId, (perItem.get(l.itemId) || 0) + l.qty);
  for (const [itemId, n] of perItem) {
    const it = catalog.itemsById.get(itemId);
    if (it && it.stock_qty !== null && it.stock_qty !== undefined && n > it.stock_qty) {
      errors.push({ key: null, itemId, code: 'STOCK_LOW', available: it.stock_qty });
    }
  }
  if (count > ordering.max_items_per_order) errors.push({ key: null, code: 'TOO_MANY_ITEMS', max: ordering.max_items_per_order });

  const subtotal = priced.reduce((a, l) => a + l.lineTotal, 0);

  // fulfillment
  let deliveryFee = 0, zone = null, minOrder = 0, freeOver = null;
  if (fulfillment === 'delivery') {
    if (!fulfillmentCfg.delivery.enabled) errors.push({ key: null, code: 'DELIVERY_DISABLED' });
    else if (!location) errors.push({ key: null, code: 'LOCATION_REQUIRED' });
    else {
      zone = await matchZone(branch, Number(location.lat), Number(location.lng));
      if (!zone) errors.push({ key: null, code: 'OUT_OF_ZONE' });
      else {
        deliveryFee = zone.fee_minor;
        minOrder = zone.min_order_minor;
        freeOver = zone.free_over_minor;
        if (freeOver !== null && subtotal >= freeOver) deliveryFee = 0;
      }
    }
  } else if (fulfillment === 'pickup') {
    if (!fulfillmentCfg.pickup.enabled) errors.push({ key: null, code: 'PICKUP_DISABLED' });
  } else errors.push({ key: null, code: 'FULFILLMENT_INVALID' });

  // coupon
  let couponResult = null, discount = 0;
  if (couponCode) {
    const c = await findCoupon(couponCode);
    couponResult = c
      ? await evaluateCoupon(c, { lines: priced, subtotal, branchId: branch.id, nowMs, customerKey, fulfillment })
      : { ok: false, error: 'COUPON_INVALID', discount: 0, lineDiscounts: new Map(), freeDelivery: false };
    if (couponResult.ok) {
      discount = couponResult.discount;
      if (couponResult.freeDelivery) deliveryFee = 0;
    }
  }
  for (const l of priced) l.discount = couponResult?.ok ? couponResult.lineDiscounts.get(l.key) || 0 : 0;

  if (fulfillment === 'delivery' && zone && subtotal - discount < minOrder) {
    errors.push({ key: null, code: 'BELOW_MINIMUM', minimum: minOrder });
  }

  const serviceFee = priced.length ? fees.service_fee_minor || 0 : 0;
  const taxable = subtotal - discount + deliveryFee + serviceFee;
  let taxAmount = 0, total = taxable;
  if (tax.mode === 'inclusive') taxAmount = inclusiveTaxPortion(taxable, tax.rate_bp);
  else if (tax.mode === 'exclusive') { taxAmount = applyRateBp(taxable, tax.rate_bp); total = taxable + taxAmount; }

  return {
    ok: errors.length === 0 && priced.length > 0,
    empty: priced.length === 0,
    currency,
    lines: priced,
    errors,
    itemCount: count,
    coupon: couponResult ? {
      code: couponResult.coupon?.code || String(couponCode).toUpperCase(), ok: couponResult.ok, error: couponResult.error || null,
      id: couponResult.coupon?.id || null, kind: couponResult.coupon?.kind || null, pendingFreeDelivery: Boolean(couponResult.pendingFreeDelivery),
      terms_en: couponResult.coupon?.terms_en || '', terms_ar: couponResult.coupon?.terms_ar || '',
    } : null,
    fulfillment: { type: fulfillment, zoneId: zone?.id || null, zoneName_en: zone?.name_en, zoneName_ar: zone?.name_ar, etaMinutes: zone?.eta_minutes || null, minOrder, freeOver },
    totals: { subtotal, discount, deliveryFee, serviceFee, tax: taxAmount, taxMode: tax.mode, taxRateBp: tax.rate_bp, total },
  };
}

/** Browser-safe view of a quote. */
export function publicQuote(q, lang) {
  const ar = lang === 'ar';
  return {
    ok: q.ok, empty: q.empty, currency: q.currency, itemCount: q.itemCount, errors: q.errors,
    lines: q.lines.map((l) => ({
      key: l.key, itemId: l.itemId, slug: l.slug, qty: l.qty, note: l.note, unit: l.unit, lineTotal: l.lineTotal, discount: l.discount, kcal: l.kcal,
      name: ar ? l.name_ar : l.name_en, options: l.options.map((o) => ({ id: o.id, name: ar ? o.name_ar : o.name_en, price: o.price_minor })),
    })),
    coupon: q.coupon ? { code: q.coupon.code, ok: q.coupon.ok, error: q.coupon.error, pendingFreeDelivery: q.coupon.pendingFreeDelivery, terms: ar ? q.coupon.terms_ar : q.coupon.terms_en } : null,
    fulfillment: { type: q.fulfillment.type, zone: ar ? q.fulfillment.zoneName_ar : q.fulfillment.zoneName_en, etaMinutes: q.fulfillment.etaMinutes, minOrder: q.fulfillment.minOrder, freeOver: q.fulfillment.freeOver },
    totals: q.totals,
  };
}
