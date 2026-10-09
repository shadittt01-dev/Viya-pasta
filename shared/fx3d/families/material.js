// Material study: one form rendered in the shop's materials — glazed tile,
// tomato lacquer, brushed steel, wax paper, ceramic — under an orbiting light.
import { geo, m4 } from '../engine.js';
import { C, paperCanvas } from '../parts.js';

const MATS = {
  'glazed tile': { color: C.tile, shine: 110, spec: 1.1, rim: 0.4 },
  'tomato lacquer': { color: C.maroon, shine: 160, spec: 1.4, rim: 0.3 },
  'brushed steel': { color: [0.62, 0.66, 0.67], shine: 30, spec: 0.9, rim: 0.2 },
  'wax paper': { color: C.paper, shine: 12, spec: 0.12, rim: 0.05, tex: true },
  ceramic: { color: [0.93, 0.93, 0.9], shine: 70, spec: 0.6, rim: 0.2 },
};

export function build(E, p) {
  E.env.clear = C.night; E.env.fog = C.night; E.env.fogNear = 8; E.env.fogFar = 24;
  E.env.sky = [0.7, 0.85, 0.88]; E.env.ground = [0.1, 0.08, 0.08]; E.env.ambient = 0.4;
  E.lights = [];
  const key = E.light([3, 3, 4], [1.05, 1, 0.96]);
  E.light([-4, 1, 2], [0.25, 0.4, 0.45]);
  if (p.rim) E.light([0, 2, -5], [0.4, 0.9, 0.95]);
  const g = { sphere: () => geo.sphere(1.2, 48, 32), torus: () => geo.torus(1.0, 0.38, 64, 24), knot: () => geo.knot(1.6, 0.26), box: () => geo.box(1.7, 1.7, 1.7), cylinder: () => geo.cylinder(0.9, 2, 48) }[p.geometry]();
  const m = MATS[p.material];
  const item = E.add(E.mesh(g), { ...m, tex: m.tex ? E.texture(paperCanvas()) : null });
  const plinth = E.add(E.mesh(geo.cylinder(1.6, 0.25, 48)), { color: C.tileDeep, shine: 60, spec: 0.5 });
  plinth.model = m4.trs([0, -1.75, 0]);
  E.camera = { eye: [0, 0.6, 6], target: [0, -0.2, 0], fov: 40 };
  return {
    update(t) {
      const s = t * (0.1 + p.speed);
      const a = t * p.lightOrbit * 0.8 + 0.6;
      key.pos = [Math.cos(a) * 4, 3, Math.sin(a) * 4 + 1, 0];
      item.model = m4.trs([0, -0.2, 0], [s * 0.3, s * 0.6, 0]);
    },
  };
}
