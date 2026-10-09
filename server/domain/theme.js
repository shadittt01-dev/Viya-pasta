// Compiles the published (or draft) design selection into: <html> data
// attributes, a small theme.css, and a client config that names ONLY the
// chosen presets — the full 480-preset gallery is never shipped to customers.
import crypto from 'node:crypto';
import { getSetting } from './settings.js';
import { resolveSelection, getPreset } from '../../shared/presets/registry.js';
import { visualAttrs } from '../../shared/presets/visual.js';
import { renderPattern, patternDataUrl } from '../../shared/presets/patterns.js';
import { token } from '../../shared/presets/params.js';
import { all } from '../db/db.js';
import { pageTransitionCss } from '../../shared/motion/runtime.js';

export const MOTION_SLOTS = ['cartAdd', 'sheet', 'press', 'priceTick', 'toast', 'tab', 'loader', 'reveal', 'hover', 'page', 'status', 'skeleton'];
export const PATTERN_SLOTS = ['menu', 'hero', 'band', 'ticket'];

// The restrained default combination chosen for Via Pasta (see docs/DESIGN.md).
export const DEFAULT_THEME = {
  visual: { id: 'vis-tile-counter-01', params: {} },
  hero3d: { id: '3d-pasta-02', params: {} },
  motion: {
    cartAdd: { id: 'mot-cartadd-03' }, sheet: { id: 'mot-sheet-02' }, press: { id: 'mot-press-01' }, priceTick: { id: 'mot-pricetick-01' },
    toast: { id: 'mot-toast-01' }, tab: { id: 'mot-tab-01' }, loader: { id: 'mot-loader-01' }, reveal: { id: 'mot-reveal-02' },
    hover: { id: 'mot-hover-01' }, page: { id: 'mot-page-01' }, status: { id: 'mot-status-01' }, skeleton: { id: 'mot-skeleton-01' },
  },
  patterns: {
    menu: { id: 'pat-wordmark-01', params: {} },
    hero: { id: 'pat-tile-01', params: { color: 'tile' } },
    band: { id: 'pat-tile-08', params: { color: 'white' } },
    ticket: { id: 'pat-receipt-05', params: {} },
  },
  background: { opacity: 0.07, scale: 1, contrast: 'normal' },
  seasonal: [], // [{ id, params, starts_at, ends_at }] overrides the menu pattern in its window
};

const MAX_OPACITY = { subtle: 0.06, normal: 0.1, bold: 0.14 };

export function normalizeTheme(raw) {
  const t = raw || {};
  const out = { visual: null, hero3d: null, motion: {}, patterns: {}, background: { ...DEFAULT_THEME.background, ...(t.background || {}) }, seasonal: [] , errors: [] };
  const vis = resolveSelection(t.visual || DEFAULT_THEME.visual, 'visual');
  const asSel = (r) => ({ id: r.preset.id, params: r.params });
  out.visual = vis.preset ? asSel(vis) : asSel(resolveSelection(DEFAULT_THEME.visual, 'visual'));
  if (!vis.ok) out.errors.push({ slot: 'visual', errors: vis.errors });
  if (t.hero3d === null) out.hero3d = null;
  else {
    const h = resolveSelection(t.hero3d || DEFAULT_THEME.hero3d, '3d');
    out.hero3d = h.preset ? { id: h.preset.id, family: h.preset.family, params: h.params } : null;
    if (!h.ok) out.errors.push({ slot: 'hero3d', errors: h.errors });
  }
  for (const slot of MOTION_SLOTS) {
    const sel = (t.motion || {})[slot] || DEFAULT_THEME.motion[slot];
    const r = resolveSelection(sel, 'motion');
    const preset = r.preset && r.preset.family === slot ? r.preset : getPreset(DEFAULT_THEME.motion[slot].id);
    out.motion[slot] = { id: preset.id, behaviour: preset.behaviour, params: r.preset === preset ? r.params : resolveSelection({ id: preset.id }).params };
    if (!r.ok) out.errors.push({ slot: `motion.${slot}`, errors: r.errors });
    else if (r.preset.family !== slot) out.errors.push({ slot: `motion.${slot}`, errors: [{ code: 'WRONG_SLOT', id: r.preset.id }] });
  }
  for (const slot of PATTERN_SLOTS) {
    const sel = (t.patterns || {})[slot] || DEFAULT_THEME.patterns[slot];
    const r = resolveSelection(sel, 'pattern');
    out.patterns[slot] = r.preset ? asSel(r) : asSel(resolveSelection(DEFAULT_THEME.patterns[slot], 'pattern'));
    if (!r.ok) out.errors.push({ slot: `patterns.${slot}`, errors: r.errors });
  }
  const bg = out.background;
  bg.contrast = ['subtle', 'normal', 'bold'].includes(bg.contrast) ? bg.contrast : 'normal';
  bg.opacity = Math.min(MAX_OPACITY[bg.contrast], Math.max(0, Number(bg.opacity) || 0));
  bg.scale = Math.min(3, Math.max(0.5, Number(bg.scale) || 1));
  for (const s of Array.isArray(t.seasonal) ? t.seasonal : []) {
    const r = resolveSelection(s, 'pattern');
    if (r.preset && Date.parse(s.starts_at) < Date.parse(s.ends_at)) out.seasonal.push({ id: r.preset.id, params: r.params, starts_at: s.starts_at, ends_at: s.ends_at });
  }
  return out;
}

function patternVars(name, sel, scale = 1) {
  const preset = getPreset(sel.id);
  const r = renderPattern(preset, sel.params);
  return `--pat-${name}: ${patternDataUrl(r.svg)}; --pat-${name}-size: ${Math.round(r.w * scale)}px ${Math.round(r.h * scale)}px;`;
}

export function compileTheme(themeRaw, { nowMs = Date.now(), categoryPresets = [] } = {}) {
  const th = normalizeTheme(themeRaw);
  const v = th.visual.params;
  const attrs = visualAttrs(v);
  const seasonal = th.seasonal.find((s) => Date.parse(s.starts_at) <= nowMs && nowMs < Date.parse(s.ends_at));
  const menuSel = seasonal || th.patterns.menu;
  let css = `:root{--accent:${token(v.accent)};--hero-h:${v.heroHeight}svh;--pat-opacity:${th.background.opacity};`;
  css += patternVars('menu', menuSel, th.background.scale);
  css += patternVars('hero', th.patterns.hero);
  css += patternVars('band', th.patterns.band);
  css += patternVars('ticket', th.patterns.ticket);
  css += '}\n';
  // category-specific backgrounds chosen in the menu editor
  for (const presetId of categoryPresets) {
    const p = getPreset(presetId);
    if (p && p.category === 'pattern') {
      const sel = resolveSelection({ id: p.id }, 'pattern');
      css += `[data-cat-bg="${p.id}"]{${patternVars('cat', { id: p.id, params: sel.params }, th.background.scale)}}\n`;
    }
  }
  css += pageTransitionCss(th.motion.page.behaviour, th.motion.page.params);
  const client = {
    hero3d: th.hero3d, motion: Object.fromEntries(Object.entries(th.motion).map(([k, m]) => [k, { b: m.behaviour, p: m.params }])),
  };
  const attrString = Object.entries(attrs).map(([k, val]) => `${k}="${String(val).replace(/"/g, '')}"`).join(' ');
  const hash = crypto.createHash('sha256').update(css + JSON.stringify(client)).digest('hex').slice(0, 10);
  return { css, attrs: attrString, client, hash, hero3d: th.hero3d, normalized: th };
}

/** settings: the allSettings() object when the caller already has it (saves queries). */
export async function activeThemeAsync({ preview = false } = {}) {
  const [draft, published, bg, categoryPresets] = await Promise.all([preview ? getSetting('theme_draft') : null, getSetting('theme_published'), getSetting('menu_background'), categoryBackgroundPresets()]);
  return activeTheme({ preview, settings: { theme_draft: draft, theme_published: published, menu_background: bg }, categoryPresets });
}

/** Background presets chosen per category in the menu editor. */
export async function categoryBackgroundPresets() {
  return (await all('SELECT DISTINCT background_preset FROM categories WHERE background_preset IS NOT NULL')).map((r) => r.background_preset);
}

export function activeTheme({ preview = false, settings, categoryPresets = [] }) {
  const raw = preview ? settings.theme_draft || settings.theme_published : settings.theme_published;
  const bg = settings.menu_background;
  const merged = raw || { ...DEFAULT_THEME };
  if (!raw && bg) merged.background = { opacity: bg.opacity, scale: bg.scale, contrast: bg.contrast };
  return compileTheme(merged, { categoryPresets });
}
