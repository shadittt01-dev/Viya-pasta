// Loads the chosen 3D hero preset only when it is useful: after the page is
// interactive, when the hero is on screen, on capable devices. Reduced-motion
// users get one still frame; low-power devices keep the static CSS art.
import { boot } from './store.js';

const cfg = boot.theme?.hero3d;
const stage = document.getElementById('hero-stage');
const hero = stage?.closest('.hero');

function capable() {
  const c = navigator.connection;
  if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 2) return false;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) return false;
  try { return Boolean(document.createElement('canvas').getContext('webgl2')); } catch { return false; }
}

if (cfg && stage && capable()) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = async () => {
    try {
      const { mountScene } = await import('/shared/fx3d/mount.js');
      const ctl = await mountScene(stage, cfg, { still, dpr: Math.min(window.devicePixelRatio || 1, 1.75) });
      if (!ctl) return;
      hero.classList.add('hero--3d-ready');
      // pause offscreen and in background tabs
      new IntersectionObserver(([e]) => (e.isIntersecting ? ctl.resume() : ctl.pause())).observe(stage);
      document.addEventListener('visibilitychange', () => (document.hidden ? ctl.pause() : ctl.resume()));
    } catch (e) {
      // Static fallback stays visible; nothing else depends on the 3D layer.
      console.warn('3D hero unavailable', e?.message);
    }
  };
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  if (document.readyState === 'complete') idle(start, { timeout: 1500 });
  else window.addEventListener('load', () => idle(start, { timeout: 1500 }), { once: true });
}
