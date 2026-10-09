// Static assets with content-hash versioning, ETags and gzip. Asset URLs are
// rendered as /assets/x.css?v=<hash>; versioned requests are cached for a year.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { ROOT, config } from '../config.js';

const TYPES = {
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

export const MOUNTS = {
  '/assets/': path.join(ROOT, 'public'),
  '/shared/': path.join(ROOT, 'shared'),
};

const cache = new Map(); // abs path → { mtimeMs, etag, hash, gz }

function fileInfo(abs) {
  const st = fs.statSync(abs);
  const hit = cache.get(abs);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit;
  const buf = fs.readFileSync(abs);
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
  const ext = path.extname(abs).toLowerCase();
  const info = { mtimeMs: st.mtimeMs, size: st.size, buf, hash, etag: `"${hash}"`, gz: COMPRESSIBLE.has(ext) && buf.length > 1024 ? zlib.gzipSync(buf, { level: 9 }) : null };
  cache.set(abs, info);
  return info;
}

function resolveSafe(base, rel) {
  const abs = path.resolve(base, `.${path.sep}${rel}`);
  if (!abs.startsWith(base + path.sep)) return null;
  return abs;
}

/** Versioned URL for templates: asset('css/site.css') → /assets/css/site.css?v=abc123 */
export function asset(rel, mount = '/assets/') {
  const abs = resolveSafe(MOUNTS[mount], rel);
  try { return `${mount}${rel}?v=${fileInfo(abs).hash}`; } catch { return `${mount}${rel}`; }
}

export function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return;
  const mount = Object.keys(MOUNTS).find((m) => req.path.startsWith(m));
  if (!mount) return;
  const rel = req.path.slice(mount.length);
  if (!rel || rel.includes('\0') || rel.split('/').some((s) => s.startsWith('.'))) return;
  const ext = path.extname(rel).toLowerCase();
  if (mount === '/shared/' && ext !== '.js') return;
  const abs = resolveSafe(MOUNTS[mount], rel);
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return;
  const info = fileInfo(abs);
  const versioned = req.query.v && req.query.v === info.hash;
  const headers = {
    'content-type': TYPES[ext] || 'application/octet-stream',
    etag: info.etag,
    'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
    vary: 'accept-encoding',
  };
  if (req.headers['if-none-match'] === info.etag) { res.writeHead(304, headers); res.end(); return; }
  const gzip = info.gz && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  const body = gzip ? info.gz : info.buf;
  if (gzip) headers['content-encoding'] = 'gzip';
  headers['content-length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** gzip a dynamic text response when the client accepts it. */
export function sendCompressed(req, res, status, body, headers) {
  const buf = Buffer.from(body);
  if (buf.length > 1024 && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
    const gz = zlib.gzipSync(buf, { level: 6 });
    res.writeHead(status, { ...headers, 'content-encoding': 'gzip', vary: 'accept-encoding', 'content-length': gz.length });
    res.end(req.method === 'HEAD' ? undefined : gz);
  } else {
    res.writeHead(status, { ...headers, 'content-length': buf.length });
    res.end(req.method === 'HEAD' ? undefined : buf);
  }
}
