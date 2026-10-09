// Development/test-only pages. Never registered when APP_ENV=production.
import { asset } from '../http/static.js';
import { config } from '../config.js';

export function registerDev(app) {
  if (config.isProd) return;
  app.get('/dev/preset-check', async (req, res) => {
    res.html(200, `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Preset verification</title>
<link rel="stylesheet" href="${asset('css/site.css')}"><link rel="stylesheet" href="/theme.css"></head>
<body><h1>Preset verification (development only)</h1><p id="out">starting…</p><div id="stage"></div>
<style nonce="${res.locals.nonce}">#mock *, #mock *::before, #mock *::after { transition: none !important; animation: none !important; }</style>
<div id="mock" style="width:1200px"><section class="band" id="mock-band">band</section><section class="hero"><div class="hero__copy"><h1 class="h1">Title</h1><a class="btn btn--primary" href="#">Order</a></div></section>
<ul class="menu-list"><li class="mi"><span class="mi__art"></span><div><h3 class="mi__name">A</h3></div></li><li class="mi"></li><li class="mi"></li><li class="mi"></li></ul></div>
<script type="module" src="${asset('js/preset-check.js')}"></script></body></html>`);
  });
}
