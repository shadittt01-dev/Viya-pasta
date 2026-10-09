// Create a dashboard user interactively (the password is never echoed or logged).
// Usage: npm run create-owner
import readline from 'node:readline';
import { openDb, migrate, closeDb, one } from '../server/db/db.js';
import { createUser, passwordProblems } from '../server/domain/auth.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const ask = (q, hidden = false) => new Promise((resolve) => {
  if (!hidden) return rl.question(q, resolve);
  process.stdout.write(q);
  const onData = (c) => { if (['\n', '\r', '\u0004'].includes(String(c))) process.stdin.removeListener('data', onData); else { readline.moveCursor(process.stdout, -1, 0); process.stdout.write('*'); } };
  process.stdin.on('data', onData);
  rl.question('', (a) => { process.stdout.write('\n'); resolve(a); });
});

await openDb();
await migrate();
const email = (await ask('Email: ')).trim();
const name = (await ask('Name: ')).trim();
const role = ((await ask('Role (owner/manager/staff) [owner]: ')).trim() || 'owner');
const password = await ask('Password (12+ characters): ', true);
if (await one('SELECT 1 FROM users WHERE email = ?', email)) console.error('That email already has an account.');
else if (passwordProblems(password).length) console.error(`Password rejected: ${passwordProblems(password).join(', ')}`);
else { await createUser({ email, name, role, password }); console.log(`Created ${role} ${email}.`); }
rl.close();
await closeDb();
