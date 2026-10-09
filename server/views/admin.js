// Dashboard HTML shells. The dashboard itself is a small client app
// (public/admin/*.js) that talks to /admin/api/* with CSRF-protected requests.
import { html, raw, jsonScript } from './html.js';
import { asset } from '../http/static.js';

const ERR = {
  ar: { failed: 'البريد أو كلمة المرور غير صحيحة.', locked: 'محاولات كثيرة. انتظر ١٥ دقيقة ثم حاول مرة أخرى.' },
  en: { failed: 'Email or password is incorrect.', locked: 'Too many attempts. Wait 15 minutes and try again.' },
};

export function loginPage({ nonce, error, lang, noOwner = false }) {
  const ar = lang === 'ar';
  return '<!doctype html>' + html`<html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${ar ? 'دخول لوحة ڤيا باستا' : 'Via Pasta dashboard sign-in'}</title>
<link rel="icon" href="/icon.svg"><link rel="stylesheet" href="${asset('fonts/fonts.css')}"><link rel="stylesheet" href="${asset('admin/admin.css')}"></head>
<body class="login"><main class="login__card">
<div class="login__mark" aria-hidden="true"><b>VIA PASTA</b><small>ITALIAN · YANBU</small></div>
<h1>${ar ? 'لوحة التحكم' : 'Dashboard'}</h1>
${noOwner ? html`<p class="alert" role="status">${ar
    ? 'لا يوجد حساب مالك بعد. في Vercel: Settings ← Environment Variables، أضف OWNER_EMAIL و OWNER_PASSWORD (١٢ حرفًا على الأقل)، ثم أعد النشر (Redeploy).'
    : 'No owner account yet. In Vercel: Settings → Environment Variables, add OWNER_EMAIL and OWNER_PASSWORD (at least 12 characters), then Redeploy.'}</p>` : ''}
${error ? html`<p class="alert" role="alert">${ERR[ar ? 'ar' : 'en'][error] || ERR[ar ? 'ar' : 'en'].failed}</p>` : ''}
<form method="post" action="/admin/login">
<label>${ar ? 'البريد الإلكتروني' : 'Email'}<input name="email" type="email" autocomplete="username" required dir="ltr"></label>
<label>${ar ? 'كلمة المرور' : 'Password'}<input name="password" type="password" autocomplete="current-password" required minlength="8" dir="ltr"></label>
<button type="submit">${ar ? 'دخول' : 'Sign in'}</button></form>
<p class="login__lang"><a href="/admin/login?lang=${ar ? 'en' : 'ar'}">${ar ? 'English' : 'العربية'}</a></p>
</main><script nonce="${nonce}">document.cookie='hb_admin_lang=${ar ? 'ar' : 'en'};path=/admin;max-age=31536000;samesite=strict';</script></body></html>`;
}

export function adminShell({ nonce, user, lang }) {
  const ar = lang === 'ar';
  return '<!doctype html>' + html`<html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${ar ? 'لوحة ڤيا باستا' : 'Via Pasta dashboard'}</title><link rel="icon" href="/icon.svg">
<link rel="stylesheet" href="${asset('fonts/fonts.css')}"><link rel="stylesheet" href="${asset('css/site.css')}"><link rel="stylesheet" href="${asset('admin/admin.css')}"></head>
<body class="admin"><a class="skip" href="#view">${ar ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
<div class="admin__app" id="app"><p class="admin__boot">${ar ? 'جاري التحميل…' : 'Loading…'}</p></div>
<div class="toasts" id="toasts" role="status" aria-live="polite"></div>
<script type="application/json" id="admin-boot">${jsonScript({ lang, user: { name: user.name, role: user.role } })}</script>
<script type="module" src="${asset('admin/admin.js')}" nonce="${nonce}"></script>
${raw('')}</body></html>`;
}
