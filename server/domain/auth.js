// Staff authentication: scrypt password hashes, server-side sessions with
// hashed tokens, CSRF tokens per session, lockout after repeated failures,
// and a role → permission matrix enforced on every admin route.
import crypto from 'node:crypto';
import { one, run, all } from '../db/db.js';

const SESSION_DAYS = 14;
const LOCK_AFTER = 8;
const LOCK_MINUTES = 15;

export const PERMISSIONS = {
  'orders.view': ['owner', 'manager', 'staff'],
  'orders.update': ['owner', 'manager', 'staff'],
  'orders.refund': ['owner', 'manager'],
  'menu.availability': ['owner', 'manager', 'staff'],
  'menu.edit': ['owner', 'manager'],
  'menu.publish': ['owner', 'manager'],
  'settings.operations': ['owner', 'manager'],
  'settings.payments': ['owner'],
  'campaigns.edit': ['owner', 'manager'],
  'design.edit': ['owner', 'manager'],
  'design.publish': ['owner'],
  'reports.view': ['owner', 'manager'],
  'exports.download': ['owner', 'manager'],
  'staff.manage': ['owner'],
  'audit.view': ['owner'],
  'content.edit': ['owner', 'manager'],
};

export function can(user, permission) {
  return Boolean(user && user.active && PERMISSIONS[permission]?.includes(user.role));
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const got = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(expected, got);
}

export function passwordProblems(pw) {
  const p = String(pw || '');
  const issues = [];
  if (p.length < 12) issues.push('PASSWORD_TOO_SHORT');
  if (/^(.)\1+$/.test(p)) issues.push('PASSWORD_TRIVIAL');
  return issues;
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Always run one scrypt so response time does not reveal whether an email exists.
const DUMMY_HASH = hashPassword(crypto.randomBytes(8).toString('hex'));

export async function login(email, password) {
  const user = await one('SELECT * FROM users WHERE email = ? COLLATE NOCASE', String(email || '').trim());
  if (!user) { verifyPassword(password, DUMMY_HASH); return { ok: false, code: 'LOGIN_FAILED' }; }
  if (user.locked_until && Date.parse(user.locked_until) > Date.now()) { verifyPassword(password, DUMMY_HASH); return { ok: false, code: 'LOGIN_LOCKED' }; }
  if (!user.active || !verifyPassword(password, user.password_hash)) {
    const failed = user.failed_logins + 1;
    await run('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?', failed >= LOCK_AFTER ? 0 : failed,
      failed >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null, user.id);
    return { ok: false, code: 'LOGIN_FAILED' };
  }
  await run("UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", user.id);
  return { ok: true, user, ...(await createSession(user.id)) };
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  await run('INSERT INTO sessions (id, user_id, csrf, expires_at) VALUES (?,?,?,?)', sha(token), userId, csrf, new Date(Date.now() + SESSION_DAYS * 86400000).toISOString());
  return { token, csrf };
}

export async function sessionFromToken(token) {
  if (!token || token.length > 100) return null;
  const s = await one(`SELECT s.id sid, s.csrf, s.expires_at, s.last_seen_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`, sha(token));
  if (!s || Date.parse(s.expires_at) < Date.now() || !s.active) return null;
  if (Date.now() - Date.parse(s.last_seen_at) > 5 * 60000) {
    await run("UPDATE sessions SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", s.sid);
  }
  const { password_hash: _ph, ...user } = s;
  return user;
}

export async function logout(token) {
  if (token) await run('DELETE FROM sessions WHERE id = ?', sha(token));
}

export async function revokeUserSessions(userId) {
  await run('DELETE FROM sessions WHERE user_id = ?', userId);
}

export async function createUser({ email, name, role, password }) {
  if (!['owner', 'manager', 'staff'].includes(role)) throw new Error('ROLE_INVALID');
  const issues = passwordProblems(password);
  if (issues.length) throw new Error(issues[0]);
  const r = await run('INSERT INTO users (email, name, role, password_hash) VALUES (?,?,?,?)', String(email).trim().toLowerCase(), String(name).trim().slice(0, 60), role, hashPassword(password));
  return Number(r.lastInsertRowid);
}

export async function listUsers() {
  return all('SELECT id, email, name, role, active, created_at, last_login_at FROM users ORDER BY id');
}

export async function pruneSessions() {
  await run('DELETE FROM sessions WHERE expires_at < ?', new Date().toISOString());
}
