// Logo sculpture: the maroon VIA PASTA sign as a bevelled 3D block, arranged
// singly, stacked, in a ring, a grid or a mirrored pair.
import { C, signBlock, tileWall } from '../parts.js';

export function build(E, p) {
  E.env.clear = C.night; E.env.fog = C.night; E.env.fogNear = 9; E.env.fogFar = 30;
  E.env.sky = [0.6, 0.85, 0.88]; E.env.ground = [0.08, 0.06, 0.06]; E.env.ambient = 0.45;
  E.lights = [];
  E.light([2, 4, 6], [1, 0.97, 0.94]);
  const sweep = E.light([0, 1, 4], [0.2, 0.8, 0.85], true);
  E.light([-5, -1, 3], [0.3, 0.3, 0.35]);
  if (p.tileBackdrop) { const w = tileWall(E, { cols: 26, rows: 8 }); for (let i = 0; i < w.n; i++) w.set(i, -3, C.tileDeep); w.commit(); }
  const count = { single: 1, stack: 3, ring: 6, grid: 6, mirror: 2 }[p.arrangement];
  const signs = Array.from({ length: count }, () => signBlock(E, { w: 2.8, h: 1.4, d: 0.3 + p.bevel, bevel: p.bevel }));
  E.camera = { eye: [0, 0.5, p.arrangement === 'ring' ? 9 : p.arrangement === 'grid' ? 8.5 : 6.5], target: [0, 0, 0], fov: 42 };
  return {
    update(t) {
      const s = t * (0.2 + p.speed);
      if (p.lightSweep) sweep.pos = [Math.sin(s * 0.8) * 4, 1.2, 3, 1];
      signs.forEach((sg, i) => {
        let pos = [0, 0, 0], rot = [0, 0, 0], sc = 1;
        switch (p.arrangement) {
          case 'stack': pos = [0, (i - 1) * 1.6, -i * 0.4]; sc = 1 - i * 0.12; break;
          case 'ring': { const a = (i / count) * Math.PI * 2 + s * 0.4; pos = [Math.sin(a) * 3.2, 0, Math.cos(a) * 3.2 - 1]; rot = [0, a, 0]; sc = 0.7; break; }
          case 'grid': pos = [((i % 3) - 1) * 3, (Math.floor(i / 3) - 0.5) * 1.7, 0]; sc = 0.85; break;
          case 'mirror': pos = [(i - 0.5) * 3.2, 0, 0]; rot = [0, (i ? -1 : 1) * 0.3, 0]; sc = 0.95; break;
          default: break;
        }
        switch (p.motion) {
          case 'turntable': if (p.arrangement !== 'ring') rot[1] += s * 0.6; break;
          case 'sway': rot[1] += Math.sin(s + i) * 0.25; rot[0] = Math.sin(s * 0.7 + i) * 0.06; break;
          case 'flip': rot[0] += Math.max(0, Math.sin(s * 0.8 + i * 0.6)) ** 6 * Math.PI * 2; break;
          case 'float': pos[1] += Math.sin(s * 1.2 + i * 1.3) * 0.18; rot[2] = Math.sin(s * 0.5 + i) * 0.05; break;
          default: break; // still: only the light moves
        }
        sg.place(pos, rot, sc);
      });
    },
  };
}
