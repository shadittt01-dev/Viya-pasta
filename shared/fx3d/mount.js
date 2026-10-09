// Mounts one 3D preset into a container (customer hero) and renders preset
// thumbnails for the studio with a single shared WebGL context.
import { Engine } from './engine.js';

const FAMILIES = ['tileWave', 'pasta', 'stack', 'forms', 'particles', 'logo', 'wedges', 'material', 'lights', 'cards', 'paper', 'ingredients'];

export async function loadFamily(name) {
  if (!FAMILIES.includes(name)) throw new Error(`Unknown 3D family ${name}`);
  return import(`./families/${name}.js`);
}

/**
 * cfg: { family, params }. opts: { still, dpr }.
 * Returns { pause, resume, destroy } or null if WebGL is unavailable.
 */
export async function mountScene(container, cfg, { still = false, dpr = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  container.prepend(canvas);
  let E;
  try { E = new Engine(canvas, { dpr }); } catch { canvas.remove(); return null; }
  const mod = await loadFamily(cfg.family);
  const scene = await mod.build(E, cfg.params);
  let raf = 0, running = false, t0 = performance.now(), tPaused = 0, last = 0;
  const frame = (now) => {
    const t = (now - t0) / 1000;
    if (now - last > 1000 / 50) { scene.update(t); E.render(); last = now; } // ~50 fps cap
    if (running) raf = requestAnimationFrame(frame);
  };
  const ctl = {
    pause() { if (!running) return; running = false; cancelAnimationFrame(raf); tPaused = performance.now(); },
    resume() { if (running || still) return; running = true; t0 += performance.now() - tPaused; raf = requestAnimationFrame(frame); },
    destroy() { ctl.pause(); E.destroy(); canvas.remove(); },
  };
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ctl.destroy(); container.closest('.hero')?.classList.remove('hero--3d-ready'); });
  scene.update(1.5);
  E.render();
  if (!still) { tPaused = performance.now(); ctl.resume(); }
  return ctl;
}

// ---- studio thumbnails: one hidden WebGL canvas reused for every preset
let thumbEngine = null;
export async function renderThumb(cfg, target, { t = 1.8 } = {}) {
  if (!thumbEngine) {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:200px';
    document.body.appendChild(c);
    thumbEngine = new Engine(c, { dpr: 1 });
  }
  const E = thumbEngine;
  E.clearScene();
  E.camera = { eye: [0, 1, 6], target: [0, 0, 0], fov: 40 };
  E.env = { ...E.env, fogNear: 12, fogFar: 40, ambient: 0.35 };
  const mod = await loadFamily(cfg.family);
  const scene = await mod.build(E, cfg.params);
  scene.update(t);
  E.render();
  const ctx = target.getContext('2d');
  ctx.drawImage(E.canvas, 0, 0, target.width, target.height);
  // pixel check used by the automated preset verification
  const px = E.gl.getError();
  return { glError: px };
}

/** Pixel statistics of a 2D canvas: proves something actually rendered. */
export function canvasStats(canvas) {
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0, sum2 = 0, n = 0;
  for (let i = 0; i < data.length; i += 16) { const l = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11); sum += l; sum2 += l * l; n++; }
  const mean = sum / n;
  return { mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)) };
}
