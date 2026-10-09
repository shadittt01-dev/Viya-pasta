// A small stand-in for a Turso/libSQL server, used only by `npm run test:remote`.
// Speaks the Hrana-over-HTTP v2 pipeline protocol on top of node:sqlite, with one
// SQLite connection per stream (baton), so transactions behave like the real thing.
// Usage: node tests/support/mock-turso.js <db-file> <port> <token>
import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const [file, port = '0', token = 'test-token'] = process.argv.slice(2);
const streams = new Map(); // baton -> { db, timer }

function connect() {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 0;');
  return db;
}

function toValue(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'bigint') return { type: 'integer', value: v.toString() };
  if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v };
  if (v instanceof Uint8Array) return { type: 'blob', base64: Buffer.from(v).toString('base64') };
  return { type: 'text', value: String(v) };
}
function fromArg(a) {
  switch (a.type) {
    case 'null': return null;
    case 'integer': return Number(a.value);
    case 'float': return Number(a.value);
    case 'text': return a.value;
    case 'blob': return Buffer.from(a.base64, 'base64');
    default: throw new Error(`bad arg type ${a.type}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withBusyRetry(fn) {
  for (let i = 0; ; i++) {
    try { return fn(); } catch (e) {
      if (!/database is locked|SQLITE_BUSY/i.test(e.message) || i > 400) throw e;
      await sleep(10);
    }
  }
}

async function execute(db, stmt) {
  const args = (stmt.args || []).map(fromArg);
  return withBusyRetry(() => {
    const s = db.prepare(stmt.sql);
    const cols = s.columns();
    if (cols.length) {
      const rows = s.all(...args);
      const names = cols.map((c) => c.name);
      return { cols: cols.map((c) => ({ name: c.name, decltype: c.type || null })), rows: stmt.want_rows === false ? [] : rows.map((r) => names.map((n) => toValue(r[n]))), affected_row_count: 0, last_insert_rowid: null };
    }
    const r = s.run(...args);
    return { cols: [], rows: [], affected_row_count: Number(r.changes), last_insert_rowid: String(r.lastInsertRowid) };
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/v2/pipeline') { res.writeHead(404); return res.end('not found'); }
  if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"message":"Unauthorized"}'); }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  let stream;
  if (body.baton) {
    stream = streams.get(body.baton);
    if (!stream) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"message":"Stream expired"}'); }
    streams.delete(body.baton);
    clearTimeout(stream.timer);
  } else stream = { db: connect() };
  const results = [];
  let closed = false;
  for (const r of body.requests) {
    try {
      if (r.type === 'execute') results.push({ type: 'ok', response: { type: 'execute', result: await execute(stream.db, r.stmt) } });
      else if (r.type === 'sequence') { await withBusyRetry(() => stream.db.exec(r.sql)); results.push({ type: 'ok', response: { type: 'sequence' } }); }
      else if (r.type === 'close') { closed = true; results.push({ type: 'ok', response: { type: 'close' } }); }
      else results.push({ type: 'error', error: { message: `unsupported request ${r.type}` } });
    } catch (e) {
      results.push({ type: 'error', error: { message: `SQLite error: ${e.message}`, code: e.errcode ? `SQLITE_${e.errcode}` : 'SQLITE_ERROR' } });
    }
  }
  let baton = null;
  if (closed) {
    try { if (stream.db.isTransaction) stream.db.exec('ROLLBACK'); } catch { /* ignore */ }
    stream.db.close();
  } else {
    baton = crypto.randomBytes(12).toString('hex');
    // Like the real server: idle streams expire (and roll back).
    stream.timer = setTimeout(() => { streams.delete(baton); try { stream.db.close(); } catch { /* ignore */ } }, 10000);
    streams.set(baton, stream);
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ baton, base_url: null, results }));
});

server.listen(Number(port), '127.0.0.1', () => {
  process.stdout.write(`READY ${server.address().port}\n`);
});
