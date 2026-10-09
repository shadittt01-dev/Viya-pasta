// Design studio: searchable gallery of all 480 presets with safe, lazy
// previews; parameter editing with validation; draft → preview → publish.
// Loaded only inside the dashboard — never shipped to customer pages.
import { PRESETS, CATEGORIES, getPreset, searchPresets, validateParams, defaultsOf, counts } from '/shared/presets/registry.js';
import { renderPattern, patternDataUrl, PATTERN_FAMILIES } from '/shared/presets/patterns.js';
import { visualAttrs } from '/shared/presets/visual.js';
import { THREE_FAMILIES } from '/shared/presets/three.js';
import { MOTION_SLOTS } from '/shared/presets/motion.js';
import { play } from '/shared/motion/runtime.js';
import { BRAND_TOKENS } from '/shared/presets/params.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PATTERN_SLOTS = ['menu', 'hero', 'band', 'ticket'];

let ctx, draft, published, defaults;

export async function renderStudio(view, c) {
  ctx = c;
  const t = await ctx.api('GET', '/theme');
  published = t.published; defaults = t.defaults;
  draft = t.draft ? structuredClone(t.draft) : structuredClone(t.published);
  const AR = ctx.AR;
  const n = counts();
  view.innerHTML = `<h1>${esc(ctx.tr('design'))}</h1>
    <p class="muted">${AR ? `${n.total} إعدادًا جاهزًا: ${n.visual} للتخطيط، ${n['3d']} مشهد ثلاثي الأبعاد حقيقي، ${n.motion} حركة للواجهة، ${n.pattern} خلفية ونقشة. الموقع يحمّل فقط ما تختاره.` : `${n.total} presets: ${n.visual} layout styles, ${n['3d']} real 3D scenes, ${n.motion} interface motions, ${n.pattern} backgrounds and patterns. The site loads only what you choose.`}</p>
    <div class="card bar" id="draftbar"></div>
    <div class="grid2"><section class="card"><h2 style="margin-top:0">${AR ? 'الاختيار الحالي (مسودة)' : 'Current selection (draft)'}</h2><div class="slots" id="slots"></div></section>
      <section class="card"><h2 style="margin-top:0">${AR ? 'خلفية المنيو' : 'Menu background'}</h2><form class="form" id="bgf">
        <label>${AR ? 'الشفافية' : 'Opacity'} <input type="range" name="opacity" min="0" max="0.14" step="0.005" value="${draft.background.opacity}"></label>
        <label>${AR ? 'الحجم' : 'Scale'} <input type="range" name="scale" min="0.5" max="3" step="0.1" value="${draft.background.scale}"></label>
        <label>${AR ? 'التباين (حد أقصى للوضوح)' : 'Contrast (caps opacity for legibility)'}<select name="contrast">${['subtle', 'normal', 'bold'].map((k) => `<option ${draft.background.contrast === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <p class="muted">${AR ? 'الشفافية محدودة دائمًا حتى تبقى الأسعار والنصوص واضحة.' : 'Opacity is always capped so prices and text stay readable.'}</p></form>
        <h2>${AR ? 'خلفية موسمية' : 'Seasonal background'}</h2><div id="seasonal"></div></section></div>
    <h2>${AR ? 'المعرض' : 'Gallery'}</h2>
    <div class="bar"><input type="search" id="q" placeholder="${AR ? 'ابحث: tile, pasta, wordmark…' : 'Search: tile, pasta, wordmark…'}" style="min-height:40px;padding:6px 10px;border:1px solid #D5C5B1;border-radius:8px;min-width:220px">
      <select id="cat"><option value="">${AR ? 'كل الفئات' : 'All categories'}</option>${Object.entries(CATEGORIES).map(([k, l]) => `<option value="${k}">${esc(l)} (${n[k]})</option>`).join('')}</select>
      <select id="fam"><option value="">${AR ? 'كل العائلات' : 'All families'}</option></select>
      <select id="perf"><option value="">${AR ? 'كل مستويات الأداء' : 'Any performance tier'}</option><option value="light">light</option><option value="medium">medium</option></select>
      <span class="muted" id="resultcount"></span></div>
    <div class="studio__grid" id="grid"></div><div id="detail"></div>`;
  renderDraftBar(); renderSlots(); renderSeasonal();
  const famSel = $('#fam');
  const famsFor = (cat) => {
    const fams = new Map();
    for (const p of PRESETS) if (!cat || p.category === cat) fams.set(p.family, ({ ...PATTERN_FAMILIES, ...THREE_FAMILIES, ...MOTION_SLOTS }[p.family] || p.family));
    famSel.innerHTML = `<option value="">${AR ? 'كل العائلات' : 'All families'}</option>${[...fams].map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}`;
  };
  famsFor('');
  $('#cat').onchange = (e) => { famsFor(e.target.value); renderGrid(); };
  famSel.onchange = renderGrid; $('#perf').onchange = renderGrid;
  let qt; $('#q').oninput = () => { clearTimeout(qt); qt = setTimeout(renderGrid, 200); };
  $('#bgf').oninput = (e) => { const f = e.currentTarget; draft.background = { opacity: Number(f.elements.opacity.value), scale: Number(f.elements.scale.value), contrast: f.elements.contrast.value }; saveDraft(); };
  renderGrid();
}

// ------------------------------------------------------------------ draft state
let saveTimer = null;
function saveDraft() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { const r = await ctx.api('PUT', '/theme/draft', draft); draft = r.draft; renderDraftBar(); renderSlots(); } catch (e) { if (e.body?.errors) ctx.toast(JSON.stringify(e.body.errors[0]), true); }
  }, 300);
}

function renderDraftBar() {
  const AR = ctx.AR;
  const differs = JSON.stringify(stripErr(draft)) !== JSON.stringify(stripErr(published));
  $('#draftbar').innerHTML = `<strong>${differs ? (AR ? 'لديك تغييرات تصميم غير منشورة' : 'You have unpublished design changes') : (AR ? 'المسودة مطابقة للمنشور' : 'Draft matches what is live')}</strong><span class="spacer"></span>
    <a class="btn btn--line btn--sm" href="/${ctx.L}?preview=1" target="_blank" rel="noopener">${AR ? 'معاينة الموقع بالمسودة' : 'Preview site with draft'}</a>
    <a class="btn btn--line btn--sm" href="/${ctx.L}/menu?preview=1" target="_blank" rel="noopener">${AR ? 'معاينة المنيو' : 'Preview menu'}</a>
    ${ctx.can('design.publish') ? `<button class="btn btn--primary btn--sm" id="pub" ${differs ? '' : 'disabled'}>${ctx.tr('publish')}</button>` : ''}
    <button class="btn btn--line btn--sm" id="reset">${AR ? 'استعادة الإعدادات الافتراضية' : 'Restore defaults'}</button>
    <button class="btn btn--line btn--sm" id="discard" ${differs ? '' : 'disabled'}>${AR ? 'تجاهل المسودة' : 'Discard draft'}</button>`;
  $('#pub')?.addEventListener('click', async () => { if (!confirm(ctx.tr('confirmPublish'))) return; await ctx.api('POST', '/theme/publish'); published = structuredClone(draft); ctx.toast(ctx.tr('published')); renderDraftBar(); });
  $('#reset').onclick = async () => { const r = await ctx.api('POST', '/theme/reset'); draft = r.draft; renderDraftBar(); renderSlots(); };
  $('#discard').onclick = async () => { await ctx.api('DELETE', '/theme/draft'); draft = structuredClone(published); renderDraftBar(); renderSlots(); };
}
const stripErr = (t) => { const { errors: _e, ...rest } = t || {}; return rest; };

function renderSlots() {
  const AR = ctx.AR;
  const name = (id) => getPreset(id)?.name || id;
  const rows = [
    [AR ? 'التخطيط والأسلوب' : 'Layout & style', draft.visual?.id, 'visual'],
    [AR ? 'مشهد البطل ثلاثي الأبعاد' : 'Hero 3D scene', draft.hero3d?.id || (AR ? 'بدون (صورة ثابتة)' : 'None (static art)'), '3d'],
    ...PATTERN_SLOTS.map((s) => [`${AR ? 'نقشة' : 'Pattern'}: ${s}`, draft.patterns[s]?.id, 'pattern']),
    ...Object.keys(MOTION_SLOTS).map((s) => [`${AR ? 'حركة' : 'Motion'}: ${MOTION_SLOTS[s]}`, draft.motion[s]?.id, 'motion']),
  ];
  $('#slots').innerHTML = rows.map(([label, id, cat]) => `<div class="slot"><span><strong>${esc(label)}</strong><br><span class="muted">${esc(id && getPreset(id) ? name(id) : id)}</span></span><button class="btn btn--line btn--sm" data-browse="${cat}">${AR ? 'تغيير' : 'Change'}</button></div>`).join('')
    + `<div class="slot"><span>${AR ? 'إيقاف مشهد ثلاثي الأبعاد' : 'Turn off the 3D hero'}</span><button class="btn btn--line btn--sm" id="no3d">${AR ? 'إيقاف' : 'Off'}</button></div>`;
  for (const b of $$('[data-browse]')) b.onclick = () => { $('#cat').value = b.dataset.browse; $('#cat').dispatchEvent(new Event('change')); $('#grid').scrollIntoView({ behavior: 'smooth' }); };
  $('#no3d').onclick = () => { draft.hero3d = null; saveDraft(); };
}

function renderSeasonal() {
  const AR = ctx.AR;
  const box = $('#seasonal');
  const list = draft.seasonal || [];
  box.innerHTML = `${list.map((s, i) => `<div class="slot"><span>${esc(getPreset(s.id)?.name || s.id)}<br><span class="muted">${esc(s.starts_at.slice(0, 16))} → ${esc(s.ends_at.slice(0, 16))}</span></span><button class="btn btn--line btn--sm" data-rmseason="${i}">${ctx.tr('delete')}</button></div>`).join('') || `<p class="muted">${AR ? 'لا يوجد' : 'None'}</p>`}
    <p class="muted">${AR ? 'لإضافة خلفية موسمية: افتح نقشة من المعرض واختر «استخدام كخلفية موسمية».' : 'To add one: open a pattern in the gallery and choose “Use as seasonal background”.'}</p>`;
  box.onclick = (e) => { const b = e.target.closest('[data-rmseason]'); if (b) { draft.seasonal.splice(Number(b.dataset.rmseason), 1); saveDraft(); renderSeasonal(); } };
}

// ------------------------------------------------------------------ gallery with lazy previews
let thumbQueue = Promise.resolve();
let io = null;

function renderGrid() {
  const list = searchPresets({ q: $('#q').value, category: $('#cat').value || null, family: $('#fam').value || null, perf: $('#perf').value || null });
  $('#resultcount').textContent = `${list.length}`;
  const grid = $('#grid');
  io?.disconnect();
  grid.innerHTML = list.map((p) => `<button type="button" class="pcard" data-id="${p.id}" aria-pressed="${isSelected(p)}">
    <span class="pcard__prev" data-prev="${p.id}"></span>
    <span class="pcard__body"><b>${esc(p.name)}</b><span>${esc(p.id)} · ${esc(p.kind)} · ${esc(p.perf)}</span></span></button>`).join('');
  io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { io.unobserve(en.target); preview(en.target); }
  }, { rootMargin: '200px' });
  for (const el of $$('[data-prev]', grid)) io.observe(el);
  grid.onclick = (e) => { const c = e.target.closest('.pcard'); if (c) openDetail(getPreset(c.dataset.id)); };
  grid.onpointerover = (e) => { const c = e.target.closest('.pcard'); const p = c && getPreset(c.dataset.id); if (p?.category === 'motion') demoMotion(p, $('[data-prev]', c)); };
}

function isSelected(p) {
  if (p.category === 'visual') return draft.visual?.id === p.id;
  if (p.category === '3d') return draft.hero3d?.id === p.id;
  if (p.category === 'motion') return draft.motion[p.family]?.id === p.id;
  return Object.values(draft.patterns).some((s) => s?.id === p.id);
}

function preview(el, params) {
  const p = getPreset(el.dataset.prev);
  const prm = params || defaultsOf(p);
  if (p.category === 'pattern') {
    const r = renderPattern(p, prm);
    const dark = ['white', 'paper', 'glow'].includes(prm.color);
    el.innerHTML = `<div class="patprev" style="background-color:${dark ? '#2A1B15' : '#FBF6EE'};background-image:${patternDataUrl(r.svg)};background-size:${r.w}px ${r.h}px"></div>`;
  } else if (p.category === '3d') {
    const c = document.createElement('canvas'); c.width = 320; c.height = 200;
    el.replaceChildren(c);
    thumbQueue = thumbQueue.then(async () => {
      const { renderThumb } = await import('/shared/fx3d/mount.js');
      try { await renderThumb({ family: p.family, params: prm }, c); } catch { el.textContent = 'WebGL unavailable'; }
    });
  } else if (p.category === 'visual') {
    el.innerHTML = visualMock(prm, 0.2);
  } else {
    el.innerHTML = motionDemoMarkup(p);
  }
}

function visualMock(prm, scale) {
  const attrs = Object.entries(visualAttrs(prm)).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
  return `<div ${attrs} style="width:${100 / scale}%;transform:scale(${scale});transform-origin:top left;pointer-events:none"><div class="vprev" style="--hero-h:${prm.heroHeight}svh">
    <section class="hero"><div class="hero__stage"><div class="hero__fallback"></div></div><div class="hero__copy wrap"><h1 class="display">VIA PASTA</h1><a class="btn btn--primary">Order</a></div></section>
    <ul class="menu-list">${['Alfredo', 'Pesto', 'Mex Sauce', 'Bolognese'].map((n) => `<li class="mi"><span class="mi__art"></span><div class="mi__main"><h3 class="mi__name">${n}</h3><p class="mi__desc">Pasta with chicken, shrimp or vegetables</p></div><div class="mi__buy"><span class="price">SAR 21</span><span class="add-btn add-btn--round">+</span></div></li>`).join('')}</ul></div></div>`;
}

function motionDemoMarkup(p) {
  return `<div class="motion-demo"><button class="btn btn--primary btn--sm" data-demo-a>${esc(p.family)}</button><span class="cart-btn__count" data-demo-b style="display:inline-grid">3</span><span data-demo-c class="price">SAR 24</span><span data-demo-ind style="position:absolute;bottom:8px;left:0;height:3px;width:40px;background:#A8322A"></span></div>`;
}

function demoMotion(p, el, params) {
  const prm = params || defaultsOf(p);
  if (!el.querySelector('[data-demo-a]')) el.innerHTML = motionDemoMarkup(p);
  const a = $('[data-demo-a]', el), b = $('[data-demo-b]', el), c = $('[data-demo-c]', el), ind = $('[data-demo-ind]', el);
  const f = p.family;
  const run = {
    cartAdd: () => play(f, p.behaviour, prm, { from: a, to: b }),
    sheet: () => play(f, p.behaviour, prm, { el: a, open: true }),
    press: () => play(f, p.behaviour, prm, { el: a }),
    priceTick: () => play(f, p.behaviour, prm, { el: c, text: c.textContent === 'SAR 24' ? 'SAR 48' : 'SAR 24' }),
    toast: () => play(f, p.behaviour, prm, { el: a, show: true }),
    tab: () => play(f, p.behaviour, prm, { indicator: ind, from: { x: 0, w: 40 }, to: { x: 120, w: 60 } }),
    loader: () => { const an = play(f, p.behaviour, prm, { el: a }); setTimeout(() => an?.cancel?.(), 2400); },
    reveal: () => play(f, p.behaviour, prm, { el: c }),
    hover: () => { play(f, p.behaviour, prm, { el: a, on: true }); setTimeout(() => play(f, p.behaviour, prm, { el: a, on: false }), 700); },
    page: () => play('reveal', 'fade', { ...prm }, { el }),
    status: () => play(f, p.behaviour, prm, { el: b }),
    skeleton: () => { const an = play(f, p.behaviour, prm, { el: c }); setTimeout(() => an?.cancel?.(), 2400); },
  }[f];
  run?.();
}

// ------------------------------------------------------------------ detail panel with parameter editor
let liveCtl = null;
async function openDetail(p) {
  const AR = ctx.AR;
  liveCtl?.destroy(); liveCtl = null;
  const current = p.category === 'visual' ? draft.visual : p.category === '3d' ? draft.hero3d : p.category === 'motion' ? draft.motion[p.family] : Object.values(draft.patterns).find((s) => s?.id === p.id);
  let params = current?.id === p.id ? { ...defaultsOf(p), ...current.params } : defaultsOf(p);
  const box = $('#detail');
  box.innerHTML = `<section class="card" id="det" tabindex="-1"><div class="bar"><h2 style="margin:0">${esc(p.name)}</h2><span class="pill">${esc(p.id)}</span><span class="pill pill--info">${esc(p.kind)}</span><span class="pill">${esc(p.perf)}</span><span class="spacer"></span><button class="btn btn--line btn--sm" id="detclose">${ctx.tr('close')}</button></div>
    <p>${esc(p.description)}</p><p class="muted">${AR ? 'العارض' : 'Renderer'}: ${esc(p.renderer)} · ${AR ? 'تقليل الحركة' : 'Reduced motion'}: ${esc(p.reducedMotion)} · ${AR ? 'مناسب لـ' : 'Good for'}: ${esc(p.uses.join(', '))}</p>
    <div class="studio__detail"><div class="stage" id="stage"></div><form class="form" id="pf"></form></div>
    <div class="bar" id="useacts"></div><p class="muted" id="perr" aria-live="polite"></p></section>`;
  $('#detclose').onclick = () => { liveCtl?.destroy(); box.innerHTML = ''; };
  const stage = $('#stage');
  const form = $('#pf');
  form.innerHTML = p.params.map((q) => {
    const v = params[q.key];
    if (q.type === 'range') return `<label>${esc(q.label)} <span class="muted">${v}</span><input type="range" name="${q.key}" min="${q.min}" max="${q.max}" step="${q.step}" value="${v}"></label>`;
    if (q.type === 'bool') return `<label class="check"><input type="checkbox" name="${q.key}" ${v ? 'checked' : ''}>${esc(q.label)}</label>`;
    if (q.type === 'token') return `<label>${esc(q.label)}<select name="${q.key}">${q.options.map((o) => `<option value="${o}" ${o === v ? 'selected' : ''}>${o} ${BRAND_TOKENS[o] || ''}</option>`).join('')}</select></label>`;
    return `<label>${esc(q.label)}<select name="${q.key}">${q.options.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  }).join('') + `<button type="button" class="btn btn--line btn--sm" id="pdef">${AR ? 'استعادة القيم الافتراضية' : 'Restore defaults'}</button>`;
  const readForm = () => {
    const raw = {};
    for (const q of p.params) { const el = form.elements[q.key]; raw[q.key] = q.type === 'bool' ? el.checked : q.type === 'range' ? Number(el.value) : el.value; }
    const v = validateParams(p, raw);
    $('#perr').textContent = v.ok ? '' : v.errors.map((e) => `${e.key}: ${e.code}`).join(', ');
    return v.params;
  };
  const refresh = async () => {
    params = readForm();
    for (const lab of $$('label', form)) { const r = $('input[type=range]', lab); if (r) $('.muted', lab).textContent = r.value; }
    if (p.category === '3d') {
      liveCtl?.destroy();
      stage.innerHTML = '';
      const { mountScene } = await import('/shared/fx3d/mount.js');
      liveCtl = await mountScene(stage, { family: p.family, params }, { still: matchMedia('(prefers-reduced-motion: reduce)').matches, dpr: Math.min(1.5, devicePixelRatio || 1) });
      if (!liveCtl) stage.textContent = 'WebGL2 unavailable on this device — the site shows the static art instead.';
    } else if (p.category === 'pattern') {
      const r = renderPattern(p, params);
      const dark = ['white', 'paper', 'glow'].includes(params.color);
      stage.innerHTML = `<div style="width:100%;height:320px;background-color:${dark ? '#2A1B15' : '#FBF6EE'};background-image:${patternDataUrl(r.svg)};background-size:${r.w}px ${r.h}px"></div>`;
    } else if (p.category === 'visual') {
      stage.innerHTML = `<div style="width:100%;height:320px;overflow:hidden">${visualMock(params, 0.45)}</div>`;
    } else {
      stage.innerHTML = `<div style="position:relative;width:100%">${motionDemoMarkup(p)}</div><p><button type="button" class="btn btn--line btn--sm" id="replay">${AR ? 'تشغيل' : 'Play'}</button></p>`;
      $('#replay').onclick = () => demoMotion(p, stage.firstElementChild, params);
      demoMotion(p, stage.firstElementChild, params);
    }
  };
  let rt; form.oninput = () => { clearTimeout(rt); rt = setTimeout(refresh, 250); };
  $('#pdef').onclick = () => { const d = defaultsOf(p); for (const q of p.params) { const el = form.elements[q.key]; if (q.type === 'bool') el.checked = d[q.key]; else el.value = d[q.key]; } refresh(); };
  const acts = $('#useacts');
  const sel = () => ({ id: p.id, params: readForm() });
  if (p.category === 'visual') acts.innerHTML = `<button class="btn btn--primary" data-use="visual">${AR ? 'استخدام كأسلوب الموقع' : 'Use as site style'}</button>`;
  if (p.category === '3d') acts.innerHTML = `<button class="btn btn--primary" data-use="hero3d">${AR ? 'استخدام في البطل' : 'Use in the hero'}</button>`;
  if (p.category === 'motion') acts.innerHTML = `<button class="btn btn--primary" data-use="motion">${AR ? `استخدام لـ ${MOTION_SLOTS[p.family]}` : `Use for ${MOTION_SLOTS[p.family]}`}</button>`;
  if (p.category === 'pattern') {
    acts.innerHTML = PATTERN_SLOTS.map((s) => `<button class="btn btn--line" data-use="pattern" data-slot="${s}">${AR ? 'استخدام في' : 'Use for'} ${s}</button>`).join('')
      + `<span class="spacer"></span><label>${AR ? 'من' : 'From'} <input type="date" id="sfrom"></label><label>${AR ? 'إلى' : 'To'} <input type="date" id="sto"></label><button class="btn btn--line" data-use="seasonal">${AR ? 'استخدام كخلفية موسمية' : 'Use as seasonal background'}</button>`;
  }
  acts.onclick = (e) => {
    const b = e.target.closest('[data-use]'); if (!b) return;
    const use = b.dataset.use;
    if (use === 'visual') draft.visual = sel();
    if (use === 'hero3d') draft.hero3d = sel();
    if (use === 'motion') draft.motion[p.family] = sel();
    if (use === 'pattern') draft.patterns[b.dataset.slot] = sel();
    if (use === 'seasonal') {
      const f = $('#sfrom').value, t = $('#sto').value;
      if (!f || !t || t <= f) { ctx.toast(AR ? 'اختر تاريخ بداية ونهاية صحيحين' : 'Choose a valid start and end date', true); return; }
      draft.seasonal = [...(draft.seasonal || []), { ...sel(), starts_at: new Date(`${f}T00:00:00+03:00`).toISOString(), ends_at: new Date(`${t}T23:59:00+03:00`).toISOString() }];
      renderSeasonal();
    }
    saveDraft();
    ctx.toast(ctx.tr('saved'));
    for (const c of $$('.pcard')) c.setAttribute('aria-pressed', String(isSelected(getPreset(c.dataset.id))));
  };
  await refresh();
  $('#det').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#det').focus({ preventScroll: true });
}
