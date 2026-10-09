// Compact WebGL2 engine for the 3D presets: real meshes, perspective camera,
// Blinn-Phong lighting with up to 4 lights, instancing, textured planes and
// point sprites. No external library. Browser-only.

// ------------------------------------------------------------------ math
export const m4 = {
  ident: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  },
  lookAt(eye, target, up = [0, 1, 0]) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1]);
  },
  /** Compose translate * rotY * rotX * rotZ * scale. */
  trs(t = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    const [rx, ry, rz] = r;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // R = Ry * Rx * Rz
    const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
    const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
    const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
    const S = Array.isArray(s) ? s : [s, s, s];
    return new Float32Array([r00 * S[0], r10 * S[0], r20 * S[0], 0, r01 * S[1], r11 * S[1], r21 * S[1], 0, r02 * S[2], r12 * S[2], r22 * S[2], 0, t[0], t[1], t[2], 1]);
  },
};

export function hex(c) {
  const n = parseInt(String(c).replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// ------------------------------------------------------------------ geometry
function finish(pos, nrm, uv, idx) { return { positions: new Float32Array(pos), normals: new Float32Array(nrm), uvs: new Float32Array(uv), indices: pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) }; }

export const geo = {
  box(w = 1, h = 1, d = 1) {
    const P = [], N = [], U = [], I = [];
    const faces = [[[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
    for (const [n, u, v] of faces) {
      const base = P.length / 3;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        P.push((n[0] + u[0] * a + v[0] * b) * w / 2, (n[1] + u[1] * a + v[1] * b) * h / 2, (n[2] + u[2] * a + v[2] * b) * d / 2);
        N.push(...n); U.push((a + 1) / 2, (b + 1) / 2);
      }
      I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return finish(P, N, U, I);
  },
  /** Surface of revolution around Y. profile: [[radius, y], ...] bottom→top. */
  lathe(profile, segs = 32, radiusFn = null) {
    const P = [], N = [], U = [], I = [];
    const rows = profile.length;
    for (let i = 0; i < rows; i++) {
      const [r, y] = profile[i];
      const prev = profile[Math.max(0, i - 1)], next = profile[Math.min(rows - 1, i + 1)];
      const dr = next[0] - prev[0], dy = next[1] - prev[1];
      let nx = dy, ny = -dr; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const rr = radiusFn ? radiusFn(r, a, i / (rows - 1)) : r;
        P.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
        N.push(Math.cos(a) * nx, ny, Math.sin(a) * nx);
        U.push(j / segs, i / (rows - 1));
      }
    }
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j, b = a + segs + 1;
      I.push(a, b, a + 1, a + 1, b, b + 1);
    }
    return finish(P, N, U, I);
  },
  sphere(r = 1, w = 24, h = 16) {
    const prof = [];
    for (let i = 0; i <= h; i++) { const t = -Math.PI / 2 + (i / h) * Math.PI; prof.push([Math.cos(t) * r, Math.sin(t) * r]); }
    return geo.lathe(prof, w);
  },
  cylinder(r = 0.5, h = 1, segs = 24) {
    return geo.lathe([[0.0001, -h / 2], [r, -h / 2], [r, -h / 2 + 0.0001], [r, h / 2 - 0.0001], [r, h / 2], [0.0001, h / 2]], segs);
  },
  capsule(r = 0.3, len = 1, segs = 20) {
    const prof = [];
    for (let i = 0; i <= 8; i++) { const t = -Math.PI / 2 + (i / 8) * (Math.PI / 2); prof.push([Math.cos(t) * r, Math.sin(t) * r - len / 2]); }
    for (let i = 0; i <= 8; i++) { const t = (i / 8) * (Math.PI / 2); prof.push([Math.cos(t) * r, Math.sin(t) * r + len / 2]); }
    return geo.lathe(prof, segs);
  },
  torus(R = 1, r = 0.3, seg = 40, side = 16) {
    const P = [], N = [], U = [], I = [];
    for (let i = 0; i <= seg; i++) {
      const u = (i / seg) * Math.PI * 2;
      for (let j = 0; j <= side; j++) {
        const v = (j / side) * Math.PI * 2;
        const cx = Math.cos(u), sx = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
        P.push((R + r * cv) * cx, r * sv, (R + r * cv) * sx);
        N.push(cv * cx, sv, cv * sx);
        U.push(i / seg, j / side);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < side; j++) { const a = i * (side + 1) + j, b = a + side + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    return finish(P, N, U, I);
  },
  knot(R = 1, r = 0.22, p = 2, q = 3, seg = 160, side = 12) {
    const P = [], N = [], U = [], I = [];
    const curve = (t) => { const c = Math.cos(q * t) + 2; return [R * 0.4 * c * Math.cos(p * t), R * 0.4 * c * Math.sin(p * t), R * 0.4 * Math.sin(q * t)]; };
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const a = curve(t), b = curve(t + 0.01);
      let T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; let l = Math.hypot(...T); T = T.map((x) => x / l);
      let Nn = [b[0] + a[0], b[1] + a[1], b[2] + a[2]];
      let B = [T[1] * Nn[2] - T[2] * Nn[1], T[2] * Nn[0] - T[0] * Nn[2], T[0] * Nn[1] - T[1] * Nn[0]]; l = Math.hypot(...B) || 1; B = B.map((x) => x / l);
      Nn = [B[1] * T[2] - B[2] * T[1], B[2] * T[0] - B[0] * T[2], B[0] * T[1] - B[1] * T[0]];
      for (let j = 0; j <= side; j++) {
        const v = (j / side) * Math.PI * 2, cx = -r * Math.cos(v), cy = r * Math.sin(v);
        const n = [Nn[0] * cx + B[0] * cy, Nn[1] * cx + B[1] * cy, Nn[2] * cx + B[2] * cy];
        P.push(a[0] + n[0], a[1] + n[1], a[2] + n[2]);
        const nl = Math.hypot(...n) || 1; N.push(n[0] / nl, n[1] / nl, n[2] / nl); U.push(i / seg, j / side);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < side; j++) { const a = i * (side + 1) + j, b = a + side + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    return finish(P, N, U, I);
  },
  icosa(r = 1) {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const P = [], N = [], U = [], I = [];
    for (const tri of f) {
      const pts = tri.map((i) => { const l = Math.hypot(...v[i]); return v[i].map((x) => (x / l) * r); });
      const e1 = pts[1].map((x, k) => x - pts[0][k]), e2 = pts[2].map((x, k) => x - pts[0][k]);
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const l = Math.hypot(...n); n = n.map((x) => x / l);
      for (const p of pts) { I.push(P.length / 3); P.push(...p); N.push(...n); U.push(0, 0); }
    }
    return finish(P, N, U, I);
  },
  /** Subdivided plane in XY, facing +Z. */
  plane(w = 1, h = 1, sx = 1, sy = 1) {
    const P = [], N = [], U = [], I = [];
    for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++) {
      P.push((i / sx - 0.5) * w, (j / sy - 0.5) * h, 0); N.push(0, 0, 1); U.push(i / sx, j / sy);
    }
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) { const a = j * (sx + 1) + i, b = a + sx + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
    return finish(P, N, U, I);
  },
  /** Thin wavy disc for smashed patties: irregular edge, slightly domed. */
  patty(r = 1, h = 0.18, seed = 1) {
    const rf = (rr, a) => rr * (1 + 0.06 * Math.sin(a * 5 + seed) + 0.04 * Math.sin(a * 11 + seed * 2.3));
    return geo.lathe([[0.001, -h / 2], [r * 0.9, -h / 2], [r, -h * 0.25], [r * 1.02, 0], [r, h * 0.3], [r * 0.85, h / 2], [0.001, h / 2 + 0.02]], 48, rf);
  },
  /** Cheese slice: square plane drooping at the corners. */
  cheese(size = 2.1, droop = 0.35, seg = 14) {
    const g = geo.plane(size, size, seg, seg);
    const P = g.positions, N = g.normals;
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i], y = P[i + 1];
      const d = Math.max(0, Math.hypot(x, y) - size * 0.38);
      P[i + 2] = -d * d * droop * 2.2; // sag
      // rotate plane to lie flat (XZ): (x, y, z) → (x, z, -y)
      const z = P[i + 2]; P[i + 1] = z; P[i + 2] = -y;
      N[i] = 0; N[i + 1] = 1; N[i + 2] = 0;
    }
    return g;
  },
};

// ------------------------------------------------------------------ shaders
const VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUv;
layout(location=3) in mat4 aInst; layout(location=7) in vec4 aInstColor;
uniform mat4 uProj, uView, uModel; uniform bool uInstanced;
out vec3 vPos; out vec3 vNrm; out vec2 vUv; out vec4 vTint;
void main(){
  mat4 M = uInstanced ? uModel * aInst : uModel;
  vec4 wp = M * vec4(aPos,1.0); vPos = wp.xyz;
  vNrm = normalize(mat3(M) * aNrm); vUv = aUv; vTint = uInstanced ? aInstColor : vec4(1.0);
  gl_Position = uProj * uView * wp;
}`;
const FS = `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vNrm; in vec2 vUv; in vec4 vTint; out vec4 frag;
uniform vec3 uColor, uEmissive, uCam, uSky, uGround, uFog; uniform float uShine, uSpec, uRim, uFogNear, uFogFar, uAlpha, uUseTex, uUnlit;
uniform sampler2D uTex;
uniform vec4 uLightPos[4]; uniform vec3 uLightColor[4]; uniform int uLights;
void main(){
  vec3 n = normalize(vNrm); if(!gl_FrontFacing) n = -n;
  vec3 base = uColor * vTint.rgb;
  float a = uAlpha * vTint.a;
  if (uUseTex > 0.5) { vec4 tx = texture(uTex, vUv); base = mix(base, tx.rgb, tx.a); }
  if (uUnlit > 0.5) { frag = vec4(base * (0.9 + 0.1 * max(n.z, 0.0)), a); return; } // brand-accurate colour (logos, labels)
  vec3 V = normalize(uCam - vPos);
  vec3 col = base * mix(uGround, uSky, n.y * 0.5 + 0.5);
  for (int i=0;i<4;i++){ if(i>=uLights) break;
    vec3 L = uLightPos[i].w > 0.5 ? uLightPos[i].xyz - vPos : uLightPos[i].xyz; float dist = length(L); L /= dist;
    float att = uLightPos[i].w > 0.5 ? 1.0 / (1.0 + 0.04*dist*dist) : 1.0;
    float d = max(dot(n,L),0.0); vec3 H = normalize(L+V);
    col += (base * d + uSpec * pow(max(dot(n,H),0.0), uShine) * d) * uLightColor[i] * att;
  }
  col += uRim * pow(1.0 - max(dot(n,V),0.0), 3.0) * uSky;
  col += uEmissive;
  float f = clamp((length(uCam - vPos) - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  col = mix(col, uFog, f);
  frag = vec4(pow(col, vec3(1.0/1.6)), a);
}`;
const PVS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec4 aCol; layout(location=2) in float aSize;
uniform mat4 uProj, uView; uniform float uScale; out vec4 vCol;
void main(){ vec4 v = uView * vec4(aPos,1.0); gl_Position = uProj * v; gl_PointSize = aSize * uScale / max(0.5, -v.z); vCol = aCol; }`;
const PFS = `#version 300 es
precision mediump float; in vec4 vCol; out vec4 frag; uniform float uSoft;
void main(){ vec2 c = gl_PointCoord*2.0-1.0; float d = dot(c,c); if(d>1.0) discard; frag = vec4(vCol.rgb, vCol.a * mix(1.0, 1.0 - d, uSoft)); }`;

function compile(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

// ------------------------------------------------------------------ renderer
export class Engine {
  constructor(canvas, { dpr = 1, alpha = false } = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true, alpha, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('WEBGL2_UNAVAILABLE');
    this.gl = gl;
    this.dpr = dpr;
    this.prog = compile(gl, VS, FS);
    this.pprog = compile(gl, PVS, PFS);
    this.items = [];
    this.points = [];
    this.lights = [];
    this.camera = { eye: [0, 1, 6], target: [0, 0, 0], fov: 40 };
    this.env = { sky: hex('#f1dcc0'), ground: hex('#2a1f1a'), fog: hex('#2A1B15'), fogNear: 12, fogFar: 40, clear: hex('#2A1B15'), ambient: 0.35 };
    this.textures = [];
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  mesh(g) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = (data, loc, size, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; };
    const posBuf = buf(g.positions, 0, 3, g.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    const nrmBuf = buf(g.normals, 1, 3, g.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    buf(g.uvs, 2, 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, posBuf, nrmBuf, count: g.indices.length, type: g.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, instBuf: null, colBuf: null, instances: 0 };
  }

  /** Re-upload positions/normals of a mesh created from a geometry with { dynamic: true }. */
  updateMesh(mesh, positions, normals) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
    if (normals) { gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nrmBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, normals); }
  }

  /** Give a mesh per-instance matrices (Float32Array n*16) and colours (n*4). */
  instance(mesh, mats, cols) {
    const gl = this.gl;
    gl.bindVertexArray(mesh.vao);
    if (!mesh.instBuf) {
      mesh.instBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instBuf);
      for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(3 + i); gl.vertexAttribPointer(3 + i, 4, gl.FLOAT, false, 64, i * 16); gl.vertexAttribDivisor(3 + i, 1); }
      mesh.colBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colBuf);
      gl.enableVertexAttribArray(7); gl.vertexAttribPointer(7, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(7, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instBuf); gl.bufferData(gl.ARRAY_BUFFER, mats, gl.DYNAMIC_DRAW);
    if (cols) { gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colBuf); gl.bufferData(gl.ARRAY_BUFFER, cols, gl.DYNAMIC_DRAW); }
    gl.bindVertexArray(null);
    mesh.instances = mats.length / 16;
  }

  texture(source) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.push(t);
    return t;
  }

  add(mesh, material = {}, model = m4.ident()) {
    const item = { mesh, model, mat: { color: hex('#ffffff'), emissive: [0, 0, 0], shine: 32, spec: 0.4, rim: 0.15, alpha: 1, tex: null, cull: true, ...material } };
    this.items.push(item);
    return item;
  }

  /** Point cloud: positions Float32Array n*3, colours n*4, sizes n. */
  pointCloud(n, { soft = 1, additive = false } = {}) {
    const gl = this.gl;
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const mk = (loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, n * size * 4, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; };
    const pc = { vao, n, pos: mk(0, 3), col: mk(1, 4), size: mk(2, 1), soft, additive, positions: new Float32Array(n * 3), colors: new Float32Array(n * 4), sizes: new Float32Array(n) };
    gl.bindVertexArray(null);
    pc.upload = () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, pc.pos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pc.positions);
      gl.bindBuffer(gl.ARRAY_BUFFER, pc.col); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pc.colors);
      gl.bindBuffer(gl.ARRAY_BUFFER, pc.size); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pc.sizes);
    };
    this.points.push(pc);
    return pc;
  }

  light(pos, color, point = false) { const l = { pos: [...pos, point ? 1 : 0], color }; this.lights.push(l); return l; }

  resize() {
    const c = this.canvas;
    const w = Math.max(1, Math.round(c.clientWidth * this.dpr)), h = Math.max(1, Math.round(c.clientHeight * this.dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.gl.viewport(0, 0, c.width, c.height);
  }

  render() {
    const gl = this.gl, P = this.prog, e = this.env, cam = this.camera;
    this.resize();
    gl.clearColor(...e.clear, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const proj = m4.perspective((cam.fov * Math.PI) / 180, this.canvas.width / this.canvas.height, 0.1, 100);
    const view = m4.lookAt(cam.eye, cam.target);
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u.uProj, false, proj);
    gl.uniformMatrix4fv(P.u.uView, false, view);
    gl.uniform3fv(P.u.uCam, cam.eye);
    gl.uniform3fv(P.u.uSky, e.sky.map((x) => x * e.ambient));
    gl.uniform3fv(P.u.uGround, e.ground.map((x) => x * e.ambient));
    gl.uniform3fv(P.u.uFog, e.fog);
    gl.uniform1f(P.u.uFogNear, e.fogNear); gl.uniform1f(P.u.uFogFar, e.fogFar);
    const lp = new Float32Array(16), lc = new Float32Array(12);
    this.lights.slice(0, 4).forEach((l, i) => { lp.set(l.pos, i * 4); lc.set(l.color, i * 3); });
    gl.uniform4fv(P.u.uLightPos, lp); gl.uniform3fv(P.u.uLightColor, lc); gl.uniform1i(P.u.uLights, Math.min(4, this.lights.length));
    gl.uniform1i(P.u.uTex, 0);
    const opaque = this.items.filter((i) => !i.hidden && i.mat.alpha >= 1), trans = this.items.filter((i) => !i.hidden && i.mat.alpha < 1);
    for (const it of [...opaque, ...trans]) {
      const m = it.mat;
      if (m.cull) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
      gl.uniformMatrix4fv(P.u.uModel, false, it.model);
      gl.uniform3fv(P.u.uColor, m.color); gl.uniform3fv(P.u.uEmissive, m.emissive);
      gl.uniform1f(P.u.uShine, m.shine); gl.uniform1f(P.u.uSpec, m.spec); gl.uniform1f(P.u.uRim, m.rim); gl.uniform1f(P.u.uAlpha, m.alpha);
      gl.uniform1f(P.u.uUseTex, m.tex ? 1 : 0);
      gl.uniform1f(P.u.uUnlit, m.unlit ? 1 : 0);
      if (m.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.tex); }
      gl.uniform1i(P.u.uInstanced, it.mesh.instances > 0 ? 1 : 0);
      gl.bindVertexArray(it.mesh.vao);
      if (it.mesh.instances > 0) gl.drawElementsInstanced(gl.TRIANGLES, it.mesh.count, it.mesh.type, 0, it.mesh.instances);
      else gl.drawElements(gl.TRIANGLES, it.mesh.count, it.mesh.type, 0);
    }
    if (this.points.length) {
      const Q = this.pprog;
      gl.useProgram(Q.p);
      gl.uniformMatrix4fv(Q.u.uProj, false, proj); gl.uniformMatrix4fv(Q.u.uView, false, view);
      gl.uniform1f(Q.u.uScale, this.canvas.height / 10);
      gl.depthMask(false);
      for (const pc of this.points) {
        gl.blendFunc(gl.SRC_ALPHA, pc.additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(Q.u.uSoft, pc.soft);
        gl.bindVertexArray(pc.vao);
        gl.drawArrays(gl.POINTS, 0, pc.n);
      }
      gl.depthMask(true);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    gl.bindVertexArray(null);
  }

  clearScene() {
    this.items = []; this.points = []; this.lights = [];
    for (const t of this.textures) this.gl.deleteTexture(t);
    this.textures = [];
  }

  destroy() { this.clearScene(); this.gl.getExtension('WEBGL_lose_context')?.loseContext(); }
}

/** Canvas texture with the VIA PASTA wordmark (live text drawn into pixels for 3D only). */
export function wordmarkCanvas({ w = 512, h = 256, bg = '#A8322A', fg = '#ffffff', sub = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  // Street-plaque frame: a thin cream line inset from the edge.
  x.strokeStyle = 'rgba(251,246,238,.9)'; x.lineWidth = Math.max(2, h * 0.02);
  x.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
  x.font = `700 ${Math.round(Math.min(h * 0.34, w / 6.4))}px Georgia, "Times New Roman", serif`;
  x.fillText('VIA PASTA', w / 2, h * (sub ? 0.45 : 0.52));
  if (sub) { x.font = `600 ${Math.round(h * 0.09)}px Arial, sans-serif`; x.fillText('I T A L I A N   ·   Y A N B U', w / 2, h * 0.74); }
  return c;
}
