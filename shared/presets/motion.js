// 120 lightweight interface motion & interaction presets (12 slots × 10 behaviours).
// Kinds: "css-2d" (Web Animations API transforms/opacity), "css-depth"
// (perspective transforms — NOT real 3D), "view-transition" (browser View
// Transitions API). Every preset declares its reduced-motion fallback.
import { P } from './params.js';

export const EASINGS = {
  standard: 'cubic-bezier(.2,.0,.0,1)', emphasized: 'cubic-bezier(.3,.0,.0,1.0)', snappy: 'cubic-bezier(.5,0,.1,1)',
  spring: 'cubic-bezier(.34,1.56,.64,1)', linear: 'linear', gentle: 'cubic-bezier(.4,0,.2,1)',
};

const DEPTH = new Set(['tilt-3d', 'tile-flip', 'block-flip', 'unfold', 'rise-rotate', 'flip', 'tilt-press', 'swing']);

const SLOTS = {
  cartAdd: ['Add-to-cart feedback', 'Confirms an item went into the order without opening the cart.',
    ['arc-fly', 'straight-fly', 'badge-pop', 'badge-spin', 'button-check', 'ripple', 'count-roll', 'dot-burst', 'ticket-drop', 'glow-pulse'],
    'Badge count updates instantly with no movement.'],
  sheet: ['Item sheet & drawer', 'How the item sheet and cart drawer enter.',
    ['slide-up', 'spring-up', 'scale-fade', 'from-card', 'slide-side', 'drop-down', 'fade-through', 'unfold', 'clip-reveal', 'stack-rise'],
    'Appears instantly in place.'],
  press: ['Button press', 'Tactile response when a button is pressed.',
    ['depress', 'squish', 'glow-ring', 'underline', 'tilt-press', 'fill-sweep', 'shadow-drop', 'bounce', 'ink-spread', 'shrink-snap'],
    'No movement; focus ring and colour change only.'],
  priceTick: ['Price change', 'How totals change when quantities or options change.',
    ['roll-up', 'roll-down', 'crossfade', 'flip', 'slide-swap', 'scale-swap', 'blink-highlight', 'odometer', 'typewriter', 'fade-color'],
    'New value replaces the old one instantly.'],
  toast: ['Toast message', 'Confirmation messages such as “added to order”.',
    ['slide-bottom', 'slide-side', 'pop', 'drop-top', 'ticket-print', 'fade', 'spring-bottom', 'grow-pill', 'swing', 'rise-stack'],
    'Shown and hidden without movement.'],
  tab: ['Category tab indicator', 'The marker that follows the active menu section.',
    ['slide-underline', 'pill-morph', 'ink-stretch', 'fade-pill', 'dot-follow', 'box-slide', 'thick-bar', 'glow-line', 'grow-center', 'jump-pill'],
    'Indicator jumps to the active tab.'],
  loader: ['Logo loader', 'The short first-visit loading treatment.',
    ['bar-sweep', 'bar-fill', 'tile-fill', 'wordmark-pulse', 'dots', 'ring', 'stripe-scroll', 'block-flip', 'glow-breathe', 'letters'],
    'Static logo; removed as soon as the page is ready.'],
  reveal: ['Hero reveal', 'One orchestrated entrance for the hero headline.',
    ['fade-up', 'clip-wipe', 'tile-flip', 'mask-slide', 'scale-in', 'stagger-up', 'fade', 'slide-side', 'rise-rotate', 'curtain'],
    'Content is visible immediately.'],
  hover: ['Card hover', 'Pointer hover on menu cards (desktop only).',
    ['lift', 'tilt-3d', 'border-glow', 'art-zoom', 'shadow-grow', 'nudge', 'underline-name', 'tint', 'rotate-art', 'raise-art'],
    'No hover movement.'],
  page: ['Page transition', 'Cross-page navigation using the View Transitions API where supported.',
    ['crossfade', 'slide', 'wipe', 'scale', 'fade-up', 'tile-sweep', 'instant', 'split', 'zoom-out', 'push'],
    'Instant navigation.'],
  status: ['Order status steps', 'The order-progress tracker on the status page.',
    ['fill-line', 'check-draw', 'pulse-current', 'step-pop', 'progress-bar', 'dot-chase', 'glow-current', 'tick-in', 'grow-ring', 'bounce-current'],
    'Steps update without animation.'],
  skeleton: ['Loading placeholder', 'Placeholders while prices or status load.',
    ['shimmer', 'pulse', 'wave', 'tile-shimmer', 'stripes', 'fade-blocks', 'sweep-diagonal', 'breathe', 'scan-line', 'dots'],
    'Static grey placeholders.'],
};

const DEFAULT_TIMING = {
  cartAdd: [520, 'emphasized'], sheet: [320, 'emphasized'], press: [140, 'snappy'], priceTick: [260, 'standard'], toast: [280, 'emphasized'],
  tab: [260, 'standard'], loader: [1100, 'gentle'], reveal: [700, 'emphasized'], hover: [200, 'standard'], page: [260, 'standard'],
  status: [500, 'emphasized'], skeleton: [1300, 'linear'],
};

const label = (s) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

export const MOTION_PRESETS = Object.entries(SLOTS).flatMap(([slot, [slotName, desc, behaviours, fallback]]) => behaviours.map((b, i) => {
  const [dur, ease] = DEFAULT_TIMING[slot];
  const durationDefault = Math.round(dur * [1, 0.9, 0.8, 1.1, 1, 1.2, 0.85, 1.05, 0.95, 1.15][i] / 10) * 10;
  return {
    id: `mot-${slot.toLowerCase()}-${String(i + 1).padStart(2, '0')}`,
    name: `${slotName}: ${label(b)}`,
    category: 'motion',
    family: slot,
    behaviour: b,
    kind: slot === 'page' ? 'view-transition' : DEPTH.has(b) ? 'css-depth' : 'css-2d',
    renderer: slot === 'page' ? 'View Transitions API (2D)' : DEPTH.has(b) ? 'CSS perspective transform (not real 3D)' : '2D Web Animations',
    params: [
      P.range('duration', 60, 2400, 10, durationDefault),
      P.select('easing', Object.keys(EASINGS), i % 3 === 2 ? 'spring' : ease),
      P.range('distance', 0, 48, 2, [12, 16, 8, 24, 10, 20, 6, 14, 18, 4][i]),
      P.range('intensity', 0.1, 1, 0.05, [0.6, 0.8, 0.5, 0.7, 0.4, 0.9, 0.55, 0.65, 0.75, 0.45][i]),
    ],
    uses: ['ordering UI', 'restaurant', 'retail'],
    perf: slot === 'loader' || slot === 'skeleton' ? 'light (loops only while visible)' : 'light',
    reducedMotion: fallback,
    description: `${desc} Behaviour: ${label(b).toLowerCase()}.`,
  };
}));

export const MOTION_SLOTS = Object.fromEntries(Object.entries(SLOTS).map(([k, v]) => [k, v[0]]));
