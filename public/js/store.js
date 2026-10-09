// Shared browser state: boot config, cart persistence, server quotes, strings.
import { normalizeCart, emptyCart, addLine, setQty, removeLine, editLine, clearCart, itemCount } from '/shared/cart.js';
import { formatMoney } from '/shared/money.js';

const bootEl = document.getElementById('boot');
export const boot = bootEl ? JSON.parse(bootEl.textContent) : { lang: 'ar', strings: {}, currency: 'SAR', theme: { motion: {} } };
export const lang = boot.lang;
const KEY = 'hb.cart';

export function t(key, vars = {}) {
  const s = boot.strings[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ''));
}
export const money = (minor) => formatMoney(minor, boot.currency, lang);

let memoryCart = null; // used when localStorage is unavailable (private mode)
function read() {
  try { return normalizeCart(JSON.parse(localStorage.getItem(KEY) || 'null'), boot.branchId); } catch { return memoryCart || emptyCart(boot.branchId); }
}
function write(cart) {
  memoryCart = cart;
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* memory only */ }
  emit();
}

const listeners = new Set();
export function onCart(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { const c = read(); for (const fn of listeners) fn(c); }
window.addEventListener('storage', (e) => { if (e.key === KEY) emit(); });

export const cart = {
  get: read,
  add(line) { write(addLine(read(), line)); },
  setQty(key, qty) { write(setQty(read(), key, qty)); },
  remove(key) { write(removeLine(read(), key)); },
  edit(key, patch) { write(editLine(read(), key, patch)); },
  clear() { write(clearCart(read())); },
  count() { return itemCount(read()); },
  // A different branch invalidates the cart; prices and availability are branch-specific.
  ensureBranch() { const c = read(); if (c.branch !== null && c.branch !== boot.branchId) write(emptyCart(boot.branchId)); },
};

// ---- catalog (inline on menu pages, fetched elsewhere)
let catalogPromise = null;
export function catalog() {
  if (!catalogPromise) {
    const el = document.getElementById('catalog');
    catalogPromise = el ? Promise.resolve(JSON.parse(el.textContent)) : fetch(`/api/menu?lang=${lang}`).then((r) => r.json()).then((j) => j.categories);
  }
  return catalogPromise;
}
export async function itemById(id) {
  const cats = await catalog();
  for (const c of cats) for (const i of c.items) if (i.id === Number(id)) return i;
  return null;
}

// ---- server quote (authoritative prices); latest request wins
let quoteSeq = 0;
export async function fetchQuote(extra = {}) {
  const seq = ++quoteSeq;
  const c = read();
  const r = await fetch('/api/quote', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lang, lines: c.lines.map(({ itemId, optionIds, qty, note }) => ({ itemId, optionIds, qty, note })), ...extra }),
  });
  if (!r.ok) throw new Error(`quote ${r.status}`);
  const q = await r.json();
  return seq === quoteSeq ? q : null;
}

export function errorText(e, nameOf = () => '') {
  const vars = { item: nameOf(e.itemId), n: e.available ?? e.max ?? '', amount: e.minimum ? money(e.minimum) : e.minSubtotal ? money(e.minSubtotal) : '' };
  return t(`err.${e.code}`, vars) === `err.${e.code}` ? t('err.generic') : t(`err.${e.code}`, vars);
}

// ---- first-party, cookieless analytics (no personal data)
export function track(name, props = {}) {
  if (!boot.analytics || boot.preview) return;
  const body = JSON.stringify({ name, path: location.pathname, props: { lang, ...props } });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }));
    else fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
  } catch { /* analytics must never break ordering */ }
}
