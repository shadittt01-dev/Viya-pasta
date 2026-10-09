// Tile wall wave: the storefront's deep-teal glazed tiles as an instanced
// wall that ripples, with the maroon VIA PASTA sign mounted in front.
import { C, tileWall, signBlock } from '../parts.js';

export function build(E, p) {
  E.env.clear = C.night; E.env.fog = C.night; E.env.fogNear = 9; E.env.fogFar = 30;
  E.env.sky = [0.55, 0.85, 0.88]; E.env.ground = [0.05, 0.12, 0.14]; E.env.ambient = 0.55;
  E.lights = [];
  E.light([3, 5, 7], [0.9, 0.95, 0.95]);
  const glow = E.light([0, 0, 3], [0.1, 0.5, 0.55], true);
  E.light([-6, -2, 4], [0.25, 0.3, 0.35]);
  const wall = tileWall(E, { cols: p.cols, rows: p.rows, tile: p.tile });
  const W = p.cols * wall.tw, H = p.rows * wall.th;
  const signW = 3.4;
  const sign = p.sign ? signBlock(E, { w: signW, h: signW / 2 }) : null;
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  // "cover" framing: the wall always fills the viewport whatever its aspect ratio
  const fov = 42, tan = Math.tan((fov * Math.PI) / 360);
  const frame = () => {
    const aspect = (E.canvas.clientWidth || E.canvas.width) / (E.canvas.clientHeight || E.canvas.height) || 1.6;
    const margin = p.camera === 'front' ? 0.9 : 0.72;
    const d = Math.min((W / 2) / (tan * aspect), (H / 2) / tan) * margin;
    const cams = { front: [[0, 0, d], [0, 0, 0]], low: [[0, -H * 0.18, d], [0, H * 0.04, 0]], 'three-quarter': [[d * 0.32, H * 0.06, d * 0.95], [-W * 0.02, 0, 0]] };
    const [eye, target] = cams[p.camera] || cams.front;
    E.camera = { eye, target, fov };
  };
  frame();
  const amp = p.amplitude * 0.6;
  const deep = C.tileDeep, base = C.tile, hi = [0.12, 0.47, 0.52];
  return {
    update(t) {
      frame();
      const s = t * (0.4 + p.speed * 1.6);
      const sweepX = Math.sin(t * 0.35 * (0.5 + p.speed)) * W * 0.55;
      if (p.glowSweep) glow.pos = [sweepX, H * 0.1, 2.2, 1];
      else glow.pos = [0, -H * 0.6, 2.5, 1];
      for (let i = 0; i < wall.n; i++) {
        const { x, y, c, r } = wall.layout[i];
        let ph;
        switch (p.wave) {
          case 'radial': ph = Math.hypot(x, y) * 1.4 - s; break;
          case 'diagonal': ph = (x + y) * 0.9 - s; break;
          case 'rows': ph = r * 1.1 - s * 1.3; break;
          case 'columns': ph = c * 0.7 - s; break;
          case 'noise': ph = Math.sin(c * 1.7 + r * 2.3) * 3 + Math.sin(c * 0.5 - s * 0.6) * 2 - s * 0.5; break;
          default: ph = Math.hypot(x - W * 0.15, y + H * 0.2) * 2.2 - s * 1.6; // ripple
        }
        const z = Math.sin(ph) * amp;
        const k = 0.5 + 0.5 * Math.sin(ph);
        const tint = [deep[0] + (base[0] - deep[0]) * k, deep[1] + (base[1] - deep[1]) * k, deep[2] + (base[2] - deep[2]) * k];
        if (p.glowSweep) { const g = Math.max(0, 1 - Math.abs(x - sweepX) / (W * 0.18)); tint[0] += (hi[0] - tint[0]) * g * 0.35; tint[1] += (hi[1] - tint[1]) * g * 0.35; tint[2] += (hi[2] - tint[2]) * g * 0.35; }
        wall.set(i, z, tint, Math.sin(ph) * amp * 0.12);
      }
      wall.commit();
      if (sign) {
        // keep the sign clear of the headline: upper-centre on portrait screens, offset on wide ones
        const aspect = (E.canvas.clientWidth || E.canvas.width) / (E.canvas.clientHeight || E.canvas.height) || 1.6;
        const d = Math.hypot(...E.camera.eye.map((v, k) => v - E.camera.target[k])) - 0.9; // the sign sits 0.9 in front of the wall
        const visW = 2 * d * tan * aspect, visH = 2 * d * tan;
        const sc = Math.min(1, (visW * (aspect < 1 ? 0.56 : 0.22)) / signW);
        const pos = aspect < 1 ? [0, visH * 0.24, 0.9] : [visW * 0.25 * (rtl ? -1 : 1), visH * 0.14, 0.9];
        sign.place([pos[0], pos[1], pos[2] + Math.sin(t * 0.6) * 0.04], [0, (rtl ? 0.12 : -0.12) + Math.sin(t * 0.3) * 0.04, 0], sc);
      }
    },
  };
}
