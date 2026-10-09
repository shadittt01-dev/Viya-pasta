// Owner dashboard client. Every action goes through /admin/api with the
// session's CSRF token; the server enforces permissions and records an audit trail.
import { formatMoney, parseMajor, toMajorString } from '/shared/money.js';
import { formatLocalTime, formatLocalDay } from '/shared/hours.js';
import { illustration, ILLUSTRATIONS } from '/shared/illustrations.js';

const boot = JSON.parse(document.getElementById('admin-boot').textContent);
const L = boot.lang;
const AR = L === 'ar';
const TZ = 'Asia/Riyadh';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ------------------------------------------------------------------ copy
const D = {
  ar: {
    orders: 'الطلبات', menu: 'المنيو', hours: 'ساعات العمل', ops: 'التشغيل والدفع', campaigns: 'العروض والكوبونات', content: 'المحتوى والبيانات', design: 'التصميم', qr: 'رموز QR', reports: 'التقارير', staff: 'الموظفون', audit: 'سجل التغييرات', setup: 'قائمة الإطلاق',
    viewSite: 'عرض الموقع', logout: 'تسجيل الخروج', lang: 'English', live: 'مباشر', offline: 'غير متصل', sound: 'تنبيه صوتي', notify: 'إشعارات المتصفح',
    colNew: 'جديدة', colKitchen: 'في المطبخ', colReady: 'جاهزة / في الطريق', none: 'لا يوجد', awaitingPay: 'بانتظار الدفع أونلاين', done: 'منتهية', all: 'الكل', search: 'بحث برقم الطلب أو الجوال',
    accept: 'قبول', reject: 'رفض', cancel: 'إلغاء', preparing: 'بدء التجهيز', ready: 'جاهز', collected: 'تم الاستلام', dispatched: 'خرج للتوصيل', delivered: 'تم التوصيل', deliveryFailed: 'تعذر التوصيل',
    paidCash: 'دُفع نقدًا', paidCard: 'دُفع بالبطاقة', refund: 'تسجيل استرداد', print: 'طباعة', prep: 'التجهيز (دقيقة)', reason: 'السبب (يظهر للعميل)', driver: 'اسم المندوب',
    asap: 'بأسرع وقت', scheduled: 'مجدول', pickup: 'استلام', delivery: 'توصيل', note: 'ملاحظة', whatsappOpened: 'فتح العميل واتساب (لا يعني أنه أرسل)', whatsappOffered: 'طُلب من العميل إرسال واتساب',
    save: 'حفظ', saved: 'تم الحفظ', publish: 'نشر', published: 'تم النشر', discard: 'تجاهل المسودات', preview: 'معاينة', edit: 'تعديل', add: 'إضافة', close: 'إغلاق', delete: 'حذف', archive: 'أرشفة', unpublish: 'إلغاء النشر',
    soldOut: 'نفد', stock: 'المخزون', active: 'مفعّل', drafts: 'تغييرات غير منشورة', price: 'السعر', kcal: 'السعرات', nameEn: 'الاسم (إنجليزي)', nameAr: 'الاسم (عربي)', descEn: 'الوصف (إنجليزي)', descAr: 'الوصف (عربي)',
    photo: 'صورة الصنف', rights: 'أؤكد أن لدينا حق استخدام هذه الصورة وأنها تُظهر المنتج الفعلي', upload: 'رفع صورة', removePhoto: 'إزالة الصورة (عرض الرسم)', groups: 'مجموعات الخيارات', min: 'الحد الأدنى', max: 'الحد الأقصى', option: 'خيار', newItem: 'صنف جديد', newCategory: 'قسم جديد', category: 'القسم', window: 'متاح من / إلى (اختياري)', bg: 'خلفية القسم',
    needsReview: 'بحاجة لمراجعة', confirmed: 'مؤكد', unconfirmed: 'غير مؤكد', from: 'من', to: 'إلى', closures: 'إغلاقات مؤقتة', addInterval: 'إضافة فترة', addClosure: 'إضافة إغلاق', overnight: 'يتجاوز منتصف الليل',
    error: 'تعذر الحفظ', forbidden: 'ليست لديك صلاحية لهذا الإجراء.', confirmPublish: 'نشر هذه التغييرات للعملاء الآن؟', revenue: 'الإيرادات', ordersCount: 'الطلبات', aov: 'متوسط الطلب', discounts: 'الخصومات',
  },
  en: {
    orders: 'Orders', menu: 'Menu', hours: 'Hours', ops: 'Operations & payments', campaigns: 'Offers & coupons', content: 'Content & details', design: 'Design', qr: 'QR codes', reports: 'Reports', staff: 'Staff', audit: 'Audit log', setup: 'Launch checklist',
    viewSite: 'View site', logout: 'Sign out', lang: 'العربية', live: 'Live', offline: 'Offline', sound: 'Sound alert', notify: 'Browser notifications',
    colNew: 'New', colKitchen: 'In the kitchen', colReady: 'Ready / out', none: 'Nothing here', awaitingPay: 'Awaiting online payment', done: 'Finished', all: 'All', search: 'Search order number or phone',
    accept: 'Accept', reject: 'Reject', cancel: 'Cancel', preparing: 'Start preparing', ready: 'Mark ready', collected: 'Collected', dispatched: 'Out for delivery', delivered: 'Delivered', deliveryFailed: 'Delivery failed',
    paidCash: 'Paid cash', paidCard: 'Paid card', refund: 'Record refund', print: 'Print', prep: 'Prep (min)', reason: 'Reason (shown to the customer)', driver: 'Driver name',
    asap: 'ASAP', scheduled: 'Scheduled', pickup: 'Pickup', delivery: 'Delivery', note: 'Note', whatsappOpened: 'Customer opened WhatsApp (not proof it was sent)', whatsappOffered: 'Customer asked to send WhatsApp',
    save: 'Save', saved: 'Saved', publish: 'Publish', published: 'Published', discard: 'Discard drafts', preview: 'Preview', edit: 'Edit', add: 'Add', close: 'Close', delete: 'Delete', archive: 'Archive', unpublish: 'Unpublish',
    soldOut: 'Sold out', stock: 'Stock', active: 'Active', drafts: 'unpublished changes', price: 'Price', kcal: 'Calories', nameEn: 'Name (English)', nameAr: 'Name (Arabic)', descEn: 'Description (English)', descAr: 'Description (Arabic)',
    photo: 'Item photo', rights: 'I confirm we have the right to use this photo and it shows the actual product', upload: 'Upload photo', removePhoto: 'Remove photo (show illustration)', groups: 'Option groups', min: 'Min', max: 'Max', option: 'Option', newItem: 'New item', newCategory: 'New category', category: 'Category', window: 'Available from / to (optional)', bg: 'Section background',
    needsReview: 'Needs review', confirmed: 'Confirmed', unconfirmed: 'Unconfirmed', from: 'From', to: 'To', closures: 'Temporary closures', addInterval: 'Add opening', addClosure: 'Add closure', overnight: 'runs past midnight',
    error: 'Could not save', forbidden: 'You do not have permission for this.', confirmPublish: 'Publish these changes to customers now?', revenue: 'Revenue', ordersCount: 'Orders', aov: 'Average order', discounts: 'Discounts',
  },
};
const tr = (k) => D[L][k] ?? D.en[k] ?? k;
const money = (m, cur = 'SAR') => formatMoney(m, cur, L);
const when = (iso) => (iso ? `${formatLocalDay(Date.parse(iso), TZ, L)} ${formatLocalTime(Date.parse(iso), TZ, L)}` : '');
const STATUS = {
  awaiting_payment: ['warn', AR ? 'بانتظار الدفع' : 'Awaiting payment'], awaiting_acceptance: ['new', AR ? 'جديد' : 'New'], accepted: ['info', AR ? 'مقبول' : 'Accepted'],
  completed: ['ok', AR ? 'مكتمل' : 'Completed'], rejected: ['bad', AR ? 'مرفوض' : 'Rejected'], cancelled: ['bad', AR ? 'ملغي' : 'Cancelled'], failed: ['bad', AR ? 'لم يكتمل' : 'Failed'],
  not_started: ['', AR ? 'لم يبدأ' : 'Not started'], preparing: ['warn', AR ? 'قيد التجهيز' : 'Preparing'], ready: ['ok', AR ? 'جاهز' : 'Ready'], collected: ['ok', AR ? 'استُلم' : 'Collected'],
  dispatched: ['info', AR ? 'في الطريق' : 'Out'], delivered: ['ok', AR ? 'وصل' : 'Delivered'], delivery_failed: ['bad', AR ? 'تعذر التوصيل' : 'Delivery failed'],
  unpaid: ['', AR ? 'غير مدفوع' : 'Unpaid'], pending: ['warn', AR ? 'دفع قيد المعالجة' : 'Payment pending'], paid: ['ok', AR ? 'مدفوع' : 'Paid'], refunded: ['info', AR ? 'مسترد' : 'Refunded'],
};
const pill = (s) => { const [k, label] = STATUS[s] || ['', s]; return `<span class="pill ${k ? `pill--${k}` : ''}">${esc(label)}</span>`; };

// ------------------------------------------------------------------ api
let me = null;
async function api(method, path, body, { raw = false, headers = {} } = {}) {
  const init = { method, headers: { ...headers }, credentials: 'same-origin' };
  if (me) init.headers['x-csrf-token'] = me.csrf;
  if (body !== undefined && !raw) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(body); }
  if (raw) init.body = body;
  const r = await fetch(`/admin/api${path}`, init);
  if (r.status === 401) { location.href = '/admin/login'; throw new Error('AUTH'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = r.status === 403 ? tr('forbidden') : `${tr('error')}: ${j.error || r.status}`;
    toast(msg, true);
    const e = new Error(j.error || String(r.status)); e.body = j; throw e;
  }
  return j;
}
const can = (p) => me.permissions.includes(p);

function toast(msg, error = false) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast${error ? ' toast--error' : ''}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), error ? 6000 : 2600);
}

// ------------------------------------------------------------------ shell & router
const ROUTES = [
  ['orders', 'orders.view'], ['menu', 'orders.view'], ['hours', 'orders.view'], ['ops', 'settings.operations'], ['campaigns', 'campaigns.edit'],
  ['content', 'content.edit'], ['design', 'design.edit'], ['qr', 'orders.view'], ['reports', 'reports.view'], ['staff', 'staff.manage'], ['audit', 'audit.view'], ['setup', 'settings.operations'],
];
const app = $('#app');
let newCount = 0;

function shell() {
  app.innerHTML = `<aside class="side"><div class="side__top"><span class="brand brand--sm"><span class="brand__word">VIA PASTA</span><span class="brand__sub">ITALIAN · YANBU</span></span>
    <span class="live" id="live"><i></i>${esc(tr('offline'))}</span></div>
    <nav aria-label="${esc(AR ? 'أقسام لوحة التحكم' : 'Dashboard sections')}"><ul>${ROUTES.filter(([, p]) => can(p)).map(([r]) => `<li><a href="#/${r}" data-route="${r}">${esc(tr(r))}${r === 'orders' ? '<span class="side__badge" id="badge-new" hidden>0</span>' : ''}</a></li>`).join('')}</ul></nav>
    <div class="side__foot"><p>${esc(me.user.name)} — ${esc(me.user.role)}</p><a href="/${L}" target="_blank" rel="noopener">${esc(tr('viewSite'))}</a>
    <button type="button" id="lang-switch">${esc(tr('lang'))}</button><button type="button" id="logout">${esc(tr('logout'))}</button>
    ${me.env !== 'production' ? `<p class="pill pill--warn">${esc(me.env)}</p>` : ''}</div></aside><main class="view" id="view" tabindex="-1"></main>`;
  $('#logout').onclick = async () => { await fetch('/admin/logout', { method: 'POST', headers: { 'x-csrf-token': me.csrf } }).catch(() => {}); location.href = '/admin/login'; };
  $('#lang-switch').onclick = () => { document.cookie = `hb_admin_lang=${AR ? 'en' : 'ar'};path=/admin;max-age=31536000;samesite=strict`; location.reload(); };
}

async function route() {
  if (!me) return; // boot not finished; boot calls route() itself
  const name = (location.hash.replace(/^#\//, '') || 'orders').split('?')[0];
  const r = ROUTES.find(([n]) => n === name) || ROUTES[0];
  if (!can(r[1])) { location.hash = '#/orders'; return; }
  for (const a of $$('.side nav a')) { if (a.dataset.route === r[0]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  if (r[0] !== 'orders') ordersRefresh = null;
  const view = $('#view');
  view.innerHTML = '<p class="muted">…</p>';
  try { await VIEWS[r[0]](view); } catch (e) { if (e.message !== 'AUTH') view.innerHTML = `<p class="notice notice--error">${esc(tr('error'))}: ${esc(e.message)}</p>`; }
  view.focus({ preventScroll: true });
}
window.addEventListener('hashchange', route);

// ------------------------------------------------------------------ live updates
let audioOn = false, audioCtx = null;
function beep() {
  if (!audioOn) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    o.start(); o.stop(audioCtx.currentTime + 0.55);
  } catch { /* audio unavailable */ }
}
// Polls for order changes every few seconds (works on any hosting, including serverless).
function connectLive() {
  if (!can('orders.view')) return;
  const live = $('#live');
  let cursor = null, timer = null;
  const setLive = (on) => { live.className = on ? 'live live--on' : 'live'; live.lastChild.textContent = tr(on ? 'live' : 'offline'); };
  async function poll() {
    try {
      const r = await fetch(`/admin/api/changes${cursor === null ? '' : `?since=${cursor}`}`, { headers: { accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) { setLive(false); return; }
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      const first = cursor === null;
      cursor = d.cursor;
      setLive(true);
      if (!first && d.events.length) {
        const created = d.events.filter((e) => e.type === 'order.created' && e.visible);
        if (created.length) {
          beep();
          if ('Notification' in window && Notification.permission === 'granted') for (const e of created) new Notification(AR ? `طلب جديد ${e.ref}` : `New order ${e.ref}`);
        }
        refreshOrdersIfVisible();
      }
    } catch { setLive(false); }
    timer = setTimeout(poll, document.hidden ? 15000 : 4000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer) { clearTimeout(timer); poll(); } });
  poll();
}
let ordersRefresh = null;
function refreshOrdersIfVisible() { if (ordersRefresh) ordersRefresh(); }
function setBadge(n) {
  newCount = n;
  const b = $('#badge-new');
  if (b) { b.hidden = !n; b.textContent = String(n); }
  document.title = `${n ? `(${n}) ` : ''}${AR ? 'لوحة ڤيا باستا' : 'Via Pasta dashboard'}`;
}

// ------------------------------------------------------------------ views
const VIEWS = {};

VIEWS.orders = async (view) => {
  let tab = 'active', q = '';
  view.innerHTML = `<h1>${esc(tr('orders'))}</h1>
    <div class="bar"><div class="tabs" role="tablist">${[['active', tr('colNew') + ' / ' + tr('colKitchen')], ['awaiting_payment', tr('awaitingPay')], ['done', tr('done')], ['all', tr('all')]].map(([k, l], i) => `<button role="tab" data-tab="${k}" aria-selected="${i === 0}">${esc(l)}</button>`).join('')}</div>
    <span class="spacer"></span><input type="search" id="oq" placeholder="${esc(tr('search'))}" style="min-height:40px;padding:6px 10px;border:1px solid #D5C5B1;border-radius:8px">
    <label class="switch"><input type="checkbox" id="snd" ${audioOn ? 'checked' : ''}>${esc(tr('sound'))}</label>
    ${'Notification' in window ? `<button type="button" class="btn btn--line btn--sm" id="ntf">${esc(tr('notify'))}</button>` : ''}</div>
    <div id="olist"></div>`;
  $('#snd').onchange = (e) => { audioOn = e.target.checked; if (audioOn) beep(); };
  $('#ntf')?.addEventListener('click', () => Notification.requestPermission());
  for (const b of $$('[data-tab]', view)) b.onclick = () => { tab = b.dataset.tab; for (const x of $$('[data-tab]', view)) x.setAttribute('aria-selected', String(x === b)); load(); };
  let qt; $('#oq').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value.trim(); load(); }, 250); };
  async function load() {
    const { orders } = await api('GET', `/orders?view=${tab}&q=${encodeURIComponent(q)}`);
    const list = $('#olist');
    if (!list) return;
    if (tab === 'active' && !q) {
      const fresh = orders.filter((o) => o.orderStatus === 'awaiting_acceptance');
      const kitchen = orders.filter((o) => o.orderStatus === 'accepted' && ['not_started', 'preparing'].includes(o.fulfillmentStatus));
      const ready = orders.filter((o) => o.orderStatus === 'accepted' && ['ready', 'dispatched', 'delivery_failed'].includes(o.fulfillmentStatus));
      setBadge(fresh.length);
      list.innerHTML = `<div class="board">${[[tr('colNew'), fresh], [tr('colKitchen'), kitchen], [tr('colReady'), ready]].map(([title, arr]) => `<section class="col"><h2>${esc(title)} <span class="pill">${arr.length}</span></h2>${arr.length ? arr.map(orderCard).join('') : `<p class="empty-col">${esc(tr('none'))}</p>`}</section>`).join('')}</div>`;
    } else list.innerHTML = orders.length ? orders.map(orderCard).join('') : `<p class="empty-col">${esc(tr('none'))}</p>`;
  }
  view.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.closest('[data-order]').dataset.order;
    const act = b.dataset.act;
    const body = { action: act };
    if (act === 'accept') body.prepMinutes = Number($(`#prep-${id}`)?.value || 15);
    if (act === 'reject' || act === 'cancel' || act === 'delivery_failed' || act === 'mark_refunded') { const r = prompt(tr('reason')); if (r === null) return; body.reason = r; }
    if (act === 'dispatched') { const d = prompt(tr('driver')); if (d === null) return; body.driver = d; }
    if (act === 'paid_cash') { body.action = 'mark_paid'; body.method = 'cash'; }
    if (act === 'paid_card') { body.action = 'mark_paid'; body.method = 'card_terminal'; }
    if (act === 'print') { printTicket(id); return; }
    b.disabled = true;
    try { await api('POST', `/orders/${id}/action`, body); toast(tr('saved')); } catch { /* toast shown */ }
    load();
  };
  ordersRefresh = load;
  await load();
};

function orderCard(o) {
  const terminal = ['completed', 'rejected', 'cancelled', 'failed'].includes(o.orderStatus);
  const acts = [];
  if (o.orderStatus === 'awaiting_acceptance') {
    acts.push(`<label class="switch">${esc(tr('prep'))} <select id="prep-${o.id}">${[5, 10, 15, 20, 30, 45, 60].map((m) => `<option ${m === 15 ? 'selected' : ''}>${m}</option>`).join('')}</select></label>`);
    acts.push(`<button class="btn btn--ok btn--sm" data-act="accept">${esc(tr('accept'))}</button><button class="btn btn--line btn--sm" data-act="reject">${esc(tr('reject'))}</button>`);
  }
  if (o.orderStatus === 'accepted') {
    if (o.fulfillmentStatus === 'not_started') acts.push(`<button class="btn btn--dark btn--sm" data-act="preparing">${esc(tr('preparing'))}</button>`);
    if (o.fulfillmentStatus === 'preparing') acts.push(`<button class="btn btn--ok btn--sm" data-act="ready">${esc(tr('ready'))}</button>`);
    if (o.fulfillmentStatus === 'ready') acts.push(o.fulfillmentType === 'pickup' ? `<button class="btn btn--ok btn--sm" data-act="collected">${esc(tr('collected'))}</button>` : `<button class="btn btn--dark btn--sm" data-act="dispatched">${esc(tr('dispatched'))}</button>`);
    if (o.fulfillmentStatus === 'dispatched') acts.push(`<button class="btn btn--ok btn--sm" data-act="delivered">${esc(tr('delivered'))}</button><button class="btn btn--line btn--sm" data-act="delivery_failed">${esc(tr('deliveryFailed'))}</button>`);
    if (o.fulfillmentStatus === 'delivery_failed') acts.push(`<button class="btn btn--dark btn--sm" data-act="dispatched">${esc(tr('dispatched'))}</button>`);
    acts.push(`<button class="btn btn--line btn--sm" data-act="cancel">${esc(tr('cancel'))}</button>`);
  }
  if (!terminal && o.paymentMethod !== 'online' && o.paymentStatus === 'unpaid') acts.push(`<button class="btn btn--line btn--sm" data-act="paid_cash">${esc(tr('paidCash'))}</button><button class="btn btn--line btn--sm" data-act="paid_card">${esc(tr('paidCard'))}</button>`);
  if (o.paymentStatus === 'paid' && can('orders.refund') && terminal) acts.push(`<button class="btn btn--line btn--sm" data-act="mark_refunded">${esc(tr('refund'))}</button>`);
  acts.push(`<button class="btn btn--line btn--sm" data-act="print">${esc(tr('print'))}</button>`);
  const addr = o.address ? `${o.address.district}، ${o.address.street} ${o.address.building || ''} ${o.address.unit || ''} — ${o.address.instructions || ''}` : '';
  return `<article class="ocard${o.orderStatus === 'awaiting_acceptance' ? ' ocard--new' : ''}" data-order="${o.id}">
    <div class="ocard__top"><span class="ocard__ref" dir="ltr">${esc(o.ref)}</span><span>${esc(money(o.total, o.currency))}</span></div>
    <div class="ocard__meta">${pill(o.orderStatus)}${o.orderStatus === 'accepted' ? pill(o.fulfillmentStatus) : ''}${pill(o.paymentStatus)}
      <span class="pill">${esc(o.fulfillmentType === 'delivery' ? tr('delivery') : tr('pickup'))} · ${esc(o.scheduledFor ? `${tr('scheduled')} ${when(o.scheduledFor)}` : tr('asap'))}</span>
      ${o.coupon ? `<span class="pill">${esc(o.coupon)}</span>` : ''}${o.whatsapp === 'opened' ? `<span class="pill pill--info">${esc(tr('whatsappOpened'))}</span>` : o.whatsapp === 'offered' ? `<span class="pill">${esc(tr('whatsappOffered'))}</span>` : ''}</div>
    <p style="margin:4px 0"><strong>${esc(o.customerName)}</strong> · <a href="tel:${esc(o.customerPhone)}" dir="ltr">${esc(o.customerPhone)}</a> · <span class="muted">${esc(when(o.createdAt))}</span></p>
    ${addr ? `<p style="margin:4px 0">${esc(addr)}</p>` : ''}
    <ul class="ocard__items">${o.items.map((i) => `<li><strong>${i.qty}×</strong> ${esc(AR ? i.name_ar : i.name_en)}${i.options.length ? `<small>${esc(i.options.map((x) => (AR ? x.name_ar : x.name_en)).join('، '))}</small>` : ''}${i.note ? `<small>“${esc(i.note)}”</small>` : ''}</li>`).join('')}</ul>
    ${o.note ? `<p class="card--warn" style="padding:6px 8px;border-radius:6px;margin:4px 0">${esc(tr('note'))}: ${esc(o.note)}</p>` : ''}
    ${o.rejectReason ? `<p class="muted">${esc(o.rejectReason)}</p>` : ''}
    <div class="ocard__acts">${acts.join('')}</div></article>`;
}

async function printTicket(id) {
  const { order: o, items } = await api('GET', `/orders/${id}`);
  const w = window.open('', '_blank', 'width=380,height=600');
  if (!w) return;
  w.document.write(`<!doctype html><html dir="${AR ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(o.ref)}</title><style>body{font:14px monospace;margin:12px}h1{font-size:28px;margin:0}hr{border:0;border-top:1px dashed #000}</style></head><body>
    <h1>${esc(o.ref)}</h1><p>${esc(when(o.createdAt))}<br>${esc(o.fulfillmentType)} · ${esc(o.scheduledFor ? when(o.scheduledFor) : tr('asap'))}<br>${esc(o.customerName)} ${esc(o.customerPhone)}</p><hr>
    ${items.map((i) => `<p><b>${i.qty}× ${esc(AR ? i.name_ar : i.name_en)}</b>${i.options.length ? `<br>&nbsp; ${esc(i.options.map((x) => (AR ? x.name_ar : x.name_en)).join(', '))}` : ''}${i.note ? `<br>&nbsp; "${esc(i.note)}"` : ''}</p>`).join('')}<hr>
    <p>${esc(tr('note'))}: ${esc(o.note || '-')}</p><p><b>${esc(money(o.total, o.currency))}</b> — ${esc(o.paymentStatus)}</p></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

// ------------------------------------------------------------------ menu editor
VIEWS.menu = async (view) => {
  const { categories, drafts } = await api('GET', '/menu?drafts=1');
  const draftKeys = new Set(drafts.map((d) => `${d.entity}:${d.entity_id}`));
  const editable = can('menu.edit');
  view.innerHTML = `<h1>${esc(tr('menu'))}</h1>
    ${drafts.length ? `<div class="card card--warn bar"><strong>${drafts.length} ${esc(tr('drafts'))}</strong><span class="spacer"></span>
      <a class="btn btn--line btn--sm" href="/${L}/menu?preview=1" target="_blank" rel="noopener">${esc(tr('preview'))}</a>
      ${can('menu.publish') ? `<button class="btn btn--primary btn--sm" id="m-pub">${esc(tr('publish'))}</button>` : ''}<button class="btn btn--line btn--sm" id="m-disc">${esc(tr('discard'))}</button></div>` : ''}
    ${editable ? `<div class="bar"><button class="btn btn--line btn--sm" id="m-newitem">${esc(tr('newItem'))}</button><button class="btn btn--line btn--sm" id="m-newcat">${esc(tr('newCategory'))}</button>
      <span class="spacer"></span><a class="btn btn--line btn--sm" href="/admin/api/export/menu.csv">CSV</a></div>` : ''}
    ${categories.map((c) => `<section class="card"><div class="bar"><h2 style="margin:0">${esc(AR ? c.name_ar : c.name_en)}</h2>${c.active ? '' : `<span class="pill">${esc(AR ? 'مخفي' : 'Hidden')}</span>`}
      ${draftKeys.has(`category:${c.id}`) ? `<span class="pill pill--warn">${esc(AR ? 'مسودة' : 'Draft')}</span>` : ''}<span class="spacer"></span>${editable ? `<button class="btn btn--line btn--sm" data-editcat="${c.id}">${esc(tr('edit'))}</button>` : ''}</div>
      ${c.items.map((i) => `<div class="mrow${draftKeys.has(`item:${i.id}`) ? ' mrow--draft' : ''}" data-item="${i.id}">
        <div style="display:flex;gap:10px;align-items:center"><span class="thumb">${i.image_path ? `<img src="/uploads/${esc(i.image_path)}" alt="">` : illustration(i.illustration, '')}</span>
          <div><div class="mrow__name">${esc(AR ? i.name_ar : i.name_en)}</div><div class="muted">${esc(money(i.price_minor))}${i.kcal ? ` · ${i.kcal} kcal` : ''}${i.active ? '' : ` · ${AR ? 'مخفي' : 'hidden'}`}
          ${i.needs_review.length ? ` · <span class="pill pill--warn" title="${esc(i.needs_review.join('; '))}">${esc(tr('needsReview'))}</span>` : ''}</div></div></div>
        <div class="mrow__ctrl"><label class="switch"><input type="checkbox" data-soldout ${i.sold_out && !(i.stock_qty === 0) ? 'checked' : ''}>${esc(tr('soldOut'))}</label>
          <label class="switch">${esc(tr('stock'))} <input type="number" min="0" style="width:72px;min-height:36px" data-stock value="${i.stock_qty ?? ''}" placeholder="∞"></label>
          ${editable ? `<button class="btn btn--line btn--sm" data-edit>${esc(tr('edit'))}</button>` : ''}</div></div>`).join('')}</section>`).join('')}`;
  $('#m-pub')?.addEventListener('click', async () => { if (!confirm(tr('confirmPublish'))) return; await api('POST', '/menu/publish'); toast(tr('published')); VIEWS.menu(view); });
  $('#m-disc')?.addEventListener('click', async () => { await api('POST', '/menu/discard'); VIEWS.menu(view); });
  $('#m-newcat')?.addEventListener('click', async () => {
    const en = prompt(tr('nameEn')); if (!en) return; const ar = prompt(tr('nameAr')); if (!ar) return;
    await api('POST', '/categories', { name_en: en, name_ar: ar }); VIEWS.menu(view);
  });
  $('#m-newitem')?.addEventListener('click', () => itemPanel(null, categories, view));
  view.onchange = async (e) => {
    const row = e.target.closest('[data-item]');
    if (!row) return;
    const id = row.dataset.item;
    if (e.target.matches('[data-soldout]')) await api('PATCH', `/items/${id}/availability`, { sold_out: e.target.checked });
    if (e.target.matches('[data-stock]')) await api('PATCH', `/items/${id}/availability`, { stock_qty: e.target.value === '' ? null : Number(e.target.value) });
    toast(tr('saved'));
  };
  view.onclick = (e) => {
    if (e.target.closest('[data-edit]')) { const id = Number(e.target.closest('[data-item]').dataset.item); const item = categories.flatMap((c) => c.items).find((i) => i.id === id); itemPanel(item, categories, view); }
    const ec = e.target.closest('[data-editcat]');
    if (ec) categoryPanel(categories.find((c) => c.id === Number(ec.dataset.editcat)), view);
  };
};

function panel(html) {
  const scrim = document.createElement('div'); scrim.className = 'panel-scrim';
  const p = document.createElement('div'); p.className = 'panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
  p.innerHTML = html;
  const close = () => { scrim.remove(); p.remove(); };
  scrim.onclick = close;
  p.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.body.append(scrim, p);
  setTimeout(() => p.querySelector('input,select,textarea,button')?.focus(), 30);
  return { el: p, close };
}

function fv(form, name) { return form.elements[name]?.value; }

async function resizeImage(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/webp', 0.85));
}

function itemPanel(item, categories, view) {
  const isNew = !item;
  const i = item || { name_en: '', name_ar: '', desc_en: '', desc_ar: '', price_minor: 0, kcal: null, category_id: categories[0]?.id, illustration: 'pasta-alfredo', groups: [], active: 0 };
  const { el, close } = panel(`<h2>${esc(isNew ? tr('newItem') : (AR ? i.name_ar : i.name_en))}</h2>
    <form class="form" id="itemf">
      <div class="row"><label>${esc(tr('nameEn'))}<input name="name_en" value="${esc(i.name_en)}" required maxlength="80"></label><label>${esc(tr('nameAr'))}<input name="name_ar" value="${esc(i.name_ar)}" required maxlength="80" dir="rtl"></label></div>
      <label>${esc(tr('descEn'))}<textarea name="desc_en" maxlength="400">${esc(i.desc_en)}</textarea></label>
      <label>${esc(tr('descAr'))}<textarea name="desc_ar" maxlength="400" dir="rtl">${esc(i.desc_ar)}</textarea></label>
      <div class="row"><label>${esc(tr('price'))} (SAR)<input name="price" inputmode="decimal" value="${esc(toMajorString(i.price_minor, 'SAR'))}" required></label>
        <label>${esc(tr('kcal'))}<input name="kcal" inputmode="numeric" value="${i.kcal ?? ''}"><small>${AR ? 'اتركه فارغًا إذا لم يُتحقق منه' : 'Leave empty if not verified'}</small></label>
        <label>${esc(tr('category'))}<select name="category_id">${categories.map((c) => `<option value="${c.id}" ${c.id === i.category_id ? 'selected' : ''}>${esc(AR ? c.name_ar : c.name_en)}</option>`).join('')}</select></label></div>
      <div class="row"><label>${AR ? 'الرسم التوضيحي' : 'Illustration'}<select name="illustration">${Object.keys(ILLUSTRATIONS).map((k) => `<option ${k === i.illustration ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" name="active" ${i.active ? 'checked' : ''}>${esc(tr('active'))}</label></div>
      ${isNew ? '' : `<fieldset class="card"><legend>${esc(tr('photo'))}</legend>
        ${i.image_path ? `<img src="/uploads/${esc(i.image_path)}" alt="" style="max-width:220px;border-radius:8px"><p><button type="button" class="btn btn--line btn--sm" id="rmphoto">${esc(tr('removePhoto'))}</button></p>` : ''}
        <label class="check"><input type="checkbox" id="rights">${esc(tr('rights'))}</label>
        <input type="file" id="photo" accept="image/jpeg,image/png,image/webp" disabled></fieldset>`}
      ${isNew ? '' : `<fieldset class="card"><legend>${esc(tr('groups'))}</legend>
        ${i.groups.map((g) => `<div class="card" data-group="${g.id}"><div class="row"><label>${esc(tr('nameEn'))}<input data-g="name_en" value="${esc(g.name_en)}"></label><label>${esc(tr('nameAr'))}<input data-g="name_ar" value="${esc(g.name_ar)}" dir="rtl"></label>
          <label>${esc(tr('min'))}<input data-g="min_select" type="number" min="0" value="${g.min_select}"></label><label>${esc(tr('max'))}<input data-g="max_select" type="number" min="1" value="${g.max_select}"></label></div>
          ${g.options.map((o) => `<div class="row" data-option="${o.id}"><label>${esc(tr('option'))} EN<input data-o="name_en" value="${esc(o.name_en)}"></label><label>${esc(tr('option'))} AR<input data-o="name_ar" value="${esc(o.name_ar)}" dir="rtl"></label>
            <label>${esc(tr('price'))}<input data-o="price_minor" value="${esc(toMajorString(o.price_minor, 'SAR'))}"></label><label class="check"><input type="checkbox" data-o="active" ${o.active ? 'checked' : ''}>${esc(tr('active'))}</label>
            <label class="check"><input type="checkbox" data-osold ${o.sold_out ? 'checked' : ''}>${esc(tr('soldOut'))}</label></div>`).join('')}
          <button type="button" class="btn btn--line btn--sm" data-addopt="${g.id}">+ ${esc(tr('option'))}</button></div>`).join('')}
        <button type="button" class="btn btn--line btn--sm" id="addgroup">+ ${esc(tr('groups'))}</button></fieldset>`}
      <p class="muted">${AR ? 'التعديلات تُحفظ كمسودة ولا يراها العملاء حتى النشر.' : 'Changes are saved as a draft — customers see them only after you publish.'}</p>
      <div class="bar"><button class="btn btn--primary">${esc(tr('save'))}</button><button type="button" class="btn btn--line" id="pclose">${esc(tr('close'))}</button></div>
    </form>`);
  const f = $('#itemf', el);
  $('#pclose', el).onclick = close;
  $('#rights', el)?.addEventListener('change', (e) => { $('#photo', el).disabled = !e.target.checked; });
  $('#photo', el)?.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const blob = await resizeImage(file);
    const up = await api('POST', `/uploads?purpose=item&rights=${encodeURIComponent('owner confirmed rights in dashboard')}`, blob, { raw: true, headers: { 'content-type': 'application/octet-stream' } });
    await api('PUT', `/drafts/item/${i.id}`, { image_path: up.path, image_alt_en: `Photo of ${i.name_en}`, image_alt_ar: `صورة ${i.name_ar}` });
    toast(tr('saved')); close(); VIEWS.menu(view);
  });
  $('#rmphoto', el)?.addEventListener('click', async () => { await api('PUT', `/drafts/item/${i.id}`, { image_path: null }); close(); VIEWS.menu(view); });
  $('#addgroup', el)?.addEventListener('click', async () => {
    const en = prompt(tr('nameEn')); if (!en) return; const ar = prompt(tr('nameAr')) || en;
    await api('POST', `/items/${i.id}/groups`, { name_en: en, name_ar: ar, min_select: 0, max_select: 1 }); close(); VIEWS.menu(view);
  });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-addopt]'); if (!b) return;
    const en = prompt(tr('nameEn')); if (!en) return; const ar = prompt(tr('nameAr')) || en;
    await api('POST', `/groups/${b.dataset.addopt}/options`, { name_en: en, name_ar: ar, price: '0' }); close(); VIEWS.menu(view);
  });
  f.onsubmit = async (e) => {
    e.preventDefault();
    let price;
    try { price = parseMajor(fv(f, 'price'), 'SAR'); } catch { toast(`${tr('error')}: ${tr('price')}`, true); return; }
    const payload = { name_en: fv(f, 'name_en'), name_ar: fv(f, 'name_ar'), desc_en: fv(f, 'desc_en'), desc_ar: fv(f, 'desc_ar'), price_minor: price, kcal: fv(f, 'kcal') === '' ? null : Number(fv(f, 'kcal')), category_id: Number(fv(f, 'category_id')), illustration: fv(f, 'illustration'), active: f.elements.active.checked };
    if (isNew) { const r = await api('POST', '/items', { ...payload, price: toMajorString(price, 'SAR') }); await api('PUT', `/drafts/item/${r.id}`, { active: payload.active }); }
    else {
      await api('PUT', `/drafts/item/${i.id}`, payload);
      for (const gEl of $$('[data-group]', el)) {
        const gp = {}; for (const inp of $$('[data-g]', gEl)) gp[inp.dataset.g] = inp.value;
        await api('PUT', `/drafts/modifier_group/${gEl.dataset.group}`, gp);
        for (const oEl of $$('[data-option]', gEl)) {
          const op = {};
          for (const inp of $$('[data-o]', oEl)) op[inp.dataset.o] = inp.type === 'checkbox' ? inp.checked : inp.dataset.o === 'price_minor' ? parseMajor(inp.value || '0', 'SAR') : inp.value;
          await api('PUT', `/drafts/modifier/${oEl.dataset.option}`, op);
          await api('PATCH', `/modifiers/${oEl.dataset.option}/availability`, { sold_out: $('[data-osold]', oEl).checked });
        }
      }
    }
    toast(tr('saved')); close(); VIEWS.menu(view);
  };
}

async function categoryPanel(c, view) {
  const { PATTERN_PRESETS } = await import('/shared/presets/patterns.js');
  const { el, close } = panel(`<h2>${esc(AR ? c.name_ar : c.name_en)}</h2><form class="form" id="catf">
    <div class="row"><label>${esc(tr('nameEn'))}<input name="name_en" value="${esc(c.name_en)}"></label><label>${esc(tr('nameAr'))}<input name="name_ar" value="${esc(c.name_ar)}" dir="rtl"></label></div>
    <div class="row"><label>${esc(tr('window'))}<input name="window_from_local" type="time" value="${esc(c.window_from_local || '')}"></label><label>&nbsp;<input name="window_to_local" type="time" value="${esc(c.window_to_local || '')}"></label></div>
    <label>${esc(tr('bg'))}<select name="background_preset"><option value="">${AR ? 'الخلفية العامة للمنيو' : 'Use the menu background'}</option>${PATTERN_PRESETS.map((p) => `<option value="${p.id}" ${p.id === c.background_preset ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}>${esc(tr('active'))}</label>
    <div class="bar"><button class="btn btn--primary">${esc(tr('save'))}</button><button type="button" class="btn btn--line" id="pclose">${esc(tr('close'))}</button></div></form>`);
  $('#pclose', el).onclick = close;
  $('#catf', el).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    await api('PUT', `/drafts/category/${c.id}`, { name_en: fv(f, 'name_en'), name_ar: fv(f, 'name_ar'), window_from_local: fv(f, 'window_from_local') || null, window_to_local: fv(f, 'window_to_local') || null, background_preset: fv(f, 'background_preset') || null, active: f.elements.active.checked });
    toast(tr('saved')); close(); VIEWS.menu(view);
  };
}

// ------------------------------------------------------------------ hours
VIEWS.hours = async (view) => {
  const { branch, hours, closures } = await api('GET', '/hours');
  const days = [6, 0, 1, 2, 3, 4, 5];
  const names = AR ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const editable = can('settings.operations');
  view.innerHTML = `<h1>${esc(tr('hours'))}</h1>
    <p class="muted">${AR ? 'بتوقيت ينبع (Asia/Riyadh). إذا كان وقت الإغلاق قبل وقت الفتح فهذا يعني أن الفترة تمتد بعد منتصف الليل.' : 'Yanbu time (Asia/Riyadh). A closing time earlier than the opening time runs past midnight.'}</p>
    <form class="form card" id="hf">${days.map((d) => `<fieldset data-day="${d}" style="border:0;padding:0"><legend><strong>${esc(names[d])}</strong></legend>
      ${hours.filter((h) => h.weekday === d).map((h) => hourRow(h)).join('') || ''}<button type="button" class="btn btn--line btn--sm" data-addh="${d}">+ ${esc(tr('addInterval'))}</button></fieldset>`).join('<hr>')}
      ${editable ? `<div class="bar"><button class="btn btn--primary">${esc(tr('save'))}</button></div>` : ''}</form>
    <h2>${esc(tr('closures'))}</h2>
    <table class="t"><thead><tr><th>${esc(tr('from'))}</th><th>${esc(tr('to'))}</th><th>${esc(tr('reason'))}</th><th></th></tr></thead><tbody>
      ${closures.map((c) => `<tr><td>${esc(when(c.starts_at))}</td><td>${esc(when(c.ends_at))}</td><td>${esc(AR ? c.reason_ar : c.reason_en)}</td><td>${editable ? `<button class="btn btn--line btn--sm" data-delc="${c.id}">${esc(tr('delete'))}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">${esc(tr('none'))}</td></tr>`}</tbody></table>
    ${editable ? `<form class="form card" id="cf"><div class="row"><label>${esc(tr('from'))}<input type="datetime-local" name="s" required></label><label>${esc(tr('to'))}<input type="datetime-local" name="e" required></label>
      <label>${esc(tr('reason'))} EN<input name="ren"></label><label>${esc(tr('reason'))} AR<input name="rar" dir="rtl"></label></div><button class="btn btn--line">${esc(tr('addClosure'))}</button></form>` : ''}`;
  function hourRow(h) {
    return `<div class="row" data-h><label>${esc(tr('from'))}<input type="time" data-k="opens_local" value="${esc(h.opens_local)}" required></label><label>${esc(tr('to'))}<input type="time" data-k="closes_local" value="${esc(h.closes_local)}" required></label>
      <label class="check"><input type="checkbox" data-k="confirmed" ${h.confirmed ? 'checked' : ''}>${esc(tr('confirmed'))}</label><button type="button" class="btn btn--line btn--sm" data-rmh>${esc(tr('delete'))}</button></div>`;
  }
  view.onclick = async (e) => {
    const add = e.target.closest('[data-addh]');
    if (add) add.insertAdjacentHTML('beforebegin', hourRow({ opens_local: '17:00', closes_local: '03:00', confirmed: 0 }));
    if (e.target.closest('[data-rmh]')) e.target.closest('[data-h]').remove();
    const dc = e.target.closest('[data-delc]');
    if (dc) { await api('DELETE', `/closures/${dc.dataset.delc}`); VIEWS.hours(view); }
  };
  $('#hf').onsubmit = async (e) => {
    e.preventDefault();
    const rows = [];
    for (const fs of $$('[data-day]', view)) for (const r of $$('[data-h]', fs)) rows.push({ weekday: Number(fs.dataset.day), opens_local: $('[data-k=opens_local]', r).value, closes_local: $('[data-k=closes_local]', r).value, confirmed: $('[data-k=confirmed]', r).checked });
    await api('PUT', '/hours', { hours: rows }); toast(tr('saved')); VIEWS.hours(view);
  };
  $('#cf')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const iso = (v) => new Date(`${v}:00+03:00`).toISOString(); // inputs are Yanbu wall time
    await api('POST', '/closures', { starts_at: iso(fv(f, 's')), ends_at: iso(fv(f, 'e')), reason_en: fv(f, 'ren'), reason_ar: fv(f, 'rar') });
    VIEWS.hours(view);
  });
  void branch;
};

// ------------------------------------------------------------------ operations (ordering, fulfilment, payments, WhatsApp, zones, branch)
VIEWS.ops = async (view) => {
  const [{ settings: S, secrets, provider }, { zones }, { branch }] = await Promise.all([api('GET', '/settings'), api('GET', '/zones'), api('GET', '/hours')]);
  const chk = (name, v, label) => `<label class="check"><input type="checkbox" name="${name}" ${v ? 'checked' : ''}>${esc(label)}</label>`;
  const owner = can('settings.payments');
  view.innerHTML = `<h1>${esc(tr('ops'))}</h1>
  <div class="grid2">
  <form class="form card" data-key="ordering"><h2>${AR ? 'الطلب أونلاين' : 'Online ordering'}</h2>
    ${chk('enabled', S.ordering.enabled, AR ? 'استقبال الطلبات مفعّل' : 'Accept online orders')}
    <label>${AR ? 'طريقة القبول' : 'Acceptance'}<select name="accept_mode"><option value="manual" ${S.ordering.accept_mode === 'manual' ? 'selected' : ''}>${AR ? 'يدوي — الموظف يقبل كل طلب' : 'Manual — staff accept each order'}</option><option value="auto" ${S.ordering.accept_mode === 'auto' ? 'selected' : ''}>${AR ? 'تلقائي' : 'Automatic'}</option></select></label>
    ${chk('asap', S.ordering.asap, AR ? 'السماح بـ«بأسرع وقت»' : 'Allow “as soon as possible”')}${chk('scheduling', S.ordering.scheduling, AR ? 'السماح بالجدولة' : 'Allow scheduling')}
    <div class="row"><label>${AR ? 'أيام مقدمًا' : 'Days ahead'}<input name="days_ahead" type="number" min="0" max="7" value="${S.ordering.days_ahead}"></label><label>${AR ? 'فاصل الأوقات (دقيقة)' : 'Slot (min)'}<select name="slot_minutes">${[5, 10, 15, 20, 30, 60].map((m) => `<option ${m === S.ordering.slot_minutes ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label>${AR ? 'آخر طلب قبل الإغلاق (دقيقة)' : 'Last order before close (min)'}<input name="cutoff_minutes" type="number" min="0" value="${S.ordering.cutoff_minutes}"></label><label>${AR ? 'حد الأصناف' : 'Max items'}<input name="max_items_per_order" type="number" min="1" value="${S.ordering.max_items_per_order}"></label></div>
    <button class="btn btn--primary">${esc(tr('save'))}</button></form>
  <form class="form card" data-key="fulfillment"><h2>${AR ? 'الاستلام والتوصيل' : 'Pickup & delivery'}</h2>
    ${chk('pickup.enabled', S.fulfillment.pickup.enabled, AR ? 'الاستلام من المطعم' : 'Pickup')}<label>${AR ? 'وقت التجهيز للاستلام (دقيقة)' : 'Pickup prep (min)'}<input name="pickup.prep_minutes" type="number" value="${S.fulfillment.pickup.prep_minutes}"></label>
    ${chk('delivery.enabled', S.fulfillment.delivery.enabled, AR ? 'التوصيل (فعّله فقط بعد تحديد المناطق والرسوم)' : 'Delivery (enable only once zones and fees are confirmed)')}<label>${AR ? 'وقت التجهيز للتوصيل' : 'Delivery prep (min)'}<input name="delivery.prep_minutes" type="number" value="${S.fulfillment.delivery.prep_minutes}"></label>
    <label>${AR ? 'من يوصل' : 'Who delivers'}<select name="delivery.provider"><option value="own_drivers">${AR ? 'مندوبو المطعم' : 'Own drivers'}</option><option value="partner" ${S.fulfillment.delivery.provider === 'partner' ? 'selected' : ''}>${AR ? 'شريك توصيل (يدوي)' : 'Delivery partner (manual)'}</option></select></label>
    <button class="btn btn--primary">${esc(tr('save'))}</button></form>
  ${owner ? `<form class="form card" data-key="payments"><h2>${AR ? 'طرق الدفع' : 'Payment methods'}</h2>
    ${chk('pay_at_pickup.enabled', S.payments.pay_at_pickup.enabled, AR ? 'الدفع عند الاستلام' : 'Pay at pickup')}${chk('pay_at_pickup.cash', S.payments.pay_at_pickup.cash, AR ? 'نقدًا متاح' : 'Cash accepted')}${chk('pay_at_pickup.card_terminal', S.payments.pay_at_pickup.card_terminal, AR ? 'جهاز بطاقات/مدى متاح' : 'Card/mada terminal available')}${chk('pay_at_pickup.methods_confirmed', S.payments.pay_at_pickup.methods_confirmed, AR ? 'أكّد المالك هذه الطرق' : 'Owner confirmed these methods')}
    ${chk('pay_on_delivery.enabled', S.payments.pay_on_delivery.enabled, AR ? 'الدفع عند التوصيل' : 'Pay on delivery')}${chk('pay_on_delivery.cash', S.payments.pay_on_delivery.cash, AR ? 'نقدًا' : 'Cash')}${chk('pay_on_delivery.card_terminal', S.payments.pay_on_delivery.card_terminal, AR ? 'جهاز بطاقات مع المندوب' : 'Card terminal with driver')}
    ${chk('online.enabled', S.payments.online.enabled, AR ? 'الدفع أونلاين' : 'Online payment')}
    <p class="muted">${AR ? 'مزوّد الدفع' : 'Provider'}: <strong>${esc(provider)}</strong> — ${secrets.moyasar ? (AR ? 'مفاتيح Moyasar موجودة في الخادم' : 'Moyasar keys present on the server') : (AR ? 'لا توجد مفاتيح — الدفع أونلاين لن يظهر للعملاء' : 'No keys configured — online payment stays hidden from customers')}</p>
    <div class="row"><label>${AR ? 'وصف الطرق (EN)' : 'Methods label (EN)'}<input name="online.methods_label_en" value="${esc(S.payments.online.methods_label_en)}"></label><label>${AR ? 'وصف الطرق (AR)' : 'Methods label (AR)'}<input name="online.methods_label_ar" value="${esc(S.payments.online.methods_label_ar)}" dir="rtl"></label></div>
    <button class="btn btn--primary">${esc(tr('save'))}</button></form>
  <form class="form card" data-key="tax"><h2>${AR ? 'ضريبة القيمة المضافة' : 'VAT'}</h2>
    <label>${AR ? 'الوضع' : 'Mode'}<select name="mode"><option value="none" ${S.tax.mode === 'none' ? 'selected' : ''}>${AR ? 'بدون (غير مسجل)' : 'None (not registered)'}</option><option value="inclusive" ${S.tax.mode === 'inclusive' ? 'selected' : ''}>${AR ? 'الأسعار شاملة الضريبة' : 'Prices include VAT'}</option><option value="exclusive" ${S.tax.mode === 'exclusive' ? 'selected' : ''}>${AR ? 'تُضاف الضريبة على الأسعار' : 'VAT added on top'}</option></select></label>
    <div class="row"><label>${AR ? 'النسبة (نقاط أساس، 1500 = 15٪)' : 'Rate (basis points, 1500 = 15%)'}<input name="rate_bp" type="number" value="${S.tax.rate_bp}"></label><label>${AR ? 'الرقم الضريبي' : 'VAT number'}<input name="vat_number" value="${esc(S.tax.vat_number)}" dir="ltr"></label></div>
    <p class="muted">${AR ? 'تحقق من وضعك الضريبي مع محاسبك قبل التفعيل.' : 'Confirm your VAT status with your accountant before enabling.'}</p><button class="btn btn--primary">${esc(tr('save'))}</button></form>` : ''}
  <form class="form card" data-key="fees"><h2>${AR ? 'رسوم الخدمة' : 'Service fee'}</h2><label>${AR ? 'بالهللة (0 = بدون)' : 'In halalas (0 = none)'}<input name="service_fee_minor" type="number" min="0" value="${S.fees.service_fee_minor}"></label><button class="btn btn--primary">${esc(tr('save'))}</button></form>
  <form class="form card" data-key="whatsapp"><h2>WhatsApp</h2>
    <label>${AR ? 'رقم الأعمال' : 'Business number'}<input name="number" value="${esc(S.whatsapp.number)}" dir="ltr"></label>
    ${chk('verified', S.whatsapp.verified, AR ? 'تأكدت أن هذا الرقم يعمل على واتساب' : 'I verified this number is on WhatsApp')}
    <label>${AR ? 'الاستخدام' : 'Use'}<select name="mode">${[['off', AR ? 'متوقف' : 'Off'], ['support', AR ? 'زر تواصل فقط' : 'Contact button only'], ['order_copy', AR ? 'العميل يمكنه إرسال نسخة من الطلب' : 'Customer may send a copy of the order'], ['whatsapp_required', AR ? 'تأكيد الطلبات عبر واتساب' : 'Orders are confirmed over WhatsApp']].map(([v, l]) => `<option value="${v}" ${S.whatsapp.mode === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <p class="muted">${AR ? 'فتح واتساب لا يعني أن الرسالة أُرسلت. حالة الطلب تبقى كما هي حتى يقبلها الموظف.' : 'Opening WhatsApp does not mean the message was sent. Order status only changes when staff act.'}</p><button class="btn btn--primary">${esc(tr('save'))}</button></form>
  ${owner ? `<form class="form card" data-key="notifications"><h2>${AR ? 'الإشعارات الآلية' : 'Automated notifications'}</h2>
    ${chk('webhook_enabled', S.notifications.webhook_enabled, `Webhook ${secrets.webhook ? '✓' : (AR ? '(غير مُعد على الخادم)' : '(not configured on the server)')}`)}
    ${chk('whatsapp_cloud_enabled', S.notifications.whatsapp_cloud_enabled, `WhatsApp Cloud API ${secrets.whatsappCloud ? '✓' : (AR ? '(غير مُعد)' : '(not configured)')}`)}<button class="btn btn--primary">${esc(tr('save'))}</button></form>` : ''}
  <form class="form card" id="branchf"><h2>${AR ? 'بيانات الفرع' : 'Branch details'}</h2>
    <div class="row"><label>${AR ? 'العنوان EN' : 'Address EN'}<input name="address_en" value="${esc(branch.address_en)}"></label><label>${AR ? 'العنوان AR' : 'Address AR'}<input name="address_ar" value="${esc(branch.address_ar)}" dir="rtl"></label></div>
    <div class="row"><label>${AR ? 'الهاتف' : 'Phone'}<input name="phone" value="${esc(branch.phone)}" dir="ltr"></label><label>Plus code<input name="plus_code" value="${esc(branch.plus_code)}" dir="ltr"></label><label>Lat<input name="lat" value="${branch.lat}" dir="ltr"></label><label>Lng<input name="lng" value="${branch.lng}" dir="ltr"></label></div>
    <label>Google Maps URL<input name="maps_url" value="${esc(branch.maps_url)}" dir="ltr"></label>
    <div class="row"><label>${AR ? 'تعليمات الاستلام EN' : 'Pickup note EN'}<input name="pickup_note_en" value="${esc(branch.pickup_note_en)}"></label><label>${AR ? 'تعليمات الاستلام AR' : 'Pickup note AR'}<input name="pickup_note_ar" value="${esc(branch.pickup_note_ar)}" dir="rtl"></label></div>
    <button class="btn btn--primary">${esc(tr('save'))}</button></form>
  </div>
  <h2>${AR ? 'مناطق التوصيل' : 'Delivery zones'}</h2>
  <table class="t"><thead><tr><th>${AR ? 'المنطقة' : 'Zone'}</th><th>${AR ? 'النوع' : 'Type'}</th><th>${AR ? 'الرسوم' : 'Fee'}</th><th>${AR ? 'الحد الأدنى' : 'Minimum'}</th><th>${AR ? 'مجاني فوق' : 'Free over'}</th><th>ETA</th><th></th></tr></thead><tbody>
  ${zones.map((z) => `<tr><td>${esc(AR ? z.name_ar : z.name_en)}${z.active ? '' : ` <span class="pill">${AR ? 'معطل' : 'off'}</span>`}</td><td>${esc(z.kind === 'radius' ? `${z.geometry.km} km` : `${z.geometry.points.length} pts`)}</td><td>${esc(money(z.fee_minor))}</td><td>${esc(money(z.min_order_minor))}</td><td>${z.free_over_minor === null ? '—' : esc(money(z.free_over_minor))}</td><td>${z.eta_minutes}′</td><td>${z.active ? `<button class="btn btn--line btn--sm" data-delz="${z.id}">${AR ? 'تعطيل' : 'Deactivate'}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7" class="muted">${esc(tr('none'))}</td></tr>`}</tbody></table>
  <form class="form card" id="zonef"><h2>${AR ? 'إضافة منطقة' : 'Add zone'}</h2>
    <div class="row"><label>EN<input name="name_en" required></label><label>AR<input name="name_ar" required dir="rtl"></label><label>${AR ? 'النوع' : 'Type'}<select name="kind"><option value="radius">${AR ? 'نصف قطر من الفرع' : 'Radius from branch'}</option><option value="polygon">${AR ? 'مضلع (إحداثيات)' : 'Polygon (coordinates)'}</option></select></label></div>
    <div class="row"><label>${AR ? 'نصف القطر (كم)' : 'Radius (km)'}<input name="km" type="number" step="0.1" value="3"></label><label>${AR ? 'الرسوم (ريال)' : 'Fee (SAR)'}<input name="fee" value="0"></label><label>${AR ? 'الحد الأدنى (ريال)' : 'Minimum (SAR)'}<input name="min_order" value="0"></label><label>${AR ? 'مجاني فوق (ريال)' : 'Free over (SAR)'}<input name="free_over" placeholder="—"></label><label>ETA (min)<input name="eta_minutes" type="number" value="40"></label></div>
    <label>${AR ? 'إحداثيات المضلع: [[lat,lng],...]' : 'Polygon points: [[lat,lng],...]'}<textarea name="points" dir="ltr" placeholder="[[24.10,38.00],[24.12,38.03],[24.08,38.04]]"></textarea></label>
    <button class="btn btn--primary">${esc(tr('add'))}</button></form>`;
  const setPath = (o, path, v) => { const ks = path.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]]; x[ks.at(-1)] = v; };
  for (const f of $$('form[data-key]', view)) {
    f.onsubmit = async (e) => {
      e.preventDefault();
      const key = f.dataset.key;
      const val = structuredClone(S[key]);
      for (const el of f.elements) {
        if (!el.name) continue;
        setPath(val, el.name, el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value);
      }
      const r = await api('PUT', `/settings/${key}`, val);
      S[key] = r[key]; toast(tr('saved'));
    };
  }
  $('#branchf').onsubmit = async (e) => { e.preventDefault(); const f = e.target; const b = {}; for (const el of f.elements) if (el.name) b[el.name] = el.value; await api('PUT', '/branch', b); toast(tr('saved')); };
  $('#zonef').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const kind = fv(f, 'kind');
    let geometry;
    try { geometry = kind === 'radius' ? { km: Number(fv(f, 'km')) } : { points: JSON.parse(fv(f, 'points')) }; } catch { toast(tr('error'), true); return; }
    await api('POST', '/zones', { name_en: fv(f, 'name_en'), name_ar: fv(f, 'name_ar'), kind, geometry, fee: fv(f, 'fee') || '0', min_order: fv(f, 'min_order') || '0', free_over: fv(f, 'free_over') || null, eta_minutes: Number(fv(f, 'eta_minutes')) });
    VIEWS.ops(view);
  };
  view.onclick = async (e) => { const d = e.target.closest('[data-delz]'); if (d) { await api('DELETE', `/zones/${d.dataset.delz}`); VIEWS.ops(view); } };
};

// ------------------------------------------------------------------ campaigns & coupons
VIEWS.campaigns = async (view) => {
  const { campaigns, coupons } = await api('GET', '/campaigns');
  const kinds = { announcement: AR ? 'شريط إعلان' : 'Announcement bar', hero: AR ? 'بانر الصفحة الرئيسية' : 'Home hero', offer: AR ? 'عرض' : 'Offer' };
  const iso = (v) => (v ? new Date(`${v}:00+03:00`).toISOString() : null);
  const local = (v) => (v ? new Date(Date.parse(v) + 3 * 3600000).toISOString().slice(0, 16) : '');
  view.innerHTML = `<h1>${esc(tr('campaigns'))}</h1>
    <p class="muted">${AR ? 'الجدولة بتوقيت ينبع. لا عدادات تنازلية إلا لمواعيد انتهاء حقيقية، ولا ادعاءات ندرة أو أسعار مشطوبة غير حقيقية.' : 'Schedules use Yanbu time. Countdowns only for real end times; no invented scarcity or crossed-out prices.'}</p>
    <div class="tbl-wrap"><table class="t"><thead><tr><th>${AR ? 'النوع' : 'Kind'}</th><th>${AR ? 'العنوان' : 'Title'}</th><th>${AR ? 'الفترة' : 'Window'}</th><th>${AR ? 'الحالة' : 'Status'}</th><th></th></tr></thead><tbody>
    ${campaigns.map((c) => `<tr><td>${esc(kinds[c.kind])}</td><td>${esc(AR ? c.title_ar : c.title_en)}</td><td>${esc(when(c.starts_at) || '—')} → ${esc(when(c.ends_at) || '—')}</td><td><span class="pill ${c.status === 'published' ? 'pill--ok' : ''}">${esc(c.status)}</span></td>
      <td><button class="btn btn--line btn--sm" data-editc="${c.id}">${esc(tr('edit'))}</button> ${c.status === 'published' ? `<button class="btn btn--line btn--sm" data-cst="${c.id}" data-to="draft">${esc(tr('unpublish'))}</button>` : `<button class="btn btn--primary btn--sm" data-cst="${c.id}" data-to="published">${esc(tr('publish'))}</button>`} <button class="btn btn--line btn--sm" data-cst="${c.id}" data-to="archived">${esc(tr('archive'))}</button></td></tr>`).join('') || `<tr><td colspan="5" class="muted">${esc(tr('none'))}</td></tr>`}</tbody></table></div>
    <form class="form card" id="campf"><h2 id="campf-t">${AR ? 'حملة جديدة' : 'New campaign'}</h2><input type="hidden" name="id">
      <div class="row"><label>${AR ? 'النوع' : 'Kind'}<select name="kind">${Object.entries(kinds).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></label><label>${AR ? 'الأولوية' : 'Priority'}<input name="priority" type="number" value="0"></label>
        <label>${AR ? 'كوبون مرتبط' : 'Linked coupon'}<select name="coupon_id"><option value="">—</option>${coupons.map((k) => `<option value="${k.id}">${esc(k.code)}</option>`).join('')}</select></label></div>
      <div class="row"><label>${AR ? 'العنوان EN' : 'Title EN'}<input name="title_en"></label><label>${AR ? 'العنوان AR' : 'Title AR'}<input name="title_ar" dir="rtl"></label></div>
      <div class="row"><label>${AR ? 'النص EN' : 'Text EN'}<textarea name="body_en"></textarea></label><label>${AR ? 'النص AR' : 'Text AR'}<textarea name="body_ar" dir="rtl"></textarea></label></div>
      <div class="row"><label>${AR ? 'زر EN' : 'Button EN'}<input name="cta_en"></label><label>${AR ? 'زر AR' : 'Button AR'}<input name="cta_ar" dir="rtl"></label><label>${AR ? 'رابط الزر' : 'Button link'}<input name="cta_href" placeholder="/menu" dir="ltr"></label></div>
      <div class="row"><label>${esc(tr('from'))}<input type="datetime-local" name="starts_at"></label><label>${esc(tr('to'))}<input type="datetime-local" name="ends_at"></label><label class="check"><input type="checkbox" name="show_countdown">${AR ? 'عرض العد التنازلي (يتطلب وقت انتهاء)' : 'Show countdown (needs an end time)'}</label></div>
      <div class="bar"><button class="btn btn--primary">${esc(tr('save'))}</button><span class="muted">${AR ? 'تُحفظ كمسودة؛ انشرها من الجدول.' : 'Saved as a draft; publish it from the table.'}</span></div></form>
    <h2>${AR ? 'الكوبونات' : 'Coupons'}</h2>
    <div class="tbl-wrap"><table class="t"><thead><tr><th>${AR ? 'الكود' : 'Code'}</th><th>${AR ? 'النوع' : 'Type'}</th><th>${AR ? 'القيمة' : 'Value'}</th><th>${AR ? 'الحدود' : 'Limits'}</th><th>${AR ? 'مستخدم' : 'Used'}</th><th>${AR ? 'الفترة' : 'Window'}</th><th></th></tr></thead><tbody>
    ${coupons.map((k) => `<tr><td dir="ltr"><strong>${esc(k.code)}</strong></td><td>${esc(k.kind)}</td><td>${k.kind === 'percent' ? `${k.value / 100}%` : k.kind === 'fixed' ? esc(money(k.value)) : '—'}</td><td>${k.usage_limit ?? '∞'} / ${k.per_customer_limit ?? '∞'}${k.min_subtotal_minor ? ` · ≥ ${esc(money(k.min_subtotal_minor))}` : ''}</td><td>${k.redemptions}</td><td>${esc(when(k.starts_at) || '—')} → ${esc(when(k.ends_at) || '—')}</td><td>${k.active ? '' : `<span class="pill">${AR ? 'معطل' : 'off'}</span>`} <button class="btn btn--line btn--sm" data-editk="${k.id}">${esc(tr('edit'))}</button></td></tr>`).join('') || `<tr><td colspan="7" class="muted">${esc(tr('none'))}</td></tr>`}</tbody></table></div>
    <form class="form card" id="coupf"><h2 id="coupf-t">${AR ? 'كوبون جديد' : 'New coupon'}</h2><input type="hidden" name="id">
      <div class="row"><label>${AR ? 'الكود' : 'Code'}<input name="code" required dir="ltr" style="text-transform:uppercase"></label><label>${AR ? 'النوع' : 'Type'}<select name="kind"><option value="percent">${AR ? 'نسبة' : 'Percent'}</option><option value="fixed">${AR ? 'مبلغ ثابت' : 'Fixed amount'}</option><option value="free_delivery">${AR ? 'توصيل مجاني' : 'Free delivery'}</option></select></label>
        <label>${AR ? 'النسبة ٪' : 'Percent %'}<input name="percent" type="number" step="0.5"></label><label>${AR ? 'المبلغ (ريال)' : 'Amount (SAR)'}<input name="amount"></label></div>
      <div class="row"><label>${AR ? 'حد أدنى للطلب (ريال)' : 'Min subtotal (SAR)'}<input name="min_subtotal"></label><label>${AR ? 'أقصى خصم (ريال)' : 'Max discount (SAR)'}<input name="max_discount"></label><label>${AR ? 'عدد الاستخدامات الكلي' : 'Total uses'}<input name="usage_limit" type="number" min="1"></label><label>${AR ? 'لكل عميل' : 'Per customer'}<input name="per_customer_limit" type="number" min="1"></label></div>
      <div class="row"><label>${esc(tr('from'))}<input type="datetime-local" name="starts_at"></label><label>${esc(tr('to'))}<input type="datetime-local" name="ends_at"></label><label class="check"><input type="checkbox" name="active" checked>${esc(tr('active'))}</label></div>
      <div class="row"><label>${AR ? 'الشروط EN' : 'Terms EN'}<input name="terms_en"></label><label>${AR ? 'الشروط AR' : 'Terms AR'}<input name="terms_ar" dir="rtl"></label></div>
      <button class="btn btn--primary">${esc(tr('save'))}</button></form>`;
  const cf = $('#campf'), kf = $('#coupf');
  view.onclick = async (e) => {
    const st = e.target.closest('[data-cst]');
    if (st) { await api('POST', `/campaigns/${st.dataset.cst}/status`, { status: st.dataset.to }); VIEWS.campaigns(view); return; }
    const ec = e.target.closest('[data-editc]');
    if (ec) {
      const c = campaigns.find((x) => x.id === Number(ec.dataset.editc));
      for (const k of ['id', 'kind', 'priority', 'title_en', 'title_ar', 'body_en', 'body_ar', 'cta_en', 'cta_ar', 'cta_href']) cf.elements[k].value = c[k] ?? '';
      cf.elements.coupon_id.value = c.coupon_id ?? ''; cf.elements.starts_at.value = local(c.starts_at); cf.elements.ends_at.value = local(c.ends_at); cf.elements.show_countdown.checked = Boolean(c.show_countdown);
      $('#campf-t').textContent = `${tr('edit')} #${c.id}`; cf.scrollIntoView({ behavior: 'smooth' });
    }
    const ek = e.target.closest('[data-editk]');
    if (ek) {
      const k = coupons.find((x) => x.id === Number(ek.dataset.editk));
      kf.elements.id.value = k.id; kf.elements.code.value = k.code; kf.elements.code.readOnly = true; kf.elements.kind.value = k.kind;
      kf.elements.percent.value = k.kind === 'percent' ? k.value / 100 : ''; kf.elements.amount.value = k.kind === 'fixed' ? toMajorString(k.value, 'SAR') : '';
      kf.elements.min_subtotal.value = k.min_subtotal_minor ? toMajorString(k.min_subtotal_minor, 'SAR') : ''; kf.elements.max_discount.value = k.max_discount_minor ? toMajorString(k.max_discount_minor, 'SAR') : '';
      kf.elements.usage_limit.value = k.usage_limit ?? ''; kf.elements.per_customer_limit.value = k.per_customer_limit ?? ''; kf.elements.starts_at.value = local(k.starts_at); kf.elements.ends_at.value = local(k.ends_at);
      kf.elements.active.checked = Boolean(k.active); kf.elements.terms_en.value = k.terms_en; kf.elements.terms_ar.value = k.terms_ar;
      $('#coupf-t').textContent = `${tr('edit')} ${k.code}`; kf.scrollIntoView({ behavior: 'smooth' });
    }
  };
  cf.onsubmit = async (e) => {
    e.preventDefault();
    const b = {};
    for (const el of cf.elements) if (el.name) b[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    b.starts_at = iso(b.starts_at); b.ends_at = iso(b.ends_at); b.coupon_id = b.coupon_id ? Number(b.coupon_id) : null; b.priority = Number(b.priority) || 0;
    if (b.id) await api('PUT', `/campaigns/${b.id}`, b); else await api('POST', '/campaigns', b);
    toast(tr('saved')); VIEWS.campaigns(view);
  };
  kf.onsubmit = async (e) => {
    e.preventDefault();
    const b = {};
    for (const el of kf.elements) if (el.name) b[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    b.starts_at = iso(b.starts_at); b.ends_at = iso(b.ends_at); b.percent = b.percent === '' ? undefined : Number(b.percent);
    if (b.id) await api('PUT', `/coupons/${b.id}`, b); else await api('POST', '/coupons', b);
    toast(tr('saved')); VIEWS.campaigns(view);
  };
};

// ------------------------------------------------------------------ content, SEO, business details
VIEWS.content = async (view) => {
  const [{ blocks }, { settings: S }] = await Promise.all([api('GET', '/content'), api('GET', '/settings')]);
  const b = S.business;
  view.innerHTML = `<h1>${esc(tr('content'))}</h1>
    <form class="form card" id="bizf"><h2>${AR ? 'بيانات النشاط' : 'Business details'}</h2>
      <div class="row"><label>${esc(tr('nameEn'))}<input name="name_en" value="${esc(b.name_en)}"></label><label>${esc(tr('nameAr'))}<input name="name_ar" value="${esc(b.name_ar)}" dir="rtl"></label></div>
      <div class="row"><label>${AR ? 'الشعار النصي EN' : 'Tagline EN'}<input name="tagline_en" value="${esc(b.tagline_en)}"></label><label>${AR ? 'الشعار النصي AR' : 'Tagline AR'}<input name="tagline_ar" value="${esc(b.tagline_ar)}" dir="rtl"></label></div>
      <div class="row"><label>${AR ? 'البريد' : 'Email'}<input name="email" type="email" value="${esc(b.email)}" dir="ltr"></label><label>${AR ? 'الاسم القانوني' : 'Legal name'}<input name="legal_name" value="${esc(b.legal_name)}"></label></div>
      <label>${AR ? 'حسابات التواصل (سطر لكل حساب: الشبكة | @الحساب | https://رابط)' : 'Social profiles (one per line: network | @handle | https://url)'}<textarea name="socials" dir="ltr">${esc((b.socials || []).map((s) => `${s.network} | ${s.handle} | ${s.url}`).join('\n'))}</textarea></label>
      <fieldset class="card"><legend>${AR ? 'تأكيدات المالك' : 'Owner confirmations'}</legend>${Object.entries(b.confirmed || {}).map(([k, v]) => `<label class="check"><input type="checkbox" data-conf="${k}" ${v ? 'checked' : ''}>${esc(k.replace(/_/g, ' '))}</label>`).join('')}</fieldset>
      <button class="btn btn--primary">${esc(tr('save'))}</button></form>
    <form class="form card" id="seof"><h2>SEO</h2>
      <div class="row"><label>Title EN<input name="title_en" maxlength="70" value="${esc(S.seo.title_en)}"></label><label>Title AR<input name="title_ar" maxlength="70" value="${esc(S.seo.title_ar)}" dir="rtl"></label></div>
      <div class="row"><label>Description EN<textarea name="desc_en" maxlength="170">${esc(S.seo.desc_en)}</textarea></label><label>Description AR<textarea name="desc_ar" maxlength="170" dir="rtl">${esc(S.seo.desc_ar)}</textarea></label></div>
      <button class="btn btn--primary">${esc(tr('save'))}</button></form>
    <h2>${AR ? 'نصوص الموقع' : 'Site text'}</h2>
    ${blocks.map((x) => `<form class="form card${x.needs_review ? ' card--warn' : ''}" data-block="${esc(x.key)}"><h2 style="margin:0">${esc(x.key)} ${x.needs_review ? `<span class="pill pill--warn">${esc(tr('needsReview'))}</span>` : ''}</h2>
      ${x.key === 'faq.items' ? `<small>${AR ? 'تنسيق JSON: [["سؤال","جواب"], ...]' : 'JSON format: [["question","answer"], ...]'}</small>` : ''}
      <div class="row"><label>EN<textarea name="value_en" rows="5">${esc(x.value_en)}</textarea></label><label>AR<textarea name="value_ar" rows="5" dir="rtl">${esc(x.value_ar)}</textarea></label></div>
      <label class="check"><input type="checkbox" name="approved" ${x.needs_review ? '' : 'checked'}>${AR ? 'وافق المالك على هذا النص' : 'Owner approved this text'}</label><button class="btn btn--primary btn--sm">${esc(tr('save'))}</button></form>`).join('')}`;
  $('#bizf').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const socials = fv(f, 'socials').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x.length === 3 && x[2]).map(([network, handle, url]) => ({ network, handle, url }));
    const confirmed = Object.fromEntries($$('[data-conf]', f).map((c) => [c.dataset.conf, c.checked]));
    await api('PUT', '/settings/business', { ...b, name_en: fv(f, 'name_en'), name_ar: fv(f, 'name_ar'), tagline_en: fv(f, 'tagline_en'), tagline_ar: fv(f, 'tagline_ar'), email: fv(f, 'email'), legal_name: fv(f, 'legal_name'), socials, confirmed });
    toast(tr('saved'));
  };
  $('#seof').onsubmit = async (e) => { e.preventDefault(); const f = e.target; await api('PUT', '/settings/seo', { title_en: fv(f, 'title_en'), title_ar: fv(f, 'title_ar'), desc_en: fv(f, 'desc_en'), desc_ar: fv(f, 'desc_ar') }); toast(tr('saved')); };
  for (const f of $$('[data-block]', view)) f.onsubmit = async (e) => { e.preventDefault(); await api('PUT', `/content/${encodeURIComponent(f.dataset.block)}`, { value_en: fv(f, 'value_en'), value_ar: fv(f, 'value_ar'), approved: f.elements.approved.checked }); toast(tr('saved')); };
};

// ------------------------------------------------------------------ design studio (lazy)
VIEWS.design = async (view) => { const m = await import('./studio.js'); await m.renderStudio(view, { api, toast, tr, AR, can, L }); };

// ------------------------------------------------------------------ QR
VIEWS.qr = async (view) => {
  view.innerHTML = `<h1>${esc(tr('qr'))}</h1>
    ${me.indexing ? '' : `<p class="notice notice--warn">${AR ? `معاينة: الرموز تشير إلى ${esc(me.publicUrl)}. أعد إنشاءها بعد تشغيل النطاق الرسمي وقبل الطباعة.` : `Preview: codes point to ${esc(me.publicUrl)}. Regenerate them once the official domain is live, before printing.`}</p>`}
    <div class="qrbox"><img id="qrimg" alt="QR"><form class="form card" id="qrf">
      <label>${AR ? 'الوجهة' : 'Destination'}<select name="target"><option value="menu">${AR ? 'المنيو' : 'Menu'}</option><option value="home">${AR ? 'الرئيسية' : 'Home'}</option><option value="visit">${AR ? 'الموقع والساعات' : 'Location & hours'}</option><option value="offers">${AR ? 'العروض' : 'Offers'}</option></select></label>
      <label>${AR ? 'اللغة' : 'Language'}<select name="lang"><option value="ar">العربية</option><option value="en">English</option></select></label>
      <label>${AR ? 'وسم الحملة (اختياري، لقياس المسح)' : 'Campaign tag (optional, to measure scans)'}<input name="campaign" placeholder="table-tent" dir="ltr"></label>
      <p id="qrurl" class="muted" dir="ltr"></p>
      <div class="bar"><a class="btn btn--line btn--sm" id="qrpng">PNG</a><a class="btn btn--line btn--sm" id="qrsvg">SVG</a><a class="btn btn--line btn--sm" id="qrprint" target="_blank">${AR ? 'نسخة للطباعة' : 'Print card'}</a></div></form></div>`;
  const f = $('#qrf');
  const upd = () => {
    const q = `target=${fv(f, 'target')}&lang=${fv(f, 'lang')}&campaign=${encodeURIComponent(fv(f, 'campaign'))}`;
    $('#qrimg').src = `/admin/api/qr?${q}`;
    $('#qrpng').href = `/admin/api/qr?${q}&format=png`; $('#qrsvg').href = `/admin/api/qr?${q}&format=svg`; $('#qrprint').href = `/admin/api/qr?${q}&format=print`;
    const path = { home: '', menu: '/menu', visit: '/visit', offers: '/offers' }[fv(f, 'target')];
    const c = fv(f, 'campaign').toLowerCase().replace(/[^a-z0-9-]/g, '');
    $('#qrurl').textContent = `${me.publicUrl}/${fv(f, 'lang')}${path}${c ? `?utm_source=qr&utm_campaign=${c}` : ''}`;
  };
  f.oninput = upd; upd();
};

// ------------------------------------------------------------------ reports
VIEWS.reports = async (view) => {
  const r = await api('GET', '/reports');
  const max = Math.max(1, ...r.byDay.map((d) => d.revenue));
  const funnel = Object.fromEntries(r.funnel.map((f) => [f.name, f.n]));
  view.innerHTML = `<h1>${esc(tr('reports'))}</h1><p class="muted">${esc(r.from)} → ${esc(r.to)} · ${esc(r.note)}</p>
    <div class="kpis"><div class="kpi"><b>${r.totals.orders}</b><span>${esc(tr('ordersCount'))}</span></div><div class="kpi"><b>${esc(money(r.totals.revenue))}</b><span>${esc(tr('revenue'))}</span></div>
      <div class="kpi"><b>${esc(money(r.totals.aov))}</b><span>${esc(tr('aov'))}</span></div><div class="kpi"><b>${esc(money(r.totals.discounts))}</b><span>${esc(tr('discounts'))}</span></div></div>
    <div class="grid2"><section class="card"><h2>${AR ? 'الإيرادات اليومية' : 'Revenue by day'}</h2>
      ${r.byDay.length ? `<svg class="chart" viewBox="0 0 ${r.byDay.length * 40} 180" role="img" aria-label="${AR ? 'رسم الإيرادات اليومية' : 'Daily revenue chart'}">${r.byDay.map((d, i) => { const h = Math.round((d.revenue / max) * 140); return `<rect x="${i * 40 + 8}" y="${150 - h}" width="24" height="${h}" fill="#A8322A"><title>${d.day}: ${money(d.revenue)} (${d.orders})</title></rect><text x="${i * 40 + 20}" y="170" font-size="9" text-anchor="middle">${d.day.slice(5)}</text>`; }).join('')}</svg>` : `<p class="muted">${esc(tr('none'))}</p>`}</section>
    <section class="card"><h2>${AR ? 'الأكثر طلبًا' : 'Top items'}</h2><table class="t"><tbody>${r.topItems.map((i) => `<tr><td>${esc(AR ? i.name_ar : i.name_en)}</td><td>${i.qty}</td><td>${esc(money(i.revenue))}</td></tr>`).join('') || `<tr><td class="muted">${esc(tr('none'))}</td></tr>`}</tbody></table></section>
    <section class="card"><h2>${AR ? 'الطلبات حسب الساعة' : 'Orders by hour'}</h2><table class="t"><tbody>${r.byHour.map((h) => `<tr><td>${String(h.hour).padStart(2, '0')}:00</td><td>${h.orders}</td></tr>`).join('') || `<tr><td class="muted">${esc(tr('none'))}</td></tr>`}</tbody></table></section>
    <section class="card"><h2>${AR ? 'مسار الطلب (بدون بيانات شخصية)' : 'Ordering funnel (no personal data)'}</h2><table class="t"><tbody>${['page_view', 'item_view', 'add_to_cart', 'checkout_start', 'order_placed'].map((n) => `<tr><td>${n}</td><td>${funnel[n] || 0}</td></tr>`).join('')}</tbody></table>
      <h2>${AR ? 'حالات الطلبات' : 'Order statuses'}</h2><p>${r.statuses.map((s) => `${pill(s.order_status)} ${s.n}`).join(' ')}</p></section></div>
    ${can('exports.download') ? `<p><a class="btn btn--line" href="/admin/api/export/orders.csv">${AR ? 'تصدير الطلبات CSV' : 'Export orders CSV'}</a> <a class="btn btn--line" href="/admin/api/export/menu.csv">${AR ? 'تصدير المنيو CSV' : 'Export menu CSV'}</a></p>` : ''}`;
};

// ------------------------------------------------------------------ staff & audit
VIEWS.staff = async (view) => {
  const { users } = await api('GET', '/users');
  const roles = { owner: AR ? 'مالك' : 'Owner', manager: AR ? 'مدير' : 'Manager', staff: AR ? 'موظف' : 'Staff' };
  view.innerHTML = `<h1>${esc(tr('staff'))}</h1>
    <p class="muted">${AR ? 'المالك: كل شيء. المدير: المنيو والعروض والتقارير والتشغيل. الموظف: الطلبات وتوفر الأصناف فقط.' : 'Owner: everything. Manager: menu, offers, reports, operations. Staff: orders and item availability only.'}</p>
    <table class="t"><thead><tr><th>${AR ? 'الاسم' : 'Name'}</th><th>Email</th><th>${AR ? 'الدور' : 'Role'}</th><th>${esc(tr('active'))}</th><th>${AR ? 'آخر دخول' : 'Last sign-in'}</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr data-user="${u.id}"><td>${esc(u.name)}</td><td dir="ltr">${esc(u.email)}</td><td><select data-role>${Object.entries(roles).map(([k, l]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td>
      <td><input type="checkbox" data-active ${u.active ? 'checked' : ''}></td><td>${esc(when(u.last_login_at) || '—')}</td><td><button class="btn btn--line btn--sm" data-pw>${AR ? 'كلمة مرور جديدة' : 'New password'}</button></td></tr>`).join('')}</tbody></table>
    <form class="form card" id="uf"><h2>${AR ? 'إضافة موظف' : 'Add staff member'}</h2><div class="row"><label>${AR ? 'الاسم' : 'Name'}<input name="name" required></label><label>Email<input name="email" type="email" required dir="ltr"></label>
      <label>${AR ? 'الدور' : 'Role'}<select name="role">${Object.entries(roles).map(([k, l]) => `<option value="${k}" ${k === 'staff' ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label><label>${AR ? 'كلمة مرور مؤقتة (١٢ حرفًا على الأقل)' : 'Temporary password (12+ characters)'}<input name="password" type="password" minlength="12" required autocomplete="new-password"></label></div>
      <button class="btn btn--primary">${esc(tr('add'))}</button></form>`;
  view.onchange = async (e) => {
    const row = e.target.closest('[data-user]'); if (!row) return;
    try { await api('PUT', `/users/${row.dataset.user}`, { role: $('[data-role]', row).value, active: $('[data-active]', row).checked }); toast(tr('saved')); } catch { VIEWS.staff(view); }
  };
  view.onclick = async (e) => {
    const b = e.target.closest('[data-pw]'); if (!b) return;
    const pw = prompt(AR ? 'كلمة المرور الجديدة (١٢ حرفًا على الأقل)' : 'New password (12+ characters)'); if (!pw) return;
    await api('PUT', `/users/${b.closest('[data-user]').dataset.user}`, { password: pw }); toast(tr('saved'));
  };
  $('#uf').onsubmit = async (e) => { e.preventDefault(); const f = e.target; await api('POST', '/users', { name: fv(f, 'name'), email: fv(f, 'email'), role: fv(f, 'role'), password: fv(f, 'password') }); VIEWS.staff(view); };
};

VIEWS.audit = async (view) => {
  const { entries } = await api('GET', '/audit?limit=200');
  view.innerHTML = `<h1>${esc(tr('audit'))}</h1><div class="tbl-wrap"><table class="t"><thead><tr><th>${AR ? 'الوقت' : 'Time'}</th><th>${AR ? 'المستخدم' : 'User'}</th><th>${AR ? 'الإجراء' : 'Action'}</th><th>${AR ? 'العنصر' : 'Entity'}</th><th>${AR ? 'التفاصيل' : 'Details'}</th></tr></thead><tbody>
    ${entries.map((a) => `<tr><td>${esc(when(a.created_at))}</td><td>${esc(a.user_name || '—')}</td><td>${esc(a.action)}</td><td>${esc(a.entity)} ${esc(a.entity_id || '')}</td><td><details><summary>…</summary><pre style="white-space:pre-wrap;max-width:520px;font-size:.75rem" dir="ltr">${esc(a.before || '')}\n→ ${esc(a.after || '')}</pre></details></td></tr>`).join('')}</tbody></table></div>`;
};

// ------------------------------------------------------------------ launch checklist
VIEWS.setup = async (view) => {
  const fresh = await api('GET', '/me');
  const n = fresh.needsReview;
  const c = n.confirmed || {};
  const row = (ok, label, href) => `<li class="slot"><span>${ok ? '✅' : '⏳'} ${esc(label)}</span>${href ? `<a href="${href}">${esc(tr('edit'))}</a>` : ''}</li>`;
  view.innerHTML = `<h1>${esc(tr('setup'))}</h1><p class="muted">${AR ? 'هذه البنود تحتاج تأكيد المالك أو إعداد خدمات قبل الإطلاق الرسمي.' : 'These items need owner confirmation or service setup before the public launch.'}</p>
    <ul class="slots" style="list-style:none;padding:0">
      ${row(!n.unconfirmedHours, `${AR ? 'ساعات العمل لكل الأيام' : 'Opening hours for every day'}${n.unconfirmedHours ? ` (${n.unconfirmedHours} ${AR ? 'غير مؤكدة' : 'unconfirmed'})` : ''}`, '#/hours')}
      ${row(c.delivery, AR ? 'قرار التوصيل (المناطق والرسوم أو الاستلام فقط)' : 'Delivery decision (zones and fees, or pickup only)', '#/ops')}
      ${row(c.payments, AR ? 'طرق الدفع عند الكاونتر' : 'Payment methods at the counter', '#/ops')}
      ${row(c.vat, AR ? 'الوضع الضريبي والرقم الضريبي' : 'VAT status and number', '#/ops')}
      ${row(c.whatsapp, AR ? 'رقم واتساب مؤكد' : 'Verified WhatsApp number', '#/ops')}
      ${row(c.logo, AR ? 'ملف الشعار الأصلي والألوان الدقيقة' : 'Original logo file and exact colours', '#/design')}
      ${row(c.arabic_name, AR ? 'الاسم التجاري بالعربي' : 'Arabic trading name', '#/content')}
      ${row(c.address, AR ? 'العنوان الوطني' : 'National address', '#/ops')}
      ${row(!n.content.length, `${AR ? 'موافقة على النصوص' : 'Approve site text'}${n.content.length ? `: ${n.content.join(', ')}` : ''}`, '#/content')}
      ${row(!n.items.length, `${AR ? 'مراجعة بيانات الأصناف' : 'Review item details'}${n.items.length ? `: ${n.items.map((i) => `${i.name} (${i.notes.join('; ')})`).join(' · ')}` : ''}`, '#/menu')}
      ${row(fresh.paymentProvider === 'moyasar', AR ? 'حساب الدفع أونلاين — Moyasar (اختياري)' : 'Online payment account — Moyasar (optional)', '#/ops')}
      ${row(fresh.indexing, AR ? 'النطاق الرسمي مفعّل وفهرسة محركات البحث' : 'Official domain live and search indexing on', null)}
    </ul>`;
};

// ------------------------------------------------------------------ boot
(async () => {
  try { me = await api('GET', '/me'); } catch { return; }
  shell();
  connectLive();
  route();
  // keep the new-order badge correct even when another view is open
  if (can('orders.view')) setInterval(async () => { if (!ordersRefresh || !location.hash.includes('orders')) { const { orders } = await api('GET', '/orders?view=active').catch(() => ({ orders: [] })); setBadge(orders.filter((o) => o.orderStatus === 'awaiting_acceptance').length); } }, 30000);
})();
