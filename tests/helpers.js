// Test harness: an isolated database per test file, the real HTTP app on a
// random port, and small fetch helpers (including a cookie jar for the dashboard).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

export function isolatedEnv(extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'viapasta-test-'));
  Object.assign(process.env, {
    APP_ENV: 'test', DATABASE_PATH: path.join(dir, 'test.sqlite'), UPLOADS_DIR: path.join(dir, 'uploads'),
    SESSION_SECRET: 'test-secret-test-secret-test-secret-123', PAYMENT_PROVIDER: 'sandbox', PUBLIC_URL: 'http://localhost:3999', ...extra,
  });
  return dir;
}

/** Start the real app in-process. Call isolatedEnv() BEFORE importing this file's dynamic imports. */
export async function startApp() {
  const { initDatabase, buildApp } = await import('../server/main.js');
  await initDatabase({ devSeed: false });
  const app = buildApp();
  const server = http.createServer((req, res) => app.handle(req, res));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base, close: () => new Promise((r) => server.close(r)) };
}

/** A second server PROCESS on the same database file, to test cross-process locking. */
export async function spawnSecondServer() {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/main.js'], {
    cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'),
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${base}/api/health`); if (r.ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return { base, kill: () => child.kill() };
}

export async function json(base, method, p, body, headers = {}) {
  const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  let data = null;
  try { data = await r.json(); } catch { /* empty body */ }
  return { status: r.status, body: data, headers: r.headers };
}

export function key(prefix = 'k') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Log a dashboard user in and return an authenticated client. */
export async function adminClient(base, email, password) {
  const r = await fetch(`${base}/admin/login`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email, password }), redirect: 'manual' });
  const set = r.headers.getSetCookie().find((c) => c.startsWith('hb_admin='));
  if (!set) return null;
  const cookie = set.split(';')[0];
  const me = await (await fetch(`${base}/admin/api/me`, { headers: { cookie } })).json();
  const call = (method, p, body) => json(base, method, `/admin/api${p}`, body, { cookie, 'x-csrf-token': me.csrf });
  return { cookie, me, call };
}

export async function menu(base) {
  const r = await json(base, 'GET', '/api/menu?lang=en');
  const items = Object.fromEntries(r.body.categories.flatMap((c) => c.items).map((i) => [i.slug, i]));
  return items;
}

export function orderBody(items, overrides = {}) {
  return {
    idempotencyKey: key('order'), lang: 'en', fulfillment: 'pickup', paymentMethod: 'pay_at_pickup',
    customer: { name: 'Test Customer', phone: '0551234567' },
    lines: [{ itemId: items['spaghetti-bolognese'].id, qty: 1 }], ...overrides,
  };
}
