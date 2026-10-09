// Consistent online backup of the SQLite database (safe while the app runs)
// plus a copy of uploaded photos. Usage: npm run backup [-- /path/to/backups]
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../server/config.js';

const dir = path.resolve(process.argv[2] || path.join(path.dirname(config.dbPath), 'backups'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, `viapasta-${config.appEnv}-${stamp}.sqlite`);
const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA busy_timeout = 10000');
db.prepare('VACUUM INTO ?').run(target); // transactionally consistent snapshot
db.close();
const check = new DatabaseSync(target, { readOnly: true });
const ok = check.prepare('PRAGMA integrity_check').get();
const orders = check.prepare('SELECT count(*) n FROM orders').get().n;
check.close();
if (fs.existsSync(config.uploadsDir)) fs.cpSync(config.uploadsDir, path.join(dir, `uploads-${stamp}`), { recursive: true });
console.log(`Backup written: ${target} (integrity: ${Object.values(ok)[0]}, orders: ${orders})`);
