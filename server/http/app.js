// Minimal, dependency-free HTTP framework: routing, cookies, body parsing,
// security headers, error handling and request logging (without personal data).
import crypto from 'node:crypto';
import { config } from '../config.js';

export class HttpError extends Error {
  constructor(status, code, details = {}) { super(code); this.status = status; this.code = code; this.details = details; }
}

function compile(pattern) {
  const keys = [];
  const re = pattern === '*' ? '.*' : pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:([A-Za-z_]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; })
    .replace(/\/\*$/, '(?:/(.*))?');
  if (pattern.endsWith('/*')) keys.push('wildcard');
  return { re: new RegExp(`^${re}/?$`), keys };
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}

export function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > limit) { reject(new HttpError(413, 'BODY_TOO_LARGE')); req.resume(); return; }
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'BODY_TOO_LARGE')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function jsonBody(req, limit) {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.startsWith('application/json')) throw new HttpError(415, 'JSON_REQUIRED');
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); } catch { throw new HttpError(400, 'JSON_INVALID'); }
}

export async function formBody(req, limit = 16 * 1024) {
  const buf = await readBody(req, limit);
  return Object.fromEntries(new URLSearchParams(buf.toString('utf8')));
}

function securityHeaders(res, nonce) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src https://www.google.com",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  if (config.isProd) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (!config.allowIndexing) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

export function createApp() {
  const routes = [];
  const middleware = [];
  const app = {
    use(fn) { middleware.push(fn); },
    route(method, pattern, ...handlers) { routes.push({ method, ...compile(pattern), handlers, pattern }); },
    get(p, ...h) { app.route('GET', p, ...h); },
    post(p, ...h) { app.route('POST', p, ...h); },
    put(p, ...h) { app.route('PUT', p, ...h); },
    patch(p, ...h) { app.route('PATCH', p, ...h); },
    delete(p, ...h) { app.route('DELETE', p, ...h); },
    onError: null,
    notFound: null,
    async handle(req, res) {
      const started = process.hrtime.bigint();
      const url = new URL(req.url, 'http://localhost');
      req.path = decodeURIComponent(url.pathname).replace(/\/{2,}/g, '/');
      req.query = Object.fromEntries(url.searchParams);
      req.cookies = parseCookies(req.headers.cookie);
      req.ip = (config.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '';
      req.id = crypto.randomBytes(6).toString('hex');
      res.locals = { nonce: crypto.randomBytes(16).toString('base64') };
      securityHeaders(res, res.locals.nonce);
      attachHelpers(res);
      res.on('finish', () => {
        if (config.isTest) return;
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        // Paths only — never query strings, bodies, cookies or headers.
        console.log(JSON.stringify({ t: new Date().toISOString(), id: req.id, m: req.method, p: req.path.slice(0, 120), s: res.statusCode, ms: Math.round(ms) }));
      });
      try {
        for (const mw of middleware) {
          await mw(req, res);
          if (res.writableEnded) return;
        }
        const method = req.method === 'HEAD' ? 'GET' : req.method;
        let matchedPath = false;
        for (const r of routes) {
          const m = r.re.exec(req.path);
          if (!m) continue;
          matchedPath = true;
          if (r.method !== method) continue;
          req.params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
          for (const h of r.handlers) {
            await h(req, res);
            if (res.writableEnded || res.headersSent) return;
          }
          return;
        }
        if (matchedPath) throw new HttpError(405, 'METHOD_NOT_ALLOWED');
        if (app.notFound) return await app.notFound(req, res);
        throw new HttpError(404, 'NOT_FOUND');
      } catch (err) {
        if (res.headersSent) { res.destroy(); return; }
        if (app.onError) return app.onError(err, req, res);
        res.json(err.status || 500, { error: err.code || 'SERVER_ERROR' });
      }
    },
  };
  return app;
}

function attachHelpers(res) {
  res.json = (status, body, headers = {}) => {
    const s = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
    res.end(s);
  };
  res.html = (status, html, headers = {}) => {
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...headers });
    res.end(html);
  };
  res.text = (status, text, headers = {}) => {
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...headers });
    res.end(text);
  };
  res.redirect = (location, status = 302) => {
    res.writeHead(status, { location, 'cache-control': 'no-store' });
    res.end();
  };
  res.cookie = (name, value, opts = {}) => {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path || '/'}`, `SameSite=${opts.sameSite || 'Lax'}`];
    if (opts.httpOnly !== false) parts.push('HttpOnly');
    if (config.isProd || opts.secure) parts.push('Secure');
    if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
    const prev = res.getHeader('set-cookie');
    res.setHeader('set-cookie', [...(Array.isArray(prev) ? prev : prev ? [prev] : []), parts.join('; ')]);
  };
}

// ---- rate limiting (in-memory, per process) ----
const buckets = new Map();
export function rateLimit({ name, limit, windowMs, by = (req) => req.ip }) {
  return (req) => {
    if (config.isTest && !process.env.TEST_RATE_LIMITS) return;
    const k = `${name}:${by(req)}`;
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || now - b.start > windowMs) { b = { start: now, n: 0 }; buckets.set(k, b); }
    b.n++;
    if (b.n > limit) {
      const err = new HttpError(429, 'RATE_LIMITED', { retryAfter: Math.ceil((b.start + windowMs - now) / 1000) });
      throw err;
    }
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now - b.start > 3600000) buckets.delete(k);
}, 600000).unref();

export function resetRateLimits() { buckets.clear(); }
