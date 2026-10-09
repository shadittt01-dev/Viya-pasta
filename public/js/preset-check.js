// Development-only verification harness: renders EVERY declared preset and
// records whether it produced visible output. Used by tests/browser.
import { PRESETS, counts, validateParams, defaultsOf } from '/shared/presets/registry.js';
import { renderPattern } from '/shared/presets/patterns.js';
import { renderThumb, canvasStats } from '/shared/fx3d/mount.js';
import { play } from '/shared/motion/runtime.js';
import { visualAttrs } from '/shared/presets/visual.js';

const report = { counts: counts(), results: [], startedAt: Date.now(), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
const out = document.getElementById('out');
const only = new URLSearchParams(location.search).get('category');

function record(p, ok, info = {}) { report.results.push({ id: p.id, category: p.category, ok, ...info }); out.textContent = `${report.results.length} / ${PRESETS.length}`; }

async function check3d(p) {
  const c = document.createElement('canvas'); c.width = 160; c.height = 100;
  const params = defaultsOf(p);
  await renderThumb({ family: p.family, params }, c);
  const st = canvasStats(c);
  return { ok: st.std > 3, std: Math.round(st.std * 10) / 10 };
}

async function checkPattern(p) {
  const { svg, w, h } = renderPattern(p, defaultsOf(p));
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = Math.max(32, Math.min(256, w * 2)); c.height = Math.max(32, Math.min(256, h * 2));
    const x = c.getContext('2d');
    x.fillStyle = p.params.find((q) => q.key === 'color')?.default === 'white' || p.params.find((q) => q.key === 'color')?.default === 'paper' ? '#2A1B15' : '#FBF6EE';
    x.fillRect(0, 0, c.width, c.height);
    const pat = x.createPattern(img, 'repeat'); x.fillStyle = pat; x.fillRect(0, 0, c.width, c.height);
    const st = canvasStats(c);
    return { ok: st.std > 1, std: Math.round(st.std * 10) / 10, w, h };
  } finally { URL.revokeObjectURL(url); }
}

const stage = document.getElementById('stage');
async function checkMotion(p) {
  stage.innerHTML = '<button class="btn" id="a">A</button><span id="b" class="cart-btn__count">1</span><div id="c" style="position:relative;width:300px"><span id="ind" style="position:absolute;height:3px;background:red"></span></div><p id="d">x</p>';
  const params = { ...defaultsOf(p), duration: 60 };
  const ctx = { from: stage.querySelector('#a'), to: stage.querySelector('#b'), el: stage.querySelector('#d'), open: true, show: true, on: true, text: 'SAR 24', indicator: stage.querySelector('#ind'), toRect: null };
  if (p.family === 'tab') { ctx.from = { x: 0, w: 40 }; ctx.to = { x: 80, w: 60 }; }
  if (p.family === 'page') return { ok: true, note: 'CSS view-transition — compiled into theme.css', reduced: report.reducedMotion };
  const before = document.getAnimations().length;
  const r = play(p.family, p.behaviour, params, ctx);
  const created = document.getAnimations().length - before + (r && typeof r.cancel === 'function' ? 1 : 0);
  if (r && typeof r.then === 'function') await Promise.race([r, new Promise((res) => setTimeout(res, 400))]);
  if (r && typeof r.cancel === 'function') r.cancel();
  for (const a of document.getAnimations()) a.cancel();
  // In reduced-motion mode nothing may animate; otherwise something must.
  const ok = report.reducedMotion ? created === 0 || ['priceTick', 'tab'].includes(p.family) : created > 0;
  return { ok, animations: created };
}

const mock = document.getElementById('mock');
function checkVisual(p) {
  const params = defaultsOf(p);
  for (const [k, v] of Object.entries(visualAttrs(params))) mock.setAttribute(k, v);
  mock.style.setProperty('--hero-h', `${params.heroHeight}vh`);
  const list = mock.querySelector('.menu-list'), mi = mock.querySelector('.mi'), h = mock.querySelector('.hero'), copy = mock.querySelector('.hero__copy');
  const cs = getComputedStyle(list), ms = getComputedStyle(mi), hs = getComputedStyle(h), ps = getComputedStyle(copy), root = getComputedStyle(mock);
  // Everything a customer would see change: layout, card treatment, type scale, spacing, hero form, surface and accent colours.
  const sig = [cs.gridTemplateColumns.split(' ').length, cs.gridAutoFlow, ms.borderRadius, ms.boxShadow, ms.borderTopStyle, ms.borderInlineStartWidth, ms.backgroundColor,
    getComputedStyle(mock.querySelector('.h1')).fontSize, ms.paddingTop, hs.minHeight, hs.alignItems, hs.flexDirection, ps.backgroundColor, ps.textAlign,
    getComputedStyle(mock.querySelector('.btn--primary')).backgroundColor, root.getPropertyValue('--surface').trim(), root.getPropertyValue('--card').trim(), getComputedStyle(mock.querySelector('#mock-band')).backgroundColor].join('|');
  const ok = mi.getBoundingClientRect().height > 0 && h.getBoundingClientRect().height > 0;
  return { ok, signature: sig };
}

async function run() {
  // parameter validation behaviour
  const sample = PRESETS[0];
  const bad = validateParams(sample, { hero: 'not-a-layout', heroHeight: 999, nope: 1 });
  report.validation = { rejectsUnknownOption: bad.errors.some((e) => e.code === 'NOT_AN_OPTION'), clampsRange: bad.params.heroHeight <= 100, flagsUnknownKey: bad.errors.some((e) => e.code === 'UNKNOWN_PARAM') };
  for (const p of PRESETS) {
    if (only && p.category !== only) continue;
    try {
      const info = p.category === '3d' ? await check3d(p) : p.category === 'pattern' ? await checkPattern(p) : p.category === 'motion' ? await checkMotion(p) : checkVisual(p);
      record(p, info.ok, info);
    } catch (e) { record(p, false, { error: String(e?.message || e) }); }
  }
  const sigs = report.results.filter((r) => r.signature).map((r) => r.signature);
  report.visualUniqueSignatures = new Set(sigs).size;
  report.finishedAt = Date.now();
  window.__presetReport = report;
  document.body.dataset.done = '1';
}
run();
