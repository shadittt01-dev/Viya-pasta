// Owner dashboard: authentication, server-enforced permissions, CSRF, audit
// trail, and JSON APIs for every module the business uses.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { jsonBody, formBody, readBody, rateLimit, HttpError } from '../http/app.js';
import { config } from '../config.js';
import { one, all, run, tx, parseJson } from '../db/db.js';
import { login, logout, sessionFromToken, can, PERMISSIONS, createUser, listUsers, hashPassword, passwordProblems, revokeUserSessions } from '../domain/auth.js';
import { audit, auditList } from '../domain/audit.js';
import { getSetting, setSetting, DEFAULTS } from '../domain/settings.js';
import { loadCatalog, DRAFTABLE, defaultBranch } from '../domain/catalog.js';
import { transition, orderItems, orderEvents, OrderError, markPaid } from '../domain/orders.js';
import { outboxStats } from '../domain/notify.js';
import { activeProvider } from '../payments/index.js';
import { normalizeTheme, DEFAULT_THEME, compileTheme, categoryBackgroundPresets } from '../domain/theme.js';
import { counts as presetCounts } from '../../shared/presets/registry.js';
import { qrSvg, qrPng, qrPrintPage } from '../qr/render.js';
import { adminShell, loginPage } from '../views/admin.js';
import { parseMajor } from '../../shared/money.js';
import { normalizePhone } from '../domain/phone.js';
import { sendCompressed } from '../http/static.js';

const loginLimitIp = rateLimit({ name: 'login-ip', limit: 20, windowMs: 15 * 60000 });
const loginLimitEmail = rateLimit({ name: 'login-email', limit: 8, windowMs: 15 * 60000, by: (req) => String(req._email || '').toLowerCase() });

const COOKIE = 'hb_admin';

function originOk(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin navigations and some fetches omit it; CSRF token still required
  try {
    const o = new URL(origin);
    const host = req.headers.host;
    return o.host === host || origin === new URL(config.publicUrl).origin;
  } catch { return false; }
}

async function requireUser(req) {
  const user = await sessionFromToken(req.cookies[COOKIE]);
  if (!user) throw new HttpError(401, 'AUTH_REQUIRED');
  req.user = user;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!originOk(req)) throw new HttpError(403, 'ORIGIN_REJECTED');
    const token = req.headers['x-csrf-token'];
    const a = Buffer.from(String(token || '')), b = Buffer.from(user.csrf);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(403, 'CSRF_INVALID');
  }
  return user;
}

const guard = (permission) => async (req) => {
  const user = await requireUser(req);
  if (permission && !can(user, permission)) throw new HttpError(403, 'FORBIDDEN');
};

function mustBe(cond, code = 'INVALID') { if (!cond) throw new HttpError(422, code); }
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const intOrNull = (v) => (v === null || v === '' || v === undefined ? null : Number.isInteger(Number(v)) ? Number(v) : NaN);
const isHHMM = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s));
const isoOrNull = (v) => { if (!v) return null; const t = Date.parse(v); mustBe(Number.isFinite(t), 'DATE_INVALID'); return new Date(t).toISOString(); };

function moneyField(v, currency) {
  if (Number.isInteger(v)) return v;
  try { return parseMajor(v, currency); } catch { throw new HttpError(422, 'AMOUNT_INVALID'); }
}

function orderRow(o) {
  return {
    id: o.id, ref: o.ref, createdAt: o.created_at, updatedAt: o.updated_at, orderStatus: o.order_status, fulfillmentStatus: o.fulfillment_status, paymentStatus: o.payment_status,
    fulfillmentType: o.fulfillment_type, scheduledFor: o.scheduled_for, promisedAt: o.promised_at, customerName: o.customer_name, customerPhone: o.customer_phone,
    note: o.customer_note, total: o.total_minor, currency: o.currency, paymentMethod: o.payment_method, coupon: o.coupon_code, whatsapp: o.whatsapp_handoff,
    address: parseJson(o.address, null), lang: o.lang, rejectReason: o.reject_reason,
    subtotal: o.subtotal_minor, discount: o.discount_minor, deliveryFee: o.delivery_fee_minor, serviceFee: o.service_fee_minor, tax: o.tax_minor, taxMode: o.tax_mode,
  };
}

const SETTINGS_PERMS = {
  ordering: 'settings.operations', fulfillment: 'settings.operations', fees: 'settings.operations', whatsapp: 'settings.operations', loader: 'design.edit',
  business: 'settings.operations', seo: 'content.edit', analytics: 'settings.operations', notifications: 'settings.payments', payments: 'settings.payments', tax: 'settings.payments',
  menu_background: 'design.edit',
};

function validateSetting(key, v, current) {
  const cur = current;
  switch (key) {
    case 'ordering': return {
      enabled: Boolean(v.enabled), accept_mode: v.accept_mode === 'auto' ? 'auto' : 'manual', asap: Boolean(v.asap), scheduling: Boolean(v.scheduling),
      days_ahead: Math.max(0, Math.min(7, Number(v.days_ahead) || 0)), slot_minutes: [5, 10, 15, 20, 30, 60].includes(Number(v.slot_minutes)) ? Number(v.slot_minutes) : 15,
      cutoff_minutes: Math.max(0, Math.min(120, Number(v.cutoff_minutes) || 0)), max_items_per_order: Math.max(1, Math.min(200, Number(v.max_items_per_order) || 40)), note_max_chars: cur.note_max_chars,
    };
    case 'fulfillment': return {
      pickup: { enabled: Boolean(v.pickup?.enabled), prep_minutes: Math.max(1, Math.min(180, Number(v.pickup?.prep_minutes) || 15)) },
      delivery: { enabled: Boolean(v.delivery?.enabled), prep_minutes: Math.max(1, Math.min(240, Number(v.delivery?.prep_minutes) || 25)), provider: v.delivery?.provider === 'partner' ? 'partner' : 'own_drivers' },
    };
    case 'payments': return {
      pay_at_pickup: { enabled: Boolean(v.pay_at_pickup?.enabled), methods_confirmed: Boolean(v.pay_at_pickup?.methods_confirmed), cash: Boolean(v.pay_at_pickup?.cash), card_terminal: Boolean(v.pay_at_pickup?.card_terminal) },
      pay_on_delivery: { enabled: Boolean(v.pay_on_delivery?.enabled), cash: Boolean(v.pay_on_delivery?.cash), card_terminal: Boolean(v.pay_on_delivery?.card_terminal) },
      online: { enabled: Boolean(v.online?.enabled), provider: 'moyasar', methods_label_en: str(v.online?.methods_label_en, 80), methods_label_ar: str(v.online?.methods_label_ar, 80) },
    };
    case 'tax': {
      const mode = ['none', 'inclusive', 'exclusive'].includes(v.mode) ? v.mode : 'none';
      const rate = Number(v.rate_bp);
      mustBe(Number.isInteger(rate) && rate >= 0 && rate <= 5000, 'TAX_RATE_INVALID');
      return { mode, rate_bp: rate, vat_number: str(v.vat_number, 20).replace(/[^\d]/g, '') };
    }
    case 'fees': return { service_fee_minor: Math.max(0, Math.min(100000, Number(v.service_fee_minor) || 0)) };
    case 'whatsapp': {
      const number = v.number ? normalizePhone(v.number) : '';
      mustBe(v.number ? Boolean(number) : true, 'PHONE_INVALID');
      const mode = ['off', 'support', 'order_copy', 'whatsapp_required'].includes(v.mode) ? v.mode : 'off';
      mustBe(mode === 'off' || (number && v.verified), 'WHATSAPP_NOT_VERIFIED');
      return { mode, number, verified: Boolean(v.verified) };
    }
    case 'business': {
      const socials = (Array.isArray(v.socials) ? v.socials : []).slice(0, 12).map((s) => {
        const url = str(s.url, 200);
        mustBe(/^https:\/\/[^\s]+$/.test(url), 'SOCIAL_URL_INVALID');
        return { network: str(s.network, 20).toLowerCase(), handle: str(s.handle, 60), url };
      });
      const email = str(v.email, 120);
      mustBe(!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'EMAIL_INVALID');
      return { ...cur, name_en: str(v.name_en, 80) || cur.name_en, name_ar: str(v.name_ar, 80) || cur.name_ar, tagline_en: str(v.tagline_en, 120), tagline_ar: str(v.tagline_ar, 120), email, legal_name: str(v.legal_name, 120), socials, confirmed: { ...cur.confirmed, ...(v.confirmed || {}) } };
    }
    case 'seo': return { title_en: str(v.title_en, 70), title_ar: str(v.title_ar, 70), desc_en: str(v.desc_en, 170), desc_ar: str(v.desc_ar, 170) };
    case 'loader': return { enabled: Boolean(v.enabled), max_ms: Math.max(300, Math.min(2500, Number(v.max_ms) || 1400)) };
    case 'analytics': return { enabled: Boolean(v.enabled) };
    case 'notifications': return { webhook_enabled: Boolean(v.webhook_enabled), whatsapp_cloud_enabled: Boolean(v.whatsapp_cloud_enabled) };
    case 'menu_background': return { preset: str(v.preset, 40), opacity: Math.max(0, Math.min(0.14, Number(v.opacity) || 0)), scale: Math.max(0.5, Math.min(3, Number(v.scale) || 1)), color: str(v.color, 20), contrast: ['subtle', 'normal', 'bold'].includes(v.contrast) ? v.contrast : 'normal' };
    default: throw new HttpError(404, 'SETTING_UNKNOWN');
  }
}

// --------------------------------------------------------------- image upload validation
function sniffImage(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { mime: 'image/png', ext: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if ([0xc0, 0xc1, 0xc2].includes(marker)) return { mime: 'image/jpeg', ext: 'jpg', h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
    return { mime: 'image/jpeg', ext: 'jpg', w: null, h: null };
  }
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = buf.toString('ascii', 12, 16);
    if (fmt === 'VP8X') return { mime: 'image/webp', ext: 'webp', w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (fmt === 'VP8 ') return { mime: 'image/webp', ext: 'webp', w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (fmt === 'VP8L') { const b = buf.readUInt32LE(21); return { mime: 'image/webp', ext: 'webp', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
    return { mime: 'image/webp', ext: 'webp', w: null, h: null };
  }
  return null;
}

// --------------------------------------------------------------- CSV
function csv(rows) {
  const cell = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

export function registerAdmin(app) {
  // ---- pages
  app.get('/admin/login', async (req, res) => {
    if (await sessionFromToken(req.cookies[COOKIE])) return res.redirect('/admin', 302);
    const noOwner = !(await one("SELECT 1 AS x FROM users WHERE role = 'owner' AND active = 1 LIMIT 1"));
    res.html(200, loginPage({ nonce: res.locals.nonce, noOwner, error: req.query.e || '', lang: req.query.lang === 'en' ? 'en' : (req.cookies.hb_admin_lang || 'ar') }), { 'x-robots-tag': 'noindex' });
  });

  app.post('/admin/login', async (req, res) => {
    loginLimitIp(req);
    const ct = String(req.headers['content-type'] || '');
    const body = ct.startsWith('application/json') ? await jsonBody(req, 4096) : await formBody(req);
    req._email = body.email;
    if (!originOk(req)) throw new HttpError(403, 'ORIGIN_REJECTED');
    try { loginLimitEmail(req); } catch { return res.redirect('/admin/login?e=locked', 303); }
    const r = await login(body.email, body.password);
    if (!r.ok) {
      await audit({ user: null, action: 'login_failed', entity: 'user', entityId: null, after: { email: str(body.email, 120) }, ip: req.ip });
      return res.redirect(`/admin/login?e=${r.code === 'LOGIN_LOCKED' ? 'locked' : 'failed'}`, 303);
    }
    res.cookie(COOKIE, r.token, { maxAge: 14 * 86400, sameSite: 'Strict' });
    await audit({ user: r.user, action: 'login', entity: 'user', entityId: r.user.id, ip: req.ip });
    return res.redirect('/admin', 303);
  });

  app.post('/admin/logout', async (req, res) => {
    const user = await requireUser(req);
    await logout(req.cookies[COOKIE]);
    await audit({ user, action: 'logout', entity: 'user', entityId: user.id, ip: req.ip });
    res.cookie(COOKIE, '', { maxAge: 0, sameSite: 'Strict' });
    res.json(200, { ok: true });
  });

  app.get('/admin', async (req, res) => {
    const user = await sessionFromToken(req.cookies[COOKIE]);
    if (!user) return res.redirect('/admin/login', 302);
    res.html(200, adminShell({ nonce: res.locals.nonce, user, lang: req.cookies.hb_admin_lang === 'en' ? 'en' : 'ar' }), { 'x-robots-tag': 'noindex' });
  });
  // ---- session info
  app.get('/admin/api/me', guard(null), async (req, res) => {
    const u = req.user;
    res.json(200, {
      user: { id: u.id, name: u.name, email: u.email, role: u.role }, csrf: u.csrf,
      permissions: Object.keys(PERMISSIONS).filter((p) => can(u, p)),
      env: config.appEnv, publicUrl: config.publicUrl, indexing: config.allowIndexing,
      paymentProvider: activeProvider()?.name || 'none', presets: presetCounts(), outbox: await outboxStats(),
      needsReview: await needsReviewSummary(),
    });
  });

  // ---- live updates (polling; works on serverless hosting where long-lived streams are cut off)
  // Returns order changes after the given cursor (order_events.id). Without a cursor, returns the current cursor.
  app.get('/admin/api/changes', guard('orders.view'), async (req, res) => {
    const since = Number(req.query.since);
    if (!Number.isInteger(since) || since < 0) {
      const r = await one('SELECT COALESCE(MAX(id), 0) AS id FROM order_events');
      return res.json(200, { cursor: r.id, events: [] });
    }
    const rows = await all(`SELECT e.id, e.order_id, e.field, e.from_value, e.to_value, o.ref FROM order_events e JOIN orders o ON o.id = e.order_id
      WHERE e.id > ? ORDER BY e.id LIMIT 200`, since);
    const events = rows.map((e) => {
      const created = e.field === 'order_status' && (e.from_value === null || (e.from_value === 'awaiting_payment' && ['awaiting_acceptance', 'accepted'].includes(e.to_value)));
      return created
        ? { type: 'order.created', orderId: e.order_id, ref: e.ref, visible: e.to_value !== 'awaiting_payment' }
        : { type: 'order.updated', orderId: e.order_id, ref: e.ref, field: e.field, to: e.to_value };
    });
    res.json(200, { cursor: rows.length ? rows[rows.length - 1].id : since, events });
  });

  // ---- orders
  app.get('/admin/api/orders', guard('orders.view'), async (req, res) => {
    const view = req.query.view || 'active';
    const where = {
      active: "order_status IN ('awaiting_acceptance','accepted')",
      awaiting_payment: "order_status = 'awaiting_payment'",
      done: "order_status IN ('completed','rejected','cancelled','failed')",
      all: '1=1',
    }[view] || "order_status IN ('awaiting_acceptance','accepted')";
    const q = str(req.query.q, 40).toUpperCase();
    const rows = q
      ? await all(`SELECT * FROM orders WHERE ${where} AND (ref LIKE ? OR customer_phone LIKE ?) ORDER BY id DESC LIMIT 200`, `%${q}%`, `%${q.replace(/^0/, '')}%`)
      : await all(`SELECT * FROM orders WHERE ${where} ORDER BY CASE order_status WHEN 'awaiting_acceptance' THEN 0 ELSE 1 END, COALESCE(scheduled_for, created_at) ASC LIMIT 200`);
    // One query for all line items (avoids a round trip per order on a remote database).
    const byOrder = new Map();
    if (rows.length) {
      const lines = await all(`SELECT order_id, name_en, name_ar, qty, options, note FROM order_items WHERE order_id IN (${rows.map(() => '?').join(',')}) ORDER BY id`, ...rows.map((o) => o.id));
      for (const i of lines) {
        if (!byOrder.has(i.order_id)) byOrder.set(i.order_id, []);
        byOrder.get(i.order_id).push({ name_en: i.name_en, name_ar: i.name_ar, qty: i.qty, options: parseJson(i.options, []), note: i.note });
      }
    }
    res.json(200, { orders: rows.map((o) => ({ ...orderRow(o), items: byOrder.get(o.id) || [] })) });
  });

  app.get('/admin/api/orders/:id', guard('orders.view'), async (req, res) => {
    const o = await one('SELECT * FROM orders WHERE id = ?', Number(req.params.id));
    if (!o) throw new HttpError(404, 'NOT_FOUND');
    res.json(200, { order: orderRow(o), items: await orderItems(o.id), events: await orderEvents(o.id), payments: await all('SELECT id, provider, provider_ref, status, amount_minor, currency, created_at, updated_at FROM payments WHERE order_id = ?', o.id) });
  });

  app.post('/admin/api/orders/:id/action', guard('orders.update'), async (req, res) => {
    const body = await jsonBody(req, 4096);
    const id = Number(req.params.id);
    const actor = `user:${req.user.id}`;
    const o = await one('SELECT * FROM orders WHERE id = ?', id);
    if (!o) throw new HttpError(404, 'NOT_FOUND');
    try {
      switch (body.action) {
        case 'accept': {
          const prep = Math.max(1, Math.min(240, Number(body.prepMinutes) || 15));
          const base = o.scheduled_for ? Date.parse(o.scheduled_for) : Date.now() + prep * 60000;
          await transition(id, 'order_status', 'accepted', { actor, note: `prep ${prep} min`, extra: { promised_at: new Date(base).toISOString() } });
          break;
        }
        case 'reject': await transition(id, 'order_status', 'rejected', { actor, note: str(body.reason, 200), extra: { reject_reason: str(body.reason, 200) || 'Unavailable' } }); break;
        case 'cancel': await transition(id, 'order_status', 'cancelled', { actor, note: str(body.reason, 200) }); break;
        case 'preparing': await transition(id, 'fulfillment_status', 'preparing', { actor }); break;
        case 'ready': await transition(id, 'fulfillment_status', 'ready', { actor }); break;
        case 'collected': await transition(id, 'fulfillment_status', 'collected', { actor }); break;
        case 'dispatched': await transition(id, 'fulfillment_status', 'dispatched', { actor, note: str(body.driver, 60) ? `driver: ${str(body.driver, 60)}` : '' }); break;
        case 'delivered': await transition(id, 'fulfillment_status', 'delivered', { actor }); break;
        case 'delivery_failed': await transition(id, 'fulfillment_status', 'delivery_failed', { actor, note: str(body.reason, 200) }); break;
        case 'mark_paid': {
          mustBe(['cash', 'card_terminal'].includes(body.method), 'METHOD_INVALID');
          mustBe(o.payment_method !== 'online', 'ONLINE_PAYMENTS_VERIFIED_BY_PROVIDER');
          await markPaid(id, actor, `collected at counter: ${body.method}`);
          break;
        }
        case 'mark_refunded': {
          if (!can(req.user, 'orders.refund')) throw new HttpError(403, 'FORBIDDEN');
          await transition(id, 'payment_status', 'refunded', { actor, note: str(body.reason, 200) || 'refund recorded' });
          break;
        }
        default: throw new HttpError(422, 'ACTION_INVALID');
      }
    } catch (e) {
      if (e instanceof OrderError) return res.json(e.status, { error: e.code, details: e.details });
      throw e;
    }
    await audit({ user: req.user, action: `order.${body.action}`, entity: 'order', entityId: o.ref, ip: req.ip });
    res.json(200, { order: orderRow(await one('SELECT * FROM orders WHERE id = ?', id)) });
  });

  // ---- menu
  app.get('/admin/api/menu', guard('orders.view'), async (req, res) => {
    const branch = await defaultBranch();
    const preview = req.query.drafts === '1';
    const cat = await loadCatalog(branch.id, { includeInactive: true, preview, tz: branch.timezone });
    const drafts = (await all('SELECT entity, entity_id, patch, updated_at FROM drafts')).map((d) => ({ ...d, patch: parseJson(d.patch, {}) }));
    res.json(200, { categories: cat.categories, drafts });
  });

  app.put('/admin/api/drafts/:entity/:id', guard('menu.edit'), async (req, res) => {
    const def = DRAFTABLE[req.params.entity];
    if (!def) throw new HttpError(404, 'ENTITY_UNKNOWN');
    const id = Number(req.params.id);
    const row = await one(`SELECT * FROM ${def.table} WHERE id = ?`, id);
    if (!row) throw new HttpError(404, 'NOT_FOUND');
    const body = await jsonBody(req, 16 * 1024);
    const currency = (await getSetting('business')).currency;
    const patch = {};
    for (const [k, v] of Object.entries(body)) {
      if (!def.fields.includes(k)) continue;
      if (k === 'price_minor') { patch[k] = moneyField(v, currency); mustBe(patch[k] >= 0 && patch[k] < 10_000_000, 'AMOUNT_INVALID'); }
      else if (['kcal', 'sort', 'category_id', 'min_select', 'max_select'].includes(k)) { patch[k] = intOrNull(v); mustBe(!Number.isNaN(patch[k]), 'NUMBER_INVALID'); }
      else if (['active', 'is_default'].includes(k)) patch[k] = v ? 1 : 0;
      else if (k === 'badges') patch[k] = JSON.stringify((Array.isArray(v) ? v : []).map((b) => str(b, 24)).slice(0, 3));
      else if (k === 'allergens') patch[k] = v === null ? null : JSON.stringify((Array.isArray(v) ? v : []).map((b) => str(b, 30)).slice(0, 14));
      else if (k === 'window_from_local' || k === 'window_to_local') { patch[k] = v ? str(v, 5) : null; mustBe(patch[k] === null || isHHMM(patch[k]), 'TIME_INVALID'); }
      else if (k === 'image_path') { patch[k] = v ? str(v, 120) : null; mustBe(patch[k] === null || /^[a-f0-9]{24}\.(png|jpg|webp)$/.test(patch[k]), 'IMAGE_INVALID'); }
      else patch[k] = str(v, k.startsWith('desc') ? 400 : 120);
    }
    if (req.params.entity === 'modifier_group') {
      const min = patch.min_select ?? row.min_select, max = patch.max_select ?? row.max_select;
      mustBe(min >= 0 && max >= 1 && max >= min, 'GROUP_LIMITS_INVALID');
    }
    const existing = await one('SELECT patch FROM drafts WHERE entity = ? AND entity_id = ?', req.params.entity, String(id));
    const merged = { ...parseJson(existing?.patch, {}), ...patch };
    for (const k of Object.keys(merged)) if (merged[k] === row[k]) delete merged[k];
    if (Object.keys(merged).length) {
      await run(`INSERT INTO drafts (entity, entity_id, patch, user_id, updated_at) VALUES (?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(entity, entity_id) DO UPDATE SET patch = excluded.patch, user_id = excluded.user_id, updated_at = excluded.updated_at`, req.params.entity, String(id), JSON.stringify(merged), req.user.id);
    } else await run('DELETE FROM drafts WHERE entity = ? AND entity_id = ?', req.params.entity, String(id));
    res.json(200, { draft: merged });
  });

  app.post('/admin/api/menu/publish', guard('menu.publish'), async (req, res) => {
    const applied = await tx(async () => {
      const drafts = await all('SELECT * FROM drafts WHERE entity IN (\'item\',\'category\',\'modifier\',\'modifier_group\')');
      for (const d of drafts) {
        const def = DRAFTABLE[d.entity];
        const patch = parseJson(d.patch, {});
        const keys = Object.keys(patch).filter((k) => def.fields.includes(k));
        if (!keys.length) continue;
        const before = await one(`SELECT * FROM ${def.table} WHERE id = ?`, Number(d.entity_id));
        if (!before) continue;
        await run(`UPDATE ${def.table} SET ${keys.map((k) => `${k} = ?`).join(', ')}${d.entity === 'item' ? ", updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')" : ''} WHERE id = ?`, ...keys.map((k) => patch[k]), Number(d.entity_id));
        await audit({ user: req.user, action: 'menu.publish', entity: d.entity, entityId: d.entity_id, before: Object.fromEntries(keys.map((k) => [k, before[k]])), after: patch, ip: req.ip });
      }
      await run("DELETE FROM drafts WHERE entity IN ('item','category','modifier','modifier_group')");
      return drafts.length;
    });
    res.json(200, { published: applied });
  });

  app.post('/admin/api/menu/discard', guard('menu.edit'), async (req, res) => {
    await run("DELETE FROM drafts WHERE entity IN ('item','category','modifier','modifier_group')");
    await audit({ user: req.user, action: 'menu.discard_drafts', entity: 'menu', ip: req.ip });
    res.json(200, { ok: true });
  });

  // Operational availability (immediate, no draft): sold-out toggles and stock.
  app.patch('/admin/api/items/:id/availability', guard('menu.availability'), async (req, res) => {
    const body = await jsonBody(req, 1024);
    const id = Number(req.params.id);
    const before = await one('SELECT sold_out, stock_qty FROM items WHERE id = ?', id);
    if (!before) throw new HttpError(404, 'NOT_FOUND');
    const sold = body.sold_out === undefined ? before.sold_out : body.sold_out ? 1 : 0;
    const stock = body.stock_qty === undefined ? before.stock_qty : intOrNull(body.stock_qty);
    mustBe(stock === null || (Number.isInteger(stock) && stock >= 0 && stock < 100000), 'STOCK_INVALID');
    await run("UPDATE items SET sold_out = ?, stock_qty = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", sold, stock, id);
    await audit({ user: req.user, action: 'item.availability', entity: 'item', entityId: id, before, after: { sold_out: sold, stock_qty: stock }, ip: req.ip });
    res.json(200, { ok: true });
  });
  app.patch('/admin/api/modifiers/:id/availability', guard('menu.availability'), async (req, res) => {
    const body = await jsonBody(req, 1024);
    await run('UPDATE modifiers SET sold_out = ? WHERE id = ?', body.sold_out ? 1 : 0, Number(req.params.id));
    await audit({ user: req.user, action: 'modifier.availability', entity: 'modifier', entityId: req.params.id, after: { sold_out: Boolean(body.sold_out) }, ip: req.ip });
    res.json(200, { ok: true });
  });

  // New records are created inactive; they go live when activated and published.
  app.post('/admin/api/items', guard('menu.edit'), async (req, res) => {
    const b = await jsonBody(req, 8192);
    const currency = (await getSetting('business')).currency;
    mustBe(await one('SELECT 1 FROM categories WHERE id = ?', Number(b.category_id)), 'CATEGORY_INVALID');
    const name_en = str(b.name_en, 80), name_ar = str(b.name_ar, 80);
    mustBe(name_en && name_ar, 'NAME_REQUIRED');
    const slug = (str(b.slug, 60) || name_en).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `item-${Date.now()}`;
    mustBe(!await one('SELECT 1 FROM items WHERE slug = ?', slug), 'SLUG_TAKEN');
    const r = await run(`INSERT INTO items (category_id, slug, name_en, name_ar, desc_en, desc_ar, price_minor, kcal, illustration, active, sort) VALUES (?,?,?,?,?,?,?,?,?,0,?)`,
      Number(b.category_id), slug, name_en, name_ar, str(b.desc_en, 400), str(b.desc_ar, 400), moneyField(b.price ?? 0, currency), intOrNull(b.kcal), str(b.illustration, 40) || 'pasta-alfredo', 999);
    await audit({ user: req.user, action: 'item.create', entity: 'item', entityId: Number(r.lastInsertRowid), after: { name_en, name_ar }, ip: req.ip });
    res.json(201, { id: Number(r.lastInsertRowid) });
  });
  app.post('/admin/api/categories', guard('menu.edit'), async (req, res) => {
    const b = await jsonBody(req, 4096);
    const name_en = str(b.name_en, 60), name_ar = str(b.name_ar, 60);
    mustBe(name_en && name_ar, 'NAME_REQUIRED');
    const slug = name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    mustBe(slug && !await one('SELECT 1 FROM categories WHERE slug = ?', slug), 'SLUG_TAKEN');
    const r = await run('INSERT INTO categories (slug, name_en, name_ar, active, sort) VALUES (?,?,?,0,99)', slug, name_en, name_ar);
    await audit({ user: req.user, action: 'category.create', entity: 'category', entityId: Number(r.lastInsertRowid), after: { name_en }, ip: req.ip });
    res.json(201, { id: Number(r.lastInsertRowid) });
  });
  app.post('/admin/api/items/:id/groups', guard('menu.edit'), async (req, res) => {
    const b = await jsonBody(req, 4096);
    const itemId = Number(req.params.id);
    mustBe(await one('SELECT 1 FROM items WHERE id = ?', itemId), 'ITEM_INVALID');
    const min = Number(b.min_select) || 0, max = Number(b.max_select) || 1;
    mustBe(min >= 0 && max >= 1 && max >= min, 'GROUP_LIMITS_INVALID');
    const r = await run('INSERT INTO modifier_groups (item_id, name_en, name_ar, min_select, max_select, sort) VALUES (?,?,?,?,?,99)', itemId, str(b.name_en, 60), str(b.name_ar, 60), min, max);
    await audit({ user: req.user, action: 'group.create', entity: 'modifier_group', entityId: Number(r.lastInsertRowid), ip: req.ip });
    res.json(201, { id: Number(r.lastInsertRowid) });
  });
  app.post('/admin/api/groups/:id/options', guard('menu.edit'), async (req, res) => {
    const b = await jsonBody(req, 4096);
    const groupId = Number(req.params.id);
    mustBe(await one('SELECT 1 FROM modifier_groups WHERE id = ?', groupId), 'GROUP_INVALID');
    const r = await run('INSERT INTO modifiers (group_id, name_en, name_ar, price_minor, kcal, active, sort) VALUES (?,?,?,?,?,0,99)', groupId, str(b.name_en, 60), str(b.name_ar, 60), moneyField(b.price ?? 0, (await getSetting('business')).currency), intOrNull(b.kcal));
    await audit({ user: req.user, action: 'option.create', entity: 'modifier', entityId: Number(r.lastInsertRowid), ip: req.ip });
    res.json(201, { id: Number(r.lastInsertRowid) });
  });

  // ---- uploads (owner photos, logo)
  app.post('/admin/api/uploads', guard('menu.edit'), async (req, res) => {
    const buf = await readBody(req, 2.5 * 1024 * 1024);
    const info = sniffImage(buf);
    mustBe(info, 'IMAGE_TYPE_UNSUPPORTED');
    mustBe(!info.w || (info.w >= 200 && info.h >= 200 && info.w <= 6000 && info.h <= 6000), 'IMAGE_DIMENSIONS_INVALID');
    const name = `${crypto.randomBytes(12).toString('hex')}.${info.ext}`;
    await run('INSERT INTO asset_blobs (path, data) VALUES (?, ?)', name, buf);
    await run('INSERT INTO assets (path, mime, width, height, bytes, purpose, rights_note, uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
      name, info.mime, info.w, info.h, buf.length, str(req.query.purpose, 40), str(req.query.rights, 200), req.user.id);
    await audit({ user: req.user, action: 'asset.upload', entity: 'asset', entityId: name, after: { bytes: buf.length, purpose: str(req.query.purpose, 40) }, ip: req.ip });
    res.json(201, { path: name, width: info.w, height: info.h });
  });
  app.get('/admin/api/assets', guard('menu.edit'), async (req, res) => res.json(200, { assets: await all('SELECT * FROM assets ORDER BY id DESC LIMIT 200') }));

  // ---- settings
  app.get('/admin/api/settings', guard('orders.view'), async (req, res) => {
    const out = {};
    for (const k of Object.keys(SETTINGS_PERMS)) out[k] = await getSetting(k);
    res.json(200, { settings: out, secrets: { moyasar: Boolean(config.payments.moyasarSecretKey), webhook: Boolean(config.notifications.webhookUrl), whatsappCloud: Boolean(config.notifications.whatsappCloudToken) }, provider: config.payments.provider });
  });
  app.put('/admin/api/settings/:key', async (req, res) => {
    const key = req.params.key;
    const perm = SETTINGS_PERMS[key];
    if (!perm) throw new HttpError(404, 'SETTING_UNKNOWN');
    await guard(perm)(req);
    const body = await jsonBody(req, 16 * 1024);
    const before = await getSetting(key);
    const value = validateSetting(key, body, before);
    await setSetting(key, value);
    await audit({ user: req.user, action: 'settings.update', entity: 'settings', entityId: key, before, after: value, ip: req.ip });
    res.json(200, { [key]: await getSetting(key) });
  });

  // ---- hours & closures
  app.get('/admin/api/hours', guard('orders.view'), async (req, res) => {
    const b = await defaultBranch();
    res.json(200, { branch: b, hours: await all('SELECT * FROM opening_hours WHERE branch_id = ? ORDER BY weekday, opens_local', b.id), closures: await all('SELECT * FROM closures WHERE branch_id = ? ORDER BY starts_at DESC LIMIT 50', b.id) });
  });
  app.put('/admin/api/hours', guard('settings.operations'), async (req, res) => {
    const body = await jsonBody(req, 8192);
    const b = await defaultBranch();
    const rows = Array.isArray(body.hours) ? body.hours.slice(0, 28) : [];
    for (const r of rows) mustBe(Number.isInteger(r.weekday) && r.weekday >= 0 && r.weekday <= 6 && isHHMM(r.opens_local) && isHHMM(r.closes_local), 'HOURS_INVALID');
    const before = await all('SELECT weekday, opens_local, closes_local, confirmed FROM opening_hours WHERE branch_id = ?', b.id);
    await tx(async () => {
      await run('DELETE FROM opening_hours WHERE branch_id = ?', b.id);
      for (const r of rows) await run('INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (?,?,?,?,?)', b.id, r.weekday, r.opens_local, r.closes_local, r.confirmed ? 1 : 0);
    });
    await audit({ user: req.user, action: 'hours.update', entity: 'branch', entityId: b.id, before, after: rows, ip: req.ip });
    res.json(200, { ok: true });
  });
  app.post('/admin/api/closures', guard('settings.operations'), async (req, res) => {
    const body = await jsonBody(req, 4096);
    const b = await defaultBranch();
    const s = isoOrNull(body.starts_at), e = isoOrNull(body.ends_at);
    mustBe(s && e && Date.parse(e) > Date.parse(s), 'RANGE_INVALID');
    const r = await run('INSERT INTO closures (branch_id, starts_at, ends_at, reason_en, reason_ar) VALUES (?,?,?,?,?)', b.id, s, e, str(body.reason_en, 120), str(body.reason_ar, 120));
    await audit({ user: req.user, action: 'closure.create', entity: 'closure', entityId: Number(r.lastInsertRowid), after: { s, e }, ip: req.ip });
    res.json(201, { id: Number(r.lastInsertRowid) });
  });
  app.delete('/admin/api/closures/:id', guard('settings.operations'), async (req, res) => {
    await run('DELETE FROM closures WHERE id = ?', Number(req.params.id));
    await audit({ user: req.user, action: 'closure.delete', entity: 'closure', entityId: req.params.id, ip: req.ip });
    res.json(200, { ok: true });
  });
  app.put('/admin/api/branch', guard('settings.operations'), async (req, res) => {
    const body = await jsonBody(req, 8192);
    const b = await defaultBranch();
    const phone = body.phone ? normalizePhone(body.phone) : b.phone;
    mustBe(phone, 'PHONE_INVALID');
    const lat = Number(body.lat ?? b.lat), lng = Number(body.lng ?? b.lng);
    mustBe(Math.abs(lat) <= 90 && Math.abs(lng) <= 180, 'COORDS_INVALID');
    const mapsUrl = str(body.maps_url ?? b.maps_url, 300);
    mustBe(!mapsUrl || /^https:\/\//.test(mapsUrl), 'URL_INVALID');
    const next = {
      name_en: str(body.name_en ?? b.name_en, 80), name_ar: str(body.name_ar ?? b.name_ar, 80), address_en: str(body.address_en ?? b.address_en, 200), address_ar: str(body.address_ar ?? b.address_ar, 200),
      plus_code: str(body.plus_code ?? b.plus_code, 40), lat, lng, phone, maps_url: mapsUrl, pickup_note_en: str(body.pickup_note_en ?? b.pickup_note_en, 200), pickup_note_ar: str(body.pickup_note_ar ?? b.pickup_note_ar, 200),
    };
    await run(`UPDATE branches SET ${Object.keys(next).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...Object.values(next), b.id);
    await audit({ user: req.user, action: 'branch.update', entity: 'branch', entityId: b.id, before: b, after: next, ip: req.ip });
    res.json(200, { ok: true });
  });

  // ---- delivery zones
  app.get('/admin/api/zones', guard('orders.view'), async (req, res) => res.json(200, { zones: (await all('SELECT * FROM delivery_zones ORDER BY sort, id')).map((z) => ({ ...z, geometry: parseJson(z.geometry, {}) })) }));
  app.post('/admin/api/zones', guard('settings.operations'), async (req, res) => {
    const body = await jsonBody(req, 32 * 1024);
    const z = await validateZone(body);
    const r = await run(`INSERT INTO delivery_zones (branch_id, name_en, name_ar, kind, geometry, fee_minor, min_order_minor, free_over_minor, eta_minutes, active, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      (await defaultBranch()).id, z.name_en, z.name_ar, z.kind, JSON.stringify(z.geometry), z.fee_minor, z.min_order_minor, z.free_over_minor, z.eta_minutes, z.active, z.sort);
    await audit({ user: req.user, action: 'zone.create', entity: 'zone', entityId: Number(r.lastInsertRowid), after: z, ip: req.ip });
    res.json(201, { id: Number(r.lastInsertRowid) });
  });
  app.put('/admin/api/zones/:id', guard('settings.operations'), async (req, res) => {
    const body = await jsonBody(req, 32 * 1024);
    const z = await validateZone(body);
    await run(`UPDATE delivery_zones SET name_en=?, name_ar=?, kind=?, geometry=?, fee_minor=?, min_order_minor=?, free_over_minor=?, eta_minutes=?, active=?, sort=? WHERE id = ?`,
      z.name_en, z.name_ar, z.kind, JSON.stringify(z.geometry), z.fee_minor, z.min_order_minor, z.free_over_minor, z.eta_minutes, z.active, z.sort, Number(req.params.id));
    await audit({ user: req.user, action: 'zone.update', entity: 'zone', entityId: req.params.id, after: z, ip: req.ip });
    res.json(200, { ok: true });
  });
  app.delete('/admin/api/zones/:id', guard('settings.operations'), async (req, res) => {
    await run('UPDATE delivery_zones SET active = 0 WHERE id = ?', Number(req.params.id));
    await audit({ user: req.user, action: 'zone.deactivate', entity: 'zone', entityId: req.params.id, ip: req.ip });
    res.json(200, { ok: true });
  });

  // ---- campaigns & coupons
  app.get('/admin/api/campaigns', guard('orders.view'), async (req, res) => res.json(200, {
    campaigns: await all('SELECT * FROM campaigns WHERE status != \'archived\' ORDER BY id DESC'),
    coupons: await all('SELECT c.*, (SELECT count(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id AND r.released = 0) AS redemptions FROM coupons c ORDER BY id DESC'),
  }));
  app.post('/admin/api/campaigns', guard('campaigns.edit'), async (req, res) => {
    const c = await validateCampaign(await jsonBody(req, 16 * 1024));
    const r = await run(`INSERT INTO campaigns (kind, title_en, title_ar, body_en, body_ar, cta_en, cta_ar, cta_href, image_desktop, image_mobile, coupon_id, branch_ids, starts_at, ends_at, show_countdown, status, priority)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?)`, c.kind, c.title_en, c.title_ar, c.body_en, c.body_ar, c.cta_en, c.cta_ar, c.cta_href, c.image_desktop, c.image_mobile, c.coupon_id, c.branch_ids, c.starts_at, c.ends_at, c.show_countdown, c.priority);
    await audit({ user: req.user, action: 'campaign.create', entity: 'campaign', entityId: Number(r.lastInsertRowid), after: c, ip: req.ip });
    res.json(201, { id: Number(r.lastInsertRowid) });
  });
  app.put('/admin/api/campaigns/:id', guard('campaigns.edit'), async (req, res) => {
    const c = await validateCampaign(await jsonBody(req, 16 * 1024));
    await run(`UPDATE campaigns SET kind=?, title_en=?, title_ar=?, body_en=?, body_ar=?, cta_en=?, cta_ar=?, cta_href=?, image_desktop=?, image_mobile=?, coupon_id=?, branch_ids=?, starts_at=?, ends_at=?, show_countdown=?, priority=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      c.kind, c.title_en, c.title_ar, c.body_en, c.body_ar, c.cta_en, c.cta_ar, c.cta_href, c.image_desktop, c.image_mobile, c.coupon_id, c.branch_ids, c.starts_at, c.ends_at, c.show_countdown, c.priority, Number(req.params.id));
    await audit({ user: req.user, action: 'campaign.update', entity: 'campaign', entityId: req.params.id, after: c, ip: req.ip });
    res.json(200, { ok: true });
  });
  app.post('/admin/api/campaigns/:id/status', guard('campaigns.edit'), async (req, res) => {
    const body = await jsonBody(req, 1024);
    mustBe(['draft', 'published', 'archived'].includes(body.status), 'STATUS_INVALID');
    await run("UPDATE campaigns SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", body.status, Number(req.params.id));
    await audit({ user: req.user, action: `campaign.${body.status}`, entity: 'campaign', entityId: req.params.id, ip: req.ip });
    res.json(200, { ok: true });
  });
  app.post('/admin/api/coupons', guard('campaigns.edit'), async (req, res) => {
    const c = await validateCoupon(await jsonBody(req, 8192));
    mustBe(!await one('SELECT 1 FROM coupons WHERE code = ? COLLATE NOCASE', c.code), 'CODE_TAKEN');
    const r = await run(`INSERT INTO coupons (code, kind, value, min_subtotal_minor, max_discount_minor, eligible_item_ids, branch_ids, starts_at, ends_at, usage_limit, per_customer_limit, combinable, terms_en, terms_ar, active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, c.code, c.kind, c.value, c.min_subtotal_minor, c.max_discount_minor, c.eligible_item_ids, c.branch_ids, c.starts_at, c.ends_at, c.usage_limit, c.per_customer_limit, c.combinable, c.terms_en, c.terms_ar, c.active);
    await audit({ user: req.user, action: 'coupon.create', entity: 'coupon', entityId: c.code, after: c, ip: req.ip });
    res.json(201, { id: Number(r.lastInsertRowid) });
  });
  app.put('/admin/api/coupons/:id', guard('campaigns.edit'), async (req, res) => {
    const c = await validateCoupon(await jsonBody(req, 8192));
    await run(`UPDATE coupons SET kind=?, value=?, min_subtotal_minor=?, max_discount_minor=?, eligible_item_ids=?, branch_ids=?, starts_at=?, ends_at=?, usage_limit=?, per_customer_limit=?, combinable=?, terms_en=?, terms_ar=?, active=? WHERE id = ?`,
      c.kind, c.value, c.min_subtotal_minor, c.max_discount_minor, c.eligible_item_ids, c.branch_ids, c.starts_at, c.ends_at, c.usage_limit, c.per_customer_limit, c.combinable, c.terms_en, c.terms_ar, c.active, Number(req.params.id));
    await audit({ user: req.user, action: 'coupon.update', entity: 'coupon', entityId: req.params.id, after: c, ip: req.ip });
    res.json(200, { ok: true });
  });

  // ---- content blocks
  app.get('/admin/api/content', guard('orders.view'), async (req, res) => res.json(200, { blocks: await all('SELECT * FROM content_blocks ORDER BY key') }));
  app.put('/admin/api/content/:key', guard('content.edit'), async (req, res) => {
    const body = await jsonBody(req, 32 * 1024);
    const key = str(req.params.key, 60);
    const before = await one('SELECT * FROM content_blocks WHERE key = ?', key);
    if (!before) throw new HttpError(404, 'NOT_FOUND');
    if (key === 'faq.items') for (const v of [body.value_en, body.value_ar]) { try { const a = JSON.parse(v); mustBe(Array.isArray(a) && a.every((x) => Array.isArray(x) && x.length === 2), 'FAQ_INVALID'); } catch { throw new HttpError(422, 'FAQ_INVALID'); } }
    await run("UPDATE content_blocks SET value_en = ?, value_ar = ?, needs_review = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE key = ?",
      str(body.value_en, 8000), str(body.value_ar, 8000), body.approved ? 0 : before.needs_review, key);
    await audit({ user: req.user, action: 'content.update', entity: 'content', entityId: key, before: { en: before.value_en, ar: before.value_ar }, after: { en: body.value_en, ar: body.value_ar, approved: Boolean(body.approved) }, ip: req.ip });
    res.json(200, { ok: true });
  });

  // ---- theme / design studio
  app.get('/admin/api/theme', guard('orders.view'), async (req, res) => {
    const published = await getSetting('theme_published') || DEFAULT_THEME;
    const draft = await getSetting('theme_draft');
    res.json(200, { published: normalizeTheme(published), draft: draft ? normalizeTheme(draft) : null, defaults: normalizeTheme(DEFAULT_THEME) });
  });
  app.put('/admin/api/theme/draft', guard('design.edit'), async (req, res) => {
    const body = await jsonBody(req, 32 * 1024);
    const normalized = normalizeTheme(body);
    if (normalized.errors.length) return res.json(422, { error: 'THEME_INVALID', errors: normalized.errors });
    const { errors: _e, ...clean } = normalized;
    await setSetting('theme_draft', clean);
    await audit({ user: req.user, action: 'theme.draft', entity: 'theme', after: clean, ip: req.ip });
    res.json(200, { draft: clean, compiled: compileTheme(clean, { categoryPresets: await categoryBackgroundPresets() }).hash });
  });
  app.post('/admin/api/theme/publish', guard('design.publish'), async (req, res) => {
    const draft = await getSetting('theme_draft');
    if (!draft) throw new HttpError(409, 'NO_DRAFT');
    const before = await getSetting('theme_published');
    await setSetting('theme_published', draft);
    await setSetting('theme_draft', null);
    await audit({ user: req.user, action: 'theme.publish', entity: 'theme', before, after: draft, ip: req.ip });
    res.json(200, { ok: true });
  });
  app.post('/admin/api/theme/reset', guard('design.edit'), async (req, res) => {
    await setSetting('theme_draft', { ...DEFAULT_THEME });
    await audit({ user: req.user, action: 'theme.reset_draft', entity: 'theme', ip: req.ip });
    res.json(200, { draft: normalizeTheme(DEFAULT_THEME) });
  });
  app.delete('/admin/api/theme/draft', guard('design.edit'), async (req, res) => {
    await setSetting('theme_draft', null);
    await audit({ user: req.user, action: 'theme.discard_draft', entity: 'theme', ip: req.ip });
    res.json(200, { ok: true });
  });

  // ---- QR downloads for any destination on this site
  app.get('/admin/api/qr', guard('orders.view'), async (req, res) => {
    const lang = req.query.lang === 'en' ? 'en' : 'ar';
    const targets = { home: '', menu: '/menu', visit: '/visit', offers: '/offers' };
    const target = targets[req.query.target] ?? '/menu';
    const campaign = str(req.query.campaign, 40).toLowerCase().replace(/[^a-z0-9-]/g, '');
    const url = `${config.publicUrl}/${lang}${target}${campaign ? `?utm_source=qr&utm_campaign=${campaign}` : ''}`;
    const fmt = req.query.format;
    const filename = `viapasta-${req.query.target || 'menu'}-${lang}${campaign ? `-${campaign}` : ''}`;
    if (fmt === 'png') { res.writeHead(200, { 'content-type': 'image/png', 'content-disposition': `attachment; filename="${filename}.png"` }); return res.end(qrPng(url, { scale: 20 })); }
    if (fmt === 'print') { const b = await getSetting('business'); return res.html(200, qrPrintPage({ url, lang, name: lang === 'ar' ? b.name_ar : b.name_en, preview: !config.allowIndexing, nonce: res.locals.nonce })); }
    res.writeHead(200, { 'content-type': 'image/svg+xml', 'content-disposition': `${fmt === 'svg' ? 'attachment' : 'inline'}; filename="${filename}.svg"` });
    return res.end(qrSvg(url));
  });

  // ---- reports (from real orders only)
  app.get('/admin/api/reports', guard('reports.view'), async (req, res) => {
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 13 * 86400000);
    const f = from.toISOString().slice(0, 10), t = new Date(to.getTime() + 86400000).toISOString().slice(0, 10);
    const counted = "order_status IN ('accepted','completed')";
    const byDay = await all(`SELECT substr(datetime(created_at, '+3 hours'),1,10) day, count(*) orders, sum(total_minor) revenue FROM orders WHERE ${counted} AND created_at >= ? AND created_at < ? GROUP BY day ORDER BY day`, f, t);
    const byHour = await all(`SELECT CAST(substr(datetime(created_at, '+3 hours'),12,2) AS INTEGER) hour, count(*) orders FROM orders WHERE ${counted} AND created_at >= ? AND created_at < ? GROUP BY hour ORDER BY hour`, f, t);
    const topItems = await all(`SELECT oi.name_en, oi.name_ar, sum(oi.qty) qty, sum(oi.line_total_minor) revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.${counted} AND o.created_at >= ? AND o.created_at < ? GROUP BY oi.item_id ORDER BY qty DESC LIMIT 10`, f, t);
    const totals = await one(`SELECT count(*) orders, coalesce(sum(total_minor),0) revenue, coalesce(avg(total_minor),0) aov, coalesce(sum(discount_minor),0) discounts FROM orders WHERE ${counted} AND created_at >= ? AND created_at < ?`, f, t);
    const statuses = await all('SELECT order_status, count(*) n FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY order_status', f, t);
    const funnel = await all("SELECT name, count(*) n FROM analytics_events WHERE day >= ? AND day < ? AND name IN ('page_view','item_view','add_to_cart','checkout_start','order_placed') GROUP BY name", f, t);
    res.json(200, { from: f, to: t, currency: (await getSetting('business')).currency, totals: { ...totals, aov: Math.round(totals.aov) }, byDay, byHour, topItems, statuses, funnel, note: 'Revenue counts accepted and completed orders only; times shown in Asia/Riyadh.' });
  });

  app.get('/admin/api/export/orders.csv', guard('exports.download'), async (req, res) => {
    const rows = await all('SELECT * FROM orders ORDER BY id DESC LIMIT 20000');
    const out = [['ref', 'created_at_utc', 'order_status', 'fulfillment_status', 'payment_status', 'fulfillment', 'scheduled_for', 'customer_name', 'customer_phone', 'payment_method', 'currency', 'subtotal', 'discount', 'delivery_fee', 'service_fee', 'tax', 'total', 'coupon', 'items']];
    const lineRows = await all('SELECT order_id, qty, name_en, options FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY id DESC LIMIT 20000) ORDER BY id');
    const linesByOrder = new Map();
    for (const l of lineRows) {
      if (!linesByOrder.has(l.order_id)) linesByOrder.set(l.order_id, []);
      linesByOrder.get(l.order_id).push({ ...l, options: parseJson(l.options, []) });
    }
    for (const o of rows) {
      const items = (linesByOrder.get(o.id) || []).map((i) => `${i.qty}x ${i.name_en}${i.options.length ? ` (${i.options.map((x) => x.name_en).join(', ')})` : ''}`).join('; ');
      out.push([o.ref, o.created_at, o.order_status, o.fulfillment_status, o.payment_status, o.fulfillment_type, o.scheduled_for, o.customer_name, o.customer_phone, o.payment_method, o.currency,
        o.subtotal_minor / 100, o.discount_minor / 100, o.delivery_fee_minor / 100, o.service_fee_minor / 100, o.tax_minor / 100, o.total_minor / 100, o.coupon_code, items]);
    }
    await audit({ user: req.user, action: 'export.orders', entity: 'orders', after: { rows: rows.length }, ip: req.ip });
    sendCompressed(req, res, 200, csv(out), { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="viapasta-orders-${new Date().toISOString().slice(0, 10)}.csv"`, 'cache-control': 'no-store' });
  });
  app.get('/admin/api/export/menu.csv', guard('exports.download'), async (req, res) => {
    const rows = [['category', 'slug', 'name_en', 'name_ar', 'price', 'kcal', 'active', 'sold_out', 'stock_qty']];
    for (const i of await all('SELECT i.*, c.slug cat FROM items i JOIN categories c ON c.id = i.category_id ORDER BY c.sort, i.sort')) rows.push([i.cat, i.slug, i.name_en, i.name_ar, i.price_minor / 100, i.kcal, i.active, i.sold_out, i.stock_qty]);
    sendCompressed(req, res, 200, csv(rows), { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="viapasta-menu.csv"', 'cache-control': 'no-store' });
  });

  // ---- staff
  app.get('/admin/api/users', guard('staff.manage'), async (req, res) => res.json(200, { users: await listUsers() }));
  app.post('/admin/api/users', guard('staff.manage'), async (req, res) => {
    const b = await jsonBody(req, 4096);
    mustBe(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(b.email, 120)), 'EMAIL_INVALID');
    mustBe(!await one('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE', str(b.email, 120)), 'EMAIL_TAKEN');
    const problems = passwordProblems(b.password);
    mustBe(!problems.length, problems[0]);
    const id = await createUser({ email: str(b.email, 120), name: str(b.name, 60), role: b.role, password: String(b.password) });
    await audit({ user: req.user, action: 'user.create', entity: 'user', entityId: id, after: { email: b.email, role: b.role }, ip: req.ip });
    res.json(201, { id });
  });
  app.put('/admin/api/users/:id', guard('staff.manage'), async (req, res) => {
    const b = await jsonBody(req, 4096);
    const id = Number(req.params.id);
    const target = await one('SELECT * FROM users WHERE id = ?', id);
    if (!target) throw new HttpError(404, 'NOT_FOUND');
    const role = b.role ?? target.role;
    mustBe(['owner', 'manager', 'staff'].includes(role), 'ROLE_INVALID');
    const active = b.active === undefined ? target.active : b.active ? 1 : 0;
    // never lock the business out: keep at least one active owner
    if ((role !== 'owner' || !active) && target.role === 'owner') {
      mustBe((await one("SELECT count(*) n FROM users WHERE role = 'owner' AND active = 1 AND id != ?", id)).n > 0, 'LAST_OWNER');
    }
    if (b.password) { const p = passwordProblems(b.password); mustBe(!p.length, p[0]); await run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(String(b.password)), id); await revokeUserSessions(id); }
    await run('UPDATE users SET role = ?, active = ?, name = ? WHERE id = ?', role, active, str(b.name ?? target.name, 60), id);
    if (!active || role !== target.role) await revokeUserSessions(id);
    await audit({ user: req.user, action: 'user.update', entity: 'user', entityId: id, before: { role: target.role, active: target.active }, after: { role, active, passwordChanged: Boolean(b.password) }, ip: req.ip });
    res.json(200, { ok: true });
  });

  app.get('/admin/api/audit', guard('audit.view'), async (req, res) => res.json(200, { entries: await auditList({ limit: Number(req.query.limit) || 100, offset: Number(req.query.offset) || 0 }) }));
  // Dashboard client-side routes (registered last so API routes win).
  app.get('/admin/*', async (req, res) => {
    if (req.path.startsWith('/admin/api/')) throw new HttpError(404, 'NOT_FOUND');
    const user = await sessionFromToken(req.cookies[COOKIE]);
    if (!user) return res.redirect('/admin/login', 302);
    res.html(200, adminShell({ nonce: res.locals.nonce, user, lang: req.cookies.hb_admin_lang === 'en' ? 'en' : 'ar' }), { 'x-robots-tag': 'noindex' });
  });
}

async function validateZone(b) {
  const currency = (await getSetting('business')).currency;
  const kind = b.kind === 'polygon' ? 'polygon' : 'radius';
  let geometry;
  if (kind === 'radius') { const km = Number(b.geometry?.km); mustBe(km > 0 && km <= 50, 'RADIUS_INVALID'); geometry = { km }; }
  else {
    const pts = Array.isArray(b.geometry?.points) ? b.geometry.points : [];
    mustBe(pts.length >= 3 && pts.length <= 200 && pts.every((p) => Array.isArray(p) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180), 'POLYGON_INVALID');
    geometry = { points: pts.map((p) => [Number(p[0]), Number(p[1])]) };
  }
  return {
    name_en: str(b.name_en, 60), name_ar: str(b.name_ar, 60), kind, geometry,
    fee_minor: moneyField(b.fee ?? b.fee_minor ?? 0, currency), min_order_minor: moneyField(b.min_order ?? b.min_order_minor ?? 0, currency),
    free_over_minor: b.free_over === null || b.free_over === '' || b.free_over === undefined ? (b.free_over_minor ?? null) : moneyField(b.free_over, currency),
    eta_minutes: Math.max(5, Math.min(240, Number(b.eta_minutes) || 40)), active: b.active === false ? 0 : 1, sort: Number(b.sort) || 0,
  };
}

async function validateCampaign(b) {
  const kind = ['announcement', 'hero', 'offer'].includes(b.kind) ? b.kind : null;
  mustBe(kind, 'KIND_INVALID');
  const href = str(b.cta_href, 200);
  mustBe(!href || href.startsWith('/') || /^https:\/\//.test(href), 'URL_INVALID');
  const s = isoOrNull(b.starts_at), e = isoOrNull(b.ends_at);
  mustBe(!s || !e || Date.parse(e) > Date.parse(s), 'RANGE_INVALID');
  mustBe(!b.show_countdown || e, 'COUNTDOWN_NEEDS_REAL_DEADLINE');
  const couponId = b.coupon_id ? Number(b.coupon_id) : null;
  mustBe(!couponId || await one('SELECT 1 FROM coupons WHERE id = ?', couponId), 'COUPON_INVALID');
  const img = (v) => (v ? (mustBe(/^[a-f0-9]{24}\.(png|jpg|webp)$/.test(String(v)), 'IMAGE_INVALID'), String(v)) : null);
  return {
    kind, title_en: str(b.title_en, 120), title_ar: str(b.title_ar, 120), body_en: str(b.body_en, 400), body_ar: str(b.body_ar, 400), cta_en: str(b.cta_en, 40), cta_ar: str(b.cta_ar, 40), cta_href: href,
    image_desktop: img(b.image_desktop), image_mobile: img(b.image_mobile), coupon_id: couponId, branch_ids: Array.isArray(b.branch_ids) && b.branch_ids.length ? JSON.stringify(b.branch_ids.map(Number)) : null,
    starts_at: s, ends_at: e, show_countdown: b.show_countdown ? 1 : 0, priority: Number(b.priority) || 0,
  };
}

async function validateCoupon(b) {
  const currency = (await getSetting('business')).currency;
  const code = str(b.code, 40).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  mustBe(code.length >= 3, 'CODE_INVALID');
  const kind = ['percent', 'fixed', 'free_delivery'].includes(b.kind) ? b.kind : null;
  mustBe(kind, 'KIND_INVALID');
  let value = 0;
  if (kind === 'percent') { value = Math.round(Number(b.percent ?? b.value / 100) * 100); mustBe(value > 0 && value <= 10000, 'PERCENT_INVALID'); }
  if (kind === 'fixed') { value = moneyField(b.amount ?? b.value, currency); mustBe(value > 0, 'AMOUNT_INVALID'); }
  const s = isoOrNull(b.starts_at), e = isoOrNull(b.ends_at);
  mustBe(!s || !e || Date.parse(e) > Date.parse(s), 'RANGE_INVALID');
  const lim = (v) => (v === '' || v === null || v === undefined ? null : Math.max(1, Math.floor(Number(v))));
  return {
    code, kind, value, min_subtotal_minor: b.min_subtotal !== undefined && b.min_subtotal !== '' ? moneyField(b.min_subtotal, currency) : 0,
    max_discount_minor: b.max_discount !== undefined && b.max_discount !== '' && b.max_discount !== null ? moneyField(b.max_discount, currency) : null,
    eligible_item_ids: Array.isArray(b.eligible_item_ids) && b.eligible_item_ids.length ? JSON.stringify(b.eligible_item_ids.map(Number)) : null,
    branch_ids: Array.isArray(b.branch_ids) && b.branch_ids.length ? JSON.stringify(b.branch_ids.map(Number)) : null,
    starts_at: s, ends_at: e, usage_limit: lim(b.usage_limit), per_customer_limit: lim(b.per_customer_limit), combinable: b.combinable ? 1 : 0,
    terms_en: str(b.terms_en, 300), terms_ar: str(b.terms_ar, 300), active: b.active === false ? 0 : 1,
  };
}

async function needsReviewSummary() {
  const b = await getSetting('business');
  const items = (await all("SELECT slug, name_en, needs_review FROM items WHERE needs_review != '[]'")).map((i) => ({ slug: i.slug, name: i.name_en, notes: parseJson(i.needs_review, []) }));
  const content = (await all('SELECT key FROM content_blocks WHERE needs_review = 1')).map((c) => c.key);
  const unconfirmedHours = (await one('SELECT count(*) n FROM opening_hours WHERE confirmed = 0')).n;
  return { confirmed: b.confirmed || {}, items, content, unconfirmedHours, defaults: Object.keys(DEFAULTS).length };
}
