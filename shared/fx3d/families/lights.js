// Light sweep: moving point lights across the tile wall, the sign or a
// counter, in LED cyan, warm or mixed colour.
import { geo, m4 } from '../engine.js';
import { C, tileWall, signBlock } from '../parts.js';

const PAL = { glow: [[0.3, 1.4, 1.45]], warm: [[1.5, 1.05, 0.6]], mixed: [[0.3, 1.4, 1.45], [1.5, 0.5, 0.45], [1.4, 1.1, 0.7], [0.6, 0.9, 1.4]] };

export function build(E, p) {
  E.env.clear = [0.01, 0.07, 0.08]; E.env.fog = E.env.clear; E.env.fogNear = 8; E.env.fogFar = 26;
  E.env.sky = [0.3, 0.45, 0.48]; E.env.ground = [0.05, 0.04, 0.04]; E.env.ambient = 0.22;
  E.lights = [];
  if (p.scene === 'tile-wall' || p.scene === 'sign') { const w = tileWall(E, { cols: 26, rows: 9 }); for (let i = 0; i < w.n; i++) w.set(i, p.scene === 'sign' ? -1 : 0, C.tile); w.commit(); }
  if (p.scene === 'sign') signBlock(E, { w: 3.6, h: 1.8 }).place([0, 0.2, 0.6]);
  if (p.scene === 'counter') {
    E.add(E.mesh(geo.box(6, 1.3, 1.4)), { color: C.tile, shine: 100, spec: 1, rim: 0.3 }).model = m4.trs([0, -1, 0]);
    E.add(E.mesh(geo.box(6.3, 0.14, 1.6)), { color: C.maroon, shine: 120, spec: 1.2 }).model = m4.trs([0, -0.28, 0]);
    const w = tileWall(E, { cols: 24, rows: 6 }); for (let i = 0; i < w.n; i++) w.set(i, -2.2, C.tileDeep); w.commit();
    signBlock(E, { w: 2.6, h: 1.3 }).place([0, 1.5, -1.8]);
  }
  const n = Math.round(p.lights);
  const lights = Array.from({ length: n }, (_, i) => E.light([0, 0, 2], PAL[p.palette][i % PAL[p.palette].length], true));
  E.camera = { eye: [0, 0.3, 8.5], target: [0, 0, 0], fov: 42 };
  return {
    update(t) {
      const s = t * (0.2 + p.speed);
      lights.forEach((l, i) => {
        const off = (i / n) * Math.PI * 2;
        let x = 0, y = 0;
        switch (p.sweep) {
          case 'horizontal': x = Math.sin(s + off) * 5; y = 0.3 + (i - n / 2) * 0.8; break;
          case 'vertical': x = (i - (n - 1) / 2) * 3; y = Math.sin(s + off) * 2.6; break;
          case 'circle': x = Math.cos(s + off) * 3.2; y = Math.sin(s + off) * 1.8; break;
          default: { x = (i - (n - 1) / 2) * 2.4; y = 0.4; const on = Math.sin(s * 9 + i * 3) > -0.6 ? 1 : 0.15; l.color = PAL[p.palette][i % PAL[p.palette].length].map((c) => c * on); }
        }
        l.pos = [x, y, 1.6, 1];
      });
    },
  };
}
