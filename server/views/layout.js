// Page shell: head metadata, header, footer, cart drawer, item sheet, toasts, loader.
import { html, raw, jsonScript } from './html.js';
import { brandLockup } from './brand.js';
import { asset } from '../http/static.js';
import { config } from '../config.js';
import { clientStrings } from '../i18n/strings.js';
import { formatLocalTime, formatLocalDay } from '../../shared/hours.js';

export function statusChip(ctx) {
  const { status, branch, t, lang } = ctx;
  if (!status) return '';
  if (status.open) return html`<span class="chip chip--open"><span class="dot" aria-hidden="true"></span>${t('status.openUntil', { time: formatLocalTime(status.closesAt, branch.timezone, lang) })}</span>`;
  if (status.opensAt) return html`<span class="chip chip--closed"><span class="dot" aria-hidden="true"></span>${t('status.closedOpens', { day: formatLocalDay(status.opensAt, branch.timezone, lang), time: formatLocalTime(status.opensAt, branch.timezone, lang) })}</span>`;
  return html`<span class="chip chip--closed">${t('status.closed')}</span>`;
}

function nav(ctx) {
  const items = [['/menu', 'nav.menu'], ['/offers', 'nav.offers'], ['/visit', 'nav.visit'], ['/about', 'nav.about'], ['/help', 'nav.contact']];
  if (!ctx.hasOffers) items.splice(1, 1);
  return html`<nav class="nav" aria-label="${ctx.t('nav.primary')}"><ul>${items.map(([p, k]) => html`<li><a href="${ctx.u(p)}"${ctx.path === p ? raw(' aria-current="page"') : ''}>${ctx.t(k)}</a></li>`)}</ul></nav>`;
}

function announcement(ctx) {
  const a = ctx.announcement;
  if (!a) return '';
  const ar = ctx.lang === 'ar';
  const title = ar ? a.title_ar : a.title_en;
  const cta = ar ? a.cta_ar : a.cta_en;
  return html`<div class="announce" role="region" aria-label="${ar ? 'إعلان' : 'Announcement'}"><p>${title}${a.cta_href && cta ? html` <a href="${a.cta_href.startsWith('/') ? ctx.u(a.cta_href) : a.cta_href}">${cta}</a>` : ''}</p></div>`;
}

function footer(ctx) {
  const { t, business, branch, lang } = ctx;
  const ig = (business.socials || []).find((s) => s.network === 'instagram');
  return html`<footer class="site-footer">
  <div class="wrap site-footer__grid">
    <div class="site-footer__brand">${brandLockup({ size: 'sm', lang, label: lang === 'ar' ? business.name_ar : business.name_en })}
      <p class="tagline">${lang === 'ar' ? business.tagline_ar : business.tagline_en}</p></div>
    <div><h2 class="h-foot">${t('nav.visit')}</h2>
      <p>${lang === 'ar' ? branch.address_ar : branch.address_en}</p>
      <p><a href="tel:${branch.phone}" dir="ltr">${ctx.phoneLocal}</a></p>
      ${ig ? html`<p><a href="${ig.url}" rel="noopener" target="_blank">${t('contact.instagram')} <span dir="ltr">${ig.handle}</span></a></p>` : ''}</div>
    <div><h2 class="h-foot">${t('footer.policies')}</h2>
      <ul class="plain"><li><a href="${ctx.u('/privacy')}">${t('footer.privacy')}</a></li><li><a href="${ctx.u('/terms')}">${t('footer.terms')}</a></li><li><a href="${ctx.u('/qr')}">${t('footer.qr')}</a></li></ul></div>
  </div>
  <div class="wrap site-footer__base"><p>${t('footer.rights', { year: new Date().getFullYear(), name: lang === 'ar' ? business.name_ar : business.name_en })}</p></div>
</footer>`;
}

function dialogs(ctx) {
  const { t } = ctx;
  return html`
<dialog class="drawer" id="cart" aria-labelledby="cart-title">
  <div class="drawer__inner">
    <header class="drawer__head"><h2 id="cart-title" tabindex="-1">${t('cart.title')}</h2>
      <button class="icon-btn" type="button" data-close aria-label="${t('cart.close')}">${raw(ICON.close)}</button></header>
    <div class="drawer__body" id="cart-body" aria-live="polite"></div>
    <footer class="drawer__foot" id="cart-foot"></footer>
  </div>
</dialog>
<dialog class="sheet" id="item-sheet" aria-labelledby="sheet-title">
  <form method="dialog" class="sheet__inner" id="sheet-form" novalidate></form>
</dialog>
<div class="toasts" id="toasts" role="status" aria-live="polite" aria-atomic="false"></div>`;
}

export const ICON = {
  bag: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  minus: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.5" fill="currentColor"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6.6 3.5 9.4 4l1.2 4-2 1.4a12 12 0 0 0 6 6l1.4-2 4 1.2.5 2.8c.1.8-.5 1.6-1.3 1.6A17 17 0 0 1 3.4 5c0-.8.7-1.5 1.5-1.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20l1.2-3.6A8.5 8.5 0 1 1 8 19.1L4 20Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5c.3 2.6 2.5 4.8 5.1 5.4l1.1-1.3-1.6-.9-.8.7a4 4 0 0 1-2.2-2.2l.7-.8-.9-1.6L9 8.5Z" fill="currentColor"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16.8" cy="7.2" r="1.1" fill="currentColor"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/**
 * page: { title, description, body, pageClass, jsonLd, scripts:[module paths], data:{}, noindex, catalog }
 */
export function layout(ctx, page) {
  const { lang, dir, t, business, theme } = ctx;
  const name = lang === 'ar' ? business.name_ar : business.name_en;
  const fullTitle = page.title ? `${page.title} — ${name}` : ctx.seo.title;
  const desc = page.description || ctx.seo.desc;
  const canonical = `${config.publicUrl}/${lang}${ctx.path === '/' ? '' : ctx.path}`;
  const alt = (l) => `${config.publicUrl}/${l}${ctx.path === '/' ? '' : ctx.path}`;
  const noindex = page.noindex || !config.allowIndexing || ctx.preview;
  const boot = {
    lang, dir, currency: business.currency, branchId: ctx.branch.id, tz: ctx.branch.timezone,
    strings: clientStrings(lang), urls: { menu: ctx.u('/menu'), checkout: ctx.u('/checkout'), order: ctx.u('/order/') },
    theme: theme.client, loader: ctx.loader, preview: ctx.preview, analytics: ctx.analyticsEnabled, page: page.pageClass || '',
    ...(page.data || {}),
  };
  return '<!doctype html>' + html`
<html lang="${lang === 'ar' ? 'ar-SA' : 'en'}" dir="${dir}" ${raw(theme.attrs)}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
${noindex ? raw('<meta name="robots" content="noindex, nofollow">') : ''}
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="ar" href="${alt('ar')}">
<link rel="alternate" hreflang="en" href="${alt('en')}">
<link rel="alternate" hreflang="x-default" href="${alt('ar')}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${name}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${config.publicUrl}/og.png">
<meta property="og:locale" content="${lang === 'ar' ? 'ar_SA' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2A1B15">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon-180.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="${asset('fonts/fonts.css')}">
<link rel="stylesheet" href="${asset('css/site.css')}">
<link rel="stylesheet" href="/theme.css?v=${theme.hash}">
${page.jsonLd ? html`<script type="application/ld+json" nonce="${ctx.nonce}">${jsonScript(page.jsonLd)}</script>` : ''}
<script nonce="${ctx.nonce}">${raw(loaderInline(ctx.loader.max_ms))}</script>
</head>
<body class="page-${page.pageClass || 'default'}">
${ctx.loader.enabled ? html`<div class="loader" id="loader" aria-hidden="true"><div class="loader__mark">${brandLockup({ size: 'lg', lang, label: name })}</div><div class="loader__bar"><span></span></div></div>` : ''}
<a class="skip" href="#main">${t('nav.skip')}</a>
${ctx.preview ? html`<div class="preview-bar" role="status">${lang === 'ar' ? 'معاينة المسودة — لا يراها العملاء' : 'Draft preview — customers do not see this'} <a href="/admin">${lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</a></div>` : ''}
${announcement(ctx)}
<header class="site-header">
  <div class="wrap site-header__bar">
    ${brandLockup({ size: 'sm', href: ctx.u('/'), lang, label: name })}
    ${nav(ctx)}
    <div class="site-header__tools">
      <details class="mnav"><summary aria-label="${ctx.lang === 'ar' ? 'القائمة' : 'Menu'}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></summary>${nav(ctx)}</details>
      <a class="lang" href="${ctx.switchUrl}" hreflang="${lang === 'ar' ? 'en' : 'ar'}" lang="${lang === 'ar' ? 'en' : 'ar'}" aria-label="${t('lang.switchLabel')}">${t('lang.switch')}</a>
      <button class="cart-btn" type="button" id="cart-open" aria-haspopup="dialog" aria-controls="cart">
        ${raw(ICON.bag)}<span class="cart-btn__label">${t('nav.cart')}</span><span class="cart-btn__count" id="cart-count" aria-live="polite">0</span>
      </button>
    </div>
  </div>
</header>
<main id="main" tabindex="-1">${page.body}</main>
${footer(ctx)}
${dialogs(ctx)}
<script type="application/json" id="boot">${jsonScript(boot)}</script>
${page.catalog ? html`<script type="application/json" id="catalog">${jsonScript(page.catalog)}</script>` : ''}
<script type="module" src="${asset('js/app.js')}"></script>
${(page.scripts || []).map((s) => html`<script type="module" src="${asset(s)}"></script>`)}
</body>
</html>`;
}

// Fail-safe loader: shown only on the first page view of a session, removed as
// soon as the page is interactive, and force-removed after max_ms no matter
// what (CSS also hides it on its own, so a JS failure cannot trap the page).
const loaderInline = (maxMs) => LOADER_INLINE.replace('1400', String(Math.max(300, Math.min(2500, Number(maxMs) || 1400))));
const LOADER_INLINE = `(function(){try{var d=document.documentElement;var seen=sessionStorage.getItem('hb-seen');if(seen){d.classList.add('no-loader');}else{sessionStorage.setItem('hb-seen','1');d.classList.add('first-visit');}}catch(e){document.documentElement.classList.add('no-loader');}
function done(){var l=document.getElementById('loader');if(l){l.classList.add('loader--done');setTimeout(function(){l.remove();},400);}}
document.addEventListener('DOMContentLoaded',function(){setTimeout(done,document.documentElement.classList.contains('first-visit')?350:0);});
setTimeout(done,1400);})();`;
