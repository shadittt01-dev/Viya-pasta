// npm run seed:business  — verified business data (menu, branch, hours as published, text). Production-safe.
// npm run seed:dev       — development test accounts, test zone and TEST coupons. Refuses in production.
import { openDb, migrate, closeDb } from '../server/db/db.js';
import { seedBusiness } from '../seed/business.js';
import { seedDev } from '../seed/dev.js';

const which = process.argv[2];
await openDb();
await migrate();
if (which === 'business') console.log((await seedBusiness()).skipped ? 'Business data already present — nothing changed.' : 'Business data seeded.');
else if (which === 'dev') { await seedBusiness(); await seedDev(); console.log('Development data seeded (test accounts: see seed/dev.js).'); }
else { console.error('Usage: node scripts/seed.js business|dev'); process.exitCode = 1; }
await closeDb();
