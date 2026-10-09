// Database access. Two interchangeable drivers behind one async API:
//   - local:  Node's built-in node:sqlite file (development, tests, a normal server)
//   - remote: Turso / libSQL over HTTP (serverless hosting such as Vercel)
// No npm dependency: the remote driver speaks the Hrana-over-HTTP pipeline
// protocol with fetch().
//
// API: await one(sql, ...params) / all(...) / run(...); await tx(async () => {...}).
// Queries made inside tx() automatically join that transaction (AsyncLocalStorage).
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const txStore = new AsyncLocalStorage();

let driver = null;
let opening = null;

export class DbError extends Error {
  constructor(message, code) { super(message); this.code = code || 'SQLITE_ERROR'; }
}

// ---------------------------------------------------------------- value mapping
function toArg(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'bigint') return { type: 'integer', value: v.toString() };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { type: 'integer', value: String(v) };
    return { type: 'float', value: v };
  }
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
  if (v instanceof Uint8Array) return { type: 'blob', base64: Buffer.from(v).toString('base64') };
  return { type: 'text', value: String(v) };
}

function fromValue(v) {
  switch (v?.type) {
    case 'null': case undefined: return null;
    case 'integer': {
      const n = Number(v.value);
      return Number.isSafeInteger(n) ? n : BigInt(v.value);
    }
    case 'float': return Number(v.value);
    case 'text': return v.value;
    case 'blob': return Buffer.from(v.base64 || '', 'base64');
    default: return v.value ?? null;
  }
}

// ---------------------------------------------------------------- local driver
class Mutex {
  constructor() { this.q = Promise.resolve(); }
  lock() {
    let release;
    const next = new Promise((r) => { release = r; });
    const wait = this.q;
    this.q = this.q.then(() => next);
    return wait.then(() => release);
  }
}

async function localDriver(file) {
  const { DatabaseSync } = await import('node:sqlite');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;');
  const cache = new Map();
  const prep = (sql) => {
    let s = cache.get(sql);
    if (!s) { s = db.prepare(sql); if (cache.size > 500) cache.clear(); cache.set(sql, s); }
    return s;
  };
  const norm = (params) => params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p === undefined ? null : p));
  const mutex = new Mutex();
  return {
    kind: 'local',
    mutex,
    async query(sql, params, mode) {
      const s = prep(sql);
      if (mode === 'run') {
        const r = s.run(...norm(params));
        return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
      }
      if (mode === 'get') return s.get(...norm(params)) ?? null;
      return s.all(...norm(params));
    },
    async execMulti(sql) { db.exec(sql); },
    async begin() { db.exec('BEGIN IMMEDIATE'); return null; },
    async commit() { db.exec('COMMIT'); },
    async rollback() { try { db.exec('ROLLBACK'); } catch { /* already rolled back */ } },
    close() { db.close(); },
  };
}

// ---------------------------------------------------------------- remote driver (Turso / libSQL)
function remoteDriver(url, token) {
  const base = url.replace(/^libsql:\/\//i, 'https://').replace(/^wss?:\/\//i, (m) => (m.toLowerCase() === 'ws://' ? 'http://' : 'https://')).replace(/\/+$/, '');
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  async function pipeline(stream, requests) {
    const target = `${stream?.baseUrl || base}/v2/pipeline`;
    let res;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await fetch(target, { method: 'POST', headers, body: JSON.stringify({ baton: stream?.baton ?? null, requests }) });
        break;
      } catch (e) {
        // Network blip: only safe to retry when no stream state is involved.
        if (stream?.baton || attempt >= 2) throw new DbError(`Database unreachable: ${e.message}`, 'DB_UNREACHABLE');
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      }
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let msg = text;
      try { msg = JSON.parse(text).message || text; } catch { /* plain text */ }
      throw new DbError(`Database HTTP ${res.status}: ${String(msg).slice(0, 300)}`, res.status === 401 || res.status === 403 ? 'DB_AUTH' : 'DB_HTTP');
    }
    const body = await res.json();
    if (stream) {
      stream.baton = body.baton ?? null;
      if (body.base_url) stream.baseUrl = body.base_url.replace(/\/+$/, '');
    }
    return body.results || [];
  }

  function check(result) {
    if (!result) throw new DbError('Empty database response');
    if (result.type === 'error') throw new DbError(result.error?.message || 'Database error', result.error?.code);
    return result.response;
  }

  const fkOn = { type: 'execute', stmt: { sql: 'PRAGMA foreign_keys = ON', want_rows: false } };

  function shape(result, mode) {
    if (mode === 'run') {
      return {
        changes: Number(result.affected_row_count || 0),
        lastInsertRowid: result.last_insert_rowid == null ? 0 : Number(result.last_insert_rowid),
      };
    }
    const names = result.cols.map((c) => c.name);
    const rows = result.rows.map((r) => {
      const o = {};
      for (let i = 0; i < names.length; i++) o[names[i]] = fromValue(r[i]);
      return o;
    });
    return mode === 'get' ? rows[0] ?? null : rows;
  }

  return {
    kind: 'remote',
    async query(sql, params, mode, stream) {
      const stmt = { sql, args: params.map(toArg), want_rows: mode !== 'run' };
      if (stream) {
        const [r] = await pipeline(stream, [{ type: 'execute', stmt }]);
        return shape(check(r).result, mode);
      }
      const results = await pipeline(null, [fkOn, { type: 'execute', stmt }, { type: 'close' }]);
      return shape(check(results[1]).result, mode);
    },
    async execMulti(sql, stream) {
      if (stream) { check((await pipeline(stream, [{ type: 'sequence', sql }]))[0]); return; }
      const results = await pipeline(null, [fkOn, { type: 'sequence', sql }, { type: 'close' }]);
      check(results[1]);
    },
    async begin() {
      for (let attempt = 0; ; attempt++) {
        const stream = { baton: null, baseUrl: null };
        try {
          const results = await pipeline(stream, [fkOn, { type: 'execute', stmt: { sql: 'BEGIN IMMEDIATE', want_rows: false } }]);
          check(results[1]);
          return stream;
        } catch (e) {
          if (stream.baton) await pipeline(stream, [{ type: 'close' }]).catch(() => {});
          if (attempt < 6 && /BUSY|locked/i.test(`${e.code} ${e.message}`)) {
            await new Promise((r) => setTimeout(r, 40 * 2 ** attempt));
            continue;
          }
          throw e;
        }
      }
    },
    async commit(stream) {
      const results = await pipeline(stream, [{ type: 'execute', stmt: { sql: 'COMMIT', want_rows: false } }, { type: 'close' }]);
      check(results[0]);
    },
    async rollback(stream) {
      if (!stream?.baton) return;
      await pipeline(stream, [{ type: 'execute', stmt: { sql: 'ROLLBACK', want_rows: false } }, { type: 'close' }]).catch(() => {});
    },
    close() {},
  };
}

// ---------------------------------------------------------------- connection
/** Where the database lives, from the environment. Remote wins when configured. */
export function databaseTarget() {
  const r = config.remoteDb;
  if (r.url) return { kind: 'remote', url: r.url, token: r.token };
  return { kind: 'local', file: config.dbPath };
}

export async function openDb(target = databaseTarget()) {
  if (driver) return driver;
  if (opening) return opening;
  if (typeof target === 'string') target = { kind: 'local', file: target };
  opening = (async () => {
    driver = target.kind === 'remote' ? remoteDriver(target.url, target.token) : await localDriver(target.file);
    opening = null;
    return driver;
  })();
  return opening;
}

async function getDriver() {
  return driver || openDb();
}

export function driverKind() { return driver?.kind || databaseTarget().kind; }

export async function closeDb() {
  if (driver) { driver.close(); driver = null; }
}

// ---------------------------------------------------------------- queries
async function q(sql, params, mode) {
  const d = await getDriver();
  const ctx = txStore.getStore();
  if (ctx) return d.query(sql, params, mode, ctx.stream);
  if (d.kind === 'local') {
    const release = await d.mutex.lock();
    try { return await d.query(sql, params, mode); } finally { release(); }
  }
  return d.query(sql, params, mode);
}

export function one(sql, ...params) { return q(sql, params, 'get'); }
export function all(sql, ...params) { return q(sql, params, 'all'); }
export function run(sql, ...params) { return q(sql, params, 'run'); }

/** Run fn inside a write transaction. Nested calls join the outer transaction. */
export async function tx(fn) {
  if (txStore.getStore()) return fn();
  const d = await getDriver();
  const release = d.kind === 'local' ? await d.mutex.lock() : null;
  const ctx = { stream: null, after: [] };
  let out;
  try {
    ctx.stream = await d.begin();
    try {
      out = await txStore.run(ctx, fn);
      await d.commit(ctx.stream);
    } catch (e) {
      await d.rollback(ctx.stream);
      throw e;
    }
  } finally {
    if (release) release();
  }
  for (const cb of ctx.after) { try { await cb(); } catch (e) { console.error('afterCommit callback failed', e); } }
  return out;
}

/** Run a side effect (event broadcast, network call) only once the current transaction commits. */
export function afterCommit(fn) {
  const ctx = txStore.getStore();
  if (ctx) ctx.after.push(fn);
  else Promise.resolve().then(fn).catch((e) => console.error('afterCommit callback failed', e));
}

// ---------------------------------------------------------------- migrations
export async function migrate() {
  const d = await getDriver();
  await run(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  ) STRICT`);
  const applied = new Set((await all('SELECT version FROM schema_migrations')).map((r) => r.version));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const ran = [];
  for (const f of files) {
    const version = f.replace(/\.sql$/, '');
    if (applied.has(version)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    try {
      await tx(async () => {
        // Another instance may have applied it while we waited for the write lock.
        if (await one('SELECT 1 AS x FROM schema_migrations WHERE version = ?', version)) return;
        await d.execMulti(sql, txStore.getStore().stream);
        await run('INSERT INTO schema_migrations(version) VALUES (?)', version);
        ran.push(version);
      });
    } catch (e) {
      throw new Error(`Migration ${f} failed: ${e.message}`);
    }
  }
  return ran;
}

export function nowIso() { return new Date().toISOString(); }

export function parseJson(s, fallback = null) {
  if (s === null || s === undefined || s === '') return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}
