// Customer pages. Every page renders complete HTML on the server; JavaScript
// enhances ordering (sheet, cart drawer, live totals) but content never depends on it.
import { html, raw, paragraphs } from './html.js';
import { layout, statusChip, ICON } from './layout.js';
import { brandLockup } from './brand.js';
import { formatMoney } from '../../shared/money.js';
import { illustration } from '../../shared/illustrations.js';
import { formatLocalTime } from '../../shared/hours.js';
import { publicCatalog } from '../domain/catalog.js';
import { waLink } from '../../shared/whatsapp.js';
import { config } from '../config.js';

const money = (ctx, v) => formatMoney(v, ctx.business.currency, ctx.lang);
const L = (ctx, row, f) => (ctx.lang === 'ar' ? row[`${f}_ar`] : row[`${f}_en`]);

/** "from SAR 21" when a required choice can raise the price (e.g. chicken or shrimp). */
function priceLabel(ctx, item) {
  const varies = (item.groups || []).some((g) => g.min_select > 0 && g.options.some((o) => o.price_minor > 0));
  return varies ? `${ctx.t('menu.from')} ${money(ctx, item.price_minor)}` : money(ctx, item.price_minor);
}

function itemArt(ctx, item, cls = 'art') {
  const name = L(ctx, item, 'name');
  if (item.image_path) {
    return html`<span class="${cls} ${cls}--photo"><img src="/uploads/${item.image_path}" alt="${L(ctx, item, 'image_alt') || name}" loading="lazy" decoding="async" width="400" height="320" data-fallback="art"></span>`;
  }
  return html`<span class="${cls}" data-art="${item.illustration}">${raw(illustration(item.illustration, `${ctx.t('menu.illustration')}: ${name}`))}</span>`;
}

function needsSheet(item) {
  return item.groups.some((g) => g.min_select > 0 || g.options.length > 0);
}

function addButton(ctx, item, variant = 'round') {
  const name = L(ctx, item, 'name');
  if (!item.available) return html`<span class="tag tag--muted">${item.sold_out ? ctx.t('menu.soldOut') : ctx.t('menu.unavailable')}</span>`;
  const sheet = needsSheet(item);
  return html`<button type="button" class="add-btn add-btn--${variant}" data-add="${item.id}" data-sheet="${sheet ? 1 : 0}" aria-label="${sheet ? `${ctx.t('menu.choose')} ${name}` : `${ctx.t('menu.add')} ${name}`}">${raw(ICON.plus)}<span>${sheet ? ctx.t('menu.choose') : ctx.t('menu.add')}</span></button>`;
}

function kcal(ctx, item) {
  return item.kcal !== null && item.kcal !== undefined ? html`<span class="kcal">${ctx.t('menu.kcal', { n: item.kcal })}</span>` : '';
}

export function itemRow(ctx, item) {
  const name = L(ctx, item, 'name');
  const desc = L(ctx, item, 'desc');
  const portion = L(ctx, item, 'portion');
  return html`<li class="mi${item.available ? '' : ' mi--off'}" id="item-${item.slug}" data-item="${item.id}" data-search="${`${item.name_en} ${item.name_ar} ${item.desc_en} ${item.desc_ar}`.toLowerCase()}">
  <a class="mi__art" href="${ctx.u(`/menu/${item.slug}`)}" tabindex="-1" aria-hidden="true">${itemArt(ctx, item)}</a>
  <div class="mi__main">
    <h3 class="mi__name"><a href="${ctx.u(`/menu/${item.slug}`)}" data-open="${item.id}">${name}</a></h3>
    ${desc ? html`<p class="mi__desc">${desc}</p>` : ''}
    <p class="mi__meta">${portion ? html`<span>${portion}</span>` : ''}${kcal(ctx, item)}${item.badges.map((b) => html`<span class="tag">${b}</span>`)}</p>
  </div>
  <div class="mi__buy"><span class="price">${priceLabel(ctx, item)}</span>${addButton(ctx, item)}</div>
</li>`;
}

function burgerCard(ctx, item) {
  const name = L(ctx, item, 'name');
  return html`<li class="bcard" data-item="${item.id}">
  <a class="bcard__art" href="${ctx.u(`/menu/${item.slug}`)}" tabindex="-1" aria-hidden="true">${itemArt(ctx, item)}</a>
  <h3 class="bcard__name"><a href="${ctx.u(`/menu/${item.slug}`)}" data-open="${item.id}">${name}</a></h3>
  <p class="bcard__desc">${L(ctx, item, 'desc')}</p>
  <div class="bcard__foot"><span class="price">${priceLabel(ctx, item)}</span>${kcal(ctx, item)}${addButton(ctx, item, 'pill')}</div>
</li>`;
}

function hoursTable(ctx) {
  const { t, hours, branch, lang } = ctx;
  const order = [6, 0, 1, 2, 3, 4, 5]; // Saturday-first week, as used in Saudi Arabia
  const anyUnconfirmed = hours.some((h) => !h.confirmed);
  const fmt = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return formatLocalTime(Date.UTC(2026, 0, 1, h, m), 'UTC', lang); // wall-clock time, no zone shift
  };
  return html`<table class="hours">
  <caption class="sr-only">${t('visit.hours')}</caption>
  <tbody>${order.map((wd) => {
    const rows = hours.filter((h) => h.weekday === wd);
    const today = ctx.todayWeekday === wd;
    return html`<tr${today ? raw(' class="is-today" aria-current="date"') : ''}><th scope="row">${t(`weekday.${wd}`)}</th><td>${rows.length ? rows.map((r) => {
      const overnight = r.closes_local <= r.opens_local;
      return html`<span class="hours__span">${fmt(r.opens_local)} – ${fmt(r.closes_local)}${overnight ? html` <span class="hours__note">${lang === 'ar' ? '(فجرًا)' : '(next day)'}</span>` : ''}</span>`;
    }) : t('visit.closedDay')}</td></tr>`;
  })}</tbody></table>
  ${anyUnconfirmed ? html`<p class="note">${t('visit.unconfirmed')}</p>` : ''}`;
  void branch;
}

function contactButtons(ctx, { compact = false } = {}) {
  const { t, branch } = ctx;
  const wa = ctx.whatsapp.mode !== 'off' && ctx.whatsapp.verified ? waLink(ctx.whatsapp.number, '') : null;
  return html`<div class="btn-row${compact ? ' btn-row--compact' : ''}">
    <a class="btn btn--line" href="https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}" target="_blank" rel="noopener">${raw(ICON.pin)}${t('home.directions')}</a>
    <a class="btn btn--line" href="tel:${branch.phone}">${raw(ICON.phone)}<span>${t('home.call')}</span> <span dir="ltr" class="num">${ctx.phoneLocal}</span></a>
    ${wa ? html`<a class="btn btn--line" href="${wa}" target="_blank" rel="noopener">${raw(ICON.whatsapp)}${t('home.whatsapp')}</a>` : ''}
  </div>`;
}

// ---------------------------------------------------------------- home
export function homePage(ctx, catalog) {
  const { t } = ctx;
  const burgers = catalog.categories[0]; // featured section: the first menu section
  const hero = ctx.heroCampaign;
  const title = hero ? L(ctx, hero, 'title') : ctx.content('home.hero.title');
  const sub = hero ? L(ctx, hero, 'body') : ctx.content('home.hero.sub');
  const body = html`
<section class="hero" aria-labelledby="hero-title">
  <div class="hero__stage" id="hero-stage" data-fx="${ctx.theme.hero3d ? ctx.theme.hero3d.id : ''}">
    <div class="hero__fallback" aria-hidden="true"><div class="hero__sign">${brandLockup({ size: 'xl', lang: ctx.lang })}</div></div>
  </div>
  <div class="wrap hero__copy">
    <div class="hero__chips">${statusChip(ctx)}${ctx.pickupOnly ? html`<span class="chip">${t('status.pickupOnly')}</span>` : ''}</div>
    <h1 id="hero-title" class="display">${title}</h1>
    <p class="hero__sub">${sub}</p>
    <div class="hero__cta">
      <a class="btn btn--primary btn--lg" href="${ctx.u('/menu')}">${t('home.order')}</a>
      ${hero && hero.cta_href ? html`<a class="btn btn--ghost" href="${hero.cta_href.startsWith('/') ? ctx.u(hero.cta_href) : hero.cta_href}">${L(ctx, hero, 'cta')}</a>` : ''}
    </div>
  </div>
</section>
${burgers ? html`<section class="band band--paper menu-bg" aria-labelledby="burgers-title" data-bg="menu">
  <div class="wrap">
    <div class="band__head"><h2 id="burgers-title" class="h2">${t('home.burgers')}</h2><p class="lead">${t('home.burgersLead')}</p></div>
    <ul class="bcards" role="list">${burgers.items.map((i) => burgerCard(ctx, i))}</ul>
    <p class="band__more"><a class="link-strong" href="${ctx.u('/menu')}">${t('home.viewMenu')}</a></p>
  </div>
</section>` : ''}
<section class="band band--tile" aria-labelledby="how-title">
  <div class="wrap how">
    <h2 id="how-title" class="h2">${t('home.howTitle')}</h2>
    <ol class="steps">
      <li><span class="steps__n" aria-hidden="true">1</span><p>${t('home.how1')}</p></li>
      <li><span class="steps__n" aria-hidden="true">2</span><p>${t('home.how2')}</p></li>
      <li><span class="steps__n" aria-hidden="true">3</span><p>${t('home.how3')}</p></li>
    </ol>
  </div>
</section>
<section class="band" aria-labelledby="find-title">
  <div class="wrap find">
    <div><h2 id="find-title" class="h2">${t('home.findTitle')}</h2>
      <p class="find__addr">${L(ctx, ctx.branch, 'address')} <span class="muted" dir="ltr">${ctx.branch.plus_code}</span></p>
      ${contactButtons(ctx)}</div>
    <div><h3 class="h3">${t('visit.hours')}</h3>${hoursTable(ctx)}</div>
  </div>
</section>`;
  return layout(ctx, {
    pageClass: 'home', body, jsonLd: ctx.jsonLd, catalog: publicCatalog(catalog, ctx.lang),
    scripts: ctx.theme.hero3d ? ['js/hero.js'] : [],
  });
}

// ---------------------------------------------------------------- menu
export function menuPage(ctx, catalog) {
  const { t } = ctx;
  const body = html`
<div class="menu-top">
  <div class="wrap">
    <div class="menu-top__row"><h1 class="h1">${t('menu.title')}</h1>${statusChip(ctx)}</div>
    <p class="lead">${t('menu.lead')}</p>
    <label class="search"><span class="sr-only">${t('menu.search')}</span>${raw(ICON.search)}<input type="search" id="menu-search" placeholder="${t('menu.search')}" autocomplete="off" enterkeyhint="search"></label>
  </div>
  <nav class="cat-tabs" aria-label="${t('menu.categories')}"><div class="wrap"><ul>${catalog.categories.map((c, i) => html`<li><a href="#${c.slug}"${i === 0 ? raw(' aria-current="true"') : ''}>${L(ctx, c, 'name')}</a></li>`)}</ul></div></nav>
</div>
<div class="menu-body menu-bg" data-bg="menu">
  <div class="wrap">
    ${catalog.categories.map((c) => html`<section class="cat" id="${c.slug}" aria-labelledby="h-${c.slug}" ${c.background_preset ? raw(`data-cat-bg="${c.background_preset}"`) : ''}>
      <h2 class="cat__title" id="h-${c.slug}">${L(ctx, c, 'name')}</h2>
      <ul class="menu-list" role="list">${c.items.map((i) => itemRow(ctx, i))}</ul>
    </section>`)}
    <p class="empty" id="menu-empty" hidden></p>
  </div>
</div>`;
  return layout(ctx, {
    pageClass: 'menu', title: t('menu.title'), body, jsonLd: ctx.menuJsonLd(catalog), catalog: publicCatalog(catalog, ctx.lang),
    description: ctx.lang === 'ar' ? 'منيو ڤيا باستا: ألفريدو، بيستو، صوص مكس، بولونيز، فوتشيني وباستا بول — الأسعار.' : 'Via Pasta menu: Alfredo, pesto, Mex sauce, Bolognese, fettuccine and pasta balls — prices.',
  });
}

// ---------------------------------------------------------------- item detail
export function itemPage(ctx, catalog, item) {
  const { t } = ctx;
  const name = L(ctx, item, 'name');
  const body = html`
<article class="wrap item-page" data-item="${item.id}">
  <nav class="crumbs" aria-label="${ctx.lang === 'ar' ? 'مسار التصفح' : 'Breadcrumb'}"><a href="${ctx.u('/menu')}">${t('menu.title')}</a> <span aria-hidden="true">/</span> <span aria-current="page">${name}</span></nav>
  <div class="item-page__grid">
    <div class="item-page__art menu-bg" data-bg="menu">${itemArt(ctx, item, 'art art--xl')}</div>
    <div class="item-page__info">
      <h1 class="display display--item">${name}</h1>
      <p class="item-page__price"><span class="price price--lg">${priceLabel(ctx, item)}</span>${kcal(ctx, item)}</p>
      ${L(ctx, item, 'desc') ? html`<p class="item-page__desc">${L(ctx, item, 'desc')}</p>` : ''}
      ${L(ctx, item, 'portion') ? html`<p class="muted">${L(ctx, item, 'portion')}</p>` : ''}
      <div class="item-page__buy">${item.available
        ? html`<button class="btn btn--primary btn--lg" type="button" data-add="${item.id}" data-sheet="${needsSheet(item) ? 1 : 0}">${needsSheet(item) ? `${t('menu.choose')} — ${name}` : t('item.addToOrder', { price: money(ctx, item.price_minor) })}</button>`
        : html`<p class="tag tag--muted">${item.sold_out ? t('menu.soldOut') : t('menu.unavailable')}</p>`}
        <a class="link-strong" href="${ctx.u('/menu')}">${t('checkout.back')}</a></div>
    </div>
  </div>
</article>`;
  const desc = `${name} — ${money(ctx, item.price_minor)}. ${L(ctx, item, 'desc') || ''}`.trim();
  return layout(ctx, { pageClass: 'item', title: name, description: desc, body, catalog: publicCatalog(catalog, ctx.lang), jsonLd: ctx.itemJsonLd(item) });
}

// ---------------------------------------------------------------- checkout
export function checkoutPage(ctx, data) {
  const { t } = ctx;
  const body = html`
<div class="wrap checkout" id="checkout" data-state="loading">
  <h1 class="h1">${t('checkout.title')}</h1>
  <noscript><p class="notice notice--warn">${ctx.lang === 'ar' ? 'يحتاج الطلب أونلاين إلى تفعيل JavaScript. يمكنك الاتصال بنا على' : 'Online ordering needs JavaScript. You can call us on'} <a href="tel:${ctx.branch.phone}" dir="ltr">${ctx.phoneLocal}</a>.</p></noscript>
  <div class="checkout__grid">
    <form class="checkout__form" id="checkout-form" novalidate>
      <div class="notice notice--error" id="checkout-error" role="alert" hidden></div>
      <fieldset class="block" id="fs-how" ${data.fulfillment.length < 2 ? raw('hidden') : ''}>
        <legend class="block__title">${t('checkout.how')}</legend>
        <div class="seg">${data.fulfillment.map((f, i) => html`<label class="seg__opt"><input type="radio" name="fulfillment" value="${f}" ${i === 0 ? raw('checked') : ''}><span>${t(`checkout.${f}`)}</span></label>`)}</div>
      </fieldset>
      <fieldset class="block" id="fs-address" hidden>
        <legend class="block__title">${t('checkout.address')}</legend>
        <div class="field-grid">
          <label class="field"><span>${t('checkout.district')}</span><input name="district" autocomplete="address-level3" maxlength="80"></label>
          <label class="field"><span>${t('checkout.street')}</span><input name="street" autocomplete="address-line1" maxlength="120"></label>
          <label class="field"><span>${t('checkout.building')}</span><input name="building" inputmode="numeric" maxlength="40"></label>
          <label class="field"><span>${t('checkout.unit')}</span><input name="unit" autocomplete="address-line2" maxlength="40"></label>
          <label class="field field--wide"><span>${t('checkout.instructions')}</span><input name="instructions" maxlength="200"></label>
        </div>
        <button type="button" class="btn btn--line" id="use-location">${raw(ICON.pin)}${t('checkout.useLocation')}</button>
        <p class="hint" id="location-status" aria-live="polite"></p>
      </fieldset>
      <fieldset class="block" id="fs-when">
        <legend class="block__title">${t('checkout.when')}</legend>
        <div id="when-options" class="when"></div>
      </fieldset>
      <fieldset class="block">
        <legend class="block__title">${t('checkout.details')}</legend>
        <div class="field-grid">
          <label class="field"><span>${t('checkout.name')}</span><input name="name" autocomplete="name" required minlength="2" maxlength="60" aria-describedby="err-name"><small class="field__err" id="err-name"></small></label>
          <label class="field"><span>${t('checkout.phone')}</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" required dir="ltr" aria-describedby="hint-phone err-phone"><small class="hint" id="hint-phone">${t('checkout.phoneHint')}</small><small class="field__err" id="err-phone"></small></label>
          <label class="field field--wide"><span>${t('checkout.note')}</span><input name="note" maxlength="280"></label>
        </div>
        <label class="opt"><input type="checkbox" id="remember"><span class="opt__name">${ctx.lang === 'ar' ? 'احفظ اسمي ورقمي على هذا الجهاز' : 'Remember my name and number on this device'}</span></label>
      </fieldset>
      <fieldset class="block" id="fs-pay">
        <legend class="block__title">${t('checkout.payment')}</legend>
        <div class="pay-opts" id="pay-options"></div>
      </fieldset>
      ${data.couponsActive ? html`<fieldset class="block">
        <legend class="block__title">${t('checkout.coupon')}</legend>
        <div class="coupon"><input name="coupon" id="coupon" autocomplete="off" autocapitalize="characters" maxlength="40" aria-label="${t('checkout.coupon')}" aria-describedby="coupon-msg"><button type="button" class="btn btn--line" id="coupon-apply">${t('checkout.applyCoupon')}</button></div>
        <p class="hint" id="coupon-msg" aria-live="polite"></p>
      </fieldset>` : ''}
    </form>
    <aside class="checkout__summary" aria-labelledby="sum-title">
      <div class="ticket">
        <h2 class="block__title" id="sum-title">${t('checkout.review')}</h2>
        <div id="summary-lines" aria-live="polite"><p class="muted">${t('cart.updating')}</p></div>
        <dl class="totals" id="summary-totals"></dl>
        <button class="btn btn--primary btn--lg btn--block" type="submit" form="checkout-form" id="place-order" disabled>${t('checkout.placing')}</button>
        <p class="hint">${t('checkout.privacy').replace(/\.?$/, '')} — <a href="${ctx.u('/privacy')}">${t('footer.privacy')}</a></p>
      </div>
    </aside>
  </div>
</div>`;
  return layout(ctx, { pageClass: 'checkout', title: t('checkout.title'), body, noindex: true, scripts: ['js/checkout.js'], data: { checkout: data } });
}

// ---------------------------------------------------------------- order status
export function orderPage(ctx, ref) {
  const { t } = ctx;
  const body = html`
<div class="wrap order" id="order" data-ref="${ref}" data-state="loading">
  <div class="order__loading" id="order-loading"><p>${t('cart.updating')}</p></div>
  <div class="order__missing" id="order-missing" hidden>
    <h1 class="h1">${t('order.notFound')}</h1><p>${t('order.notFoundHelp')}</p>
    <p class="order__ref-plain" dir="ltr">${ref}</p>
    ${contactButtons(ctx, { compact: true })}
  </div>
  <div id="order-view" hidden></div>
</div>`;
  return layout(ctx, { pageClass: 'order', title: t('order.title', { ref }), body, noindex: true, scripts: ['js/order.js'], data: { order: { ref, whatsapp: ctx.whatsapp.mode !== 'off' && ctx.whatsapp.verified ? ctx.whatsapp.number : null, whatsappMode: ctx.whatsapp.mode } } });
}

// ---------------------------------------------------------------- offers
export function offersPage(ctx, offers) {
  const { t } = ctx;
  const body = html`<div class="wrap page-pad">
  <h1 class="h1">${t('offers.title')}</h1>
  ${offers.length ? html`<ul class="offers" role="list">${offers.map((o) => html`<li class="offer">
    <h2 class="h3">${L(ctx, o, 'title')}</h2>${L(ctx, o, 'body') ? html`<p>${L(ctx, o, 'body')}</p>` : ''}
    ${o.coupon_code ? html`<p class="offer__code">${t('offers.code', { code: '' })}<code dir="ltr">${o.coupon_code}</code></p>` : ''}
    ${o.ends_at ? html`<p class="muted">${t('offers.ends', { when: new Intl.DateTimeFormat(ctx.lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: ctx.branch.timezone }).format(new Date(o.ends_at)) })}${o.show_countdown ? html` <span class="countdown" data-deadline="${o.ends_at}"></span>` : ''}</p>` : ''}
    ${o.terms ? html`<details><summary>${t('offers.terms')}</summary><p>${o.terms}</p></details>` : ''}
    ${o.cta_href ? html`<a class="btn btn--primary" href="${o.cta_href.startsWith('/') ? ctx.u(o.cta_href) : o.cta_href}">${L(ctx, o, 'cta') || t('nav.menu')}</a>` : ''}
  </li>`)}</ul>` : html`<p class="empty">${t('offers.none')}</p><p><a class="btn btn--primary" href="${ctx.u('/menu')}">${t('nav.menu')}</a></p>`}
</div>`;
  return layout(ctx, { pageClass: 'offers', title: t('offers.title'), body });
}

// ---------------------------------------------------------------- visit / location
export function visitPage(ctx) {
  const { t, branch } = ctx;
  const embed = `https://www.google.com/maps?q=${branch.lat},${branch.lng}&z=17&output=embed`;
  const body = html`<div class="wrap page-pad visit">
  <h1 class="h1">${t('visit.title')}</h1>
  <div class="visit__grid">
    <div>
      <h2 class="h3">${t('visit.address')}</h2>
      <p>${L(ctx, branch, 'address')}</p>
      <p class="muted">${t('visit.plusCode')}: <span dir="ltr">${branch.plus_code}</span></p>
      ${contactButtons(ctx)}
      <h2 class="h3">${t('visit.hours')}</h2>
      ${statusChip(ctx)}
      ${hoursTable(ctx)}
    </div>
    <div class="map" id="map" data-embed="${embed}">
      <div class="map__placeholder">${raw(ICON.pin)}<p>${t('visit.mapNote')}</p><button type="button" class="btn btn--line" id="map-load">${t('visit.showMap')}</button>
      <a href="${branch.maps_url}" target="_blank" rel="noopener">Google Maps</a></div>
    </div>
  </div>
</div>`;
  return layout(ctx, { pageClass: 'visit', title: t('visit.title'), body, jsonLd: ctx.jsonLd });
}

// ---------------------------------------------------------------- about
export function aboutPage(ctx) {
  const body = html`<article class="wrap page-pad prose about">
  <h1 class="h1">${ctx.t('about.title')}</h1>
  <p class="lead">${ctx.content('about.lead')}</p>
  ${paragraphs(ctx.content('about.body'))}
  <div class="about__sign">${brandLockup({ size: 'lg', lang: ctx.lang })}</div>
  <p><a class="btn btn--primary" href="${ctx.u('/menu')}">${ctx.t('home.order')}</a></p>
</article>`;
  return layout(ctx, { pageClass: 'about', title: ctx.t('about.title'), body });
}

// ---------------------------------------------------------------- help
export function helpPage(ctx) {
  const { t } = ctx;
  let faq = [];
  try { faq = JSON.parse(ctx.content('faq.items') || '[]'); } catch { faq = []; }
  const ig = (ctx.business.socials || []).find((s) => s.network === 'instagram');
  const body = html`<div class="wrap page-pad help">
  <h1 class="h1">${t('contact.title')}</h1>
  <div class="help__grid">
    <section aria-labelledby="faq-title"><h2 class="h3" id="faq-title">${t('contact.faq')}</h2>
      <div class="faq">${faq.map(([q, a]) => html`<details><summary>${q}</summary><p>${a}</p></details>`)}</div></section>
    <section aria-labelledby="reach-title"><h2 class="h3" id="reach-title">${t('contact.reach')}</h2>
      ${contactButtons(ctx)}
      ${ig ? html`<p><a class="btn btn--line" href="${ig.url}" target="_blank" rel="noopener">${raw(ICON.instagram)}<span dir="ltr">${ig.handle}</span></a></p>` : ''}
      ${ctx.business.email ? html`<p><a href="mailto:${ctx.business.email}">${ctx.business.email}</a></p>` : ''}
    </section>
  </div>
</div>`;
  return layout(ctx, { pageClass: 'help', title: t('contact.title'), body, jsonLd: faq.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) } : null });
}

export function policyPage(ctx, key, title) {
  const body = html`<article class="wrap page-pad prose"><h1 class="h1">${title}</h1>${paragraphs(ctx.content(key))}</article>`;
  return layout(ctx, { pageClass: 'policy', title, body });
}

export function qrPage(ctx) {
  const { lang } = ctx;
  const ar = lang === 'ar';
  const live = config.allowIndexing;
  const body = html`<div class="wrap page-pad qr-page">
  <h1 class="h1">${ctx.t('footer.qr')}</h1>
  ${live ? '' : html`<p class="notice notice--warn">${ar ? 'معاينة: يشير هذا الرمز إلى عنوان غير نهائي. سيُعاد إنشاؤه عند تشغيل النطاق الرسمي.' : 'Preview: this code points to a non-final address. It will be regenerated when the official domain goes live.'}</p>`}
  <figure class="qr-card">
    <img src="/qr/menu-${lang}.svg" alt="${ar ? 'رمز QR يفتح منيو ڤيا باستا' : 'QR code that opens the Via Pasta menu'}" width="280" height="280">
    <figcaption><strong>${ar ? ctx.business.name_ar : ctx.business.name_en}</strong><span dir="ltr">${config.publicUrl.replace(/^https?:\/\//, '')}/${lang}/menu</span></figcaption>
  </figure>
  <p class="btn-row"><a class="btn btn--line" href="/qr/menu-${lang}.png" download>PNG</a><a class="btn btn--line" href="/qr/menu-${lang}.svg" download>SVG</a><a class="btn btn--line" href="/qr/print/${lang}" target="_blank">${ar ? 'نسخة للطباعة' : 'Print version'}</a></p>
</div>`;
  return layout(ctx, { pageClass: 'qr', title: ctx.t('footer.qr'), body, noindex: true });
}

export function errorPage(ctx, status) {
  const { t } = ctx;
  const is404 = status === 404;
  const body = html`<div class="wrap page-pad error-page"><p class="error-page__code" aria-hidden="true">${status}</p>
  <h1 class="h1">${is404 ? t('error.404') : t('error.500')}</h1><p>${is404 ? t('error.404Help') : t('error.500Help')}</p>
  <p class="btn-row"><a class="btn btn--primary" href="${ctx.u('/menu')}">${t('nav.menu')}</a><a class="btn btn--line" href="${ctx.u('/')}">${t('nav.home')}</a></p></div>`;
  return layout(ctx, { pageClass: 'error', title: String(status), body, noindex: true });
}
