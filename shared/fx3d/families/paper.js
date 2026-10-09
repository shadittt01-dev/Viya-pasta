// Wax paper: a subdivided sheet printed with the wordmark, deformed on the
// CPU each frame (wave, corner fold, ripple, flutter, crumple).
import { geo, m4 } from '../engine.js';
import { C, paperCanvas, lightRig } from '../parts.js';

export function build(E, p) {
  E.env.clear = [0.05, 0.19, 0.22]; E.env.fog = E.env.clear; E.env.fogNear = 9; E.env.fogFar = 28;
  lightRig(E, 'studio');
  const seg = Math.round(p.segments);
  const g = geo.plane(5.2, 3.6, seg, Math.round(seg * 0.7));
  g.dynamic = true;
  const base = g.positions.slice();
  const mesh = E.mesh(g);
  const tex = p.wordmark ? E.texture(paperCanvas()) : null;
  const item = E.add(mesh, { color: C.paper, tex, shine: 22, spec: 0.25, cull: false });
  item.model = m4.trs([0, 0, 0], [-0.35, 0, 0]);
  E.camera = { eye: [0, 0.4, 6], target: [0, 0, 0], fov: 45 };
  const pos = g.positions, nrm = g.normals;
  const cols = seg + 1, rows = Math.round(seg * 0.7) + 1;
  const amp = p.amplitude;
  return {
    update(t) {
      const s = t * (0.2 + p.speed);
      for (let i = 0; i < base.length; i += 3) {
        const x = base[i], y = base[i + 1];
        let z = 0;
        switch (p.mode) {
          case 'fold': { const d = Math.max(0, x + y - 2.4 + Math.sin(s) * 0.8); z = d * d * amp * 0.8; break; }
          case 'ripple': z = Math.sin(Math.hypot(x, y) * 4 - s * 3) * 0.12 * amp; break;
          case 'flutter': z = Math.sin(x * 1.6 + s * 2.4) * 0.3 * amp * (x + 2.6) / 5.2 + Math.sin(y * 3 + s * 3) * 0.05; break;
          case 'crumple': z = (Math.sin(x * 5.1 + 1.3) * Math.cos(y * 4.7) + Math.sin(x * 9.3 - y * 6.1) * 0.5) * 0.12 * amp * (0.8 + 0.2 * Math.sin(s)); break;
          default: z = Math.sin(x * 1.3 + s) * 0.35 * amp + Math.cos(y * 1.6 + s * 0.7) * 0.12 * amp;
        }
        pos[i + 2] = z;
      }
      // normals from the height field
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 3;
        const l = (r * cols + Math.max(0, c - 1)) * 3, rr = (r * cols + Math.min(cols - 1, c + 1)) * 3;
        const d = (Math.max(0, r - 1) * cols + c) * 3, u = (Math.min(rows - 1, r + 1) * cols + c) * 3;
        const dx = (pos[rr + 2] - pos[l + 2]) / ((pos[rr] - pos[l]) || 1), dy = (pos[u + 2] - pos[d + 2]) / ((pos[u + 1] - pos[d + 1]) || 1);
        const len = Math.hypot(dx, dy, 1);
        nrm[i] = -dx / len; nrm[i + 1] = -dy / len; nrm[i + 2] = 1 / len;
      }
      E.updateMesh(mesh, pos, nrm);
      item.model = m4.trs([0, 0, 0], [-0.4 + Math.sin(s * 0.3) * 0.05, Math.sin(s * 0.2) * 0.15, 0]);
    },
  };
}
