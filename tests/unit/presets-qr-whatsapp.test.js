import { test, before } from 'node:test';
import { isolatedEnv } from '../helpers.js';
import assert from 'node:assert/strict';
import { PRESETS, counts, validateParams, defaultsOf, resolveSelection } from '../../shared/presets/registry.js';
import { renderPattern } from '../../shared/presets/patterns.js';
import { encodeQr } from '../../server/qr/qrcode.js';
import { qrPng } from '../../server/qr/render.js';
import { waLink, orderMessage } from '../../shared/whatsapp.js';

let compileTheme, normalizeTheme, DEFAULT_THEME;
before(async () => {
  isolatedEnv();
  const db = await import('../../server/db/db.js');
  db.openDb(process.env.DATABASE_PATH);
  db.migrate();
  ({ compileTheme, normalizeTheme, DEFAULT_THEME } = await import('../../server/domain/theme.js'));
});

test('preset registry: exactly 120 per category, 480 total, stable unique ids', () => {
  assert.deepEqual(counts(), { visual: 120, '3d': 120, motion: 120, pattern: 120, total: 480 });
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, 480);
  for (const p of PRESETS) {
    for (const f of ['id', 'name', 'category', 'family', 'kind', 'params', 'uses', 'perf', 'reducedMotion', 'description']) assert.ok(p[f] !== undefined && p[f] !== '', `${p.id} missing ${f}`);
    assert.ok(Array.isArray(p.params) && p.params.length >= 1, `${p.id} has configurable parameters`);
  }
});

test('preset registry: kinds are labelled honestly', () => {
  for (const p of PRESETS.filter((x) => x.category === '3d')) assert.equal(p.kind, 'webgl-3d');
  for (const p of PRESETS.filter((x) => x.category === 'pattern')) assert.equal(p.kind, 'svg-pattern');
  for (const p of PRESETS.filter((x) => x.category === 'visual')) assert.equal(p.kind, 'css-layout');
  for (const p of PRESETS.filter((x) => x.category === 'motion')) assert.ok(['css-2d', 'css-depth', 'view-transition'].includes(p.kind));
  assert.ok(PRESETS.some((p) => p.kind === 'css-depth'), 'perspective effects are labelled css-depth, not 3D');
});

test('preset registry: no renamed copies — every preset differs structurally, not only by colour', () => {
  const sig = (p) => {
    const d = defaultsOf(p);
    const structural = Object.fromEntries(Object.entries(d).filter(([k]) => !['color', 'accent', 'speed', 'duration', 'easing', 'intensity'].includes(k)));
    return `${p.category}|${p.family}|${p.behaviour || ''}|${JSON.stringify(structural)}`;
  };
  const sigs = PRESETS.map(sig);
  assert.equal(new Set(sigs).size, 480, 'each preset has a distinct structural configuration');
});

test('every pattern preset renders a valid, distinct SVG tile', () => {
  const out = new Set();
  for (const p of PRESETS.filter((x) => x.category === 'pattern')) {
    const r = renderPattern(p, defaultsOf(p));
    assert.ok(r.w > 0 && r.h > 0 && r.svg.startsWith('<svg') && !/NaN|undefined/.test(r.svg), p.id);
    out.add(r.svg);
  }
  assert.equal(out.size, 120);
});

test('parameter validation rejects invalid input and clamps ranges', () => {
  const p = PRESETS.find((x) => x.category === '3d');
  const r = validateParams(p, { speed: 99, wave: 'zigzag', glowSweep: 'yes', bogus: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.params.speed, 2);
  assert.equal(r.params.wave, defaultsOf(p).wave);
  assert.deepEqual(r.errors.map((e) => e.code).sort(), ['NOT_AN_OPTION', 'NOT_A_BOOLEAN', 'OUT_OF_RANGE', 'UNKNOWN_PARAM']);
  assert.equal(resolveSelection({ id: 'nope' }).errors[0].code, 'UNKNOWN_PRESET');
  assert.equal(resolveSelection({ id: p.id }, 'pattern').errors[0].code, 'WRONG_CATEGORY');
});

test('theme: only the chosen presets are shipped; invalid selections fall back safely', () => {
  const c = compileTheme(DEFAULT_THEME);
  assert.ok(c.client.hero3d && c.client.hero3d.family === 'pasta');
  assert.equal(Object.keys(c.client.motion).length, 12, 'one preset per motion slot, not the whole catalogue');
  assert.ok(!JSON.stringify(c.client).includes('pat-sesame'), 'unchosen presets are not in the client config');
  const bad = normalizeTheme({ visual: { id: 'vis-nope' }, motion: { cartAdd: { id: 'mot-sheet-01' } }, background: { opacity: 0.9, contrast: 'subtle' } });
  assert.equal(bad.visual.id, 'vis-tile-counter-01');
  assert.equal(bad.motion.cartAdd.id, 'mot-cartadd-03', 'a preset from another slot is rejected');
  assert.equal(bad.background.opacity, 0.06, 'pattern opacity is capped for legibility');
  assert.ok(bad.errors.length >= 2);
});

test('QR: encoder output has correct size, finder patterns and quiet zone', () => {
  const q = encodeQr('https://example.sa/ar/menu', { ecl: 'Q' });
  assert.equal(q.size, q.version * 4 + 17);
  for (const [x, y] of [[0, 0], [q.size - 7, 0], [0, q.size - 7]]) {
    assert.equal(q.modules[y][x], true); assert.equal(q.modules[y + 3][x + 3], true); assert.equal(q.modules[y + 1][x + 1], false);
  }
  const png = qrPng('https://example.sa/ar/menu');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.throws(() => encodeQr('x'.repeat(400), { ecl: 'H' }), /QR_TOO_LONG/);
});

test('WhatsApp: summary is readable and fully URL-encoded; opening it is only a draft', () => {
  const text = orderMessage({ ref: 'H7K3QX', currency: 'SAR', items: [{ name: 'همبو & "Humbo"', qty: 2, options: ['بهارات'], note: 'بدون بصل #1' }], fulfillmentType: 'pickup', scheduledLabel: 'اليوم 9:00 م', totals: { subtotal: 4800, discount: 0, deliveryFee: 0, total: 4800 }, paymentLabel: 'الدفع عند الاستلام' }, 'ar');
  assert.match(text, /H7K3QX/);
  assert.match(text, /2 × همبو/);
  const link = waLink('+966 55 461 5386', text);
  assert.ok(link.startsWith('https://wa.me/966554615386?text='));
  assert.ok(!/[\s&#"]/.test(link.split('?text=')[1]), 'no raw spaces, ampersands, hashes or quotes');
  assert.equal(decodeURIComponent(link.split('?text=')[1]), text);
  assert.equal(waLink('not a number', 'x'), null);
});
