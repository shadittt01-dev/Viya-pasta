// Floating geometric forms: instanced spheres, cubes, tori, capsules or
// icosahedra drifting in brand colours.
import { geo, m4 } from '../engine.js';
import { C, lightRig } from '../parts.js';

const PALETTE = [C.maroon, C.tile, C.bun, C.paper, C.cheese, C.tileDeep];

function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

export function build(E, p) {
  E.env.clear = C.night; E.env.fog = C.night; E.env.fogNear = 6; E.env.fogFar = 22;
  lightRig(E, 'studio');
  const shapes = p.shape === 'mixed' ? ['spheres', 'cubes', 'tori', 'capsules', 'icosa'] : [p.shape];
  const meshFor = { spheres: () => geo.sphere(0.32, 20, 14), cubes: () => geo.box(0.5, 0.5, 0.5), tori: () => geo.torus(0.32, 0.11, 32, 12), capsules: () => geo.capsule(0.16, 0.45, 16), icosa: () => geo.icosa(0.38) };
  const mat = { glaze: { shine: 90, spec: 0.9, rim: 0.3 }, matte: { shine: 8, spec: 0.08, rim: 0.1 }, metal: { shine: 120, spec: 1.2, rim: 0.45 } }[p.material];
  const r = rnd(9001);
  const groups = shapes.map((sh) => {
    const mesh = E.mesh(meshFor[sh]());
    const count = Math.max(1, Math.round(p.count / shapes.length));
    const inst = [];
    for (let i = 0; i < count; i++) inst.push({ pos: [(r() - 0.5) * p.spread * 2, (r() - 0.5) * p.spread * 1.2, (r() - 0.5) * p.spread * 1.6], rot: [r() * 6, r() * 6, r() * 6], spd: 0.4 + r(), phase: r() * 6.28, col: PALETTE[Math.floor(r() * PALETTE.length)], scale: 0.6 + r() * 0.8 });
    E.add(mesh, { color: C.white, ...mat });
    return { mesh, inst, mats: new Float32Array(count * 16), cols: new Float32Array(count * 4) };
  });
  E.camera = { eye: [0, 0.3, p.spread * 2.2 + 3], target: [0, 0, 0], fov: 45 };
  return {
    update(t) {
      const s = t * (0.2 + p.speed);
      for (const g of groups) {
        g.inst.forEach((o, i) => {
          let [x, y, z] = o.pos, [rx, ry, rz] = o.rot;
          switch (p.drift) {
            case 'orbit': { const a = s * 0.3 * o.spd + o.phase; const rad = Math.hypot(x, z); x = Math.cos(a) * rad; z = Math.sin(a) * rad; break; }
            case 'bob': y += Math.sin(s * o.spd * 1.5 + o.phase) * 0.35; break;
            case 'tumble': rx += s * o.spd; ry += s * o.spd * 0.7; y += Math.sin(s * 0.5 + o.phase) * 0.15; break;
            default: y += Math.sin(s * 0.6 * o.spd + o.phase) * 0.25; x += Math.cos(s * 0.4 * o.spd + o.phase) * 0.2; ry += s * 0.2;
          }
          g.mats.set(m4.trs([x, y, z], [rx, ry, rz], o.scale), i * 16);
          g.cols.set([...o.col, 1], i * 4);
        });
        E.instance(g.mesh, g.mats, g.cols);
      }
    },
  };
}
