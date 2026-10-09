// Regenerates docs/PRESETS.md from the registry (the registry is the source of truth).
import fs from 'node:fs';
import { PRESETS, CATEGORIES, counts } from '../shared/presets/registry.js';
import { DEFAULT_THEME } from '../server/domain/theme.js';

const c = counts();
const chosen = new Set([DEFAULT_THEME.visual.id, DEFAULT_THEME.hero3d.id, ...Object.values(DEFAULT_THEME.motion).map((m) => m.id), ...Object.values(DEFAULT_THEME.patterns).map((p) => p.id)]);
let md = `# Preset catalogue\n\nGenerated from \`shared/presets/registry.js\` by \`node scripts/preset-docs.js\`. **${c.total} presets**: ${Object.entries(CATEGORIES).map(([k, v]) => `${c[k]} ${v.toLowerCase()}`).join(', ')}.\n\n`;
md += `Every preset has a stable ID, a name, a category, a renderer label, configurable parameters (validated and clamped on the server), recommended uses, a performance tier and a reduced-motion fallback. Previews render live in the dashboard (Design → Gallery). ★ = part of the default combination chosen for Via Pasta.\n\n`;
md += `Renderer labels are literal: **webgl-3d** = real 3D geometry rendered with WebGL2; **css-depth** = perspective transforms (not real 3D); **css-2d** = 2D Web Animations; **view-transition** = browser page transitions; **svg-pattern** = static 2D SVG tiles; **css-layout** = layout/styling only.\n\n`;
for (const [cat, label] of Object.entries(CATEGORIES)) {
  md += `## ${label} (${c[cat]})\n\n| | ID | Name | Renderer | Perf | Parameters | Reduced motion |\n|---|---|---|---|---|---|---|\n`;
  for (const p of PRESETS.filter((x) => x.category === cat)) {
    const params = p.params.map((q) => (q.type === 'range' ? `${q.key} ${q.min}–${q.max}` : q.type === 'bool' ? `${q.key} on/off` : `${q.key} (${q.options.length})`)).join(', ');
    md += `| ${chosen.has(p.id) ? '★' : ''} | \`${p.id}\` | ${p.name} | ${p.kind} | ${p.perf} | ${params} | ${p.reducedMotion} |\n`;
  }
  md += '\n';
}
fs.writeFileSync(new URL('../docs/PRESETS.md', import.meta.url), md);
console.log(`docs/PRESETS.md written (${c.total} presets)`);
