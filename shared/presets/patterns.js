// 120 branded background/texture/pattern presets (12 families × 10 variants).
// Kind: "svg-pattern" — 2D repeating SVG tiles (no motion). Each generator
// returns a self-contained SVG tile; the site applies it as a CSS background
// layer whose opacity is capped so menu text always stays readable.
import { P, token, rng } from './params.js';

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const r1 = (n) => Math.round(n * 10) / 10;

const COLOR = (def) => P.token('color', def, ['maroon', 'tile', 'ink', 'glow', 'cheese', 'bun', 'white', 'paper', 'night']);

// ------------------------------------------------------------------ generators
const FAMILIES = {
  wordmark: {
    name: 'Wordmark paper', uses: ['menu background', 'packaging feel', 'hero'],
    schema: (d) => [P.select('text', ['VIA PASTA', 'VIA PASTA · YANBU', 'ڤيا باستا', 'VIA PASTA · ڤيا باستا'], d.text), P.select('arrangement', ['grid', 'brick', 'diagonal', 'columns', 'alternate'], d.arrangement),
      P.range('size', 8, 48, 1, d.size), P.range('gap', 0.4, 3, 0.1, d.gap), P.range('rotate', -90, 90, 5, d.rotate), P.select('weight', ['400', '700', '900'], d.weight), P.bool('outline', d.outline), COLOR(d.color)],
    gen(p) {
      const fill = token(p.color);
      const words = p.text === 'VIA PASTA · ڤيا باستا' ? ['VIA PASTA', 'ڤيا باستا'] : [p.text];
      const charW = p.size * (p.text.length > 6 ? 0.62 : 0.78);
      const w = Math.ceil(Math.max(...words.map((x) => x.length)) * charW + p.size * p.gap * 2);
      const h = Math.ceil(p.size * (1 + p.gap) * 2);
      const style = p.outline ? `fill="none" stroke="${fill}" stroke-width="${Math.max(0.6, p.size / 30)}"` : `fill="${fill}"`;
      const t = (x, y, word, extra = '') => `<text x="${r1(x)}" y="${r1(y)}" font-family="'Arial Black','Helvetica Neue',Arial,'Geeza Pro','Noto Sans Arabic',sans-serif" font-weight="${p.weight}" font-size="${p.size}" letter-spacing="${p.size * 0.06}" text-anchor="middle" ${style} ${extra}>${esc(word)}</text>`;
      let body = '';
      const row1 = h * 0.25 + p.size * 0.35, row2 = h * 0.75 + p.size * 0.35;
      const w2 = words[1] || words[0];
      switch (p.arrangement) {
        case 'grid': body = t(w / 2, row1, words[0]) + t(w / 2, row2, w2); break;
        case 'brick': body = t(w / 2, row1, words[0]) + t(0, row2, w2) + t(w, row2, w2); break;
        case 'diagonal': body = t(w / 2, row1, words[0]) + t(0, row2, w2) + t(w, row2, w2); break;
        case 'columns': body = t(w / 2, row1, words[0]) + t(w / 2, row2, w2, 'opacity=".55"'); break;
        case 'alternate': body = t(w / 2, row1, words[0]) + t(0, row2, w2, 'transform-origin="center" font-style="italic"') + t(w, row2, w2, 'font-style="italic"'); break;
        default: body = t(w / 2, row1, words[0]);
      }
      const rot = p.arrangement === 'diagonal' && !p.rotate ? -30 : p.rotate;
      return { w, h, svg: svg(w, h, rot ? `<g transform="rotate(${rot} ${w / 2} ${h / 2})">${body}</g>` : body) };
    },
  },
  tile: {
    name: 'Glazed tile', uses: ['hero', 'section bands', 'storefront feel'],
    schema: (d) => [P.select('bond', ['stack-vertical', 'running', 'herringbone', 'basket', 'stack-square', 'third-offset', 'chevron', 'vertical-running'], d.bond),
      P.range('tile', 6, 40, 1, d.tile), P.range('ratio', 1, 4, 0.5, d.ratio), P.range('grout', 0.5, 4, 0.5, d.grout), P.bool('glaze', d.glaze), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), g = p.grout, s = p.tile, L = s * p.ratio;
      const glaze = (x, y, w, h) => (p.glaze ? `<rect x="${r1(x + w * 0.12)}" y="${r1(y + h * 0.08)}" width="${r1(Math.max(1, w * 0.16))}" height="${r1(h * 0.7)}" rx="1" fill="#fff" opacity=".18"/>` : '');
      const rect = (x, y, w, h) => `<rect x="${r1(x + g / 2)}" y="${r1(y + g / 2)}" width="${r1(w - g)}" height="${r1(h - g)}" rx="${r1(Math.min(2, s / 8))}" fill="${c}"/>${glaze(x + g / 2, y + g / 2, w - g, h - g)}`;
      let w, h, body = '';
      switch (p.bond) {
        case 'stack-vertical': w = s; h = L; body = rect(0, 0, s, L); break;
        case 'vertical-running': w = s * 2; h = L * 2; body = rect(0, 0, s, L) + rect(s, -L / 2, s, L) + rect(s, L / 2, s, L) + rect(s, L * 1.5, s, L) + rect(0, L, s, L); break;
        case 'running': w = L; h = s * 2; body = rect(0, 0, L, s) + rect(-L / 2, s, L, s) + rect(L / 2, s, L, s); break;
        case 'third-offset': w = L; h = s * 3; body = [0, 1, 2].map((i) => rect(-(i * L) / 3, i * s, L, s) + rect(L - (i * L) / 3, i * s, L, s)).join(''); break;
        case 'stack-square': w = s; h = s; body = rect(0, 0, s, s); break;
        case 'basket': w = s * 4; h = s * 4; body = rect(0, 0, s * 2, s) + rect(0, s, s * 2, s) + rect(s * 2, 0, s, s * 2) + rect(s * 3, 0, s, s * 2) + rect(0, s * 2, s, s * 2) + rect(s, s * 2, s, s * 2) + rect(s * 2, s * 2, s * 2, s) + rect(s * 2, s * 3, s * 2, s); break;
        case 'herringbone': {
          w = s * 4; h = s * 4;
          for (let i = -2; i < 4; i++) body += `<g transform="translate(${i * s} ${i * s})">${rect(0, 0, s * 2, s)}${rect(s, s, s, s * 2)}</g>`;
          break;
        }
        case 'chevron': {
          w = s * 4; h = s * 2;
          body = `<path d="M0 ${s} L${s * 2} 0 L${s * 4} ${s} L${s * 4} ${s * 2 - g} L${s * 2} ${s - g} L0 ${s * 2 - g}Z" fill="${c}"/>`;
          break;
        }
        default: w = s; h = L; body = rect(0, 0, s, L);
      }
      return { w: Math.ceil(w), h: Math.ceil(h), svg: svg(Math.ceil(w), Math.ceil(h), body) };
    },
  },
  sesame: {
    name: 'Sesame scatter', uses: ['menu background', 'empty states', 'cards'],
    schema: (d) => [P.select('shape', ['seed', 'dot', 'dash', 'crumb'], d.shape), P.range('density', 4, 60, 1, d.density), P.range('size', 1, 6, 0.5, d.size),
      P.range('jitter', 0, 180, 5, d.jitter), P.select('layout', ['random', 'clustered', 'rows'], d.layout), P.range('seed', 1, 999, 1, d.seed), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), w = 140, h = 140, rand = rng(p.seed * 7919);
      const pts = [];
      for (let i = 0; i < p.density; i++) {
        let x = rand() * w, y = rand() * h;
        if (p.layout === 'clustered') { const cx = (i % 3) * 47 + 23, cy = Math.floor(i / 3) % 3 * 47 + 23; x = cx + (rand() - 0.5) * 30; y = cy + (rand() - 0.5) * 30; }
        if (p.layout === 'rows') { y = (Math.floor(i / 6) * 28 + 10) % h; x = ((i % 6) * 24 + (Math.floor(i / 6) % 2) * 12 + rand() * 4) % w; }
        pts.push([x, y, (rand() - 0.5) * 2 * p.jitter]);
      }
      const s = p.size;
      const shape = ([x, y, a]) => {
        const tr = `transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(a)})"`;
        if (p.shape === 'seed') return `<ellipse ${tr} rx="${s * 1.5}" ry="${s * 0.7}" fill="${c}"/>`;
        if (p.shape === 'dot') return `<circle ${tr} r="${s}" fill="${c}"/>`;
        if (p.shape === 'dash') return `<rect ${tr} x="${-s * 2}" y="${-s / 3}" width="${s * 4}" height="${s / 1.5}" rx="${s / 3}" fill="${c}"/>`;
        return `<path ${tr} d="M${-s} 0 L0 ${-s * 0.8} L${s} ${-s * 0.2} L${s * 0.4} ${s} Z" fill="${c}"/>`;
      };
      // wrap points near edges so the tile repeats seamlessly
      const all = [];
      for (const pt of pts) for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
        const q = [pt[0] + dx, pt[1] + dy, pt[2]];
        if (q[0] > -10 && q[0] < w + 10 && q[1] > -10 && q[1] < h + 10) all.push(q);
      }
      return { w, h, svg: svg(w, h, all.map(shape).join('')) };
    },
  },
  halftone: {
    name: 'Halftone', uses: ['hero edges', 'section dividers', 'posters'],
    schema: (d) => [P.select('grid', ['square', 'hex'], d.grid), P.select('gradient', ['none', 'linear', 'radial', 'wave'], d.gradient), P.range('spacing', 6, 24, 1, d.spacing),
      P.range('dot', 0.5, 6, 0.25, d.dot), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), sp = p.spacing, n = 8, w = sp * n, h = sp * n * (p.grid === 'hex' ? 0.866 : 1);
      let body = '';
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const x = i * sp + (p.grid === 'hex' && j % 2 ? sp / 2 : 0) + sp / 2;
        const y = j * sp * (p.grid === 'hex' ? 0.866 : 1) + sp / 2;
        let k = 1;
        if (p.gradient === 'linear') k = 0.25 + 0.75 * (i / (n - 1));
        if (p.gradient === 'radial') k = 0.25 + 0.75 * (1 - Math.hypot(x - w / 2, y - h / 2) / Math.hypot(w / 2, h / 2));
        if (p.gradient === 'wave') k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((i / n) * Math.PI * 2 + (j / n) * Math.PI));
        body += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(Math.max(0.3, p.dot * k))}" fill="${c}"/>`;
      }
      return { w: Math.round(w), h: Math.round(h), svg: svg(Math.round(w), Math.round(h), body) };
    },
  },
  stripes: {
    name: 'Paper stripes', uses: ['bags & labels feel', 'announcement bar', 'offers'],
    schema: (d) => [P.select('rhythm', ['even', 'pin', 'double', 'candy', 'varied', 'awning'], d.rhythm), P.range('angle', -45, 90, 45, d.angle), P.range('unit', 2, 24, 1, d.unit), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), u = p.unit;
      const seqs = { even: [[0, 1]], pin: [[0, 0.15]], double: [[0, 0.3], [0.5, 0.3]], candy: [[0, 1.5]], varied: [[0, 0.3], [0.6, 1], [2, 0.2]], awning: [[0, 2]] };
      const period = { even: 2, pin: 2, double: 2.2, candy: 3, varied: 3.4, awning: 4 }[p.rhythm] * u;
      const bars = seqs[p.rhythm].map(([o, wdt]) => `<rect x="${r1(o * u)}" y="-200" width="${r1(wdt * u)}" height="400" fill="${c}"/>`).join('');
      const a = p.angle;
      if (a === 0 || a === 90) {
        const body = a === 0 ? bars : `<g transform="rotate(90 ${period / 2} ${period / 2})">${bars}</g>`;
        return { w: Math.ceil(period), h: Math.ceil(period), svg: svg(Math.ceil(period), Math.ceil(period), `<g>${body}</g>`) };
      }
      const size = Math.ceil(period * Math.SQRT2);
      const step = size / Math.SQRT2;
      let body = '';
      for (let k = -3; k <= 3; k++) body += `<g transform="translate(${r1(k * step * Math.SQRT2)} 0)">${bars}</g>`;
      return { w: size, h: size, svg: svg(size, size, `<g transform="rotate(${a} ${size / 2} ${size / 2})">${body}</g>`) };
    },
  },
  check: {
    name: 'Deli check', uses: ['tray liners', 'offers', 'playful sections'],
    schema: (d) => [P.select('kind', ['checker', 'gingham', 'diamond', 'windowpane', 'buffalo'], d.kind), P.range('size', 4, 40, 1, d.size), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), s = p.size;
      switch (p.kind) {
        case 'checker': return { w: s * 2, h: s * 2, svg: svg(s * 2, s * 2, `<rect width="${s}" height="${s}" fill="${c}"/><rect x="${s}" y="${s}" width="${s}" height="${s}" fill="${c}"/>`) };
        case 'gingham': return { w: s * 2, h: s * 2, svg: svg(s * 2, s * 2, `<rect width="${s}" height="${s * 2}" fill="${c}" opacity=".5"/><rect width="${s * 2}" height="${s}" fill="${c}" opacity=".5"/>`) };
        case 'diamond': return { w: s * 2, h: s * 2, svg: svg(s * 2, s * 2, `<path d="M${s} 0 L${s * 2} ${s} L${s} ${s * 2} L0 ${s}Z" fill="${c}"/>`) };
        case 'windowpane': return { w: s * 3, h: s * 3, svg: svg(s * 3, s * 3, `<path d="M0 0.5H${s * 3}M0.5 0V${s * 3}" stroke="${c}" stroke-width="1.5"/><path d="M0 ${s * 1.5}H${s * 3}M${s * 1.5} 0V${s * 3}" stroke="${c}" stroke-width=".6"/>`) };
        default: return { w: s * 2, h: s * 2, svg: svg(s * 2, s * 2, `<rect width="${s}" height="${s * 2}" fill="${c}" opacity=".6"/><rect width="${s * 2}" height="${s}" fill="${c}" opacity=".6"/><rect width="${s}" height="${s}" fill="${c}"/>`) };
      }
    },
  },
  rings: {
    name: 'Plate rings', uses: ['pasta sections', 'loading states'],
    schema: (d) => [P.range('rings', 1, 6, 1, d.rings), P.range('cell', 24, 96, 4, d.cell), P.select('layout', ['grid', 'brick', 'offset-quarter', 'single'], d.layout), P.range('stroke', 0.5, 4, 0.5, d.stroke), P.bool('irregular', d.irregular), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), s = p.cell;
      const ring = (cx, cy) => {
        let out = '';
        for (let i = 1; i <= p.rings; i++) {
          const r = (s / 2 - 2) * (i / p.rings);
          if (p.irregular) {
            const pts = [];
            for (let a = 0; a < 18; a++) { const ang = (a / 18) * Math.PI * 2; const rr = r * (0.92 + 0.08 * Math.sin(a * 2.3 + i)); pts.push(`${r1(cx + Math.cos(ang) * rr)},${r1(cy + Math.sin(ang) * rr)}`); }
            out += `<polygon points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="${p.stroke}"/>`;
          } else out += `<circle cx="${cx}" cy="${cy}" r="${r1(r)}" fill="none" stroke="${c}" stroke-width="${p.stroke}"/>`;
        }
        return out;
      };
      if (p.layout === 'single') return { w: s, h: s, svg: svg(s, s, ring(s / 2, s / 2)) };
      if (p.layout === 'grid') return { w: s, h: s, svg: svg(s, s, ring(s / 2, s / 2)) };
      if (p.layout === 'brick') return { w: s, h: s * 2, svg: svg(s, s * 2, ring(s / 2, s / 2) + ring(0, s * 1.5) + ring(s, s * 1.5)) };
      return { w: s * 2, h: s * 2, svg: svg(s * 2, s * 2, ring(s / 2, s / 2) + ring(s * 1.5, s) + ring(s, s * 1.75)) };
    },
  },
  receipt: {
    name: 'Receipt edge', uses: ['order tickets', 'dividers', 'checkout summary'],
    schema: (d) => [P.select('edge', ['zigzag', 'scallop', 'perforation', 'tear', 'notch'], d.edge), P.range('wave', 6, 40, 2, d.wave), P.range('depth', 2, 16, 1, d.depth), P.range('rowGap', 20, 120, 4, d.rowGap), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), w = p.wave * 2, h = p.rowGap, d = p.depth, y = h / 2;
      let path;
      switch (p.edge) {
        case 'zigzag': path = `<path d="M0 ${y} L${w / 4} ${y - d} L${w / 2} ${y} L${w * 0.75} ${y - d} L${w} ${y}" fill="none" stroke="${c}" stroke-width="1.5"/>`; break;
        case 'scallop': path = `<path d="M0 ${y} Q${w / 4} ${y - d * 2} ${w / 2} ${y} Q${w * 0.75} ${y - d * 2} ${w} ${y}" fill="none" stroke="${c}" stroke-width="1.5"/>`; break;
        case 'perforation': path = `<circle cx="${w / 4}" cy="${y}" r="${d / 3}" fill="${c}"/><circle cx="${w * 0.75}" cy="${y}" r="${d / 3}" fill="${c}"/>`; break;
        case 'tear': path = `<path d="M0 ${y} L${w * 0.2} ${y - d * 0.6} L${w * 0.35} ${y - d * 0.1} L${w * 0.6} ${y - d} L${w * 0.8} ${y - d * 0.3} L${w} ${y}" fill="none" stroke="${c}" stroke-width="1.2"/>`; break;
        default: path = `<path d="M0 ${y} H${w * 0.35} V${y - d} H${w * 0.65} V${y} H${w}" fill="none" stroke="${c}" stroke-width="1.5"/>`;
      }
      return { w, h, svg: svg(w, h, path) };
    },
  },
  icons: {
    name: 'Menu icons', uses: ['menu background', 'category headers', 'empty states'],
    schema: (d) => [P.select('set', ['penne', 'farfalle', 'fork', 'bowl', 'mixed'], d.set), P.select('layout', ['grid', 'brick', 'rotated', 'diagonal'], d.layout), P.range('size', 12, 48, 2, d.size), P.range('gap', 0.5, 3, 0.25, d.gap), P.range('stroke', 0.75, 3, 0.25, d.stroke), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), s = p.size, cell = s * (1 + p.gap);
      const I = {
        penne: `<path d="M4 16 L14 4 L20 8 L10 20Z M8 11 L13 15 M11 8 L16 12" />`,
        farfalle: `<path d="M12 12 L3 5 Q2 12 3 19Z M12 12 L21 5 Q22 12 21 19Z M12 9 V15" />`,
        fork: `<path d="M8 2 V8 Q8 11 12 11 Q16 11 16 8 V2 M12 2 V8 M12 11 V22" />`,
        bowl: `<path d="M3 11 H21 Q20 19 12 19 Q4 19 3 11Z M9 21 H15 M8 8 Q10 5 12 8 Q14 5 16 8" />`,
      };
      const keys = p.set === 'mixed' ? ['penne', 'farfalle', 'fork', 'bowl'] : [p.set, p.set, p.set, p.set];
      const icon = (k, x, y, rot = 0) => `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${rot} ${s / 2} ${s / 2}) scale(${r1(s / 24)})" fill="none" stroke="${c}" stroke-width="${r1(p.stroke * (24 / s) * 1.2)}" stroke-linecap="round" stroke-linejoin="round">${I[k]}</g>`;
      const w = cell * 2, h = cell * 2;
      const off = (cell - s) / 2;
      let body;
      if (p.layout === 'grid') body = icon(keys[0], off, off) + icon(keys[1], cell + off, off) + icon(keys[2], off, cell + off) + icon(keys[3], cell + off, cell + off);
      else if (p.layout === 'brick') body = icon(keys[0], off, off) + icon(keys[1], cell + off, off) + icon(keys[2], off + cell / 2, cell + off) + icon(keys[3], off - cell / 2, cell + off) + icon(keys[3], off + cell * 1.5, cell + off);
      else if (p.layout === 'rotated') body = icon(keys[0], off, off, -15) + icon(keys[1], cell + off, off, 20) + icon(keys[2], off, cell + off, 10) + icon(keys[3], cell + off, cell + off, -25);
      else body = icon(keys[0], off, off, 45) + icon(keys[2], cell + off, cell + off, 45);
      return { w: Math.round(w), h: Math.round(h), svg: svg(Math.round(w), Math.round(h), body) };
    },
  },
  grill: {
    name: 'Linen stripes', uses: ['hero', 'section bands'],
    schema: (d) => [P.select('kind', ['diagonal', 'cross', 'double', 'wavy', 'char'], d.kind), P.range('spacing', 8, 40, 2, d.spacing), P.range('thickness', 1, 8, 0.5, d.thickness), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), s = p.spacing, t = p.thickness;
      const line = (rot) => `<g transform="rotate(${rot} ${s / 2} ${s / 2})"><rect x="${-s}" y="${(s - t) / 2}" width="${s * 3}" height="${t}" rx="${t / 2}" fill="${c}"/></g>`;
      switch (p.kind) {
        case 'diagonal': return { w: s, h: s, svg: svg(s, s, `<path d="M${-s / 2} ${s / 2} L${s / 2} ${-s / 2} M0 ${s} L${s} 0 M${s / 2} ${s * 1.5} L${s * 1.5} ${s / 2}" stroke="${c}" stroke-width="${t}" stroke-linecap="round"/>`) };
        case 'cross': return { w: s, h: s, svg: svg(s, s, line(45) + line(-45)) };
        case 'double': return { w: s, h: s, svg: svg(s, s, `<path d="M0 ${s} L${s} 0" stroke="${c}" stroke-width="${t}"/><path d="M0 ${s / 2} L${s / 2} 0 M${s / 2} ${s} L${s} ${s / 2}" stroke="${c}" stroke-width="${t / 2}"/>`) };
        case 'wavy': return { w: s * 2, h: s, svg: svg(s * 2, s, `<path d="M0 ${s / 2} Q${s / 2} ${s / 2 - t * 2} ${s} ${s / 2} T${s * 2} ${s / 2}" fill="none" stroke="${c}" stroke-width="${t}" stroke-linecap="round"/>`) };
        default: return { w: s * 2, h: s * 2, svg: svg(s * 2, s * 2, `<path d="M0 ${s * 2} L${s * 2} 0" stroke="${c}" stroke-width="${t}" stroke-dasharray="${s / 2} ${s / 4}" stroke-linecap="round"/>`) };
      }
    },
  },
  arches: {
    name: 'Arches', uses: ['about page', 'footers', 'soft sections'],
    schema: (d) => [P.select('kind', ['arches', 'scales', 'domes', 'fan', 'waves'], d.kind), P.range('size', 12, 64, 2, d.size), P.range('stroke', 0.75, 4, 0.25, d.stroke), P.bool('filled', d.filled), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), s = p.size, st = p.filled ? `fill="${c}"` : `fill="none" stroke="${c}" stroke-width="${p.stroke}"`;
      switch (p.kind) {
        case 'arches': return { w: s, h: s, svg: svg(s, s, `<path d="M${s * 0.1} ${s} V${s / 2} A${s * 0.4} ${s * 0.4} 0 0 1 ${s * 0.9} ${s / 2} V${s}" ${st}/>`) };
        case 'scales': return { w: s, h: s / 2, svg: svg(s, s / 2, `<path d="M0 0 A${s / 2} ${s / 2} 0 0 0 ${s} 0" ${st}/><path d="M${-s / 2} ${s / 2} A${s / 2} ${s / 2} 0 0 0 ${s / 2} ${s / 2} A${s / 2} ${s / 2} 0 0 0 ${s * 1.5} ${s / 2}" ${st}/>`) };
        case 'domes': return { w: s, h: s * 0.7, svg: svg(s, s * 0.7, `<path d="M${s * 0.08} ${s * 0.6} Q${s * 0.08} ${s * 0.12} ${s / 2} ${s * 0.12} Q${s * 0.92} ${s * 0.12} ${s * 0.92} ${s * 0.6} Z" ${st}/>`) };
        case 'fan': return { w: s, h: s, svg: svg(s, s, [0.25, 0.5, 0.75, 1].map((k) => `<path d="M0 ${s} A${s * k} ${s * k} 0 0 1 ${s * k} ${s - s * k}" fill="none" stroke="${c}" stroke-width="${p.stroke}"/>`).join('')) };
        default: return { w: s * 2, h: s / 2, svg: svg(s * 2, s / 2, `<path d="M0 ${s / 4} Q${s / 2} 0 ${s} ${s / 4} T${s * 2} ${s / 4}" fill="none" stroke="${c}" stroke-width="${p.stroke}"/>`) };
      }
    },
  },
  neon: {
    name: 'Neon grid', uses: ['night hero', 'loader', 'status page'],
    schema: (d) => [P.select('kind', ['square', 'dots', 'plus', 'iso', 'diagonal'], d.kind), P.range('spacing', 10, 64, 2, d.spacing), P.range('stroke', 0.5, 3, 0.25, d.stroke), P.bool('glow', d.glow), COLOR(d.color)],
    gen(p) {
      const c = token(p.color), s = p.spacing;
      const filter = p.glow ? `<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${p.stroke * 1.2}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` : '';
      const f = p.glow ? 'filter="url(#g)"' : '';
      switch (p.kind) {
        case 'square': return { w: s, h: s, svg: svg(s, s, `${filter}<path d="M0 0.5H${s}M0.5 0V${s}" stroke="${c}" stroke-width="${p.stroke}" ${f}/>`) };
        case 'dots': return { w: s, h: s, svg: svg(s, s, `${filter}<circle cx="${s / 2}" cy="${s / 2}" r="${p.stroke * 1.3}" fill="${c}" ${f}/>`) };
        case 'plus': return { w: s, h: s, svg: svg(s, s, `${filter}<path d="M${s / 2 - 4} ${s / 2}H${s / 2 + 4}M${s / 2} ${s / 2 - 4}V${s / 2 + 4}" stroke="${c}" stroke-width="${p.stroke}" ${f}/>`) };
        case 'iso': { const h = Math.round(s * 0.577 * 2); return { w: s, h, svg: svg(s, h, `${filter}<path d="M0 0 L${s} ${h / 2} M${s} 0 L0 ${h / 2} M0 ${h / 2} L${s} ${h} M${s} ${h / 2} L0 ${h}" stroke="${c}" stroke-width="${p.stroke}" ${f}/>`) }; }
        default: return { w: s, h: s, svg: svg(s, s, `${filter}<path d="M0 ${s} L${s} 0" stroke="${c}" stroke-width="${p.stroke}" ${f}/>`) };
      }
    },
  },
};

// ------------------------------------------------------------------ variants (structural differences per variant)
const V = {
  wordmark: [
    ['Wrapper brick', { text: 'VIA PASTA', arrangement: 'brick', size: 14, gap: 1.2, rotate: 0, weight: '900', outline: false, color: 'maroon' }],
    ['Wrapper grid', { text: 'VIA PASTA', arrangement: 'grid', size: 12, gap: 1.6, rotate: 0, weight: '700', outline: false, color: 'maroon' }],
    ['Diagonal stamp', { text: 'VIA PASTA', arrangement: 'diagonal', size: 16, gap: 1, rotate: -30, weight: '900', outline: false, color: 'maroon' }],
    ['Full name rows', { text: 'VIA PASTA · YANBU', arrangement: 'brick', size: 10, gap: 1.4, rotate: 0, weight: '700', outline: false, color: 'ink' }],
    ['Arabic brick', { text: 'ڤيا باستا', arrangement: 'brick', size: 20, gap: 1, rotate: 0, weight: '700', outline: false, color: 'maroon' }],
    ['Bilingual alternate', { text: 'VIA PASTA · ڤيا باستا', arrangement: 'alternate', size: 14, gap: 1.2, rotate: 0, weight: '700', outline: false, color: 'tile' }],
    ['Outline columns', { text: 'VIA PASTA', arrangement: 'columns', size: 34, gap: 0.6, rotate: 90, weight: '900', outline: true, color: 'maroon' }],
    ['Micro grid', { text: 'VIA PASTA', arrangement: 'grid', size: 8, gap: 2.2, rotate: 0, weight: '700', outline: false, color: 'ink' }],
    ['Tilted alternate', { text: 'VIA PASTA', arrangement: 'alternate', size: 18, gap: 1, rotate: 45, weight: '400', outline: false, color: 'maroon' }],
    ['Poster sparse', { text: 'VIA PASTA', arrangement: 'brick', size: 44, gap: 2.4, rotate: -10, weight: '900', outline: true, color: 'maroon' }],
  ],
  tile: [
    ['Storefront stack', { bond: 'stack-vertical', tile: 12, ratio: 4, grout: 1.5, glaze: true, color: 'tile' }],
    ['Running subway', { bond: 'running', tile: 12, ratio: 3, grout: 1.5, glaze: true, color: 'tile' }],
    ['Herringbone', { bond: 'herringbone', tile: 10, ratio: 2, grout: 1, glaze: false, color: 'tile' }],
    ['Basketweave', { bond: 'basket', tile: 10, ratio: 2, grout: 1, glaze: false, color: 'tile' }],
    ['Square stack', { bond: 'stack-square', tile: 18, ratio: 1, grout: 2, glaze: true, color: 'tile' }],
    ['Third offset', { bond: 'third-offset', tile: 10, ratio: 3, grout: 1, glaze: false, color: 'tile' }],
    ['Chevron', { bond: 'chevron', tile: 12, ratio: 2, grout: 2, glaze: false, color: 'tile' }],
    ['Vertical running', { bond: 'vertical-running', tile: 10, ratio: 3.5, grout: 1.5, glaze: true, color: 'tile' }],
    ['Maroon counter', { bond: 'stack-vertical', tile: 8, ratio: 3, grout: 1, glaze: true, color: 'maroon' }],
    ['Large stack', { bond: 'stack-vertical', tile: 28, ratio: 2.5, grout: 3, glaze: true, color: 'tile' }],
  ],
  sesame: [
    ['Scattered seeds', { shape: 'seed', density: 22, size: 2, jitter: 180, layout: 'random', seed: 7, color: 'bun' }],
    ['Dense seeds', { shape: 'seed', density: 50, size: 1.5, jitter: 180, layout: 'random', seed: 21, color: 'bun' }],
    ['Seed clusters', { shape: 'seed', density: 36, size: 2, jitter: 120, layout: 'clustered', seed: 3, color: 'bun' }],
    ['Seed rows', { shape: 'seed', density: 30, size: 2, jitter: 20, layout: 'rows', seed: 5, color: 'bun' }],
    ['Pepper dots', { shape: 'dot', density: 40, size: 1, jitter: 0, layout: 'random', seed: 11, color: 'ink' }],
    ['Large dots', { shape: 'dot', density: 12, size: 4, jitter: 0, layout: 'random', seed: 17, color: 'maroon' }],
    ['Dashes', { shape: 'dash', density: 26, size: 2, jitter: 180, layout: 'random', seed: 29, color: 'tile' }],
    ['Dash rows', { shape: 'dash', density: 30, size: 2.5, jitter: 10, layout: 'rows', seed: 31, color: 'maroon' }],
    ['Crumbs', { shape: 'crumb', density: 28, size: 2.5, jitter: 180, layout: 'random', seed: 41, color: 'bun' }],
    ['Crumb clusters', { shape: 'crumb', density: 40, size: 2, jitter: 180, layout: 'clustered', seed: 43, color: 'maroon' }],
  ],
  halftone: [
    ['Even square', { grid: 'square', gradient: 'none', spacing: 10, dot: 1.5, color: 'maroon' }],
    ['Even hex', { grid: 'hex', gradient: 'none', spacing: 12, dot: 2, color: 'tile' }],
    ['Linear fade', { grid: 'square', gradient: 'linear', spacing: 10, dot: 3.5, color: 'maroon' }],
    ['Hex linear', { grid: 'hex', gradient: 'linear', spacing: 14, dot: 4, color: 'ink' }],
    ['Radial spot', { grid: 'square', gradient: 'radial', spacing: 12, dot: 4.5, color: 'maroon' }],
    ['Hex radial', { grid: 'hex', gradient: 'radial', spacing: 10, dot: 3.5, color: 'tile' }],
    ['Wave', { grid: 'square', gradient: 'wave', spacing: 10, dot: 3.5, color: 'tile' }],
    ['Hex wave', { grid: 'hex', gradient: 'wave', spacing: 12, dot: 4, color: 'maroon' }],
    ['Fine pepper', { grid: 'hex', gradient: 'none', spacing: 6, dot: 0.75, color: 'ink' }],
    ['Bold poster', { grid: 'square', gradient: 'radial', spacing: 22, dot: 6, color: 'cheese' }],
  ],
  stripes: [
    ['Even vertical', { rhythm: 'even', angle: 0, unit: 8, color: 'maroon' }],
    ['Pinstripe', { rhythm: 'pin', angle: 0, unit: 10, color: 'ink' }],
    ['Double line', { rhythm: 'double', angle: 0, unit: 12, color: 'tile' }],
    ['Candy diagonal', { rhythm: 'candy', angle: 45, unit: 8, color: 'maroon' }],
    ['Varied vertical', { rhythm: 'varied', angle: 0, unit: 10, color: 'tile' }],
    ['Awning', { rhythm: 'awning', angle: 0, unit: 16, color: 'maroon' }],
    ['Horizontal even', { rhythm: 'even', angle: 90, unit: 6, color: 'tile' }],
    ['Reverse diagonal pin', { rhythm: 'pin', angle: -45, unit: 12, color: 'maroon' }],
    ['Horizontal double', { rhythm: 'double', angle: 90, unit: 14, color: 'ink' }],
    ['Diagonal varied', { rhythm: 'varied', angle: 45, unit: 6, color: 'tile' }],
  ],
  check: [
    ['Checker small', { kind: 'checker', size: 8, color: 'maroon' }],
    ['Checker large', { kind: 'checker', size: 24, color: 'tile' }],
    ['Gingham', { kind: 'gingham', size: 10, color: 'maroon' }],
    ['Gingham large', { kind: 'gingham', size: 22, color: 'tile' }],
    ['Diamond', { kind: 'diamond', size: 10, color: 'maroon' }],
    ['Diamond large', { kind: 'diamond', size: 26, color: 'tile' }],
    ['Windowpane', { kind: 'windowpane', size: 14, color: 'ink' }],
    ['Windowpane large', { kind: 'windowpane', size: 30, color: 'maroon' }],
    ['Buffalo', { kind: 'buffalo', size: 12, color: 'maroon' }],
    ['Buffalo large', { kind: 'buffalo', size: 28, color: 'ink' }],
  ],
  rings: [
    ['Single ring grid', { rings: 1, cell: 40, layout: 'grid', stroke: 1.5, irregular: false, color: 'maroon' }],
    ['Uneven rings', { rings: 3, cell: 56, layout: 'grid', stroke: 1, irregular: true, color: 'maroon' }],
    ['Brick rings', { rings: 2, cell: 44, layout: 'brick', stroke: 1, irregular: false, color: 'tile' }],
    ['Quarter offset', { rings: 3, cell: 48, layout: 'offset-quarter', stroke: 1, irregular: false, color: 'ink' }],
    ['Target', { rings: 5, cell: 80, layout: 'single', stroke: 0.75, irregular: false, color: 'maroon' }],
    ['Irregular brick', { rings: 2, cell: 52, layout: 'brick', stroke: 1.5, irregular: true, color: 'tile' }],
    ['Fine grid', { rings: 4, cell: 32, layout: 'grid', stroke: 0.5, irregular: false, color: 'ink' }],
    ['Bold single', { rings: 1, cell: 64, layout: 'single', stroke: 4, irregular: true, color: 'maroon' }],
    ['Offset irregular', { rings: 4, cell: 60, layout: 'offset-quarter', stroke: 1, irregular: true, color: 'tile' }],
    ['Large brick', { rings: 6, cell: 96, layout: 'brick', stroke: 0.75, irregular: false, color: 'maroon' }],
  ],
  receipt: [
    ['Zigzag rows', { edge: 'zigzag', wave: 12, depth: 6, rowGap: 48, color: 'ink' }],
    ['Fine zigzag', { edge: 'zigzag', wave: 6, depth: 3, rowGap: 24, color: 'maroon' }],
    ['Scallop', { edge: 'scallop', wave: 16, depth: 5, rowGap: 56, color: 'tile' }],
    ['Deep scallop', { edge: 'scallop', wave: 24, depth: 10, rowGap: 72, color: 'maroon' }],
    ['Perforation', { edge: 'perforation', wave: 8, depth: 6, rowGap: 40, color: 'ink' }],
    ['Wide perforation', { edge: 'perforation', wave: 16, depth: 9, rowGap: 64, color: 'tile' }],
    ['Torn edge', { edge: 'tear', wave: 20, depth: 8, rowGap: 60, color: 'ink' }],
    ['Torn fine', { edge: 'tear', wave: 10, depth: 4, rowGap: 32, color: 'maroon' }],
    ['Notched', { edge: 'notch', wave: 14, depth: 6, rowGap: 44, color: 'tile' }],
    ['Notched wide', { edge: 'notch', wave: 30, depth: 12, rowGap: 88, color: 'maroon' }],
  ],
  icons: [
    ['Penne grid', { set: 'penne', layout: 'grid', size: 24, gap: 1, stroke: 1.5, color: 'maroon' }],
    ['Farfalle grid', { set: 'farfalle', layout: 'grid', size: 22, gap: 1.2, stroke: 1.5, color: 'tile' }],
    ['Mixed brick', { set: 'mixed', layout: 'brick', size: 24, gap: 1.2, stroke: 1.5, color: 'maroon' }],
    ['Mixed tossed', { set: 'mixed', layout: 'rotated', size: 26, gap: 1, stroke: 1.5, color: 'ink' }],
    ['Fork diagonal', { set: 'fork', layout: 'diagonal', size: 20, gap: 1.5, stroke: 1.25, color: 'tile' }],
    ['Bowl brick', { set: 'bowl', layout: 'brick', size: 22, gap: 1.2, stroke: 1.75, color: 'maroon' }],
    ['Penne tossed', { set: 'penne', layout: 'rotated', size: 32, gap: 0.75, stroke: 2, color: 'maroon' }],
    ['Fine mixed grid', { set: 'mixed', layout: 'grid', size: 14, gap: 2, stroke: 1, color: 'ink' }],
    ['Farfalle diagonal', { set: 'farfalle', layout: 'diagonal', size: 30, gap: 1, stroke: 1.5, color: 'tile' }],
    ['Large mixed brick', { set: 'mixed', layout: 'brick', size: 44, gap: 0.75, stroke: 2.5, color: 'maroon' }],
  ],
  grill: [
    ['Diagonal grill', { kind: 'diagonal', spacing: 16, thickness: 2, color: 'ink' }],
    ['Cross hatch', { kind: 'cross', spacing: 18, thickness: 2, color: 'maroon' }],
    ['Double line', { kind: 'double', spacing: 20, thickness: 2, color: 'ink' }],
    ['Wavy grill', { kind: 'wavy', spacing: 14, thickness: 1.5, color: 'tile' }],
    ['Char dashes', { kind: 'char', spacing: 18, thickness: 3, color: 'ink' }],
    ['Wide diagonal', { kind: 'diagonal', spacing: 36, thickness: 5, color: 'maroon' }],
    ['Fine cross', { kind: 'cross', spacing: 10, thickness: 1, color: 'tile' }],
    ['Heavy double', { kind: 'double', spacing: 32, thickness: 6, color: 'maroon' }],
    ['Fine wave', { kind: 'wavy', spacing: 10, thickness: 1, color: 'maroon' }],
    ['Heavy char', { kind: 'char', spacing: 30, thickness: 6, color: 'tile' }],
  ],
  arches: [
    ['Arches', { kind: 'arches', size: 28, stroke: 1.5, filled: false, color: 'maroon' }],
    ['Filled arches', { kind: 'arches', size: 36, stroke: 1, filled: true, color: 'tile' }],
    ['Scales', { kind: 'scales', size: 24, stroke: 1.25, filled: false, color: 'tile' }],
    ['Domes', { kind: 'domes', size: 32, stroke: 1.5, filled: false, color: 'maroon' }],
    ['Filled domes', { kind: 'domes', size: 26, stroke: 1, filled: true, color: 'bun' }],
    ['Fan', { kind: 'fan', size: 40, stroke: 1, filled: false, color: 'ink' }],
    ['Waves', { kind: 'waves', size: 28, stroke: 1.5, filled: false, color: 'tile' }],
    ['Large arches', { kind: 'arches', size: 60, stroke: 2.5, filled: false, color: 'maroon' }],
    ['Fine scales', { kind: 'scales', size: 14, stroke: 0.75, filled: false, color: 'ink' }],
    ['Large fan', { kind: 'fan', size: 64, stroke: 2, filled: false, color: 'maroon' }],
  ],
  neon: [
    ['Neon square grid', { kind: 'square', spacing: 24, stroke: 0.75, glow: true, color: 'glow' }],
    ['Neon dots', { kind: 'dots', spacing: 20, stroke: 1, glow: true, color: 'glow' }],
    ['Plus marks', { kind: 'plus', spacing: 28, stroke: 1, glow: false, color: 'glow' }],
    ['Isometric', { kind: 'iso', spacing: 30, stroke: 0.5, glow: false, color: 'glow' }],
    ['Diagonal lines', { kind: 'diagonal', spacing: 16, stroke: 0.75, glow: true, color: 'glow' }],
    ['Blueprint grid', { kind: 'square', spacing: 12, stroke: 0.5, glow: false, color: 'white' }],
    ['Sparse dots', { kind: 'dots', spacing: 48, stroke: 2, glow: true, color: 'glow' }],
    ['Plus glow', { kind: 'plus', spacing: 40, stroke: 2, glow: true, color: 'glow' }],
    ['Fine iso', { kind: 'iso', spacing: 16, stroke: 0.5, glow: false, color: 'white' }],
    ['Maroon diagonal', { kind: 'diagonal', spacing: 24, stroke: 1.5, glow: false, color: 'maroon' }],
  ],
};

const FAMILY_ORDER = Object.keys(FAMILIES);

export const PATTERN_PRESETS = FAMILY_ORDER.flatMap((fam) => V[fam].map(([name, d], i) => ({
  id: `pat-${fam}-${String(i + 1).padStart(2, '0')}`,
  name: `${FAMILIES[fam].name}: ${name}`,
  category: 'pattern',
  family: fam,
  kind: 'svg-pattern',
  renderer: '2D SVG pattern (no motion)',
  params: FAMILIES[fam].schema(d),
  uses: FAMILIES[fam].uses,
  perf: 'light',
  reducedMotion: 'Static by design — nothing animates.',
  description: `${FAMILIES[fam].name} — ${name.toLowerCase()}. Repeating SVG tile applied behind content at a capped opacity.`,
})));

export function renderPattern(preset, params) {
  return FAMILIES[preset.family].gen(params);
}

export function patternDataUrl(tileSvg) {
  return `url("data:image/svg+xml,${encodeURIComponent(tileSvg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')}")`;
}

export const PATTERN_FAMILIES = Object.fromEntries(FAMILY_ORDER.map((k) => [k, FAMILIES[k].name]));
