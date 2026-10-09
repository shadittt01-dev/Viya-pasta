// Particle field: embers, steam, sesame, dust or LED glow as GPU point sprites
// in a 3D volume (depth-scaled), with the sign block in the background.
import { C, signBlock, lightRig } from '../parts.js';

const KIND = {
  embers: { col: [[1, 0.55, 0.2], [1, 0.32, 0.12], [1, 0.8, 0.4]], alpha: 0.9, additive: true, soft: 1 },
  steam: { col: [[0.85, 0.92, 0.92]], alpha: 0.12, additive: false, soft: 1 },
  sesame: { col: [[0.96, 0.88, 0.7], [0.9, 0.78, 0.55]], alpha: 0.95, additive: false, soft: 0.2 },
  dust: { col: [[0.7, 0.85, 0.85]], alpha: 0.5, additive: true, soft: 1 },
  glow: { col: [[0.18, 0.85, 0.87], [0.6, 0.95, 0.95]], alpha: 0.7, additive: true, soft: 1 },
};

export function build(E, p) {
  E.env.clear = C.night; E.env.fog = C.night; E.env.fogNear = 8; E.env.fogFar = 26;
  lightRig(E, 'neon');
  const sign = signBlock(E, { w: 3, h: 1.5 });
  sign.place([0, 0, -2.5]);
  const k = KIND[p.kind];
  const n = Math.round(p.count);
  const pc = E.pointCloud(n, { soft: k.soft, additive: k.additive });
  const seeds = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random(); seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random(); }
  for (let i = 0; i < n; i++) {
    const c = k.col[i % k.col.length];
    pc.colors.set([c[0], c[1], c[2], k.alpha * (0.5 + seeds[i * 4 + 3] * 0.5)], i * 4);
    pc.sizes[i] = p.size * (0.5 + seeds[i * 4 + 2]);
  }
  E.camera = { eye: [0, 0.4, 7], target: [0, 0, 0], fov: 50 };
  const W = 9, H = 6, D = 6;
  return {
    update(t) {
      const s = t * (0.15 + p.speed);
      for (let i = 0; i < n; i++) {
        const a = seeds[i * 4], b = seeds[i * 4 + 1], c = seeds[i * 4 + 2], d = seeds[i * 4 + 3];
        let x, y, z;
        switch (p.motion) {
          case 'rise': y = ((b + s * (0.15 + d * 0.2)) % 1) * H - H / 2; x = (a - 0.5) * W + Math.sin(s * 2 + d * 9) * 0.2; z = (c - 0.5) * D; break;
          case 'fall': y = H / 2 - ((b + s * (0.12 + d * 0.15)) % 1) * H; x = (a - 0.5) * W + Math.sin(s + d * 6) * 0.3; z = (c - 0.5) * D; break;
          case 'swirl': { const ang = a * 6.283 + s * (0.2 + d * 0.3); const rad = 0.6 + b * 3.6; x = Math.cos(ang) * rad; z = Math.sin(ang) * rad * 0.7; y = (c - 0.5) * H * 0.8 + Math.sin(ang * 2) * 0.2; break; }
          case 'burst': { const ph = (s * 0.25 + d) % 1; const ang = a * 6.283, el = (b - 0.5) * 3; const rad = ph * 5; x = Math.cos(ang) * Math.cos(el) * rad; y = Math.sin(el) * rad * 0.6 - 0.5 + ph; z = Math.sin(ang) * Math.cos(el) * rad * 0.6; pc.colors[i * 4 + 3] = k.alpha * (1 - ph); break; }
          default: x = (a - 0.5) * W + Math.sin(s * 0.3 + d * 7) * 0.6; y = (b - 0.5) * H + Math.cos(s * 0.25 + c * 5) * 0.4; z = (c - 0.5) * D;
        }
        pc.positions[i * 3] = x; pc.positions[i * 3 + 1] = y; pc.positions[i * 3 + 2] = z;
      }
      pc.upload();
      sign.place([0, 0, -2.5], [0, Math.sin(t * 0.2) * 0.1, 0]);
    },
  };
}
