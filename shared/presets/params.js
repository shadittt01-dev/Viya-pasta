// Preset parameter schema helpers: defaults, validation and safe clamping.
// Colours are restricted to brand tokens so owners cannot drift off-brand.

export const BRAND_TOKENS = {
  maroon: '#A8322A', maroonDeep: '#7A231D', tile: '#2E5B3F', tileDeep: '#1E3F2B', night: '#2A1B15',
  glow: '#E8B649', paper: '#FBF6EE', ink: '#2B201B', cheese: '#F0B429', bun: '#E8A65A', white: '#FFFFFF',
};

export const P = {
  range: (key, min, max, step, def, label) => ({ key, type: 'range', min, max, step, default: def, label: label || key }),
  select: (key, options, def, label) => ({ key, type: 'select', options, default: def, label: label || key }),
  token: (key, def, options = Object.keys(BRAND_TOKENS), label) => ({ key, type: 'token', options, default: def, label: label || key }),
  bool: (key, def, label) => ({ key, type: 'bool', default: def, label: label || key }),
};

export function defaultsOf(preset) {
  return Object.fromEntries(preset.params.map((p) => [p.key, p.default]));
}

/**
 * Validate params against a preset's schema.
 * Returns { ok, params (clamped/sanitised), errors: [{key, code}] }.
 * Unknown keys are dropped; wrong types fall back to defaults and are reported.
 */
export function validateParams(preset, input = {}) {
  const out = {};
  const errors = [];
  for (const p of preset.params) {
    const v = input[p.key];
    if (v === undefined) { out[p.key] = p.default; continue; }
    switch (p.type) {
      case 'range': {
        const n = Number(v);
        if (!Number.isFinite(n)) { errors.push({ key: p.key, code: 'NOT_A_NUMBER' }); out[p.key] = p.default; break; }
        const clamped = Math.min(p.max, Math.max(p.min, n));
        if (clamped !== n) errors.push({ key: p.key, code: 'OUT_OF_RANGE' });
        out[p.key] = Math.round(clamped / p.step) * p.step;
        out[p.key] = Number(out[p.key].toFixed(4));
        break;
      }
      case 'select':
      case 'token':
        if (!p.options.includes(v)) { errors.push({ key: p.key, code: 'NOT_AN_OPTION' }); out[p.key] = p.default; } else out[p.key] = v;
        break;
      case 'bool':
        if (typeof v !== 'boolean') { errors.push({ key: p.key, code: 'NOT_A_BOOLEAN' }); out[p.key] = p.default; } else out[p.key] = v;
        break;
      default:
        out[p.key] = p.default;
    }
  }
  for (const k of Object.keys(input || {})) if (!preset.params.some((p) => p.key === k)) errors.push({ key: k, code: 'UNKNOWN_PARAM' });
  return { ok: errors.length === 0, params: out, errors };
}

/** Deterministic PRNG for reproducible pattern scatter. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}

export function token(name) { return BRAND_TOKENS[name] || name; }
