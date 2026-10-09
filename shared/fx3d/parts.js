// Shared scene parts for the 3D families: the procedural pasta dish, lighting
// rigs, camera rigs, the ceramic tile wall and the red street-sign block.
import { geo, m4, hex, wordmarkCanvas } from './engine.js';

export const C = {
  maroon: hex('#A8322A'), tile: hex('#2E5B3F'), tileDeep: hex('#1E3F2B'), night: hex('#2A1B15'), glow: hex('#E8B649'),
  paper: hex('#FBF6EE'), bun: hex('#E2B866'), bunLight: hex('#F0CF7A'), beef: hex('#6B3A26'), cheese: hex('#F2C94C'),
  pasta: hex('#F1C76A'), chicken: hex('#E9C38F'), pepperRed: hex('#D63B2F'), pepperGreen: hex('#4C8A3A'), basil: hex('#2E5B3F'),
  tomato: hex('#C0392B'), wedge: hex('#E9B85A'), board: hex('#7A5232'), white: hex('#ffffff'), warm: hex('#FFD9A8'),
};

export function lightRig(E, kind = 'studio') {
  E.lights = [];
  if (kind === 'warm') {
    E.light([3, 6, 4], [1.25, 0.95, 0.7]); E.light([-4, 2, -2], [0.25, 0.35, 0.45]);
    E.env.sky = hex('#ffe2bd'); E.env.ground = hex('#3a2416'); E.env.ambient = 0.45;
  } else if (kind === 'neon') {
    E.light([2.5, 3, 3], [0.55, 1.1, 1.15]); E.light([-3, 1, 2], [1.0, 0.35, 0.42]); E.light([0, 5, -3], [0.3, 0.6, 0.65]);
    E.env.sky = hex('#f0c35a'); E.env.ground = hex('#1f120d'); E.env.ambient = 0.35;
  } else {
    E.light([4, 6, 5], [1.05, 1.02, 0.98]); E.light([-5, 3, 2], [0.4, 0.45, 0.5]); E.light([0, 2, -6], [0.5, 0.6, 0.6]);
    E.env.sky = hex('#f3e6d4'); E.env.ground = hex('#2b3233'); E.env.ambient = 0.42;
  }
}

/** Camera rigs; returns update(t) that positions the camera. */
export function cameraRig(E, kind, { radius = 6, height = 1.6, target = [0, 0.4, 0], speed = 0.3 } = {}) {
  E.camera.target = target;
  return (t) => {
    switch (kind) {
      case 'orbit': { const a = t * speed * 0.6 + 0.6; E.camera.eye = [Math.sin(a) * radius, height + 0.6, Math.cos(a) * radius]; break; }
      case 'low': E.camera.eye = [Math.sin(t * speed * 0.2) * 0.8, height * 0.25 + 0.3, radius * 0.95]; break;
      case 'three-quarter': E.camera.eye = [radius * 0.62, height * 1.25 + 0.6, radius * 0.78]; break;
      case 'top': E.camera.eye = [0.001, radius * 1.05, 0.9]; break;
      default: E.camera.eye = [Math.sin(t * speed * 0.15) * 0.3, height, radius];
    }
  };
}

const RECIPES = {
  alfredo: { sauce: hex('#EBD3A0'), pasta: 'penne', toppings: ['chicken'] },
  pesto: { sauce: hex('#5E8F3E'), pasta: 'penne', toppings: ['chicken'] },
  mex: { sauce: hex('#D9572B'), pasta: 'penne', toppings: ['veg'] },
  bolognese: { sauce: hex('#B8352A'), pasta: 'spaghetti', toppings: ['beef'] },
};

function scatter(E, mesh, n, place, color, mat = {}) {
  const mats = new Float32Array(n * 16), cols = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const [t, r, c, sc] = place(i);
    mats.set(m4.trs(t, r, sc || 1), i * 16);
    cols.set([...(c || color), 1], i * 4);
  }
  E.instance(mesh, mats, cols);
  return mesh;
}

/**
 * Build a pasta dish as separate layers so families can stack, explode or animate them.
 * Layers bottom→top: bowl, pasta, sauce, toppings, basil. Returns [{ item, baseY, height }].
 */
export function buildPasta(E, recipe = 'alfredo', { scale = 1 } = {}) {
  const R = RECIPES[recipe] || RECIPES.alfredo;
  const layers = [];
  const push = (mesh, mat, h) => { const item = E.add(mesh, mat); layers.push({ item, baseY: 0, height: h }); return item; };
  // wide ceramic bowl with a red rim line (single lathe surface, both sides drawn)
  push(E.mesh(geo.lathe([[0.001, 0], [0.72, 0], [1.22, 0.3], [1.5, 0.62], [1.46, 0.66], [1.18, 0.42], [0.7, 0.18], [0.001, 0.16]], 56)),
    { color: C.paper, shine: 90, spec: 0.7, rim: 0.2, cull: false }, 0.2);
  // pasta: instanced penne tubes in a mound, or a twirled spaghetti nest of thin tori
  const seedRand = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  if (R.pasta === 'spaghetti') {
    const m = E.mesh(geo.torus(0.5, 0.035, 48, 6));
    scatter(E, m, 14, (i) => {
      const k = i / 14; const r = 1 - k * 0.55;
      return [[(seedRand(i, 1) - 0.5) * 0.12 * r, k * 0.42, (seedRand(i, 2) - 0.5) * 0.12],
        [Math.PI / 2 + (seedRand(i, 3) - 0.5) * 0.5, seedRand(i, 4) * 6, (seedRand(i, 5) - 0.5) * 0.5], null, 1.7 * r];
    }, C.pasta);
    push(m, { color: C.white, shine: 40, spec: 0.3 }, 0.32);
  } else {
    const m = E.mesh(geo.cylinder(0.055, 0.46, 14));
    scatter(E, m, 90, (i) => {
      const a = seedRand(i, 1) * 6.283, rad = Math.sqrt(seedRand(i, 2)) * 0.95;
      const y = (1 - rad / 0.95) * 0.5 + seedRand(i, 3) * 0.1;
      const g = 0.88 + seedRand(i, 6) * 0.14;
      return [[Math.cos(a) * rad, y, Math.sin(a) * rad], [seedRand(i, 4) * 3, seedRand(i, 5) * 3, Math.PI / 2], C.pasta.map((v) => v * g)];
    }, C.pasta);
    push(m, { color: C.white, shine: 40, spec: 0.3 }, 0.3);
  }
  // sauce: a glossy, irregular pool over the pasta
  push(E.mesh(geo.lathe([[0.001, 0], [0.58, 0], [0.6, 0.03], [0.34, 0.1], [0.001, 0.12]], 40, (r, a) => r * (1 + 0.16 * Math.sin(a * 5) + 0.06 * Math.sin(a * 11)))),
    { color: R.sauce, shine: 80, spec: 0.65 }, 0.02);
  for (const tp of R.toppings) {
    if (tp === 'chicken') {
      const m = E.mesh(geo.box(0.2, 0.08, 0.13));
      scatter(E, m, 6, (i) => { const a = (i / 6) * 6.283 + 0.3; return [[Math.cos(a) * 0.42, 0.02 + (i % 2) * 0.03, Math.sin(a) * 0.5], [0.2 * (i % 3), a, 0.15], null]; }, C.chicken);
      push(m, { color: C.white, shine: 20, spec: 0.2 }, 0.08);
    } else if (tp === 'veg') {
      const m = E.mesh(geo.box(0.14, 0.08, 0.14));
      scatter(E, m, 12, (i) => { const a = (i / 12) * 6.283; const r = 0.3 + (i % 3) * 0.2; return [[Math.cos(a) * r, 0.02, Math.sin(a) * r], [i, a, 0], i % 2 ? C.pepperGreen : C.pepperRed]; }, C.pepperRed);
      push(m, { color: C.white, shine: 50, spec: 0.5 }, 0.06);
    } else if (tp === 'beef') {
      const m = E.mesh(geo.sphere(0.07, 10, 8));
      scatter(E, m, 22, (i) => { const a = (i * 2.399) % 6.283; const r = Math.sqrt(i / 22) * 0.7; return [[Math.cos(a) * r, 0.02, Math.sin(a) * r], [0, 0, 0], null]; }, C.beef);
      push(m, { color: C.white, shine: 12, spec: 0.15 }, 0.06);
    }
  }
  // basil leaves on top
  const leaf = E.mesh(geo.sphere(0.13, 12, 8));
  scatter(E, leaf, 3, (i) => [[(i - 1) * 0.16, 0.02, (i % 2) * 0.1 - 0.05], [0.2, i * 1.1, 0], null], C.basil);
  push(leaf, { color: C.white, shine: 60, spec: 0.4 }, 0.06);
  let y = 0;
  for (const l of layers) { l.baseY = y; y += l.height; }
  const total = y;
  for (const l of layers) l.baseY -= total * 0.35;
  layers.scale = scale;
  // Flatten the basil spheres into leaves via a non-uniform scale on the item.
  layers[layers.length - 1].leafScale = [1.3, 0.25, 0.7];
  return layers;
}

/** Position dish layers; spread separates layers vertically, spin rotates. */
export function poseLayers(layers, { spread = 0, spin = 0, x = 0, y = 0, z = 0, tilt = 0, scale = layers.scale || 1, perLayer = null } = {}) {
  layers.forEach((l, i) => {
    const extra = perLayer ? perLayer(i, layers.length) : { dy: 0, rot: 0 };
    const sc = l.leafScale ? l.leafScale.map((v) => v * scale) : scale;
    l.item.model = m4.trs([x, y + (l.baseY + spread * i * 0.35 + (extra.dy || 0)) * scale, z], [tilt, spin + (extra.rot || 0), 0], sc);
  });
}

export function addGround(E, kind) {
  if (kind === 'none') return null;
  if (kind === 'board') return E.add(E.mesh(geo.cylinder(1.9, 0.14, 48)), { color: C.board, shine: 12, spec: 0.1 }, m4.trs([0, -0.75, 0]));
  // wax paper sheet with wordmark
  const tex = E.texture(paperCanvas());
  const g = geo.plane(4.6, 4.6, 8, 8);
  for (let i = 0; i < g.positions.length; i += 3) { const yv = g.positions[i + 1]; g.positions[i + 1] = -0.05 * Math.sin(g.positions[i] * 1.3) ; g.positions[i + 2] = -yv; g.normals[i] = 0; g.normals[i + 1] = 1; g.normals[i + 2] = 0; }
  return E.add(E.mesh(g), { color: C.paper, tex, shine: 20, spec: 0.15, cull: false }, m4.trs([0, -0.72, 0], [0, 0.4, 0]));
}

export function paperCanvas(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#FBF6EE'; x.fillRect(0, 0, size, size);
  x.fillStyle = 'rgba(168,50,42,.55)'; x.font = '900 30px Archivo, "Arial Black", Arial, sans-serif'; x.textAlign = 'center';
  for (let r = 0; r < 9; r++) for (let k = -1; k < 5; k++) x.fillText('VIA PASTA', k * 130 + (r % 2) * 65, 40 + r * 60);
  return c;
}

/** Instanced glazed tile wall. Returns { mesh, item, layout:[{x,y}], set(i, z, tint) , commit() }. */
export function tileWall(E, { cols = 22, rows = 6, tile = 'vertical', gap = 0.06 } = {}) {
  const tw = tile === 'square' ? 0.5 : tile === 'brick' ? 0.9 : 0.36;
  const th = tile === 'square' ? 0.5 : tile === 'brick' ? 0.36 : 1.2;
  const mesh = E.mesh(geo.box(tw - gap, th - gap, 0.18));
  const n = cols * rows;
  const mats = new Float32Array(n * 16), cols4 = new Float32Array(n * 4);
  const layout = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const off = tile === 'brick' && r % 2 ? tw / 2 : 0;
    layout.push({ x: (c - cols / 2 + 0.5) * tw + off, y: (r - rows / 2 + 0.5) * th, c, r });
  }
  const item = E.add(mesh, { color: C.white, shine: 90, spec: 0.85, rim: 0.25 });
  const api = {
    mesh, item, layout, tw, th, n,
    set(i, z, tint = C.tile, rot = 0) {
      const p = layout[i];
      mats.set(m4.trs([p.x, p.y, z], [0, rot, 0]), i * 16);
      cols4.set([tint[0], tint[1], tint[2], 1], i * 4);
    },
    commit() { E.instance(mesh, mats, cols4); },
  };
  for (let i = 0; i < n; i++) api.set(i, 0);
  api.commit();
  return api;
}

export function signBlock(E, { w = 3.2, h = 1.6, d = 0.35, bevel = 0.08 } = {}) {
  const tex = E.texture(wordmarkCanvas({ w: 1024, h: 512 }));
  // body is lit with a gamma-compensated colour so its edges read as the same maroon as the unlit face
  const body = E.add(E.mesh(geo.box(w, h, d)), { color: C.maroon.map((c) => c ** 1.6), shine: 50 + bevel * 300, spec: 0.2 + bevel, rim: 0.08 });
  const face = E.add(E.mesh(geo.plane(w * 0.98, h * 0.98)), { color: C.maroon, tex, unlit: true });
  return {
    body, face,
    place(t = [0, 0, 0], r = [0, 0, 0], s = 1) {
      body.model = m4.trs(t, r, s);
      face.model = m4.mul(m4.trs(t, r, s), m4.trs([0, 0, d / 2 + 0.002]));
    },
  };
}
