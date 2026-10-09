// Plate build: the layers of a pasta dish (bowl, pasta, sauce, toppings, basil)
// separate and re-assemble along different paths.
import { C, lightRig, cameraRig, buildPasta, poseLayers } from '../parts.js';
import { offsetCamera, sideShift } from './pasta.js';

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export function build(E, p) {
  E.env.clear = [0.2, 0.13, 0.1]; E.env.fog = E.env.clear; E.env.fogNear = 10; E.env.fogFar = 30;
  lightRig(E, 'studio');
  const layers = buildPasta(E, p.recipe);
  const cam = cameraRig(E, p.camera, { radius: 7.2, height: 1.6, target: [0, 0.6, 0], speed: 0.2 });
  const n = layers.length;
  const baseTarget = [...E.camera.target];
  return {
    update(t) {
      E.camera.target = [...baseTarget];
      cam(t);
      offsetCamera(E, sideShift(E));
      const s = t * (0.3 + p.speed);
      switch (p.mode) {
        case 'breathe': poseLayers(layers, { spread: p.spacing * (0.5 + 0.5 * Math.sin(s)), spin: s * 0.2 }); break;
        case 'drop-in': {
          const cyc = (s * 0.35) % 1.4;
          poseLayers(layers, { spin: 0.4, perLayer: (i) => { const start = i / n; const k = Math.min(1, Math.max(0, (cyc - start * 0.8) / 0.25)); return { dy: (1 - ease(k)) * (3 + p.spacing * 2) }; } });
          break;
        }
        case 'spiral': poseLayers(layers, { spread: p.spacing * (0.6 + 0.4 * Math.sin(s * 0.6)), perLayer: (i) => ({ rot: Math.sin(s * 0.8) * i * 0.35 }) }); break;
        case 'pop': { const k = ease(0.5 + 0.5 * Math.sin(s * 1.2)); poseLayers(layers, { spread: p.spacing * k * 1.4, spin: s * 0.15 }); break; }
        default: { // slice: layers fan out sideways like an exploded diagram
          const k = 0.5 + 0.5 * Math.sin(s * 0.7);
          layers.forEach((l, i) => { l.item.model = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, (i - n / 2) * p.spacing * 0.3 * k, l.baseY + i * p.spacing * 0.25 * k, 0, 1]); });
        }
      }
    },
  };
}
