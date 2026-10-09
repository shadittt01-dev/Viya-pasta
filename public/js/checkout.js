// Checkout: fulfilment, time slot, details, payment, live server quote, and
// idempotent order submission that survives double-clicks and dropped connections.
import { boot, lang, t, money, cart, fetchQuote, errorText, track, catalog } from './store.js';
import { formatLocalDay, formatLocalTime } from '/shared/hours.js';
import { normalizeCart } from '/shared/cart.js';
import { play } from '/shared/motion/runtime.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const data = boot.checkout;
const root = $('#checkout');
const form = $('#checkout-form');
const placeBtn = $('#place-order');
const errorBox = $('#checkout-error');
const M = boot.theme?.motion || {};
const REMEMBER_KEY = 'hb.details';

const state = {
  fulfillment: data.fulfillment[0] || 'pickup', when: 'asap', slot: null, payment: null, coupon: null, location: null,
  quote: null, submitting: false, key: null,
};

const names = new Map();
catalog().then((cats) => { for (const c of cats) for (const i of c.items) names.set(i.id, i.name); });
const nameOf = (id) => names.get(id) || '';

function showError(msg, { retry = false } = {}) {
  errorBox.hidden = !msg;
  errorBox.innerHTML = msg ? `<p>${esc(msg)}</p>${retry ? `<button type="button" class="btn btn--line" id="retry">${esc(t('checkout.retry'))}</button>` : ''}` : '';
  if (msg) errorBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
  if (retry) $('#retry').addEventListener('click', () => submit());
}


function init() {
  track('checkout_start');
  // fulfilment
  for (const r of $$('input[name=fulfillment]')) r.addEventListener('change', () => { state.fulfillment = r.value; renderWhen(); renderPayments(); toggleAddress(); requote(); });
  toggleAddress();
  renderWhen();
  renderPayments();
  // remembered details (opt-in, this device only)
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
    if (saved) { form.name.value = saved.name || ''; form.phone.value = saved.phone || ''; }
  } catch { /* ignore */ }
  try { $('#remember').checked = Boolean(localStorage.getItem(REMEMBER_KEY)); } catch { /* storage unavailable */ }

  for (const f of ['name', 'phone']) form[f].addEventListener('blur', () => validateField(f));
  $('#coupon-apply')?.addEventListener('click', () => { state.coupon = $('#coupon').value.trim() || null; track('coupon_apply'); requote(); });
  $('#coupon')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#coupon-apply').click(); } });
  $('#use-location')?.addEventListener('click', locate);
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) requote(); });
  requote();
}

function toggleAddress() {
  $('#fs-address').hidden = state.fulfillment !== 'delivery';
}

function slotLabel(ms) { return `${formatLocalDay(ms, boot.tz, lang)} ${formatLocalTime(ms, boot.tz, lang)}`; }

function renderWhen() {
  const s = data.slots[state.fulfillment];
  const box = $('#when-options');
  if (!s) { box.innerHTML = ''; return; }
  if (!s.asap && !s.slots.length) {
    box.innerHTML = `<p class="notice notice--warn">${esc(t('checkout.noSlots', { when: s.opensAt ? slotLabel(s.opensAt) : '' }))}</p>`;
    state.when = null;
    return;
  }
  if (!s.asap) state.when = 'later';
  const groups = new Map();
  for (const ms of s.slots) { const day = formatLocalDay(ms, boot.tz, lang); if (!groups.has(day)) groups.set(day, []); groups.get(day).push(ms); }
  box.innerHTML = `${s.asap ? `<label class="opt"><input type="radio" name="when" value="asap" ${state.when === 'asap' ? 'checked' : ''}><span class="opt__name">${esc(t('checkout.asap'))}</span><span class="opt__price">${esc(t('checkout.asapReady', { min: s.asapMinutes }))}</span></label>` : `<p class="notice notice--warn">${esc(t('checkout.closedNow'))}</p>`}
    ${s.slots.length ? `<label class="opt"><input type="radio" name="when" value="later" ${state.when === 'later' ? 'checked' : ''}><span class="opt__name">${esc(t('checkout.later'))}</span></label>
    <label class="field"><span class="sr-only">${esc(t('checkout.later'))}</span><select name="slot" ${state.when === 'later' ? '' : 'disabled'}>
      ${[...groups].map(([day, list]) => `<optgroup label="${esc(day)}">${list.map((ms) => `<option value="${ms}" ${state.slot === ms ? 'selected' : ''}>${esc(formatLocalTime(ms, boot.tz, lang))}</option>`).join('')}</optgroup>`).join('')}
    </select></label>` : ''}`;
  const sel = $('select[name=slot]', box);
  if (sel && !state.slot) state.slot = Number(sel.value);
  for (const r of $$('input[name=when]', box)) r.addEventListener('change', () => { state.when = r.value; if (sel) sel.disabled = r.value !== 'later'; });
  sel?.addEventListener('change', () => { state.slot = Number(sel.value); });
}

function renderPayments() {
  const methods = data.payments[state.fulfillment] || [];
  const box = $('#pay-options');
  if (!methods.includes(state.payment)) state.payment = methods[0] || null;
  const pd = data.paymentDetails;
  const detail = (m) => {
    if (m === 'pay_at_pickup') {
      const parts = [];
      if (pd.pickup.cash) parts.push(lang === 'ar' ? 'نقدًا' : 'cash');
      if (pd.pickup.card_terminal) parts.push(lang === 'ar' ? 'بطاقة/مدى على جهاز المطعم' : 'card/mada on the restaurant’s terminal');
      return `${t('checkout.payAtPickupHint')}${parts.length ? ` (${parts.join(lang === 'ar' ? ' أو ' : ' or ')})` : ''}`;
    }
    if (m === 'pay_on_delivery') return t('checkout.payAtPickupHint');
    return `${t('checkout.payOnlineHint')} ${lang === 'ar' ? pd.online.label_ar : pd.online.label_en}`;
  };
  const label = { pay_at_pickup: 'checkout.payAtPickup', pay_on_delivery: 'checkout.payOnDelivery', online: 'checkout.payOnline' };
  box.innerHTML = methods.length ? methods.map((m) => `<label class="opt"><input type="radio" name="payment" value="${m}" ${state.payment === m ? 'checked' : ''}>
    <span class="opt__name"><strong>${esc(t(label[m]))}</strong><br><small class="muted">${esc(detail(m))}</small></span></label>`).join('')
    : `<p class="notice notice--warn">${esc(t('err.PAYMENT_METHOD_INVALID'))}</p>`;
  for (const r of $$('input[name=payment]', box)) r.addEventListener('change', () => { state.payment = r.value; renderSummary(); });
}

function locate() {
  const status = $('#location-status');
  if (!navigator.geolocation) { status.textContent = t('err.LOCATION_REQUIRED'); return; }
  status.textContent = '…';
  navigator.geolocation.getCurrentPosition((pos) => {
    state.location = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) };
    status.textContent = t('checkout.locationSet');
    requote();
  }, () => { status.textContent = t('err.LOCATION_REQUIRED'); }, { enableHighAccuracy: true, timeout: 10000 });
}

let quoteTimer = null;
function requote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(async () => {
    try {
      const q = await fetchQuote({ fulfillment: state.fulfillment, couponCode: state.coupon, location: state.fulfillment === 'delivery' ? state.location : null });
      if (!q) return;
      state.quote = q;
      renderSummary();
    } catch {
      showError(t('checkout.connection'));
    }
  }, 120);
}

function renderSummary() {
  const q = state.quote;
  if (!q) return;
  root.dataset.state = 'ready';
  $('#summary-lines').innerHTML = q.lines.map((l) => `<div class="sline"><span class="sline__qty">${l.qty}×</span><span>${esc(l.name)}</span><span class="price">${esc(money(l.lineTotal))}</span>
    ${l.options.length || l.note ? `<p class="sline__opts">${esc(l.options.map((o) => o.name).join('، '))}${l.note ? ` — “${esc(l.note)}”` : ''}</p>` : ''}</div>`).join('');
  const tt = q.totals;
  const rate = `${tt.taxRateBp / 100}%`;
  $('#summary-totals').innerHTML = `<dt>${esc(t('cart.subtotal'))}</dt><dd>${esc(money(tt.subtotal))}</dd>
    ${tt.discount ? `<dt>${esc(t('checkout.discount'))}${q.coupon?.code ? ` (${esc(q.coupon.code)})` : ''}</dt><dd>−${esc(money(tt.discount))}</dd>` : ''}
    ${q.fulfillment.type === 'delivery' ? `<dt>${esc(t('checkout.deliveryFee'))}</dt><dd>${esc(money(tt.deliveryFee))}</dd>` : ''}
    ${tt.serviceFee ? `<dt>${esc(t('checkout.serviceFee'))}</dt><dd>${esc(money(tt.serviceFee))}</dd>` : ''}
    ${tt.taxMode === 'exclusive' ? `<dt>${esc(t('checkout.vat', { rate }))}</dt><dd>${esc(money(tt.tax))}</dd>` : ''}
    <dt class="grand">${esc(t('checkout.total'))}</dt><dd class="grand" id="grand-total">${esc(money(tt.total))}</dd>
    ${tt.taxMode === 'inclusive' ? `<dt></dt><dd class="hint">${esc(t('checkout.vatIncluded', { rate }))}: ${esc(money(tt.tax))}</dd>` : ''}`;
  // coupon feedback
  const cm = $('#coupon-msg');
  if (cm) {
    if (q.coupon && !q.coupon.ok) cm.innerHTML = `<span style="color:var(--danger)">${esc(errorText({ code: q.coupon.error }))}</span>`;
    else if (q.coupon?.ok) cm.innerHTML = `${esc(q.coupon.pendingFreeDelivery ? (lang === 'ar' ? 'يُطبق على التوصيل فقط.' : 'Applies to delivery orders only.') : q.coupon.terms || '')} <button type="button" class="link" id="coupon-remove">${esc(t('checkout.removeCoupon'))}</button>`;
    else cm.textContent = '';
    $('#coupon-remove')?.addEventListener('click', () => { state.coupon = null; $('#coupon').value = ''; requote(); });
  }
  const blocking = q.errors;
  if (blocking.length) showError(blocking.map((e) => errorText(e, nameOf)).join(' '));
  else if (!state.submitting) showError('');
  const label = t('checkout.place', { price: money(tt.total) });
  if (placeBtn.textContent !== label && M.priceTick) play('priceTick', M.priceTick.b, M.priceTick.p, { el: placeBtn, text: label });
  else placeBtn.textContent = label;
  placeBtn.disabled = !q.ok || !state.payment || state.when === null || state.submitting;
}

// ------------------------------------------------------------------ validation (mirrors the server; the server decides)
function validateField(f) {
  const input = form[f];
  const err = $(`#err-${f}`);
  let msg = '';
  if (f === 'name') { const v = input.value.trim(); if (v.length < 2 || v.length > 60) msg = t('err.NAME_INVALID'); }
  if (f === 'phone') {
    const v = input.value.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[\s\-()]/g, '');
    if (!/^(05\d{8}|5\d{8}|\+?9665\d{8}|00\d{8,15}|\+[1-9]\d{7,14})$/.test(v)) msg = t('err.PHONE_INVALID');
  }
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  err.textContent = msg;
  return !msg;
}

// ------------------------------------------------------------------ idempotent submit
function idempotencyKey() {
  const fingerprint = JSON.stringify([cart.get().lines, state.fulfillment, state.when, state.slot, state.payment, state.coupon, form.name.value.trim(), form.phone.value.trim(), form.note.value.trim(), state.location]);
  try {
    const saved = JSON.parse(sessionStorage.getItem('hb.idem') || 'null');
    if (saved && saved.f === fingerprint) return saved.k;
    const k = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9-]/g, '');
    sessionStorage.setItem('hb.idem', JSON.stringify({ f: fingerprint, k }));
    return k;
  } catch {
    if (!state.key || state.keyFor !== fingerprint) { state.key = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`; state.keyFor = fingerprint; }
    return state.key;
  }
}

async function submit() {
  if (state.submitting) return; // double-click guard (the server also deduplicates)
  const okName = validateField('name'), okPhone = validateField('phone');
  if (!okName || !okPhone) { form[!okName ? 'name' : 'phone'].focus(); return; }
  if (state.fulfillment === 'delivery' && (!form.district.value.trim() || !form.street.value.trim())) { showError(t('err.ADDRESS_INVALID')); form.district.focus(); return; }
  if (!state.quote?.ok) return;
  state.submitting = true;
  placeBtn.disabled = true;
  placeBtn.textContent = t('checkout.placing');
  showError('');
  const c = normalizeCart(cart.get());
  const payload = {
    idempotencyKey: idempotencyKey(), lang,
    lines: c.lines.map(({ itemId, optionIds, qty, note }) => ({ itemId, optionIds, qty, note })),
    fulfillment: state.fulfillment, scheduledFor: state.when === 'later' && state.slot ? new Date(state.slot).toISOString() : null,
    customer: { name: form.name.value.trim(), phone: form.phone.value.trim(), note: form.note.value.trim() },
    paymentMethod: state.payment, couponCode: state.coupon, expectedTotal: state.quote.totals.total,
    address: state.fulfillment === 'delivery' ? { district: form.district.value, street: form.street.value, building: form.building.value, unit: form.unit.value, instructions: form.instructions.value, lat: state.location?.lat, lng: state.location?.lng } : null,
  };
  let res, json;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    res = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
    clearTimeout(timer);
    json = await res.json().catch(() => ({}));
  } catch {
    // Unknown outcome: the order may or may not exist. Retrying with the same key is safe.
    state.submitting = false;
    placeBtn.disabled = false;
    placeBtn.textContent = t('checkout.place', { price: money(state.quote.totals.total) });
    showError(t('checkout.connection'), { retry: true });
    return;
  }
  if (res.ok) {
    try {
      if ($('#remember')?.checked) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ name: payload.customer.name, phone: payload.customer.phone }));
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* ignore */ }
    track('order_placed', { fulfillment: state.fulfillment });
    cart.clear();
    try { sessionStorage.removeItem('hb.idem'); } catch { /* ignore */ }
    if (json.next?.type === 'pay' && json.next.url) { location.assign(json.next.url); return; }
    // token travels in the fragment (never sent to servers or logs) as a backup to the cookie
    location.assign(`${json.statusUrl}${json.token ? `#k=${json.token}` : ''}`);
    return;
  }
  state.submitting = false;
  if (json.quote) { state.quote = json.quote; renderSummary(); }
  if (json.error === 'PRICE_CHANGED') showError(t('checkout.priceChanged'));
  else if (json.error === 'CUSTOMER_INVALID' && json.fields) {
    for (const [f, code] of Object.entries(json.fields)) { const err = $(`#err-${f}`); if (err) { err.textContent = t(`err.${code}`); form[f].setAttribute('aria-invalid', 'true'); } }
    showError(t('err.CUSTOMER_INVALID'));
  } else if (json.error === 'SLOT_UNAVAILABLE' || json.error === 'CLOSED_NOW') {
    if (json.slots) data.slots[state.fulfillment].slots = json.slots;
    data.slots[state.fulfillment].asap = false;
    renderWhen();
    showError(t(`err.${json.error}`));
  } else if (json.errors?.length) showError(json.errors.map((e) => errorText(e, nameOf)).join(' '));
  else if (json.coupon) showError(errorText({ code: json.coupon.error }));
  else showError(t(`err.${json.error}`) === `err.${json.error}` ? t('err.generic') : t(`err.${json.error}`));
  renderSummary();
}

// ------------------------------------------------------------------ start (after all declarations)
if (!cart.get().lines.length) {
  root.innerHTML = `<div class="empty"><h1 class="h1">${esc(t('cart.empty'))}</h1><a class="btn btn--primary" href="${boot.urls.menu}">${esc(t('cart.emptyCta'))}</a></div>`;
} else if (!data.orderingEnabled) {
  showError(t('err.ORDERING_PAUSED'));
} else init();
