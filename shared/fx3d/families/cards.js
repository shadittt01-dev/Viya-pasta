// Spatial menu cards: textured card planes (menu illustrations + names) in a
// ring, helix, fan, floating grid or deck.
import { geo, m4 } from '../engine.js';
import { C, lightRig } from '../parts.js';
import { illustration } from '../../illustrations.js';

const ITEMS = [['pasta-alfredo', 'Alfredo'], ['pasta-pesto', 'Pesto'], ['pasta-mex', 'Mex Sauce'], ['pasta-bolognese', 'Bolognese'], ['pasta-fettuccine', 'Fettuccine'], ['pasta-ball', 'Pasta Ball'], ['wedges', 'Potato Wedges'], ['mozzarella-sticks', 'Mozzarella Sticks']];

async function cardCanvas(key, name) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#FBF6EE'; x.fillRect(0, 0, 384, 512);
  x.fillStyle = '#A8322A'; x.fillRect(0, 0, 384, 18);
  const url = URL.createObjectURL(new Blob([illustration(key, name)], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    x.drawImage(img, 22, 60, 340, 272);
  } catch { /* illustration missing: card still shows the name */ } finally { URL.revokeObjectURL(url); }
  x.fillStyle = '#2B201B'; x.font = '900 40px Archivo, "Arial Black", Arial, sans-serif'; x.textAlign = 'center';
  x.fillText(name, 192, 400);
  x.fillStyle = '#2E5B3F'; x.fillRect(150, 432, 84, 6);
  return c;
}

export async function build(E, p) {
  E.env.clear = C.night; E.env.fog = C.night; E.env.fogNear = 9; E.env.fogFar = 28;
  lightRig(E, 'studio');
  const n = Math.round(p.cards);
  const plane = E.mesh(geo.plane(1.5, 2, 1, 1));
  const canvases = await Promise.all(ITEMS.map(([k, name]) => cardCanvas(k, name)));
  const textures = canvases.map((cv) => E.texture(cv));
  const cards = Array.from({ length: n }, (_, i) => E.add(plane, { color: C.white, tex: textures[i % textures.length], shine: 30, spec: 0.25, cull: false }));
  const tilt = (p.tilt * Math.PI) / 180;
  E.camera = { eye: [0, 0.6, p.layout === 'ring' || p.layout === 'helix' ? 8 : 7], target: [0, 0, 0], fov: 44 };
  return {
    update(t) {
      const s = t * (0.1 + p.speed);
      cards.forEach((card, i) => {
        let pos, rot;
        switch (p.layout) {
          case 'ring': { const a = (i / n) * Math.PI * 2 + s * 0.5; pos = [Math.sin(a) * 3.3, Math.sin(s + i) * 0.1, Math.cos(a) * 3.3 - 1.5]; rot = [tilt * 0.2, a, 0]; break; }
          case 'helix': { const a = (i / n) * Math.PI * 4 + s * 0.6; pos = [Math.sin(a) * 2.6, (i / n - 0.5) * 4, Math.cos(a) * 2.6 - 1.2]; rot = [0, a, tilt * 0.3]; break; }
          case 'fan': { const k = i - (n - 1) / 2; pos = [k * 0.9, -Math.abs(k) * 0.12, -Math.abs(k) * 0.15]; rot = [0, Math.sin(s) * 0.15, (-k * tilt) / 3]; break; }
          case 'grid': { const c3 = Math.ceil(Math.sqrt(n)); pos = [((i % c3) - (c3 - 1) / 2) * 1.8, (Math.floor(i / c3) - (Math.ceil(n / c3) - 1) / 2) * 2.3, Math.sin(s * 1.3 + i) * 0.3]; rot = [tilt * 0.5 * Math.sin(s + i), tilt * Math.cos(s * 0.7 + i), 0]; break; }
          default: { pos = [Math.sin(s + i) * 0.1, i * 0.06 - n * 0.03, -i * 0.12]; rot = [-tilt * 0.6, Math.sin(s * 0.6) * 0.4 + i * 0.03, (i - n / 2) * 0.02]; }
        }
        card.model = m4.trs(pos, rot);
      });
    },
  };
}
