// Storefront behaviour: cart drawer, item sheet, toasts, menu search & tabs,
// click-to-load map, countdowns, analytics and the chosen motion presets.
import { boot, lang, t, money, cart, onCart, catalog, itemById, fetchQuote, errorText, track } from './store.js';
import { play } from '/shared/motion/runtime.js';
import { illustration } from '/shared/illustrations.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const M = boot.theme?.motion || {};
// Motion is decoration: never let an animation that stalls (background tab, throttled device) block the UI.
const motion = (family, ctx) => {
  if (!M[family]) return Promise.resolve();
  const cap = Math.min(900, (M[family].p?.duration || 300) + 150);
  return Promise.race([play(family, M[family].b, M[family].p, ctx), new Promise((r) => setTimeout(r, cap))]);
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  minus: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

cart.ensureBranch();

// ------------------------------------------------------------------ badge
const countEl = $('#cart-count');
const cartBtn = $('#cart-open');
function renderBadge(c = cart.get()) {
  const n = c.lines.reduce((a, l) => a + l.qty, 0);
  if (countEl) countEl.textContent = String(n);
  if (cartBtn) {
    cartBtn.dataset.empty = String(n === 0);
    cartBtn.setAttribute('aria-label', `${t('cart.title')}: ${n === 1 ? t('cart.item') : t('cart.items', { n })}`);
  }
}
renderBadge();
onCart(renderBadge);

// ------------------------------------------------------------------ toasts
const toasts = $('#toasts');
export function toast(message, { action = null, error = false, timeout = 3800 } = {}) {
  if (!toasts) return;
  const el = document.createElement('div');
  el.className = `toast${error ? ' toast--error' : ''}`;
  el.innerHTML = `<span>${esc(message)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', () => { action.run(); dismiss(); });
    el.appendChild(b);
  }
  while (toasts.children.length >= 2) toasts.firstElementChild.remove();
  toasts.appendChild(el);
  motion('toast', { el, show: true });
  let timer = setTimeout(dismiss, timeout);
  el.addEventListener('pointerenter', () => clearTimeout(timer));
  el.addEventListener('pointerleave', () => { timer = setTimeout(dismiss, 1800); });
  function dismiss() { clearTimeout(timer); motion('toast', { el, show: false }).then(() => el.remove()); }
}

// ------------------------------------------------------------------ dialogs (native <dialog>: focus trap + Esc)
let returnFocus = null;
function openDialog(d, origin) {
  returnFocus = document.activeElement;
  d.showModal();
  motion('sheet', { el: d, open: true, origin });
}
async function closeDialog(d) {
  if (!d.open) return;
  const back = returnFocus;
  await motion('sheet', { el: d, open: false });
  for (const a of d.getAnimations?.() || []) a.cancel();
  if (d.open) d.close();
  if (back && document.contains(back) && !document.querySelector('dialog[open]')) back.focus();
}
for (const d of $$('dialog')) {
  d.addEventListener('close', () => { if (returnFocus && document.contains(returnFocus)) returnFocus.focus(); });
  d.addEventListener('click', (e) => { if (e.target === d) closeDialog(d); }); // backdrop click
  d.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(d); });
}

// ------------------------------------------------------------------ cart drawer
const drawer = $('#cart');
const body = $('#cart-body');
const foot = $('#cart-foot');
let lastQuote = null;

cartBtn?.addEventListener('click', () => { openDialog(drawer); renderDrawer(); });
drawer?.querySelector('[data-close]')?.addEventListener('click', () => closeDialog(drawer));

async function renderDrawer() {
  if (!drawer?.open) return;
  const c = cart.get();
  if (!c.lines.length) {
    body.innerHTML = `<div class="empty"><p>${esc(t('cart.empty'))}</p><a class="btn btn--primary" href="${boot.urls.menu}">${esc(t('cart.emptyCta'))}</a></div>`;
    foot.innerHTML = '';
    return;
  }
  if (!lastQuote) body.innerHTML = `<p class="muted">${esc(t('cart.updating'))}</p>`;
  let q;
  try { q = await fetchQuote(); } catch { q = null; }
  if (q === null && lastQuote === null) { body.innerHTML = `<p class="notice notice--error">${esc(t('err.generic'))}</p>`; return; }
  if (q) lastQuote = q;
  q = lastQuote;
  const byKey = new Map(q.lines.map((l) => [l.key, l]));
  const errByKey = new Map(q.errors.filter((e) => e.key).map((e) => [e.key, e]));
  const names = new Map();
  for (const cat of await catalog()) for (const i of cat.items) names.set(i.id, i.name);
  const nameOf = (id) => names.get(id) || '';
  body.innerHTML = c.lines.map((l) => {
    const p = byKey.get(l.key);
    const err = errByKey.get(l.key);
    const name = p?.name || nameOf(l.itemId) || '—';
    const opts = p ? p.options.map((o) => o.name).join('، ') : '';
    return `<div class="cline${err ? ' cline--err' : ''}" data-key="${esc(l.key)}">
      <p class="cline__name">${esc(name)}</p><span class="price" data-line-total>${p ? esc(money(p.lineTotal)) : ''}</span>
      ${opts ? `<p class="cline__opts">${esc(opts)}</p>` : ''}${l.note ? `<p class="cline__opts">“${esc(l.note)}”</p>` : ''}
      ${err ? `<p class="cline__err" role="alert">${esc(errorText(err, nameOf))}</p>` : ''}
      <div class="cline__ctrl">
        <div class="stepper" role="group" aria-label="${esc(t('item.qty'))}: ${esc(name)}">
          <button type="button" data-dec aria-label="${esc(t('item.decrease'))}">${ICON.minus}</button><output aria-live="polite">${l.qty}</output>
          <button type="button" data-inc aria-label="${esc(t('item.increase'))}" ${l.qty >= 20 ? 'disabled' : ''}>${ICON.plus}</button></div>
        <button type="button" class="link" data-edit>${esc(t('cart.edit'))}</button>
        <button type="button" class="link link--danger" data-remove aria-label="${esc(t('cart.remove', { name }))}">✕</button>
      </div></div>`;
  }).join('');
  const general = q.errors.filter((e) => !e.key);
  foot.innerHTML = `${general.map((e) => `<p class="notice notice--error">${esc(errorText(e, nameOf))}</p>`).join('')}
    <div class="cart-sub"><span>${esc(t('cart.subtotal'))}</span><span class="price" id="drawer-sub">${esc(money(q.totals.subtotal))}</span></div>
    <a class="btn btn--primary btn--lg btn--block" href="${boot.urls.checkout}" ${q.ok ? '' : 'aria-disabled="true" data-blocked="1"'}>${esc(t('cart.checkout', { price: money(q.totals.total) }))}</a>
    <p><button type="button" class="link link--danger" data-clear>${esc(t('cart.clear'))}</button></p>`;
}

body?.addEventListener('click', async (e) => {
  const line = e.target.closest('.cline');
  if (!line) return;
  const key = line.dataset.key;
  const l = cart.get().lines.find((x) => x.key === key);
  if (!l) return;
  if (e.target.closest('[data-inc]')) cart.setQty(key, l.qty + 1);
  else if (e.target.closest('[data-dec]')) cart.setQty(key, l.qty - 1);
  else if (e.target.closest('[data-remove]')) { cart.remove(key); await renderDrawer(); $('#cart-title')?.focus(); return; }
  else if (e.target.closest('[data-edit]')) { await closeDialog(drawer); openSheet(l.itemId, { editKey: key }); return; }
  else return;
  renderDrawer();
});
foot?.addEventListener('click', (e) => {
  if (e.target.closest('[data-clear]') && confirm(t('cart.clearConfirm'))) { cart.clear(); renderDrawer(); }
  const blocked = e.target.closest('[data-blocked]');
  if (blocked) { e.preventDefault(); toast(t('cart.changed'), { error: true }); }
});
onCart(() => { if (drawer?.open) renderDrawer(); });

// ------------------------------------------------------------------ item sheet
const sheet = $('#item-sheet');
const form = $('#sheet-form');

function optionInput(g, o, checked) {
  const type = g.max === 1 ? 'radio' : 'checkbox';
  return `<label class="opt"><input type="${type}" name="g${g.id}" value="${o.id}" ${checked ? 'checked' : ''} ${o.available ? '' : 'disabled'}>
    <span class="opt__name">${esc(o.name)}${o.available ? '' : ` — ${esc(t('menu.soldOut'))}`}</span>${o.price ? `<span class="opt__price">+${esc(money(o.price))}</span>` : ''}</label>`;
}

async function openSheet(itemId, { editKey = null, origin = null } = {}) {
  const item = await itemById(itemId);
  if (!item || !sheet) return;
  const existing = editKey ? cart.get().lines.find((l) => l.key === editKey) : null;
  const chosen = new Set(existing ? existing.optionIds : item.groups.flatMap((g) => g.options.filter((o) => o.isDefault && o.available).map((o) => o.id)));
  const art = item.image ? `<img src="/uploads/${esc(item.image)}" alt="${esc(item.alt || item.name)}">` : illustration(item.illustration, `${t('menu.illustration')}: ${item.name}`);
  form.innerHTML = `
    <div class="sheet__head"><div class="sheet__art" data-art="${esc(item.illustration)}">${art}</div>
      <button type="button" class="icon-btn sheet__close" data-close aria-label="${esc(t('item.close'))}">${ICON.close}</button></div>
    <div class="sheet__body">
      <h2 class="sheet__title" id="sheet-title">${esc(item.name)}</h2>
      ${item.desc ? `<p class="sheet__desc">${esc(item.desc)}</p>` : ''}
      <p class="mi__meta"><span class="price">${item.groups.some((g) => g.min > 0 && g.options.some((o) => o.price > 0)) ? `${esc(t('menu.from'))} ` : ''}${esc(money(item.price))}</span>${item.kcal ? `<span class="kcal">${esc(t('menu.kcal', { n: item.kcal }))}</span>` : ''}${item.portion ? `<span>${esc(item.portion)}</span>` : ''}</p>
      ${item.groups.map((g) => `<fieldset class="ogroup${g.min > 0 ? ' ogroup--required' : ''}" data-group="${g.id}" data-min="${g.min}" data-max="${g.max}">
        <legend><span>${esc(g.name)}</span><span class="ogroup__rule">${esc(g.min > 0 ? (g.max === 1 ? t('item.chooseOne') : t('item.chooseN', { n: g.min })) : (g.max > 1 ? t('item.chooseUpTo', { n: g.max }) : t('item.optional')))}${g.min > 0 ? ` · ${esc(t('item.required'))}` : ''}</span></legend>
        ${g.options.map((o) => optionInput(g, o, chosen.has(o.id))).join('')}</fieldset>`).join('')}
      <label class="field" style="margin-top:var(--s-5)"><span>${esc(t('item.note'))}</span><input name="note" maxlength="140" placeholder="${esc(t('item.notePlaceholder'))}" value="${esc(existing?.note || '')}"></label>
    </div>
    <div class="sheet__foot">
      <div class="stepper" role="group" aria-label="${esc(t('item.qty'))}"><button type="button" data-dec aria-label="${esc(t('item.decrease'))}">${ICON.minus}</button><output id="sheet-qty" aria-live="polite">${existing?.qty || 1}</output><button type="button" data-inc aria-label="${esc(t('item.increase'))}">${ICON.plus}</button></div>
      <div style="flex:1"><p class="sheet__missing" id="sheet-missing" aria-live="polite"></p>
      <button type="submit" class="btn btn--primary btn--lg btn--block" id="sheet-add" ${item.available ? '' : 'disabled'}></button></div>
    </div>`;
  const qtyEl = $('#sheet-qty', form);
  const addBtn = $('#sheet-add', form);
  const missingEl = $('#sheet-missing', form);
  const state = { qty: existing?.qty || 1 };

  const selected = () => $$('input[type=radio]:checked, input[type=checkbox]:checked', form).map((i) => Number(i.value));
  const missingGroup = () => item.groups.find((g) => {
    const n = $$(`[data-group="${g.id}"] input:checked`, form).length;
    return n < g.min || n > g.max;
  });
  function refresh(showErrors = false) {
    const ids = selected();
    const unit = item.price + item.groups.flatMap((g) => g.options).filter((o) => ids.includes(o.id)).reduce((a, o) => a + o.price, 0);
    const total = unit * state.qty;
    const label = t(existing ? 'item.update' : 'item.addToOrder', { price: money(total) });
    if (addBtn.dataset.label !== label) { addBtn.dataset.label = label; motion('priceTick', { el: addBtn, text: label }); }
    qtyEl.textContent = String(state.qty);
    $('[data-dec]', form).disabled = state.qty <= 1;
    $('[data-inc]', form).disabled = state.qty >= 20;
    const miss = missingGroup();
    for (const fs of $$('.ogroup', form)) fs.classList.toggle('ogroup--error', Boolean(showErrors && miss && Number(fs.dataset.group) === miss.id));
    missingEl.textContent = showErrors && miss ? t('item.missing', { group: miss.name }) : '';
    addBtn.setAttribute('aria-describedby', miss ? 'sheet-missing' : '');
    return { ids, miss };
  }
  // enforce max for checkbox groups
  form.onchange = (e) => {
    const fs = e.target.closest('.ogroup');
    if (fs && e.target.type === 'checkbox') {
      const max = Number(fs.dataset.max);
      const on = $$('input:checked', fs);
      if (on.length > max) e.target.checked = false;
    }
    refresh(false);
  };
  form.onclick = (e) => {
    if (e.target.closest('[data-close]')) { closeDialog(sheet); return; }
    if (e.target.closest('[data-inc]')) { state.qty = Math.min(20, state.qty + 1); refresh(); }
    if (e.target.closest('[data-dec]')) { state.qty = Math.max(1, state.qty - 1); refresh(); }
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const { ids, miss } = refresh(true);
    if (miss) { $(`[data-group="${miss.id}"] input:not(:disabled)`, form)?.focus(); return; }
    const note = $('input[name=note]', form).value.trim();
    if (existing) cart.edit(existing.key, { optionIds: ids, note, qty: state.qty });
    else {
      cart.add({ itemId: item.id, optionIds: ids, note, qty: state.qty });
      track('add_to_cart', { itemId: item.id, qty: state.qty });
    }
    closeDialog(sheet);
    afterAdd(item.name, origin);
  };
  refresh(false);
  openDialog(sheet, origin);
  track('item_view', { itemId: item.id });
  setTimeout(() => $('#sheet-title', form)?.focus?.(), 0);
}

function afterAdd(name, fromEl) {
  motion('cartAdd', { from: fromEl || cartBtn, to: countEl || cartBtn });
  toast(t('item.added', { name }), { action: { label: t('item.viewOrder'), run: () => { openDialog(drawer); renderDrawer(); } } });
}

document.addEventListener('click', async (e) => {
  const add = e.target.closest('[data-add]');
  if (add) {
    e.preventDefault();
    const id = Number(add.dataset.add);
    if (add.dataset.sheet === '1') return openSheet(id, { origin: add });
    const item = await itemById(id);
    if (!item || !item.available) return toast(t('menu.unavailable'), { error: true });
    cart.add({ itemId: id, optionIds: [], qty: 1 });
    track('add_to_cart', { itemId: id, qty: 1 });
    afterAdd(item.name, add);
    return;
  }
  const open = e.target.closest('a[data-open]');
  if (open && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0 && $('#catalog')) {
    e.preventDefault();
    openSheet(Number(open.dataset.open), { origin: open });
    return;
  }
  const a = e.target.closest('a[href]');
  if (a) {
    const href = a.getAttribute('href');
    if (href.startsWith('tel:')) track('contact_call');
    else if (href.includes('wa.me')) track('contact_whatsapp');
    else if (href.includes('google.com/maps/dir')) track('directions');
    else if (a.classList.contains('lang')) track('language_switch');
  }
});

// press feedback on buttons
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn, .add-btn, .cart-btn');
  if (b) motion('press', { el: b });
}, { passive: true });

// ------------------------------------------------------------------ menu search + category tabs
const search = $('#menu-search');
if (search) {
  const items = $$('.mi');
  const empty = $('#menu-empty');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const li of items) { const hit = !q || li.dataset.search.includes(q); li.hidden = !hit; if (hit) shown++; }
    for (const sec of $$('.cat')) sec.hidden = !$$('.mi:not([hidden])', sec).length;
    empty.hidden = shown > 0;
    empty.textContent = shown ? '' : t('menu.noResults', { q: search.value.trim() });
  });
}
const tabs = $$('.cat-tabs a');
if (tabs.length) {
  const list = $('.cat-tabs ul');
  const indicator = document.createElement('span');
  indicator.setAttribute('aria-hidden', 'true');
  Object.assign(indicator.style, { position: 'absolute', bottom: '0', insetInlineStart: '0', height: '3px', background: 'var(--maroon)', borderRadius: '3px', pointerEvents: 'none', left: '0' });
  list.appendChild(indicator);
  for (const a of tabs) a.style.borderBottomColor = 'transparent';
  let prev = null;
  const rectOf = (a) => ({ x: a.offsetLeft, w: a.offsetWidth });
  const setActive = (a) => {
    if (!a || a === prev) return;
    for (const x of tabs) x.removeAttribute('aria-current');
    a.setAttribute('aria-current', 'true');
    motion('tab', { indicator, from: prev ? rectOf(prev) : null, to: rectOf(a) });
    a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    prev = a;
  };
  setActive(tabs[0]);
  const io = new IntersectionObserver((entries) => {
    const vis = entries.filter((en) => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (vis) setActive(tabs.find((a) => a.getAttribute('href') === `#${vis.target.id}`));
  }, { rootMargin: '-35% 0px -55% 0px' });
  for (const sec of $$('.cat')) io.observe(sec);
}

// ------------------------------------------------------------------ hover presets (fine pointers only)
if (matchMedia('(hover: hover) and (pointer: fine)').matches && M.hover) {
  document.documentElement.classList.add('js-hover-ready');
  for (const card of $$('.mi, .bcard')) {
    card.addEventListener('pointerenter', () => motion('hover', { el: card, on: true }));
    card.addEventListener('pointerleave', () => motion('hover', { el: card, on: false }));
  }
}

// ------------------------------------------------------------------ hero reveal (one orchestrated moment)
const heroTitle = $('.hero h1');
if (heroTitle && document.documentElement.classList.contains('first-visit')) motion('reveal', { el: heroTitle });

// ------------------------------------------------------------------ click-to-load map (no Google request until asked)
$('#map-load')?.addEventListener('click', () => {
  const box = $('#map');
  const f = document.createElement('iframe');
  f.src = box.dataset.embed;
  f.title = lang === 'ar' ? 'خريطة موقع المطعم' : 'Map of the restaurant location';
  f.loading = 'lazy';
  f.referrerPolicy = 'no-referrer-when-downgrade';
  box.replaceChildren(f);
});

// ------------------------------------------------------------------ image fallbacks (never a broken image)
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.fallback) return;
  if (img.dataset.fallback === 'next') { img.hidden = true; if (img.nextElementSibling) img.nextElementSibling.hidden = false; return; }
  const holder = img.closest('[data-art]') || img.parentElement;
  const key = holder?.dataset?.art;
  if (key) { holder.innerHTML = illustration(key, img.alt); holder.classList.remove('art--photo'); } else img.hidden = true;
}, true);

// ------------------------------------------------------------------ real-deadline countdowns only
for (const el of $$('[data-deadline]')) {
  const end = Date.parse(el.dataset.deadline);
  if (!Number.isFinite(end)) continue;
  const tick = () => {
    const ms = end - Date.now();
    if (ms <= 0) { el.textContent = ''; return; }
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    el.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    setTimeout(tick, 1000);
  };
  tick();
}

track('page_view');
export { openSheet };
