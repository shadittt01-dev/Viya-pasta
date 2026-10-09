// Runs the integration tests against the remote (Turso/libSQL over HTTP) driver,
// using tests/support/mock-turso.js as the database server.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'viapasta-remote-'));
const token = 'mock-token-0123456789';
const mock = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'tests/support/mock-turso.js', path.join(dir, 'remote.sqlite'), '0', token], { stdio: ['ignore', 'pipe', 'inherit'] });
const port = await new Promise((resolve, reject) => {
  mock.stdout.on('data', (d) => { const m = /READY (\d+)/.exec(String(d)); if (m) resolve(Number(m[1])); });
  mock.on('exit', (c) => reject(new Error(`mock exited ${c}`)));
});
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('tests/integration').filter((f) => f.endsWith('.test.js')).map((f) => `tests/integration/${f}`);
let failed = 0;
for (const f of files) {
  // Fresh database per file, like the local runs.
  const env = { ...process.env, TURSO_DATABASE_URL: `http://127.0.0.1:${port}`, TURSO_AUTH_TOKEN: token, HUMBO_REMOTE_TEST_DB: path.join(dir, 'remote.sqlite') };
  const code = await new Promise((r) => spawn(process.execPath, ['--disable-warning=ExperimentalWarning', '--test', '--test-concurrency=1', f], { stdio: 'inherit', env }).on('exit', r));
  if (code) failed++;
  // wipe all tables for the next file
  for (const ext of ['', '-wal', '-shm']) try { fs.rmSync(path.join(dir, `remote.sqlite${ext}`)); } catch { /* none */ }
}
mock.kill();
process.exit(failed ? 1 : 0);
