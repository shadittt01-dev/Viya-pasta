// Wedges in motion: instanced potato wedges falling, piling, spinning, arcing
// out of a red VIA PASTA cup, or orbiting it.
import { geo, m4, wordmarkCanvas } from '../engine.js';
import { C, lightRig } from '../parts.js';

export function build(E, p) {
  E.env.clear = [0.2, 0.13, 0.1]; E.env.fog = E.env.clear; E.env.fogNear = 9; E.env.fogFar = 28;
  lightRig(E, 'warm');
  const n = Math.round(p.count);
  const fry = E.mesh(geo.cylinder(0.16, 0.7, 3)); // triangular prism = potato wedge
  const mats = new Float32Array(n * 16), cols = new Float32Array(n * 4);
  const seeds = Array.from({ length: n }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
  for (let i = 0; i < n; i++) { const g = 0.85 + seeds[i][3] * 0.15; cols.set([C.wedge[0] * g, C.wedge[1] * g, C.wedge[2] * g, 1], i * 4); }
  E.add(fry, { color: C.white, shine: 25, spec: 0.25 });
  let cup = null;
  if (p.cup) {
    const tex = E.texture(wordmarkCanvas({ w: 1024, h: 256, sub: false }));
    cup = E.add(E.mesh(geo.lathe([[0.001, -0.9], [0.62, -0.9], [0.82, 0.6], [0.78, 0.62], [0.001, 0.62]], 36)), { color: C.maroon, tex, shine: 40, spec: 0.3 });
  }
  E.camera = { eye: [0, 1.2, 7], target: [0, 0.2, 0], fov: 45 };
  return {
    update(t) {
      const s = t * (0.2 + p.speed);
      for (let i = 0; i < n; i++) {
        const [a, b, c, d] = seeds[i];
        let pos, rot;
        switch (p.mode) {
          case 'fall': { const y = 4 - ((b * 8 + s * (1 + d)) % 8); pos = [(a - 0.5) * 7, y, (c - 0.5) * 3]; rot = [s * d * 2, s * a, d * 6]; break; }
          case 'pile': { const ang = a * 6.283, rad = Math.sqrt(b) * 1.8; pos = [Math.cos(ang) * rad, -0.7 + (1 - rad / 1.8) * 1.1 + c * 0.2, Math.sin(ang) * rad]; rot = [1.45 + (c - 0.5) * 0.6, ang, (d - 0.5) * 0.6]; break; }
          case 'spin': { const ang = a * 6.283 + s * 0.8; pos = [Math.cos(ang) * 0.35 * b, 0.55 + c * 0.35, Math.sin(ang) * 0.35 * b]; rot = [(d - 0.5) * 0.5, ang, (b - 0.5) * 0.4]; break; }
          case 'fountain': { const ph = (s * 0.4 + d) % 1; const ang = a * 6.283; const v = 2.2 + b; pos = [Math.cos(ang) * ph * 2.4, 0.6 + v * ph * 2 - 4.9 * ph * ph * 1.4, Math.sin(ang) * ph * 2.4]; rot = [ph * 8 * c, ang, ph * 6]; break; }
          default: { const ang = a * 6.283 + s * (0.3 + d * 0.3); const rad = 2 + b * 1.2; pos = [Math.cos(ang) * rad, (c - 0.5) * 1.6, Math.sin(ang) * rad]; rot = [s + d, ang, 0.6]; }
        }
        mats.set(m4.trs(pos, rot), i * 16);
      }
      E.instance(fry, mats, cols);
      if (cup) cup.model = m4.trs([0, -0.2, 0], [0, p.mode === 'spin' ? s * 0.8 : Math.sin(s * 0.4) * 0.3, 0]);
      E.camera.eye = [Math.sin(s * 0.15) * 1.5, 1.2, 7];
    },
  };
}
