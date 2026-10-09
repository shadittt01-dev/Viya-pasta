// Customer-facing pages, SEO files, icons and QR downloads.
import { buildContext, pickLang, LANGS, adminFromRequest } from './context.js';
import * as pages from '../views/pages.js';
import { loadCatalog, getItemBySlug } from '../domain/catalog.js';
import { getSetting, allSettings } from '../domain/settings.js';
import { orderSlots } from '../../shared/hours.js';
import { allowedPaymentMethods } from '../domain/orders.js';
import { activeThemeAsync } from '../domain/theme.js';
import { config } from '../config.js';
import { iconSvg } from '../views/brand.js';
import { sendCompressed } from '../http/static.js';
import { one, all } from '../db/db.js';
import { qrSvg, qrPng, qrPrintPage } from '../qr/render.js';
import { reconcileOrder } from '../payments/index.js';
import { getOrderByRef } from '../domain/orders.js';

function sendPage(req, res, htmlString, status = 200) {
  sendCompressed(req, res, status, htmlString, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
}

function langRoute(app, path, render) {
  app.get(`/:lang${path}`, async (req, res) => {
    const { lang } = req.params;
    if (!LANGS.includes(lang)) return notFound(req, res);
    res.cookie('hb_lang', lang, { maxAge: 365 * 86400, httpOnly: false });
    const ctx = await buildContext(req, res, lang);
    return render(req, res, ctx);
  });
}

export async function notFound(req, res) {
  const lang = /^\/en(\/|$)/.test(req.path) ? 'en' : 'ar';
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/api/')) return res.json(404, { error: 'NOT_FOUND' });
  const ctx = await buildContext(req, res, lang);
  sendPage(req, res, pages.errorPage(ctx, 404), 404);
}

export async function serverErrorPage(req, res) {
  try {
    const lang = /^\/en(\/|$)/.test(req.path) ? 'en' : 'ar';
    const ctx = await buildContext(req, res, lang);
    sendPage(req, res, pages.errorPage(ctx, 500), 500);
  } catch {
    res.html(500, '<!doctype html><title>Error</title><p>Something went wrong. Please try again.</p>');
  }
}

export async function checkoutData(ctx) {
  const { ordering, fulfillment, payments, tax } = await allSettings();
  const types = ['pickup', 'delivery'].filter((f) => fulfillment[f].enabled);
  const slotsFor = (f) => orderSlots(ctx.hours, ctx.closures, Date.now(), ctx.branch.timezone, {
    prepMinutes: fulfillment[f].prep_minutes, slotMinutes: ordering.slot_minutes, daysAhead: ordering.scheduling ? ordering.days_ahead : 0,
    cutoffMinutes: ordering.cutoff_minutes, asap: ordering.asap,
  });
  return {
    fulfillment: types,
    slots: Object.fromEntries(types.map((f) => { const s = slotsFor(f); return [f, { asap: s.asapAvailable, asapMinutes: fulfillment[f].prep_minutes, slots: s.slots, opensAt: s.status.opensAt }]; })),
    payments: Object.fromEntries(await Promise.all(types.map(async (f) => [f, await allowedPaymentMethods(f, payments)]))),
    paymentDetails: { pickup: payments.pay_at_pickup, delivery: payments.pay_on_delivery, online: { label_en: payments.online.methods_label_en, label_ar: payments.online.methods_label_ar } },
    tax: { mode: tax.mode, rateBp: tax.rate_bp },
    couponsActive: Boolean(await one("SELECT 1 FROM coupons WHERE active = 1 AND (ends_at IS NULL OR ends_at > ?) LIMIT 1", new Date().toISOString())),
    orderingEnabled: ordering.enabled,
    branch: { lat: ctx.branch.lat, lng: ctx.branch.lng },
  };
}

export function registerSite(app) {
  app.get('/', async (req, res) => res.redirect(`/${await pickLang(req)}`, 302));

  // Payment return: verify with the provider server-side, then show status.
  app.get('/pay/return', async (req, res) => {
    const order = await getOrderByRef(req.query.order);
    if (!order) return res.redirect('/', 302);
    if (order.payment_method === 'online') await reconcileOrder(order);
    return res.redirect(`/${order.lang}/order/${order.ref}`, 302);
  });

  app.get('/theme.css', async (req, res) => {
    const preview = req.query.preview === '1';
    const theme = await activeThemeAsync({ preview: preview && Boolean(await adminFromRequest(req)) });
    const versioned = req.query.v === theme.hash;
    sendCompressed(req, res, 200, theme.css, { 'content-type': 'text/css; charset=utf-8', 'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'no-cache' });
  });

  // Owner-uploaded images (stored in the database; names are random and never reused).
  app.get('/uploads/:name', async (req, res) => {
    if (!/^[a-f0-9]{24}\.(jpg|png|webp|avif)$/.test(req.params.name)) return notFound(req, res);
    const row = await one('SELECT a.mime, b.data FROM asset_blobs b JOIN assets a ON a.path = b.path WHERE b.path = ?', req.params.name);
    if (!row) return notFound(req, res);
    const data = Buffer.from(row.data);
    res.writeHead(200, { 'content-type': row.mime, 'content-length': data.length, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });

  app.get('/robots.txt', async (req, res) => {
    const body = config.allowIndexing
      ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /ar/checkout\nDisallow: /en/checkout\nDisallow: /ar/order/\nDisallow: /en/order/\nSitemap: ${config.publicUrl}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n';
    res.text(200, body, { 'cache-control': 'public, max-age=3600' });
  });

  app.get('/sitemap.xml', async (req, res) => {
    const paths = ['', '/menu', '/visit', '/about', '/help', '/privacy', '/terms'];
    for (const i of await all('SELECT slug FROM items WHERE active = 1')) paths.push(`/menu/${i.slug}`);
    const urls = paths.map((p) => `<url><loc>${config.publicUrl}/ar${p}</loc><xhtml:link rel="alternate" hreflang="ar" href="${config.publicUrl}/ar${p}"/><xhtml:link rel="alternate" hreflang="en" href="${config.publicUrl}/en${p}"/></url>`
      + `<url><loc>${config.publicUrl}/en${p}</loc><xhtml:link rel="alternate" hreflang="ar" href="${config.publicUrl}/ar${p}"/><xhtml:link rel="alternate" hreflang="en" href="${config.publicUrl}/en${p}"/></url>`).join('');
    sendCompressed(req, res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`, { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' });
  });

  app.get('/manifest.webmanifest', async (req, res) => {
    const b = await getSetting('business');
    res.writeHead(200, { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=86400' });
    res.end(JSON.stringify({
      name: b.name_en, short_name: 'Via Pasta', lang: 'ar', dir: 'rtl', start_url: '/ar/menu', display: 'standalone', background_color: '#2A1B15', theme_color: '#2A1B15',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' }],
    }));
  });
  app.get('/icon.svg', async (req, res) => { res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=604800' }); res.end(iconSvg()); });
  app.get('/icon-180.png', async (req, res) => res.redirect('/assets/img/icon-180.png', 301));
  app.get('/og.png', async (req, res) => res.redirect('/assets/img/og.png', 301));
  app.get('/favicon.ico', async (req, res) => res.redirect('/icon.svg', 301));

  // QR codes for the canonical menu URL (labelled preview until the real domain is live).
  app.get('/qr/:file', async (req, res) => {
    const m = /^menu-(ar|en)\.(svg|png)$/.exec(req.params.file);
    if (!m) return notFound(req, res);
    const url = `${config.publicUrl}/${m[1]}/menu`;
    if (m[2] === 'svg') { res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'no-cache', 'content-disposition': `inline; filename="viapasta-menu-${m[1]}.svg"` }); return res.end(qrSvg(url)); }
    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-cache', 'content-disposition': `inline; filename="viapasta-menu-${m[1]}.png"` });
    return res.end(qrPng(url, { scale: 16 }));
  });
  app.get('/qr/print/:lang', async (req, res) => {
    const lang = req.params.lang === 'en' ? 'en' : 'ar';
    const b = await getSetting('business');
    res.html(200, qrPrintPage({ url: `${config.publicUrl}/${lang}/menu`, lang, name: lang === 'ar' ? b.name_ar : b.name_en, preview: !config.allowIndexing, nonce: res.locals.nonce }));
  });

  // Language-prefixed pages last, so fixed paths above win.
  langRoute(app, '', async (req, res, ctx) => sendPage(req, res, pages.homePage(ctx, await loadCatalog(ctx.branch.id, { preview: ctx.preview, tz: ctx.branch.timezone }))));
  langRoute(app, '/menu', async (req, res, ctx) => sendPage(req, res, pages.menuPage(ctx, await loadCatalog(ctx.branch.id, { preview: ctx.preview, tz: ctx.branch.timezone }))));
  langRoute(app, '/menu/:slug', async (req, res, ctx) => {
    const catalog = await loadCatalog(ctx.branch.id, { preview: ctx.preview, tz: ctx.branch.timezone });
    const item = await getItemBySlug(ctx.branch.id, req.params.slug, { preview: ctx.preview, tz: ctx.branch.timezone });
    if (!item) return notFound(req, res);
    return sendPage(req, res, pages.itemPage(ctx, catalog, item));
  });
  langRoute(app, '/checkout', async (req, res, ctx) => sendPage(req, res, pages.checkoutPage(ctx, await checkoutData(ctx))));
  langRoute(app, '/order/:ref', async (req, res, ctx) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    sendPage(req, res, pages.orderPage(ctx, String(req.params.ref).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)));
  });
  langRoute(app, '/offers', async (req, res, ctx) => sendPage(req, res, pages.offersPage(ctx, ctx.offers.map((o) => ({ ...o, terms: ctx.lang === 'ar' ? o.terms_ar : o.terms_en })))));
  langRoute(app, '/visit', async (req, res, ctx) => sendPage(req, res, pages.visitPage(ctx)));
  langRoute(app, '/about', async (req, res, ctx) => sendPage(req, res, pages.aboutPage(ctx)));
  langRoute(app, '/help', async (req, res, ctx) => sendPage(req, res, pages.helpPage(ctx)));
  langRoute(app, '/privacy', async (req, res, ctx) => sendPage(req, res, pages.policyPage(ctx, 'policy.privacy', ctx.t('footer.privacy'))));
  langRoute(app, '/terms', async (req, res, ctx) => sendPage(req, res, pages.policyPage(ctx, 'policy.terms', ctx.t('footer.terms'))));
  langRoute(app, '/qr', async (req, res, ctx) => sendPage(req, res, pages.qrPage(ctx)));

}
