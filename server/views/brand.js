// Brand marks rendered as live text (accessible, never an image of text).
// No logo file was available from public sources, so this is a text wordmark
// in the style of an Italian street ("via") plaque: tomato-red sign, cream
// inset line, serif capitals. Replace with the owner's logo when supplied.
import { html, raw } from './html.js';

export function brandLockup({ size = 'md', href = null, lang = 'en', label = 'Via Pasta', logoUrl = null } = {}) {
  const inner = logoUrl
    ? html`<img class="brand__img" src="${logoUrl}" alt="${label}" width="120" height="120" data-fallback="next"><span class="brand__type" hidden>${wordmark()}</span>`
    : html`<span class="brand__type">${wordmark()}</span>`;
  const cls = `brand brand--${size}`;
  return href
    ? html`<a class="${cls}" href="${href}" aria-label="${label} — ${lang === 'ar' ? 'الرئيسية' : 'home'}">${inner}</a>`
    : html`<span class="${cls}" role="img" aria-label="${label}">${inner}</span>`;
}

function wordmark() {
  return raw('<span class="brand__word" aria-hidden="true">VIA PASTA</span><span class="brand__sub" aria-hidden="true">ITALIAN · YANBU</span>');
}

/** SVG favicon / app icon: the red street plaque with the wordmark on two lines. */
export function iconSvg(size = 512) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
<rect width="512" height="512" rx="96" fill="#A8322A"/>
<rect x="40" y="40" width="432" height="432" rx="64" fill="none" stroke="#FBF6EE" stroke-width="10" opacity=".9"/>
<text x="256" y="250" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="150" letter-spacing="12" fill="#FBF6EE">VIA</text>
<text x="256" y="372" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="104" letter-spacing="8" fill="#FBF6EE">PASTA</text>
</svg>`;
}
