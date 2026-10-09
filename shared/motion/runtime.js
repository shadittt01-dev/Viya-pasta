// Motion runtime for the 120 interface-motion presets. Uses the Web Animations
// API (transform/opacity only — cheap to composite). Every call honours
// prefers-reduced-motion by applying the end state with no movement.
import { EASINGS } from '../presets/motion.js';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (p) => EASINGS[p.easing] || EASINGS.standard;
const T = (p, k = 1) => Math.max(1, Math.round(p.duration * k));
const dirSign = () => (typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? -1 : 1);

function anim(el, frames, p, extra = {}) {
  if (!el || !el.animate) return null;
  return el.animate(frames, { duration: T(p), easing: ease(p), fill: 'none', ...extra });
}

function flyer(fromRect, color = 'var(--accent, #A8322A)', size = 14) {
  const d = document.createElement('div');
  d.setAttribute('aria-hidden', 'true');
  Object.assign(d.style, { position: 'fixed', left: `${fromRect.left + fromRect.width / 2 - size / 2}px`, top: `${fromRect.top + fromRect.height / 2 - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: color, zIndex: 150, pointerEvents: 'none' });
  document.body.appendChild(d);
  return d;
}

// --------------------------------------------------------------- families
export const FAMILY_IMPL = {
  cartAdd(b, p, { from, to }) {
    const badge = to;
    if (reduced() || !from || !to) return Promise.resolve();
    const fr = from.getBoundingClientRect(), tr = to.getBoundingClientRect();
    const dx = tr.left + tr.width / 2 - (fr.left + fr.width / 2), dy = tr.top + tr.height / 2 - (fr.top + fr.height / 2);
    const s = p.intensity;
    const pop = () => anim(badge, [{ transform: 'scale(1)' }, { transform: `scale(${1 + 0.6 * s})` }, { transform: 'scale(1)' }], p, { duration: T(p, 0.6), easing: EASINGS.spring });
    let a;
    switch (b) {
      case 'arc-fly': case 'straight-fly': {
        const f = flyer(fr);
        const mid = b === 'arc-fly' ? { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80 * s - p.distance}px) scale(1.1)` } : { transform: `translate(${dx * 0.5}px, ${dy * 0.5}px)` };
        a = anim(f, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, mid, { transform: `translate(${dx}px, ${dy}px) scale(.4)`, opacity: 0.2 }], p);
        a.finished.then(() => { f.remove(); pop(); }).catch(() => f.remove());
        break;
      }
      case 'badge-pop': a = pop(); break;
      case 'badge-spin': a = anim(badge, [{ transform: 'rotate(0) scale(1)' }, { transform: `rotate(${360 * dirSign()}deg) scale(${1 + 0.4 * s})` }, { transform: 'rotate(360deg) scale(1)' }], p); break;
      case 'button-check': a = anim(from, [{ transform: 'scale(1)' }, { transform: `scale(${1 - 0.12 * s})`, offset: 0.3 }, { transform: 'scale(1)' }], p); pop(); break;
      case 'ripple': {
        const f = flyer(fr, 'transparent', fr.width);
        f.style.border = '2px solid var(--accent, #A8322A)';
        a = anim(f, [{ transform: 'scale(.6)', opacity: 0.9 }, { transform: `scale(${1.6 + s})`, opacity: 0 }], p);
        a.finished.then(() => f.remove()).catch(() => f.remove());
        pop();
        break;
      }
      case 'count-roll': a = anim(badge, [{ transform: `translateY(${p.distance}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], p); break;
      case 'dot-burst': {
        const dots = [0, 1, 2, 3, 4, 5].map(() => flyer(tr, 'var(--glow, #E8B649)', 6));
        dots.forEach((d, i) => {
          const ang = (i / 6) * Math.PI * 2, r = 18 + p.distance;
          anim(d, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * r}px, ${Math.sin(ang) * r}px)`, opacity: 0 }], p).finished.then(() => d.remove()).catch(() => d.remove());
        });
        a = pop();
        break;
      }
      case 'ticket-drop': {
        const f = flyer(fr, '#fff', 16);
        Object.assign(f.style, { borderRadius: '2px', height: '20px', boxShadow: '0 2px 6px rgba(0,0,0,.25)' });
        a = anim(f, [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${dx}px, ${dy - 30}px) rotate(${-12 * dirSign()}deg)`, offset: 0.7 }, { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0 }], p);
        a.finished.then(() => { f.remove(); pop(); }).catch(() => f.remove());
        break;
      }
      case 'glow-pulse': a = anim(badge, [{ boxShadow: '0 0 0 0 rgba(47,216,222,.8)' }, { boxShadow: `0 0 0 ${8 + p.distance}px rgba(47,216,222,0)` }], p); break;
      default: a = pop();
    }
    return a?.finished?.catch(() => {}) || Promise.resolve();
  },

  sheet(b, p, { el, open, origin }) {
    if (reduced() || !el) return Promise.resolve();
    const dist = 40 + p.distance * 4;
    const F = {
      'slide-up': [{ transform: `translateY(${dist}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      'spring-up': [{ transform: `translateY(${dist * 1.5}px)` }, { transform: 'translateY(0)' }],
      'scale-fade': [{ transform: `scale(${1 - 0.08 * p.intensity})`, opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      'from-card': origin ? [{ transform: `translate(${origin.x}px, ${origin.y}px) scale(.3)`, opacity: 0 }, { transform: 'none', opacity: 1 }] : [{ opacity: 0 }, { opacity: 1 }],
      'slide-side': [{ transform: `translateX(${dist * dirSign()}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
      'drop-down': [{ transform: `translateY(${-dist}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      'fade-through': [{ opacity: 0, transform: 'scale(.98)' }, { opacity: 1, transform: 'scale(1)' }],
      unfold: [{ transform: 'perspective(900px) rotateX(-18deg)', transformOrigin: 'bottom', opacity: 0 }, { transform: 'perspective(900px) rotateX(0)', transformOrigin: 'bottom', opacity: 1 }],
      'clip-reveal': [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      'stack-rise': [{ transform: `translateY(${dist}px) scale(.96)`, opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }],
    }[b] || [{ opacity: 0 }, { opacity: 1 }];
    const frames = open ? F : [...F].reverse();
    const easing = b === 'spring-up' && open ? EASINGS.spring : ease(p);
    return anim(el, frames, p, { easing, duration: T(p, open ? 1 : 0.7) })?.finished.catch(() => {}) ?? Promise.resolve();
  },

  press(b, p, { el }) {
    if (reduced() || !el) return Promise.resolve();
    const s = p.intensity;
    const F = {
      depress: [{ transform: 'translateY(0)' }, { transform: `translateY(${1 + s * 2}px)` }, { transform: 'translateY(0)' }],
      squish: [{ transform: 'scale(1,1)' }, { transform: `scale(${1 + 0.06 * s}, ${1 - 0.1 * s})` }, { transform: 'scale(1,1)' }],
      'glow-ring': [{ boxShadow: '0 0 0 0 rgba(47,216,222,.7)' }, { boxShadow: `0 0 0 ${6 + p.distance / 2}px rgba(47,216,222,0)` }],
      underline: [{ backgroundSize: '0% 2px' }, { backgroundSize: '100% 2px' }],
      'tilt-press': [{ transform: 'perspective(400px) rotateX(0)' }, { transform: `perspective(400px) rotateX(${10 * s}deg)` }, { transform: 'perspective(400px) rotateX(0)' }],
      'fill-sweep': [{ backgroundPosition: '100% 0' }, { backgroundPosition: '0 0' }],
      'shadow-drop': [{ boxShadow: '0 6px 14px rgba(0,0,0,.25)' }, { boxShadow: '0 1px 2px rgba(0,0,0,.2)' }, { boxShadow: '0 6px 14px rgba(0,0,0,.0)' }],
      bounce: [{ transform: 'scale(1)' }, { transform: `scale(${1 - 0.08 * s})` }, { transform: `scale(${1 + 0.05 * s})` }, { transform: 'scale(1)' }],
      'ink-spread': [{ filter: 'brightness(1)' }, { filter: `brightness(${1 + 0.35 * s})` }, { filter: 'brightness(1)' }],
      'shrink-snap': [{ transform: 'scale(1)' }, { transform: `scale(${1 - 0.15 * s})`, offset: 0.4 }, { transform: 'scale(1)' }],
    }[b];
    return anim(el, F || [{ opacity: 1 }, { opacity: 0.8 }, { opacity: 1 }], p)?.finished.catch(() => {}) ?? Promise.resolve();
  },

  priceTick(b, p, { el, text }) {
    if (!el) return Promise.resolve();
    if (reduced() || el.textContent === text) { el.textContent = text; return Promise.resolve(); }
    const d = p.distance || 10;
    const half = { ...p, duration: p.duration / 2 };
    const out = {
      'roll-up': [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-d}px)`, opacity: 0 }],
      'roll-down': [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${d}px)`, opacity: 0 }],
      crossfade: [{ opacity: 1 }, { opacity: 0 }],
      flip: [{ transform: 'perspective(300px) rotateX(0)' }, { transform: 'perspective(300px) rotateX(90deg)' }],
      'slide-swap': [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-d * dirSign()}px)`, opacity: 0 }],
      'scale-swap': [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.6)', opacity: 0 }],
      'blink-highlight': [{ backgroundColor: 'transparent' }, { backgroundColor: 'rgba(240,180,41,.0)' }],
      odometer: [{ transform: 'translateY(0)', filter: 'blur(0)' }, { transform: `translateY(${-d}px)`, filter: 'blur(1px)', opacity: 0 }],
      typewriter: [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 100% 0 0)' }],
      'fade-color': [{ color: 'inherit' }, { color: 'inherit', opacity: 0.4 }],
    }[b] || [{ opacity: 1 }, { opacity: 0 }];
    const a = anim(el, out, half);
    return (a ? a.finished : Promise.resolve()).then(() => {
      el.textContent = text;
      const back = [...out].reverse().map((f) => ({ ...f }));
      if (b === 'roll-up' || b === 'odometer') back[0] = { transform: `translateY(${d}px)`, opacity: 0 };
      if (b === 'blink-highlight') return anim(el, [{ backgroundColor: 'rgba(240,180,41,.55)' }, { backgroundColor: 'rgba(240,180,41,0)' }], p)?.finished;
      return anim(el, back, half)?.finished;
    }).catch(() => { el.textContent = text; });
  },

  toast(b, p, { el, show }) {
    if (reduced() || !el) return Promise.resolve();
    const d = 20 + p.distance;
    const F = {
      'slide-bottom': [{ transform: `translateY(${d}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      'slide-side': [{ transform: `translateX(${d * 2 * dirSign()}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
      pop: [{ transform: 'scale(.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      'drop-top': [{ transform: `translateY(${-d * 2}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      'ticket-print': [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      fade: [{ opacity: 0 }, { opacity: 1 }],
      'spring-bottom': [{ transform: `translateY(${d * 2}px)` }, { transform: 'translateY(0)' }],
      'grow-pill': [{ transform: 'scaleX(.3)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }],
      swing: [{ transform: 'perspective(500px) rotateX(-70deg)', transformOrigin: 'top', opacity: 0 }, { transform: 'perspective(500px) rotateX(0)', transformOrigin: 'top', opacity: 1 }],
      'rise-stack': [{ transform: `translateY(${d}px) scale(.94)`, opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }],
    }[b] || [{ opacity: 0 }, { opacity: 1 }];
    const easing = b === 'spring-bottom' && show ? EASINGS.spring : ease(p);
    return anim(el, show ? F : [...F].reverse(), p, { easing })?.finished.catch(() => {}) ?? Promise.resolve();
  },

  tab(b, p, { indicator, from, to }) {
    if (!indicator || !to) return Promise.resolve();
    const toS = { transform: `translateX(${to.x}px)`, width: `${to.w}px` };
    const place = () => { indicator.style.transform = toS.transform; indicator.style.width = toS.width; };
    if (reduced() || !from) { place(); return Promise.resolve(); }
    const fromS = { transform: `translateX(${from.x}px)`, width: `${from.w}px` };
    const F = {
      'slide-underline': [fromS, toS],
      'pill-morph': [{ ...fromS, opacity: 1 }, { transform: `translateX(${(from.x + to.x) / 2}px)`, width: `${Math.abs(to.x - from.x) + to.w}px`, opacity: 0.8 }, toS],
      'ink-stretch': [fromS, { transform: `translateX(${Math.min(from.x, to.x)}px)`, width: `${Math.abs(to.x - from.x) + Math.max(from.w, to.w)}px` }, toS],
      'fade-pill': [{ ...toS, opacity: 0 }, { ...toS, opacity: 1 }],
      'dot-follow': [{ ...fromS, transform: `${fromS.transform} scaleX(.2)` }, { ...toS, transform: `${toS.transform} scaleX(.2)` }, toS],
      'box-slide': [fromS, toS],
      'thick-bar': [{ ...fromS, transform: `${fromS.transform} scaleY(2)` }, toS],
      'glow-line': [{ ...fromS, boxShadow: '0 0 0 rgba(47,216,222,0)' }, { ...toS, boxShadow: '0 0 12px rgba(47,216,222,.9)' }, { ...toS, boxShadow: '0 0 0 rgba(47,216,222,0)' }],
      'grow-center': [{ ...toS, transform: `${toS.transform} scaleX(0)` }, toS],
      'jump-pill': [fromS, { transform: `translateX(${(from.x + to.x) / 2}px) translateY(-6px)`, width: `${to.w}px` }, toS],
    }[b] || [fromS, toS];
    const a = anim(indicator, F, p);
    place();
    return a?.finished.catch(() => {}) ?? Promise.resolve();
  },

  loader(b, p, { el }) {
    if (!el) return null;
    if (reduced()) return null;
    const F = {
      'bar-sweep': [{ transform: 'translateX(-110%)' }, { transform: 'translateX(260%)' }],
      'bar-fill': [{ transform: 'scaleX(0)', transformOrigin: 'left' }, { transform: 'scaleX(1)', transformOrigin: 'left' }],
      'tile-fill': [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      'wordmark-pulse': [{ opacity: 0.45 }, { opacity: 1 }, { opacity: 0.45 }],
      dots: [{ transform: 'translateX(0)' }, { transform: `translateX(${p.distance * 2}px)` }, { transform: 'translateX(0)' }],
      ring: [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }],
      'stripe-scroll': [{ backgroundPosition: '0 0' }, { backgroundPosition: '40px 0' }],
      'block-flip': [{ transform: 'perspective(400px) rotateY(0)' }, { transform: 'perspective(400px) rotateY(180deg)' }, { transform: 'perspective(400px) rotateY(360deg)' }],
      'glow-breathe': [{ boxShadow: '0 0 0 rgba(47,216,222,0)' }, { boxShadow: '0 0 24px rgba(47,216,222,.6)' }, { boxShadow: '0 0 0 rgba(47,216,222,0)' }],
      letters: [{ letterSpacing: '0em', opacity: 0.6 }, { letterSpacing: '.18em', opacity: 1 }, { letterSpacing: '0em', opacity: 0.6 }],
    }[b];
    return anim(el, F || [{ opacity: 0.5 }, { opacity: 1 }], p, { iterations: Infinity });
  },

  reveal(b, p, { el }) {
    if (reduced() || !el) return Promise.resolve();
    const d = p.distance || 16;
    const F = {
      'fade-up': [{ transform: `translateY(${d}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      'clip-wipe': [{ clipPath: dirSign() > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0)' }],
      'tile-flip': [{ transform: 'perspective(800px) rotateX(70deg)', opacity: 0 }, { transform: 'perspective(800px) rotateX(0)', opacity: 1 }],
      'mask-slide': [{ transform: `translateY(100%)`, clipPath: 'inset(0 0 100% 0)' }, { transform: 'none', clipPath: 'inset(0 0 0 0)' }],
      'scale-in': [{ transform: `scale(${1 + 0.1 * p.intensity})`, opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      'stagger-up': [{ transform: `translateY(${d}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      fade: [{ opacity: 0 }, { opacity: 1 }],
      'slide-side': [{ transform: `translateX(${-d * 2 * dirSign()}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      'rise-rotate': [{ transform: `perspective(800px) translateY(${d}px) rotateZ(${-2 * dirSign()}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      curtain: [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0 0 0)' }],
    }[b] || [{ opacity: 0 }, { opacity: 1 }];
    const kids = b === 'stagger-up' && el.children.length ? [...el.children] : [el];
    return Promise.all(kids.map((k, i) => anim(k, F, p, { delay: i * 70, fill: 'backwards' })?.finished.catch(() => {}))).then(() => {});
  },

  hover(b, p, { el, on }) {
    if (reduced() || !el) return;
    const s = p.intensity, d = p.distance / 4;
    const F = {
      lift: { transform: `translateY(${-2 - d}px)`, boxShadow: '0 12px 30px rgba(42,27,21,.18)' },
      'tilt-3d': { transform: `perspective(700px) rotateX(${4 * s}deg) rotateY(${-5 * s * dirSign()}deg)` },
      'border-glow': { boxShadow: '0 0 0 2px rgba(47,216,222,.75), 0 0 18px rgba(47,216,222,.35)' },
      'art-zoom': { transform: 'scale(1)' },
      'shadow-grow': { boxShadow: `0 ${10 + d * 2}px ${30 + d * 4}px rgba(42,27,21,.2)` },
      nudge: { transform: `translateX(${(2 + d) * dirSign()}px)` },
      'underline-name': { textDecorationColor: 'currentColor' },
      tint: { backgroundColor: 'rgba(13,91,104,.06)' },
      'rotate-art': { transform: 'rotate(0)' },
      'raise-art': { transform: 'translateY(0)' },
    }[b] || {};
    const target = ['art-zoom', 'rotate-art', 'raise-art'].includes(b) ? el.querySelector('.art, svg, img') || el : el;
    const artF = { 'art-zoom': { transform: `scale(${1 + 0.08 * s})` }, 'rotate-art': { transform: `rotate(${-4 * s * dirSign()}deg)` }, 'raise-art': { transform: `translateY(${-4 - d}px)` } }[b];
    const to = artF || F;
    const from = Object.fromEntries(Object.keys(to).map((k) => [k, getComputedStyle(target)[k]]));
    target.animate(on ? [from, to] : [to, { ...Object.fromEntries(Object.keys(to).map((k) => [k, k === 'transform' ? 'none' : ''])) }], { duration: T(p), easing: ease(p), fill: 'forwards' });
  },

  status(b, p, { el }) {
    if (reduced() || !el) return Promise.resolve();
    const F = {
      'fill-line': [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      'check-draw': [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      'pulse-current': [{ transform: 'scale(1)' }, { transform: `scale(${1 + 0.15 * p.intensity})` }, { transform: 'scale(1)' }],
      'step-pop': [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      'progress-bar': [{ transform: 'scaleX(.2)' }, { transform: 'scaleX(1)' }],
      'dot-chase': [{ transform: `translateX(${-p.distance}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      'glow-current': [{ boxShadow: '0 0 0 0 rgba(47,216,222,.7)' }, { boxShadow: '0 0 0 10px rgba(47,216,222,0)' }],
      'tick-in': [{ transform: 'rotate(-90deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      'grow-ring': [{ outline: '0 solid rgba(47,216,222,.6)' }, { outline: '8px solid rgba(47,216,222,0)' }],
      'bounce-current': [{ transform: 'translateY(0)' }, { transform: `translateY(${-4 - p.distance / 4}px)` }, { transform: 'translateY(0)' }],
    }[b];
    return anim(el, F || [{ opacity: 0 }, { opacity: 1 }], p)?.finished.catch(() => {}) ?? Promise.resolve();
  },

  skeleton(b, p, { el }) {
    if (!el || reduced()) return null;
    const F = {
      shimmer: [{ backgroundPosition: '-200% 0' }, { backgroundPosition: '200% 0' }],
      pulse: [{ opacity: 0.55 }, { opacity: 1 }, { opacity: 0.55 }],
      wave: [{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }],
      'tile-shimmer': [{ backgroundPosition: '0 -200%' }, { backgroundPosition: '0 200%' }],
      stripes: [{ backgroundPosition: '0 0' }, { backgroundPosition: '48px 0' }],
      'fade-blocks': [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }],
      'sweep-diagonal': [{ backgroundPosition: '-150% -150%' }, { backgroundPosition: '150% 150%' }],
      breathe: [{ transform: 'scale(1)' }, { transform: 'scale(.985)' }, { transform: 'scale(1)' }],
      'scan-line': [{ boxShadow: 'inset 0 0 0 rgba(47,216,222,0)' }, { boxShadow: 'inset 0 -3px 0 rgba(47,216,222,.6)' }],
      dots: [{ opacity: 0.3 }, { opacity: 1 }],
    }[b];
    return anim(el, F || [{ opacity: 0.5 }, { opacity: 1 }], p, { iterations: Infinity, direction: b === 'dots' ? 'alternate' : 'normal' });
  },
};

/** Cross-document page transition CSS (served in theme.css). Empty for "instant". */
export function pageTransitionCss(b, p) {
  if (b === 'instant') return '';
  const dur = `${Math.round(p.duration)}ms`, e = EASINGS[p.easing] || EASINGS.standard, d = `${p.distance}px`;
  const kf = {
    crossfade: ['opacity:1', 'opacity:0', 'opacity:0', 'opacity:1'],
    slide: [`transform:translateX(0)`, `transform:translateX(-${d})`, `transform:translateX(${d})`, 'transform:translateX(0)'],
    wipe: ['clip-path:inset(0 0 0 0)', 'clip-path:inset(0 0 0 0)', 'clip-path:inset(0 100% 0 0)', 'clip-path:inset(0 0 0 0)'],
    scale: ['transform:scale(1);opacity:1', 'transform:scale(.96);opacity:0', 'transform:scale(1.04);opacity:0', 'transform:scale(1);opacity:1'],
    'fade-up': ['opacity:1', 'opacity:0', `opacity:0;transform:translateY(${d})`, 'opacity:1;transform:none'],
    'tile-sweep': ['clip-path:inset(0)', 'clip-path:inset(0)', 'clip-path:inset(100% 0 0 0)', 'clip-path:inset(0)'],
    split: ['clip-path:inset(0)', 'clip-path:inset(0 50% 0 50%)', 'clip-path:inset(0)', 'clip-path:inset(0)'],
    'zoom-out': ['transform:scale(1);opacity:1', 'transform:scale(.9);opacity:0', 'opacity:0', 'opacity:1'],
    push: [`transform:translateY(0)`, `transform:translateY(-${d})`, `transform:translateY(${d})`, 'transform:translateY(0)'],
  }[b] || ['opacity:1', 'opacity:0', 'opacity:0', 'opacity:1'];
  return `@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto}
@keyframes hb-vt-out{from{${kf[0]}}to{${kf[1]}}}@keyframes hb-vt-in{from{${kf[2]}}to{${kf[3]}}}
::view-transition-old(root){animation:${dur} ${e} both hb-vt-out}::view-transition-new(root){animation:${dur} ${e} both hb-vt-in}}`;
}

export function play(family, behaviour, params, ctx) {
  const f = FAMILY_IMPL[family];
  if (!f) return Promise.resolve();
  try { return f(behaviour, params, ctx); } catch { return Promise.resolve(); }
}
