// Pure cart model shared by the browser (state + persistence) and tests.
// The cart only stores what the customer chose; prices shown in the cart are
// a server quote, and the server re-prices everything at checkout.

export const CART_VERSION = 2;
export const MAX_QTY_PER_LINE = 20;

/** Stable key for an item configuration: same item + same options = same line. */
export function lineKey(itemId, optionIds = [], note = '') {
  const opts = [...new Set(optionIds.map(Number))].sort((a, b) => a - b).join('.');
  return `${Number(itemId)}|${opts}|${String(note || '').trim().toLowerCase()}`;
}

export function emptyCart(branch = null) {
  return { v: CART_VERSION, branch, lines: [], coupon: null, updatedAt: Date.now() };
}

export function normalizeCart(raw, branch = null) {
  if (!raw || raw.v !== CART_VERSION || !Array.isArray(raw.lines)) return emptyCart(branch);
  const lines = [];
  for (const l of raw.lines) {
    const qty = Math.min(MAX_QTY_PER_LINE, Math.max(0, Math.floor(Number(l.qty) || 0)));
    if (!qty || !Number.isInteger(Number(l.itemId))) continue;
    const optionIds = Array.isArray(l.optionIds) ? l.optionIds.map(Number).filter(Number.isInteger) : [];
    const key = lineKey(l.itemId, optionIds, l.note);
    const existing = lines.find((x) => x.key === key);
    if (existing) existing.qty = Math.min(MAX_QTY_PER_LINE, existing.qty + qty);
    else lines.push({ key, itemId: Number(l.itemId), optionIds, note: String(l.note || '').slice(0, 140), qty });
  }
  return { v: CART_VERSION, branch: raw.branch ?? branch, lines, coupon: raw.coupon || null, updatedAt: raw.updatedAt || Date.now() };
}

export function addLine(cart, { itemId, optionIds = [], note = '', qty = 1 }) {
  const key = lineKey(itemId, optionIds, note);
  const lines = cart.lines.map((l) => ({ ...l }));
  const existing = lines.find((l) => l.key === key);
  if (existing) existing.qty = Math.min(MAX_QTY_PER_LINE, existing.qty + qty);
  else lines.push({ key, itemId: Number(itemId), optionIds: [...optionIds].map(Number), note, qty: Math.min(MAX_QTY_PER_LINE, qty) });
  return { ...cart, lines, updatedAt: Date.now() };
}

export function setQty(cart, key, qty) {
  const q = Math.max(0, Math.min(MAX_QTY_PER_LINE, Math.floor(qty)));
  const lines = cart.lines.map((l) => (l.key === key ? { ...l, qty: q } : { ...l })).filter((l) => l.qty > 0);
  return { ...cart, lines, updatedAt: Date.now() };
}

export function removeLine(cart, key) {
  return { ...cart, lines: cart.lines.filter((l) => l.key !== key), updatedAt: Date.now() };
}

/** Replace a line's configuration (edit options). Merges into an identical line if one exists. */
export function editLine(cart, key, { optionIds, note, qty }) {
  const old = cart.lines.find((l) => l.key === key);
  if (!old) return cart;
  const without = removeLine(cart, key);
  return addLine(without, { itemId: old.itemId, optionIds: optionIds ?? old.optionIds, note: note ?? old.note, qty: qty ?? old.qty });
}

export function clearCart(cart) {
  return { ...emptyCart(cart.branch), updatedAt: Date.now() };
}

export function itemCount(cart) {
  return cart.lines.reduce((a, l) => a + l.qty, 0);
}
