// Application entry point.
import http from 'node:http';
import { config, assertProductionConfig } from './config.js';
import { openDb, migrate, closeDb } from './db/db.js';
import { createApp, HttpError } from './http/app.js';
import { serveStatic } from './http/static.js';
import { registerSite, notFound, serverErrorPage } from './routes/site.js';
import { registerApi } from './routes/api.js';
import { registerWebhooks } from './routes/webhooks.js';
import { registerAdmin } from './routes/admin.js';
import { registerDev } from './routes/dev.js';
import { seedBusiness } from '../seed/business.js';
import { seedDev } from '../seed/dev.js';
import { expireUnpaid } from './domain/orders.js';
import { processOutbox } from './domain/notify.js';
import { pruneSessions, createUser } from './domain/auth.js';
import { reconcileOrder } from './payments/index.js';
import { all, one, run } from './db/db.js';
import { pathToFileURL } from 'node:url';

export function buildApp() {
  const app = createApp();
  app.use((req, res) => serveStatic(req, res));
  registerWebhooks(app);
  registerApi(app);
  registerAdmin(app);
  registerDev(app);
  registerSite(app);
  app.notFound = notFound;
  app.onError = (err, req, res) => {
    const status = err.status || 500;
    if (status >= 500) console.error(JSON.stringify({ t: new Date().toISOString(), id: req.id, level: 'error', p: req.path, msg: err.message, stack: config.isProd ? undefined : err.stack }));
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin/api/') || req.path.startsWith('/webhooks/') || req.headers.accept?.includes('application/json')) {
      const headers = err.details?.retryAfter ? { 'retry-after': String(err.details.retryAfter) } : {};
      return res.json(status, { error: err instanceof HttpError || err.code ? err.code || 'ERROR' : 'SERVER_ERROR' }, headers);
    }
    if (status === 404) return notFound(req, res);
    return serverErrorPage(req, res);
  };
  return app;
}

export async function initDatabase({ devSeed = !config.isProd } = {}) {
  await openDb();
  await migrate();
  await seedBusiness();
  await ensureOwnerFromEnv();
  if (devSeed && !config.isTest) await seedDev();
}

/**
 * First owner account from OWNER_EMAIL / OWNER_PASSWORD (hosting environment variables).
 * Only used while no owner exists, so changing the variables later does nothing;
 * the password itself is never stored anywhere except as a scrypt hash.
 */
export async function ensureOwnerFromEnv() {
  const email = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD || '';
  if (!email || !password) return { created: false };
  if (await one("SELECT 1 AS x FROM users WHERE role = 'owner' AND active = 1 LIMIT 1")) return { created: false };
  if (await one('SELECT 1 AS x FROM users WHERE email = ? COLLATE NOCASE', email)) return { created: false };
  try {
    await createUser({ email, name: process.env.OWNER_NAME || 'Owner', role: 'owner', password });
    console.log(JSON.stringify({ level: 'info', msg: 'owner account created from OWNER_EMAIL' }));
    return { created: true };
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', msg: `OWNER_PASSWORD rejected: ${e.message} (use at least 12 characters)` }));
    return { created: false, error: e.message };
  }
}

/** Database ready (migrated + seeded) once per process; retried after a failure. */
let ready = null;
export function ensureReady() {
  if (!ready) ready = initDatabase().catch((e) => { ready = null; throw e; });
  return ready;
}

/**
 * Periodic jobs (payment reconciliation, expiry, notifications, session cleanup).
 * A normal server runs them on timers; serverless hosting runs them from incoming
 * requests, at most once a minute across all instances (job_runs row as the lock).
 */
export async function runMaintenance({ force = false } = {}) {
  const now = new Date();
  if (!force) {
    const claim = await run(`INSERT INTO job_runs (name, last_run_at) VALUES ('maintenance', ?)
      ON CONFLICT(name) DO UPDATE SET last_run_at = excluded.last_run_at WHERE job_runs.last_run_at < ?`,
    now.toISOString(), new Date(now.getTime() - 60000).toISOString());
    if (!claim.changes) return false;
  }
  // Before failing an unpaid online order, ask the provider once more (covers a late or lost webhook).
  for (const o of await all("SELECT * FROM orders WHERE order_status = 'awaiting_payment' AND expires_at < ?", now.toISOString())) {
    try { await reconcileOrder(o); } catch { /* fall through to expiry */ }
  }
  await expireUnpaid();
  await processOutbox().catch((e) => console.error('outbox', e.message));
  if (now.getUTCMinutes() === 0 || force) await pruneSessions().catch((e) => console.error('sessions', e.message));
  return true;
}

let timers = [];
export function startJobs() {
  timers.push(setInterval(() => { runMaintenance({ force: true }).catch((e) => console.error('maintenance', e.message)); }, 60000));
  timers.push(setInterval(() => { processOutbox().catch((e) => console.error('outbox', e.message)); }, 15000));
  timers.push(setInterval(() => { pruneSessions().catch((e) => console.error('sessions', e.message)); }, 3600000));
  for (const t of timers) t.unref();
}

export async function startServer({ port = config.port, host = config.host } = {}) {
  assertProductionConfig();
  await ensureReady();
  const app = buildApp();
  const server = http.createServer((req, res) => app.handle(req, res));
  server.headersTimeout = 15000;
  server.requestTimeout = 30000;
  server.keepAliveTimeout = 5000;
  return new Promise((resolve) => server.listen(port, host, () => { startJobs(); resolve(server); }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().then((s) => {
    const a = s.address();
    console.log(`Via Pasta running in ${config.appEnv} on http://${a.address}:${a.port} (public URL ${config.publicUrl})`);
  });
  const shutdown = async () => { for (const t of timers) clearInterval(t); await closeDb(); process.exit(0); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
