// Vercel serverless entry. Every request that is not a static file is routed
// here by vercel.json; the same app as the normal server handles it.
import { config, assertProductionConfig } from './config.js';
import { buildApp, ensureReady, runMaintenance } from './main.js';

let app = null;
let lastMaintenanceCheck = 0;

/** vercel.json rewrites /anything → /api/index?__p=anything; restore the original path. */
function restoreUrl(req) {
  const u = new URL(req.url, 'http://localhost');
  if (!u.searchParams.has('__p')) return;
  const p = `/${u.searchParams.get('__p') || ''}`.replace(/^\/+/, '/');
  u.searchParams.delete('__p');
  const qs = u.searchParams.toString();
  req.url = `${p}${qs ? `?${qs}` : ''}`;
}

/** Keep background work alive after the response when the platform allows it. */
function background(promise) {
  const ctx = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
  if (ctx?.waitUntil) { ctx.waitUntil(promise); return true; }
  return false;
}

function setupPage(problems) {
  const items = problems.map((p) => `<li>${String(p).replace(/[<>&]/g, '')}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Setup needed</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 16px;line-height:1.5;color:#1d2a2c}h1{font-size:1.4rem}li{margin:.4em 0}code{background:#eef3f2;padding:1px 5px;border-radius:4px}</style></head>
<body><h1>Via Pasta — one more setup step</h1><p>The site is deployed, but it can't start yet:</p><ul>${items}</ul>
<p>After fixing it in Vercel, open <b>Deployments</b> → the latest one → <b>⋯</b> → <b>Redeploy</b>.</p></body></html>`;
}

export default async function handler(req, res) {
  restoreUrl(req);
  try {
    assertProductionConfig();
    await ensureReady();
  } catch (e) {
    const problems = String(e.message || e).replace(/^Refusing to start in production:\n/, '').split('\n- ').map((s) => s.replace(/^- /, ''));
    console.error(JSON.stringify({ level: 'error', msg: 'startup failed', error: String(e.message || e).slice(0, 500) }));
    const dbProblem = /Database HTTP 40[13]|DB_AUTH/.test(e.message) ? ['The database rejected the connection. Reconnect the Turso database to this project in the Storage tab.'] : null;
    res.statusCode = 503;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(setupPage(dbProblem || problems));
    return;
  }
  if (!app) app = buildApp();

  // Request-driven maintenance (no timers on serverless): checked at most once a minute per instance.
  if (Date.now() - lastMaintenanceCheck > 60000) {
    lastMaintenanceCheck = Date.now();
    const job = runMaintenance().catch((e) => console.error(JSON.stringify({ level: 'error', msg: 'maintenance failed', error: e.message })));
    if (!background(job)) await job;
  }
  return app.handle(req, res);
}

export { config };
