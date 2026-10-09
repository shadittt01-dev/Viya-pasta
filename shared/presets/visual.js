// 120 visual style & layout presets (12 directions × 10 layout recipes).
// Kind: "css-layout" — each preset is a combination of layout modes that the
// site stylesheet implements via data attributes on <html>. No motion.
import { P } from './params.js';

export const AXES = {
  hero: ['tile-wall', 'split', 'stacked', 'poster', 'counter', 'ticket'],
  menu: ['rows', 'grid2', 'grid3', 'board', 'carousel', 'tickets'],
  card: ['flat', 'paper', 'tile', 'outline', 'sticker'],
  scale: ['compact', 'standard', 'loud'],
  density: ['airy', 'standard', 'dense'],
  radius: ['sharp', 'soft', 'round', 'pill'],
  surface: ['night', 'paper', 'split'],
};

const DIRECTIONS = [
  ['tile-counter', 'Tile Counter', { hero: 'tile-wall', surface: 'split', accent: 'maroon' }, 'Basil-green ceramic tile behind the red street-sign wordmark.'],
  ['wax-paper', 'Wax Paper', { hero: 'stacked', surface: 'paper', accent: 'maroon' }, 'Light paper surfaces printed with the wordmark, like a takeaway napkin.'],
  ['menu-board', 'Menu Board', { hero: 'counter', surface: 'night', accent: 'glow' }, 'An illuminated counter board with prices up front.'],
  ['night-shift', 'Night Shift', { hero: 'tile-wall', surface: 'night', accent: 'glow' }, 'Dark espresso surfaces with warm gold accents for late evenings.'],
  ['poster', 'Poster', { hero: 'poster', surface: 'paper', accent: 'maroon' }, 'Oversized wordmark typography as the main image.'],
  ['receipt', 'Receipt', { hero: 'ticket', surface: 'paper', accent: 'ink' }, 'Order-ticket styling with perforated edges and mono details.'],
  ['neon-edge', 'Neon Edge', { hero: 'poster', surface: 'night', accent: 'glow' }, 'Big type with glowing gold outlines on espresso brown.'],
  ['street-sticker', 'Street Sticker', { hero: 'split', surface: 'split', accent: 'maroon' }, 'Playful tilted labels and badges.'],
  ['editorial-stack', 'Editorial Stack', { hero: 'stacked', surface: 'split', accent: 'tile' }, 'Calm stacked sections with generous whitespace.'],
  ['grid-market', 'Grid Market', { hero: 'split', surface: 'paper', accent: 'tile' }, 'Product-first grid like a market shelf.'],
  ['minimal-counter', 'Minimal Counter', { hero: 'counter', surface: 'paper', accent: 'maroon' }, 'Quiet, fast and text-led.'],
  ['late-night-split', 'Late Night Split', { hero: 'split', surface: 'night', accent: 'maroon' }, 'Split hero with art and copy side by side after dark.'],
];

const RECIPES = [
  ['Printed rows', { menu: 'rows', card: 'paper', scale: 'standard', density: 'standard', radius: 'soft' }],
  ['Two-up cards', { menu: 'grid2', card: 'paper', scale: 'standard', density: 'airy', radius: 'soft' }],
  ['Three-up compact', { menu: 'grid3', card: 'flat', scale: 'compact', density: 'dense', radius: 'sharp' }],
  ['Price board', { menu: 'board', card: 'outline', scale: 'loud', density: 'standard', radius: 'sharp' }],
  ['Swipe shelves', { menu: 'carousel', card: 'tile', scale: 'standard', density: 'standard', radius: 'round' }],
  ['Ticket stubs', { menu: 'tickets', card: 'paper', scale: 'compact', density: 'dense', radius: 'sharp' }],
  ['Sticker rows', { menu: 'rows', card: 'sticker', scale: 'loud', density: 'airy', radius: 'pill' }],
  ['Tile cards', { menu: 'grid2', card: 'tile', scale: 'loud', density: 'standard', radius: 'round' }],
  ['Quiet board', { menu: 'board', card: 'flat', scale: 'compact', density: 'airy', radius: 'soft' }],
  ['Outlined grid', { menu: 'grid3', card: 'outline', scale: 'standard', density: 'standard', radius: 'pill' }],
];

export const VISUAL_PRESETS = DIRECTIONS.flatMap(([slug, dirName, base, desc], di) => RECIPES.map(([rname, r], ri) => {
  const d = { ...base, ...r, heroHeight: [70, 60, 55, 85, 75, 60, 80, 65, 60, 55, 50, 70][di] };
  return {
    id: `vis-${slug}-${String(ri + 1).padStart(2, '0')}`,
    name: `${dirName}: ${rname}`,
    category: 'visual',
    family: slug,
    kind: 'css-layout',
    renderer: 'CSS layout and styling (no motion)',
    params: [
      P.select('hero', AXES.hero, d.hero), P.select('menu', AXES.menu, d.menu), P.select('card', AXES.card, d.card),
      P.select('scale', AXES.scale, d.scale), P.select('density', AXES.density, d.density), P.select('radius', AXES.radius, d.radius),
      P.select('surface', AXES.surface, d.surface), P.token('accent', d.accent, ['maroon', 'tile', 'glow', 'ink']), P.range('heroHeight', 45, 100, 5, d.heroHeight),
    ],
    uses: ['restaurant', 'café', 'food truck', 'retail counter'],
    perf: 'light',
    reducedMotion: 'Static layout — unaffected.',
    description: `${desc} Menu as ${rname.toLowerCase()}.`,
  };
}));

export function visualAttrs(params) {
  return {
    'data-hero': params.hero, 'data-menu': params.menu, 'data-card': params.card, 'data-scale': params.scale,
    'data-density': params.density, 'data-radius': params.radius, 'data-surface': params.surface, 'data-accent': params.accent,
  };
}
