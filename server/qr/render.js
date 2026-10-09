// QR output: SVG (vector), PNG (8-bit greyscale via zlib) and a print card.
import zlib from 'node:zlib';
import { encodeQr } from './qrcode.js';

const QUIET = 4; // modules of quiet zone on each side (spec minimum)

export function qrSvg(text, { dark = '#2B201B', light = '#FFFFFF', ecl = 'Q' } = {}) {
  const q = encodeQr(text, { ecl });
  const n = q.size + QUIET * 2;
  let d = '';
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.modules[y][x]) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * 8}" height="${n * 8}" shape-rendering="crispEdges"><title>${text.replace(/[<&>]/g, '')}</title><rect width="${n}" height="${n}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}

function crc32(buf) { return zlib.crc32(buf) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function encodePngGray(width, height, pixelAt) {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) raw[y * (width + 1) + 1 + x] = pixelAt(x, y);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function qrPng(text, { scale = 12, ecl = 'Q' } = {}) {
  const q = encodeQr(text, { ecl });
  const n = (q.size + QUIET * 2) * scale;
  return encodePngGray(n, n, (x, y) => {
    const mx = Math.floor(x / scale) - QUIET, my = Math.floor(y / scale) - QUIET;
    return mx >= 0 && my >= 0 && mx < q.size && my < q.size && q.modules[my][mx] ? 0x17 : 0xff;
  });
}

export function qrPrintPage({ url, lang, name, preview, nonce, caption }) {
  const ar = lang === 'ar';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${esc(name)} — QR</title>
<style nonce="${nonce}">
@page{size:A6;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:"Readex Pro","Geeza Pro","Noto Sans Arabic",Arial,sans-serif;color:#2B201B;background:#fff}
.card{max-width:105mm;margin:0 auto;padding:8mm 6mm;text-align:center;border:1px solid #d6dcdb;border-radius:4mm}
.mark{display:inline-flex;flex-direction:column;align-items:center;background:#A8322A;color:#fff;padding:3mm 6mm;border-radius:1.5mm;font-family:Georgia,"Times New Roman",serif;font-weight:700;letter-spacing:.1em;box-shadow:inset 0 0 0 1.2mm #A8322A,inset 0 0 0 1.6mm #FBF6EE}
.mark small{font-size:6pt;letter-spacing:.3em;font-weight:600}.mark b{font-size:20pt;line-height:1}
h1{font-size:13pt;margin:5mm 0 2mm}.qr{width:62mm;height:62mm;display:block;margin:2mm auto}.url{font-size:10pt;direction:ltr;word-break:break-all}
.preview{margin-top:4mm;font-size:8pt;padding:2mm;border:1px dashed #9A5B00;color:#6b4000}
button{margin:6mm auto 0;display:block;font:inherit;padding:2mm 5mm}@media print{button{display:none}.card{border:0}}
</style></head><body><div class="card"><div class="mark" aria-label="${esc(name)}"><b>VIA PASTA</b><small>ITALIAN · YANBU</small></div>
<h1>${esc(caption || (ar ? 'امسح الرمز للطلب' : 'Scan to order'))}</h1>
<img class="qr" src="data:image/svg+xml;base64,${Buffer.from(qrSvg(url)).toString('base64')}" alt="${ar ? 'رمز QR' : 'QR code'}">
<p class="url">${esc(url.replace(/^https?:\/\//, ''))}</p>
${preview ? `<p class="preview">${ar ? 'معاينة — يُعاد إنشاء الرمز على النطاق النهائي قبل الطباعة.' : 'Preview — regenerate on the final domain before printing.'}</p>` : ''}
<button type="button" id="p">${ar ? 'طباعة' : 'Print'}</button></div>
<script nonce="${nonce}">document.getElementById('p').addEventListener('click',function(){window.print()})</script></body></html>`;
}
