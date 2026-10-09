// Ingredient orbit: penne, cherry tomatoes, basil leaves or cheese cubes
// orbiting a pasta bowl in a ring, atom, spiral, swarm or layered bands.
import { geo, m4 } from '../engine.js';
import { C, lightRig, buildPasta, poseLayers } from '../parts.js';

export function build(E, p) {
  E.env.clear = C.night; E.env.fog = C.night; E.env.fogNear = 8; E.env.fogFar = 26;
  lightRig(E, 'warm');
  const dish = p.bowl ? buildPasta(E, 'alfredo', { scale: 0.75 }) : null;
  const kinds = p.set === 'mixed' ? ['penne', 'tomatoes', 'cheese', 'basil'] : [p.set];
  const meshFor = { penne: () => geo.cylinder(0.08, 0.42, 14), tomatoes: () => geo.sphere(0.16, 16, 12), basil: () => geo.sphere(0.18, 12, 8), cheese: () => geo.box(0.22, 0.22, 0.22) };
  const colFor = { penne: C.pasta, tomatoes: C.tomato, basil: C.basil, cheese: C.cheese };
  const groups = kinds.map((k, gi) => {
    const mesh = E.mesh(meshFor[k]());
    E.add(mesh, { color: C.white, shine: 50, spec: 0.5 });
    const n = Math.max(1, Math.round(p.count / kinds.length));
    return { mesh, n, gi, col: colFor[k], mats: new Float32Array(n * 16), cols: new Float32Array(n * 4) };
  });
  E.camera = { eye: [0, 1.6, 6.5], target: [0, 0, 0], fov: 45 };
  return {
    update(t) {
      const s = t * (0.15 + p.speed);
      if (dish) poseLayers(dish, { spin: s * 0.4, tilt: 0.3, y: -0.2 });
      for (const g of groups) {
        for (let i = 0; i < g.n; i++) {
          const k = i / g.n, seed = (i * 7.31 + g.gi * 3.7) % 1;
          let pos;
          switch (p.orbit) {
            case 'ring': { const a = k * 6.283 + s + g.gi * 0.4; pos = [Math.cos(a) * 2.2, Math.sin(a * 3) * 0.1, Math.sin(a) * 2.2]; break; }
            case 'atom': { const plane = (i % 3) * 1.05; const a = k * 6.283 * 3 + s * 1.2; const x = Math.cos(a) * 2.1, z = Math.sin(a) * 2.1; pos = [x, z * Math.sin(plane), z * Math.cos(plane)]; break; }
            case 'spiral': { const a = k * 6.283 * 2 + s; const y = ((k + s * 0.08) % 1) * 3.6 - 1.8; pos = [Math.cos(a) * (1.4 + k), y, Math.sin(a) * (1.4 + k)]; break; }
            case 'swarm': { const a = seed * 6.283 + s * (0.4 + seed); pos = [Math.cos(a) * (1.4 + seed * 1.6), Math.sin(s * 0.7 + seed * 9) * 1.4, Math.sin(a * 1.3) * (1.4 + seed * 1.2)]; break; }
            default: { const band = i % 3; const a = k * 6.283 * 3 + s * (band % 2 ? 1 : -1); pos = [Math.cos(a) * (1.6 + band * 0.5), (band - 1) * 0.9, Math.sin(a) * (1.6 + band * 0.5)]; }
          }
          g.mats.set(m4.trs(pos, [s + seed * 6, s * 0.7 + seed * 3, seed], g.col === C.basil ? [1.2, 0.25, 0.7] : 1), i * 16);
          g.cols.set([...g.col, 1], i * 4);
        }
        E.instance(g.mesh, g.mats, g.cols);
      }
    },
  };
}
