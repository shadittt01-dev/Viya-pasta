// Public JSON API used by the storefront. All money is computed server-side.
import { jsonBody, rateLimit, HttpError } from '../http/app.js';
import { config } from '../config.js';
import { defaultBranch, loadCatalog, publicCatalog, branchHours, branchClosures } from '../domain/catalog.js';
import { quote, publicQuote } from '../domain/pricing.js';
import { createOrder, getOrderByRef, verifyAccess, publicOrder, OrderError, recordWhatsappOpened } from '../domain/orders.js';
import { startCheckout } from '../payments/index.js';
import { getSetting } from '../domain/settings.js';
import { orderSlots } from '../../shared/hours.js';
import { run } from '../db/db.js';
import { orderMessage, waLink } from '../../shared/whatsapp.js';
import { formatLocalDay, formatLocalTime } from '../../shared/hours.js';
import { t } from '../i18n/strings.js';

const quoteLimit = rateLimit({ name: 'quote', limit: 120, windowMs: 60000 });
const orderLimit = rateLimit({ name: 'order', limit: 12, windowMs: 10 * 60000 });
const statusLimit = rateLimit({ name: 'status', limit: 120, windowMs: 60000 });
const eventLimit = rateLimit({ name: 'event', limit: 60, windowMs: 60000 });

const ANALYTICS_EVENTS = new Set(['page_view', 'item_view', 'add_to_cart', 'checkout_start', 'order_placed', 'contact_call', 'contact_whatsapp', 'directions', 'language_switch', 'coupon_apply']);

function langOf(v) { return v === 'en' ? 'en' : 'ar'; }

function orderCookieName(ref) { return `hb_o_${ref}`; }

function tokenFor(req, ref, body) {
  return (body && typeof body.token === 'string' && body.token.slice(0, 80)) || req.cookies[orderCookieName(ref)] || null;
}

function errorPayload(e, lang) {
  const out = { error: e.code };
  if (e.details?.quote) out.quote = publicQuote(e.details.quote, lang);
  if (e.details?.fields) out.fields = e.details.fields;
  if (e.details?.slots) out.slots = e.details.slots;
  if (e.details?.opensAt) out.opensAt = e.details.opensAt;
  if (e.details?.errors) out.errors = e.details.errors;
  if (e.details?.coupon) out.coupon = { code: e.details.coupon.code, ok: false, error: e.details.coupon.error };
  return out;
}

export function registerApi(app) {
  app.get('/api/menu', async (req, res) => {
    const branch = await defaultBranch();
    const lang = langOf(req.query.lang);
    res.json(200, { categories: publicCatalog(await loadCatalog(branch.id, { tz: branch.timezone }), lang) }, { 'cache-control': 'public, max-age=30' });
  });

  app.post('/api/quote', async (req, res) => {
    quoteLimit(req);
    const body = await jsonBody(req, 32 * 1024);
    const branch = await defaultBranch();
    const lang = langOf(body.lang);
    const q = await quote({ branch, lines: body.lines, couponCode: body.couponCode || null, fulfillment: body.fulfillment || 'pickup', location: body.location || null });
    res.json(200, publicQuote(q, lang));
  });

  app.get('/api/slots', async (req, res) => {
    const branch = await defaultBranch();
    const fulfillment = req.query.fulfillment === 'delivery' ? 'delivery' : 'pickup';
    const ordering = await getSetting('ordering');
    const fcfg = (await getSetting('fulfillment'))[fulfillment];
    const s = orderSlots(await branchHours(branch.id), await branchClosures(branch.id), Date.now(), branch.timezone, {
      prepMinutes: fcfg.prep_minutes, slotMinutes: ordering.slot_minutes, daysAhead: ordering.scheduling ? ordering.days_ahead : 0, cutoffMinutes: ordering.cutoff_minutes, asap: ordering.asap,
    });
    res.json(200, { asap: s.asapAvailable, asapMinutes: fcfg.prep_minutes, slots: s.slots, open: s.status.open, opensAt: s.status.opensAt, closesAt: s.status.closesAt });
  });

  app.post('/api/orders', async (req, res) => {
    orderLimit(req);
    const body = await jsonBody(req, 32 * 1024);
    const lang = langOf(body.lang);
    const branch = await defaultBranch();
    try {
      const { order, token, replayed } = await createOrder({ ...body, branchId: branch.id, lang });
      if (token) res.cookie(orderCookieName(order.ref), token, { maxAge: 30 * 86400, sameSite: 'Lax' });
      let next = { type: 'status' };
      if (order.order_status === 'awaiting_payment') {
        try {
          const pay = await startCheckout(order);
          next = { type: 'pay', url: pay.checkout_url };
        } catch (e) {
          next = { type: 'status', payError: e.code || 'PAYMENTS_UNAVAILABLE' };
        }
      }
      // A replay returns the same order; the customer's device already holds the token cookie.
      return res.json(replayed ? 200 : 201, { ref: order.ref, token: token || null, replayed, statusUrl: `/${lang}/order/${order.ref}`, next });
    } catch (e) {
      if (e instanceof OrderError) return res.json(e.status, errorPayload(e, lang));
      throw e;
    }
  });

  app.post('/api/orders/:ref/status', async (req, res) => {
    statusLimit(req);
    const body = await jsonBody(req, 4096);
    const order = await getOrderByRef(req.params.ref);
    const token = tokenFor(req, req.params.ref, body);
    // Same response for "no such order" and "wrong token" so references cannot be probed.
    if (!order || !verifyAccess(order, token)) return res.json(404, { error: 'ORDER_NOT_FOUND' });
    if (body.token && !req.cookies[orderCookieName(order.ref)]) res.cookie(orderCookieName(order.ref), body.token, { maxAge: 30 * 86400 });
    const lang = langOf(body.lang || order.lang);
    const view = await publicOrder(order, lang);
    const whatsapp = await getSetting('whatsapp');
    if (whatsapp.mode !== 'off' && whatsapp.verified && order.whatsapp_handoff !== 'none') {
      const branch = await defaultBranch();
      const text = orderMessage({
        ref: order.ref, currency: order.currency, items: view.items, fulfillmentType: order.fulfillment_type,
        scheduledLabel: order.scheduled_for ? `${formatLocalDay(Date.parse(order.scheduled_for), branch.timezone, lang)} ${formatLocalTime(Date.parse(order.scheduled_for), branch.timezone, lang)}` : (lang === 'ar' ? 'بأسرع وقت' : 'ASAP'),
        totals: view.totals, paymentLabel: t(lang, `pay.${order.payment_status}`),
      }, lang);
      view.whatsappLink = waLink(whatsapp.number, text);
      view.whatsappRequired = whatsapp.mode === 'whatsapp_required';
    }
    res.json(200, view);
  });

  app.post('/api/orders/:ref/pay', async (req, res) => {
    orderLimit(req);
    const body = await jsonBody(req, 4096);
    const order = await getOrderByRef(req.params.ref);
    if (!order || !verifyAccess(order, tokenFor(req, req.params.ref, body))) return res.json(404, { error: 'ORDER_NOT_FOUND' });
    try {
      const pay = await startCheckout(order);
      res.json(200, { url: pay.checkout_url });
    } catch (e) {
      if (e instanceof OrderError) return res.json(e.status, { error: e.code });
      throw e;
    }
  });

  app.post('/api/orders/:ref/whatsapp', async (req, res) => {
    const body = await jsonBody(req, 4096);
    const order = await getOrderByRef(req.params.ref);
    if (!order || !verifyAccess(order, tokenFor(req, req.params.ref, body))) return res.json(404, { error: 'ORDER_NOT_FOUND' });
    await recordWhatsappOpened(order.id); // "opened", never "sent": we cannot know whether it was sent
    res.json(200, { ok: true });
  });

  // First-party, cookieless analytics. Only whitelisted event names and
  // non-personal properties are stored; anything else is discarded.
  app.post('/api/events', async (req, res) => {
    eventLimit(req);
    const noContent = () => { res.writeHead(204, { 'cache-control': 'no-store' }); res.end(); };
    if (!(await getSetting('analytics')).enabled) return noContent();
    const body = await jsonBody(req, 2048);
    if (!ANALYTICS_EVENTS.has(body.name)) throw new HttpError(422, 'EVENT_UNKNOWN');
    const p = body.props && typeof body.props === 'object' ? body.props : {};
    const props = {};
    for (const k of ['itemId', 'qty', 'value']) if (p[k] !== undefined && Number.isFinite(Number(p[k]))) props[k] = Number(p[k]);
    if (p.lang === 'ar' || p.lang === 'en') props.lang = p.lang;
    if (p.fulfillment === 'pickup' || p.fulfillment === 'delivery') props.fulfillment = p.fulfillment;
    const path = String(body.path || '').replace(/\/order\/[A-Z0-9]+/i, '/order/:ref').replace(/[?#].*$/, '').slice(0, 80);
    await run('INSERT INTO analytics_events (name, path, props, day) VALUES (?,?,?,?)', body.name, path, JSON.stringify(props), new Date().toISOString().slice(0, 10));
    noContent();
  });

  app.get('/api/health', async (req, res) => res.json(200, { ok: true, env: config.appEnv }));
}
