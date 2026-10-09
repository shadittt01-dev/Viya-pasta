// Pasta bowl turntable: a procedural pasta dish (stylised, not a photo of the
// product) on a paper napkin, a wooden board or nothing, under one of three light rigs.
// On wide screens the dish sits beside the headline (right in LTR, left in RTL).
import { C, lightRig, cameraRig, buildPasta, poseLayers, addGround } from '../parts.js';

/** Slide the camera sideways so the subject appears off-centre without changing the view angle. */
export function offsetCamera(E, amount) {
  if (!amount) return;
  const [ex, ey, ez] = E.camera.eye, [tx, ty, tz] = E.camera.target;
  let fx = tx - ex, fz = tz - ez;
  const len = Math.hypot(fx, fz) || 1; fx /= len; fz /= len;
  // right vector = forward × up (y-up), projected on the ground plane
  const rx = -fz, rz = fx;
  E.camera.eye = [ex - rx * amount, ey, ez - rz * amount];
  E.camera.target = [tx - rx * amount, ty, tz - rz * amount];
}

export function sideShift(E) {
  const c = E.canvas;
  const w = c.clientWidth || c.width, h = c.clientHeight || c.height;
  const aspect = w / Math.max(1, h);
  if (aspect < 1.25) return 0;
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  // positive = the dish appears on the right (LTR); mirrored for RTL
  return Math.min(2, (aspect - 1.25) * 1.1 + 1) * (rtl ? -1 : 1);
}

export function build(E, p) {
  const night = p.light === 'neon';
  E.env.clear = night ? C.night : [0.2, 0.13, 0.1];
  E.env.fog = E.env.clear; E.env.fogNear = 10; E.env.fogFar = 30;
  lightRig(E, p.light);
  const layers = buildPasta(E, p.recipe);
  const ground = addGround(E, p.plate);
  const groundModel = ground ? ground.model : null;
  const cam = cameraRig(E, p.camera, { radius: 7.4, height: 2.1, target: [0, 0.1, 0], speed: p.speed });
  const baseTarget = [...E.camera.target];
  return {
    update(t) {
      E.camera.target = [...baseTarget]; // the rig sets the target once; the side shift is re-applied each frame
      cam(t);
      const shift = sideShift(E);
      offsetCamera(E, shift);
      const y = shift ? 0.3 : -0.25;
      poseLayers(layers, { spin: t * p.speed * 0.8, spread: p.explode * (0.8 + 0.2 * Math.sin(t * 0.8)), y });
      if (ground) { ground.model = new Float32Array(groundModel); ground.model[13] += y + 0.25; } // keep the board/napkin under the bowl
    },
  };
}
