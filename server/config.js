// Runtime configuration from environment variables. Secrets live only in the
// environment (see .env.example) — never in the database, client code or git.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader (no dependency). Real environment variables win.
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadDotEnv(path.join(ROOT, '.env'));

const env = process.env;
// On Vercel, production deployments run in production mode unless told otherwise.
const appEnv = env.APP_ENV || (env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview' ? 'production' : 'development');

// Turso / libSQL connection. The Vercel Marketplace integration may add a custom
// prefix to the variable names, so accept any *TURSO_DATABASE_URL / *LIBSQL_URL.
function findEnv(suffixes) {
  for (const s of suffixes) if (env[s]) return { name: s, value: env[s] };
  for (const [k, v] of Object.entries(env)) {
    if (v && suffixes.some((s) => k.endsWith(`_${s}`))) return { name: k, value: v };
  }
  return null;
}
const remoteUrl = findEnv(['TURSO_DATABASE_URL', 'LIBSQL_URL', 'DATABASE_URL']);
const remoteUrlOk = remoteUrl && /^(libsql|https?|wss?):\/\//i.test(remoteUrl.value) && !/^postgres/i.test(remoteUrl.value);
let remoteToken = null;
if (remoteUrlOk) {
  const prefix = remoteUrl.name.replace(/(TURSO_DATABASE_URL|LIBSQL_URL|DATABASE_URL)$/, '');
  remoteToken = env[`${prefix}TURSO_AUTH_TOKEN`] || env[`${prefix}LIBSQL_AUTH_TOKEN`] || env[`${prefix}DATABASE_AUTH_TOKEN`]
    || findEnv(['TURSO_AUTH_TOKEN', 'LIBSQL_AUTH_TOKEN', 'DATABASE_AUTH_TOKEN'])?.value || '';
}

// Public URL: explicit PUBLIC_URL, else the Vercel production domain, else localhost.
const vercelUrl = env.VERCEL_PROJECT_PRODUCTION_URL || (env.VERCEL_ENV === 'preview' ? env.VERCEL_URL : '');
const publicUrl = (env.PUBLIC_URL || (vercelUrl ? `https://${vercelUrl}` : `http://localhost:${env.PORT || 3000}`)).replace(/\/$/, '');

// Session secret: SESSION_SECRET, else derived from the database token (already a
// long random secret held only in the environment) so a Vercel deploy needs one
// variable fewer. Changing the token signs everyone out, which is acceptable.
const sessionSecret = env.SESSION_SECRET
  || (remoteToken ? crypto.createHmac('sha256', remoteToken).update('humbo-session-secret-v1').digest('hex') : '');

export const config = {
  appEnv,
  isProd: appEnv === 'production',
  isTest: appEnv === 'test',
  port: Number(env.PORT || 3000),
  host: env.HOST || '127.0.0.1',
  // Canonical public URL. In production this must be the real, live domain.
  publicUrl,
  remoteDb: { url: remoteUrlOk ? remoteUrl.value : '', token: remoteToken || '' },
  isServerless: Boolean(env.VERCEL),
  dbPath: env.DATABASE_PATH || path.join(ROOT, 'data', `${appEnv}.sqlite`),
  uploadsDir: env.UPLOADS_DIR || path.join(ROOT, 'data', 'uploads'),
  sessionSecret,
  trustProxy: env.TRUST_PROXY === '1' || Boolean(env.VERCEL),
  allowIndexing: env.ALLOW_INDEXING === '1' && appEnv === 'production',
  payments: {
    provider: env.PAYMENT_PROVIDER || (appEnv === 'development' ? 'sandbox' : 'none'), // none | moyasar | sandbox (development only)
    moyasarSecretKey: env.MOYASAR_SECRET_KEY || '',
    moyasarWebhookSecret: env.MOYASAR_WEBHOOK_SECRET || '',
    moyasarApiBase: env.MOYASAR_API_BASE || 'https://api.moyasar.com/v1',
    sandboxSecret: env.SANDBOX_WEBHOOK_SECRET || 'dev-sandbox-secret-not-for-production',
    unpaidOrderTtlMinutes: Number(env.UNPAID_ORDER_TTL_MINUTES || 30),
  },
  notifications: {
    webhookUrl: env.NOTIFY_WEBHOOK_URL || '',
    webhookSecret: env.NOTIFY_WEBHOOK_SECRET || '',
    whatsappCloudToken: env.WHATSAPP_CLOUD_TOKEN || '',
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || '',
  },
};

export function assertProductionConfig() {
  if (!config.isProd) return;
  const problems = [];
  if (!config.sessionSecret || config.sessionSecret.length < 32) problems.push('SESSION_SECRET must be at least 32 characters');
  if (!config.publicUrl.startsWith('https://')) problems.push('PUBLIC_URL must be https:// in production');
  if (config.isServerless && !config.remoteDb.url) problems.push('No database connected: add a Turso database to this Vercel project (Storage tab), then redeploy');
  if (config.payments.provider === 'sandbox') problems.push('PAYMENT_PROVIDER=sandbox is not allowed in production');
  if (config.payments.provider === 'moyasar' && (!config.payments.moyasarSecretKey || !config.payments.moyasarWebhookSecret)) {
    problems.push('Moyasar requires MOYASAR_SECRET_KEY and MOYASAR_WEBHOOK_SECRET');
  }
  if (problems.length) {
    throw new Error(`Refusing to start in production:\n- ${problems.join('\n- ')}`);
  }
}
