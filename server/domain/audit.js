// Audit trail for sensitive administrative changes. IP addresses are stored
// as salted hashes so the log can correlate activity without keeping raw IPs.
import crypto from 'node:crypto';
import { run, all } from '../db/db.js';
import { config } from '../config.js';

const REDACT = new Set(['password', 'password_hash', 'token', 'secret', 'customer_phone']);

function clean(v) {
  if (v === undefined) return null;
  return JSON.stringify(v, (k, val) => (REDACT.has(k) ? '[redacted]' : val));
}

export async function audit({ user, action, entity, entityId = null, before = undefined, after = undefined, ip = '' }) {
  const ipHash = ip ? crypto.createHmac('sha256', config.sessionSecret || 'audit').update(ip).digest('hex').slice(0, 16) : null;
  await run('INSERT INTO audit_log (user_id, action, entity, entity_id, before, after, ip_hash) VALUES (?,?,?,?,?,?,?)',
    user?.id ?? null, action, entity, entityId === null ? null : String(entityId), clean(before), clean(after), ipHash);
}

export async function auditList({ limit = 100, offset = 0 } = {}) {
  return all(`SELECT a.*, u.name user_name, u.email user_email FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
              ORDER BY a.id DESC LIMIT ? OFFSET ?`, Math.min(500, limit), offset);
}
