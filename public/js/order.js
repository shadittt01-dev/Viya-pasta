// Order status page. Access needs the order's secret token (HttpOnly cookie set
// at checkout, or the #k= fragment from the confirmation link). Polls while the
// order is active and pauses in background tabs.
import { boot, lang, t, money } from './store.js';
import { formatLocalTime, formatLocalDay } from '/shared/hours.js';
import { play } from '/shared/motion/runtime.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = $('#order');
const ref = root.dataset.ref;
const M = boot.theme?.motion || {};
let token = null;
const m = /#k=([A-Za-z0-9_-]{16,80})/.exec(location.hash);
if (m) { token = m[1]; history.replaceState(null, '', location.pathname); }

const TERMINAL = new Set(['completed', 'rejected', 'cancelled', 'failed']);
let timer = null, lastState = '';

async function load() {
  let r;
  try {
    r = await fetch(`/api/orders/${encodeURIComponent(ref)}/status`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, lang }) });
  } catch { schedule(15000); return; }
  if (r.status === 404) { $('#order-loading').hidden = true; $('#order-missing').hidden = false; return; }
  if (!r.ok) { schedule(15000); return; }
  const o = await r.json();
  render(o);
  if (!TERMINAL.has(o.orderStatus) || o.paymentStatus === 'pending') schedule(o.paymentStatus === 'pending' ? 4000 : 8000);
}

function schedule(ms) { clearTimeout(timer); if (!document.hidden) timer = setTimeout(load, ms); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); else clearTimeout(timer); });

function steps(o) {
  const pickup = o.fulfillmentType === 'pickup';
  const list = [
    ['sent', lang === 'ar' ? 'أُرسل' : 'Sent'], ['accepted', t('order.accepted')], ['preparing', t('ful.preparing')],
    pickup ? ['ready', t('ful.ready')] : ['dispatched', t('ful.dispatched')], pickup ? ['collected', t('ful.collected')] : ['delivered', t('ful.delivered')],
  ];
  let idx = 0;
  if (o.orderStatus === 'accepted' || o.orderStatus === 'completed') idx = 1;
  const fIdx = { preparing: 2, ready: 3, dispatched: 3, delivery_failed: 3, collected: 4, delivered: 4 }[o.fulfillmentStatus];
  if (fIdx) idx = fIdx;
  return { list, idx };
}

function render(o) {
  $('#order-loading').hidden = true;
  const view = $('#order-view');
  view.hidden = false;
  const tz = boot.tz;
  const when = (iso) => `${formatLocalDay(Date.parse(iso), tz, lang)} ${formatLocalTime(Date.parse(iso), tz, lang)}`;
  const { list, idx } = steps(o);
  const terminalBad = ['rejected', 'cancelled', 'failed'].includes(o.orderStatus);
  const stateText = o.fulfillmentStatus !== 'not_started' && o.orderStatus === 'accepted' ? t(`ful.${o.fulfillmentStatus}`) : t(`order.${o.orderStatus}`);
  const payText = o.paymentMethod === 'online' ? t(`pay.${o.paymentStatus}`) : o.paymentStatus === 'paid' ? t('pay.paid') : t('pay.unpaid');
  const tt = o.totals;
  const key = `${o.orderStatus}|${o.fulfillmentStatus}|${o.paymentStatus}`;
  view.innerHTML = `
  <div class="order__ticket">
    <p class="muted">${esc(t('order.number'))}</p>
    <p class="order__ref" dir="ltr">${esc(o.ref)}</p>
    <p>${esc(t('order.showAtCounter'))}</p>
    <p class="order__state" role="status">${esc(stateText)}</p>
    ${o.rejectReason ? `<p class="muted">${esc(t('order.reason', { reason: o.rejectReason }))}</p>` : ''}
    ${!terminalBad ? `<ol class="track" aria-label="${lang === 'ar' ? 'مراحل الطلب' : 'Order progress'}">${list.map(([k, label], i) => `<li class="${i < idx ? 'is-done' : i === idx ? 'is-current' : ''}" ${i === idx ? 'aria-current="step"' : ''}>${esc(label)}</li>`).join('')}</ol>` : ''}
    ${o.promisedAt && o.orderStatus === 'accepted' ? `<p>${esc(t('order.estimate', { time: formatLocalTime(Date.parse(o.promisedAt), tz, lang) }))}</p>` : ''}
    ${o.scheduledFor ? `<p>${esc(t('order.scheduled', { when: when(o.scheduledFor) }))}</p>` : ''}
    <p class="hint">${!TERMINAL.has(o.orderStatus) ? esc(t('order.live')) : ''}</p>
  </div>
  ${payBlock(o)}
  ${o.whatsappLink ? `<section class="block"><h2 class="block__title">${esc(t('home.whatsapp'))}</h2>
    <p>${esc(o.whatsappRequired ? t('order.whatsappRequired') : t('order.whatsappNote'))}</p>
    <a class="btn btn--line" id="wa-send" href="${esc(o.whatsappLink)}" target="_blank" rel="noopener">${esc(t('order.whatsappSend'))}</a></section>` : ''}
  <section class="block">
    <h2 class="block__title">${esc(t('order.items'))}</h2>
    ${o.items.map((i) => `<div class="sline"><span class="sline__qty">${i.qty}×</span><span>${esc(i.name)}</span><span class="price">${esc(money(i.lineTotal))}</span>${i.options.length || i.note ? `<p class="sline__opts">${esc(i.options.join('، '))}${i.note ? ` — “${esc(i.note)}”` : ''}</p>` : ''}</div>`).join('')}
    <dl class="totals">
      <dt>${esc(t('cart.subtotal'))}</dt><dd>${esc(money(tt.subtotal))}</dd>
      ${tt.discount ? `<dt>${esc(t('checkout.discount'))}</dt><dd>−${esc(money(tt.discount))}</dd>` : ''}
      ${o.fulfillmentType === 'delivery' ? `<dt>${esc(t('checkout.deliveryFee'))}</dt><dd>${esc(money(tt.deliveryFee))}</dd>` : ''}
      ${tt.serviceFee ? `<dt>${esc(t('checkout.serviceFee'))}</dt><dd>${esc(money(tt.serviceFee))}</dd>` : ''}
      ${tt.taxMode === 'exclusive' ? `<dt>VAT</dt><dd>${esc(money(tt.tax))}</dd>` : ''}
      <dt class="grand">${esc(t('checkout.total'))}</dt><dd class="grand">${esc(money(tt.total))}</dd>
    </dl>
    <dl class="kv"><dt>${esc(t('checkout.payment'))}</dt><dd>${esc(payText)}</dd>
      ${o.branch && o.fulfillmentType === 'pickup' ? `<dt>${esc(t('order.pickupAt'))}</dt><dd>${esc(o.branch.address)}${o.branch.note ? `<br><span class="muted">${esc(o.branch.note)}</span>` : ''}<br><a href="${esc(o.branch.mapsUrl)}" target="_blank" rel="noopener">${esc(t('home.directions'))}</a> · <a href="tel:${esc(o.branch.phone)}" dir="ltr">${esc(o.branch.phone)}</a></dd>` : ''}</dl>
  </section>
  <p><a class="btn btn--primary" href="${boot.urls.menu}">${esc(t('order.newOrder'))}</a></p>`;
  document.title = `${t('order.title', { ref: o.ref })}`;
  $('#pay-now')?.addEventListener('click', payNow);
  $('#wa-send')?.addEventListener('click', () => fetch(`/api/orders/${encodeURIComponent(ref)}/whatsapp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) }).catch(() => {}));
  if (lastState && lastState !== key && M.status) {
    const cur = view.querySelector('.track .is-current');
    if (cur) play('status', M.status.b, M.status.p, { el: cur });
  }
  lastState = key;
}

function payBlock(o) {
  if (o.paymentMethod !== 'online' || o.orderStatus !== 'awaiting_payment') return '';
  if (o.paymentStatus === 'pending') return `<section class="block"><p role="status">${esc(t('order.confirmingPayment'))}</p><button type="button" class="btn btn--primary" id="pay-now">${esc(t('order.payNow'))}</button></section>`;
  if (o.paymentStatus === 'failed') return `<section class="block"><p class="notice notice--error">${esc(t('pay.failed'))}</p><button type="button" class="btn btn--primary" id="pay-now">${esc(t('order.payRetry'))}</button></section>`;
  return '';
}

async function payNow(e) {
  e.currentTarget.disabled = true;
  try {
    const r = await fetch(`/api/orders/${encodeURIComponent(ref)}/pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
    const j = await r.json();
    if (r.ok && j.url) location.assign(j.url);
    else { e.currentTarget.disabled = false; alert(t(`err.${j.error}`)); }
  } catch { e.currentTarget.disabled = false; }
}

load();
