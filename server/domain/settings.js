// Business settings stored as JSON rows. Defaults are deliberately conservative:
// anything that affects money or fulfillment stays off until the owner confirms it.
import { one, run, all, parseJson } from '../db/db.js';

export const DEFAULTS = {
  business: {
    name_en: 'Via Pasta',
    name_ar: 'ڤيا باستا',
    short_en: 'Via Pasta',
    short_ar: 'ڤيا باستا',
    tagline_en: 'Italian pasta in Yanbu',
    tagline_ar: 'باستا إيطالية في ينبع',
    email: '',
    legal_name: '',
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    default_lang: 'ar',
    languages: ['ar', 'en'],
    socials: [],
    confirmed: {},
  },
  ordering: {
    enabled: true,
    accept_mode: 'manual',            // manual: staff accept each order; auto: accepted on receipt
    asap: true,
    scheduling: true,
    days_ahead: 1,
    slot_minutes: 15,
    cutoff_minutes: 15,
    max_items_per_order: 40,
    note_max_chars: 140,
  },
  fulfillment: {
    pickup: { enabled: true, prep_minutes: 15 },
    delivery: { enabled: false, prep_minutes: 25, provider: 'own_drivers' },
  },
  payments: {
    pay_at_pickup: { enabled: true, methods_confirmed: false, cash: false, card_terminal: false },
    pay_on_delivery: { enabled: false, cash: false, card_terminal: false },
    online: { enabled: false, provider: 'moyasar', methods_label_en: 'Card, mada or Apple Pay', methods_label_ar: 'بطاقة أو مدى أو Apple Pay' },
  },
  tax: { mode: 'none', rate_bp: 1500, vat_number: '' },
  fees: { service_fee_minor: 0 },
  whatsapp: { mode: 'off', number: '', verified: false },
  notifications: { webhook_enabled: false, whatsapp_cloud_enabled: false },
  analytics: { enabled: true },
  seo: {
    title_en: 'Via Pasta — Italian pasta in Yanbu',
    title_ar: 'ڤيا باستا — باستا إيطالية في ينبع',
    desc_en: 'Alfredo, pesto, Bolognese, pasta balls and more on Cordoba Street, Yanbu. Order ahead for pickup.',
    desc_ar: 'ألفريدو وبيستو وبولونيز وباستا بول وأكثر في شارع قرطبة بينبع. اطلب مسبقًا واستلم من المطعم.',
  },
  loader: { enabled: true, max_ms: 1400 },
  menu_background: { preset: 'pat-wordmark-01', opacity: 0.05, scale: 1, color: 'maroon', contrast: 'normal' },
  theme_published: null,
  theme_draft: null,
  qr: { campaigns: [] },
};

export async function getSetting(key) {
  const row = await one('SELECT value FROM settings WHERE key = ?', key);
  return mergeSetting(key, row ? parseJson(row.value, null) : null);
}

function mergeSetting(key, value) {
  const def = DEFAULTS[key];
  if (value && def && typeof def === 'object' && !Array.isArray(def)) return deepMerge(def, value);
  return value ?? structuredClone(def ?? null);
}

export async function setSetting(key, value) {
  await run(`INSERT INTO settings(key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, key, JSON.stringify(value));
}

export async function allSettings() {
  const rows = new Map((await all('SELECT key, value FROM settings')).map((r) => [r.key, parseJson(r.value, null)]));
  const out = {};
  for (const k of Object.keys(DEFAULTS)) out[k] = mergeSetting(k, rows.get(k) ?? null);
  for (const [k, v] of rows) if (!(k in out)) out[k] = mergeSetting(k, v);
  return out;
}

export function deepMerge(a, b) {
  if (Array.isArray(a) || Array.isArray(b) || typeof a !== 'object' || typeof b !== 'object' || !a || !b) return b ?? a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in a ? deepMerge(a[k], v) : v;
  return out;
}

export async function content(key, lang) {
  const row = await one('SELECT value_en, value_ar FROM content_blocks WHERE key = ?', key);
  if (!row) return '';
  return lang === 'ar' ? row.value_ar : row.value_en;
}

export async function contentMap(prefix) {
  const out = {};
  for (const r of await all('SELECT key, value_en, value_ar, needs_review FROM content_blocks WHERE key LIKE ?', `${prefix}%`)) out[r.key] = r;
  return out;
}
