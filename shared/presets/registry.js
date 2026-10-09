// Preset registry: 480 presets across four categories. Shared by the server
// (validation, theme compilation, tests) and the studio gallery.
import { VISUAL_PRESETS } from './visual.js';
import { THREE_PRESETS } from './three.js';
import { MOTION_PRESETS } from './motion.js';
import { PATTERN_PRESETS } from './patterns.js';
import { defaultsOf, validateParams } from './params.js';

export const CATEGORIES = {
  visual: 'Visual style & layout',
  '3d': '3D scenes & animation',
  motion: 'Interface motion & interaction',
  pattern: 'Backgrounds, textures & patterns',
};

export const PRESETS = [...VISUAL_PRESETS, ...THREE_PRESETS, ...MOTION_PRESETS, ...PATTERN_PRESETS];

const BY_ID = new Map(PRESETS.map((p) => [p.id, p]));

export function getPreset(id) { return BY_ID.get(id) || null; }

export function counts() {
  const c = {};
  for (const p of PRESETS) c[p.category] = (c[p.category] || 0) + 1;
  return { ...c, total: PRESETS.length };
}

export function searchPresets({ q = '', category = null, family = null, perf = null } = {}) {
  const terms = String(q).toLowerCase().split(/\s+/).filter(Boolean);
  return PRESETS.filter((p) => (!category || p.category === category) && (!family || p.family === family) && (!perf || p.perf.startsWith(perf))
    && terms.every((t) => `${p.id} ${p.name} ${p.description} ${p.kind} ${p.uses.join(' ')}`.toLowerCase().includes(t)));
}

/** Validate a {id, params} selection. Returns { ok, preset, params, errors }. */
export function resolveSelection(sel, expectCategory) {
  if (!sel || !sel.id) return { ok: false, errors: [{ code: 'MISSING' }] };
  const preset = getPreset(sel.id);
  if (!preset) return { ok: false, errors: [{ code: 'UNKNOWN_PRESET', id: sel.id }] };
  if (expectCategory && preset.category !== expectCategory) return { ok: false, errors: [{ code: 'WRONG_CATEGORY', expected: expectCategory }] };
  const v = validateParams(preset, sel.params || {});
  return { ok: v.ok, preset, params: v.params, errors: v.errors };
}

export { defaultsOf, validateParams };
