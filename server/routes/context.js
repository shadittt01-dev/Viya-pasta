// Builds the per-request view context for customer pages.
import { config } from '../config.js';
import { t as translate } from '../i18n/strings.js';
import { getSetting, allSettings } from '../domain/settings.js';
import { defaultBranch, branchHours, branchClosures } from '../domain/catalog.js';
import { openStatus, zonedParts } from '../../shared/hours.js';
import { activeTheme, categoryBackgroundPresets } from '../domain/theme.js';
import { all, one, parseJson } from '../db/db.js';
import { formatPhoneLocal } from '../domain/phone.js';
import { sessionFromToken } from '../domain/auth.js';

export const LANGS = ['ar', 'en'];

/** Live campaigns of the given kinds (one query), filtered to this branch. */
export async function liveCampaigns(kinds, branchId, nowMs = Date.now()) {
  const now = new Date(nowMs).toISOString();
  const rows = await all(`SELECT c.*, k.code AS coupon_code, k.terms_en, k.terms_ar FROM campaigns c LEFT JOIN coupons k ON k.id = c.coupon_id
    WHERE c.kind IN (${kinds.map(() => '?').join(',')}) AND c.status = 'published' AND (c.starts_at IS NULL OR c.starts_at <= ?) AND (c.ends_at IS NULL OR c.ends_at > ?)
    ORDER BY c.priority DESC, c.id DESC`, ...kinds, now, now);
  return rows.filter((c) => { const b = parseJson(c.branch_ids, null); return !b || b.includes(branchId); });
}

export async function activeCampaigns(kind, branchId, nowMs = Date.now()) {
  return liveCampaigns([kind], branchId, nowMs);
}

export async function adminFromRequest(req) {
  if (!req.cookies.hb_admin) return null;
  if (!('_admin' in req)) req._admin = await sessionFromToken(req.cookies.hb_admin);
  return req._admin;
}

export async function buildContext(req, res, lang) {
  const nowMs = Date.now();
  const branch = await defaultBranch();
  const [settings, hours, closures, campaigns, contentRows, admin, categoryPresets] = await Promise.all([
    allSettings(), branchHours(branch.id), branchClosures(branch.id),
    liveCampaigns(['offer', 'announcement', 'hero'], branch.id, nowMs),
    all('SELECT key, value_en, value_ar FROM content_blocks'),
    req.query.preview === '1' ? adminFromRequest(req) : null,
    categoryBackgroundPresets(),
  ]);
  const { business, fulfillment, seo, loader, whatsapp } = settings;
  const status = openStatus(hours, closures, nowMs, branch.timezone);
  const preview = req.query.preview === '1' && Boolean(admin);
  const theme = activeTheme({ preview, settings, categoryPresets });
  const contentByKey = new Map(contentRows.map((r) => [r.key, r]));
  const path = req.path.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';
  const u = (p) => `/${lang}${p === '/' ? '' : p}${preview ? `${p.includes('?') ? '&' : '?'}preview=1` : ''}`;
  const other = lang === 'ar' ? 'en' : 'ar';
  const offers = campaigns.filter((c) => c.kind === 'offer');
  const ctx = {
    lang, dir: lang === 'ar' ? 'rtl' : 'ltr', nonce: res.locals.nonce, path, preview, nowMs,
    t: (k, v) => translate(lang, k, v), u, switchUrl: `/${other}${path === '/' ? '' : path}${preview ? '?preview=1' : ''}`,
    business, branch, hours, closures, status, theme, whatsapp,
    seo: { title: lang === 'ar' ? seo.title_ar : seo.title_en, desc: lang === 'ar' ? seo.desc_ar : seo.desc_en },
    loader, analyticsEnabled: settings.analytics.enabled,
    pickupOnly: fulfillment.pickup.enabled && !fulfillment.delivery.enabled,
    phoneLocal: formatPhoneLocal(branch.phone),
    todayWeekday: zonedParts(new Date(nowMs), branch.timezone).weekday,
    announcement: campaigns.find((c) => c.kind === 'announcement') || null,
    heroCampaign: campaigns.find((c) => c.kind === 'hero') || null,
    hasOffers: offers.length > 0,
    offers,
    content: (key) => { const r = contentByKey.get(key); return r ? (lang === 'ar' ? r.value_ar : r.value_en) : ''; },
  };
  ctx.jsonLd = restaurantJsonLd(ctx);
  ctx.menuJsonLd = (catalog) => menuJsonLd(ctx, catalog);
  ctx.itemJsonLd = (item) => itemJsonLd(ctx, item);
  return ctx;
}

function restaurantJsonLd(ctx) {
  const { business, branch, lang, hours } = ctx;
  const allConfirmed = hours.length && hours.every((h) => h.confirmed);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: lang === 'ar' ? business.name_ar : business.name_en,
    alternateName: lang === 'ar' ? business.name_en : business.name_ar,
    url: `${config.publicUrl}/${lang}`,
    servesCuisine: 'Burgers',
    telephone: branch.phone,
    hasMenu: `${config.publicUrl}/${lang}/menu`,
    acceptsReservations: false,
    address: { '@type': 'PostalAddress', addressLocality: lang === 'ar' ? 'ينبع' : 'Yanbu', addressCountry: 'SA' },
    geo: { '@type': 'GeoCoordinates', latitude: branch.lat, longitude: branch.lng },
    sameAs: (business.socials || []).map((s) => s.url),
    ...(allConfirmed ? { openingHoursSpecification: hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: dayNames[h.weekday], opens: h.opens_local, closes: h.closes_local })) } : {}),
  };
}

function menuJsonLd(ctx, catalog) {
  const ar = ctx.lang === 'ar';
  return {
    '@context': 'https://schema.org', '@type': 'Menu', name: ar ? 'منيو ڤيا باستا' : 'Via Pasta menu', inLanguage: ar ? 'ar' : 'en',
    hasMenuSection: catalog.categories.map((c) => ({
      '@type': 'MenuSection', name: ar ? c.name_ar : c.name_en,
      hasMenuItem: c.items.map((i) => ({
        '@type': 'MenuItem', name: ar ? i.name_ar : i.name_en, description: (ar ? i.desc_ar : i.desc_en) || undefined,
        offers: { '@type': 'Offer', price: (i.price_minor / 100).toFixed(2), priceCurrency: ctx.business.currency },
        ...(i.kcal ? { nutrition: { '@type': 'NutritionInformation', calories: `${i.kcal} calories` } } : {}),
      })),
    })),
  };
}

function itemJsonLd(ctx, i) {
  const ar = ctx.lang === 'ar';
  return {
    '@context': 'https://schema.org', '@type': 'MenuItem', name: ar ? i.name_ar : i.name_en, description: (ar ? i.desc_ar : i.desc_en) || undefined,
    offers: { '@type': 'Offer', price: (i.price_minor / 100).toFixed(2), priceCurrency: ctx.business.currency, availability: i.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    ...(i.kcal ? { nutrition: { '@type': 'NutritionInformation', calories: `${i.kcal} calories` } } : {}),
  };
}

export async function pickLang(req) {
  if (LANGS.includes(req.cookies.hb_lang)) return req.cookies.hb_lang;
  const al = String(req.headers['accept-language'] || '').toLowerCase();
  if (/^en\b/.test(al) && !al.includes('ar')) return 'en';
  return (await getSetting('business')).default_lang || 'ar';
}

export function anyBranch() { return one('SELECT 1 FROM branches LIMIT 1'); }
