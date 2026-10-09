// Apply pending database migrations. Safe to run repeatedly.
import { openDb, migrate, closeDb } from '../server/db/db.js';
import { config } from '../server/config.js';

await openDb();
const ran = await migrate();
console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Database is up to date.', `(${config.dbPath})`);
await closeDb();
