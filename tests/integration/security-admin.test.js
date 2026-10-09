// Dashboard security and owner workflows: authentication, lockout, CSRF,
// origin checks, role permissions, audit trail, draft/publish, campaigns,
// uploads, exports, headers, SEO/indexing controls and page rendering.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { isolatedEnv, startApp, json, menu, orderBody, adminClient } from '../helpers.js';

isolatedEnv();
let app, base, db, owner, manager, staff, items;

before(async () => {
  app = await startApp();
  base = app.base;
  db = await import('../../server/db/db.js');
  const { createUser } = await import('../../server/domain/auth.js');
  await createUser({ email: 'owner@t.test', name: 'Owner', role: 'owner', password: 'owner-password-123' });
  await createUser({ email: 'manager@t.test', name: 'Manager', role: 'manager', password: 'manager-password-123' });
  await createUser({ email: 'staff@t.test', name: 'Staff', role: 'staff', password: 'staff-password-123' });
  await createUser({ email: 'lock@t.test', name: 'Lock', role: 'staff', password: 'lock-password-1234' });
  owner = await adminClient(base, 'owner@t.test', 'owner-password-123');
  manager = await adminClient(base, 'manager@t.test', 'manager-password-123');
  staff = await adminClient(base, 'staff@t.test', 'staff-password-123');
  items = await menu(base);
  await db.run('DELETE FROM opening_hours');
  for (let d = 0; d < 7; d++) await db.run("INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (1, ?, '00:00', '00:00', 1)", d);
});
after(async () => { await app.close(); });

test('every customer page renders in both languages with correct lang/dir and no server errors', async () => {
  const paths = ['', '/menu', '/menu/alfredo', '/menu/pasta-ball', '/checkout', '/order/HABCDEF', '/offers', '/visit', '/about', '/help', '/privacy', '/terms', '/qr'];
  for (const lang of ['ar', 'en']) {
    for (const p of paths) {
      const r = await fetch(`${base}/${lang}${p}`);
      assert.equal(r.status, 200, `${lang}${p}`);
      const html = await r.text();
      assert.match(html, new RegExp(`<html lang="${lang === 'ar' ? 'ar-SA' : 'en'}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"`), `${lang}${p}`);
      assert.match(html, /<title>[^<]+<\/title>/);
      assert.match(html, /rel="canonical"/);
      assert.ok(!/undefined|\[object Object\]|NaN/.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), `${lang}${p} has no template leaks`);
    }
  }
  assert.equal((await fetch(`${base}/ar/menu/does-not-exist`)).status, 404);
  assert.equal((await fetch(`${base}/xx/menu`)).status, 404);
});

test('menu page shows all 12 items with listed prices, no invented calories; JSON-LD matches', async () => {
  const html = await (await fetch(`${base}/en/menu`)).text();
  for (const name of ['Alfredo', 'Mex Sauce', 'Pesto', 'Fettuccine', 'Spaghetti Bolognese with Beef', 'Tona Rosso', '3 Cheese Pasta', 'Pasta Ball', 'Potato Wedges', 'Mozzarella Sticks', 'Soft Drink', 'Water']) assert.ok(html.includes(name), name);
  assert.ok(!/\d+ kcal/.test(html), 'calories are not published by the restaurant, so none are shown');
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld['@type'], 'Menu');
  const bolo = ld.hasMenuSection[0].hasMenuItem.find((i) => i.name === 'Spaghetti Bolognese with Beef');
  assert.equal(bolo.offers.price, '25.00');
  const home = await (await fetch(`${base}/ar`)).text();
  const rest = JSON.parse(home.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.equal(rest['@type'], 'Restaurant');
  assert.equal(rest.openingHoursSpecification.length, 7, 'hours appear in structured data only once all are confirmed');
});

test('staging is kept out of search: robots disallow, noindex meta and header', async () => {
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  assert.match(robots, /Disallow: \//);
  const r = await fetch(`${base}/en`);
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.match(await r.text(), /<meta name="robots" content="noindex, nofollow">/);
  const sm = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.match(sm, /hreflang="ar"/);
});

test('security headers are set on pages', async () => {
  const r = await fetch(`${base}/en/menu`);
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self' 'nonce-/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});

test('static files cannot escape their folders', async () => {
  for (const p of ['/assets/../server/config.js', '/assets/%2e%2e/%2e%2e/package.json', '/shared/../.env', '/uploads/../development.sqlite', '/assets/.hidden']) {
    const r = await fetch(base + p);
    assert.notEqual(r.status, 200, p);
  }
});

test('login: wrong password fails; repeated failures lock the account', async () => {
  assert.equal(await adminClient(base, 'owner@t.test', 'wrong-password-xx'), null);
  for (let i = 0; i < 8; i++) await adminClient(base, 'lock@t.test', `wrong-${i}-password`);
  assert.equal(await adminClient(base, 'lock@t.test', 'lock-password-1234'), null, 'correct password refused while locked');
  assert.ok((await db.one("SELECT locked_until FROM users WHERE email = 'lock@t.test'")).locked_until);
  assert.ok((await db.one("SELECT count(*) n FROM audit_log WHERE action = 'login_failed'")).n >= 9);
});

test('dashboard APIs require a session; mutations require the CSRF token and same origin', async () => {
  assert.equal((await json(base, 'GET', '/admin/api/orders')).status, 401);
  const noCsrf = await json(base, 'PUT', '/admin/api/settings/ordering', {}, { cookie: owner.cookie });
  assert.equal(noCsrf.status, 403);
  assert.equal(noCsrf.body.error, 'CSRF_INVALID');
  const evil = await json(base, 'PUT', '/admin/api/settings/fees', { service_fee_minor: 0 }, { cookie: owner.cookie, 'x-csrf-token': owner.me.csrf, origin: 'https://evil.example' });
  assert.equal(evil.body.error, 'ORIGIN_REJECTED');
  const page = await fetch(`${base}/admin`, { redirect: 'manual' });
  assert.equal(page.status, 302);
});

test('roles are enforced on the server, not just hidden in the UI', async () => {
  assert.equal((await staff.call('GET', '/orders')).status, 200);
  assert.equal((await staff.call('PATCH', `/items/${items.water.id}/availability`, { sold_out: false })).status, 200, 'staff can toggle availability');
  for (const [m, p, b] of [['PUT', '/settings/payments', {}], ['PUT', `/drafts/item/${items['spaghetti-bolognese'].id}`, { price_minor: 1 }], ['POST', '/menu/publish'], ['GET', '/users'], ['GET', '/audit'], ['GET', '/reports'], ['GET', '/export/orders.csv'], ['POST', '/theme/publish'], ['POST', '/coupons', { code: 'X', kind: 'fixed', amount: '1' }]]) {
    const r = await staff.call(m, p, b);
    assert.equal(r.status, 403, `staff ${m} ${p}`);
  }
  assert.equal((await manager.call('PUT', '/settings/payments', {})).status, 403, 'only the owner changes payment settings');
  assert.equal((await manager.call('GET', '/users')).status, 403);
  assert.equal((await manager.call('GET', '/reports')).status, 200);
});

test('menu edits are drafts until published; preview shows drafts only to signed-in staff; publish is audited', async () => {
  const d = await manager.call('PUT', `/drafts/item/${items['tona-rosso'].id}`, { price_minor: '23.5', desc_en: 'Draft description' });
  assert.equal(d.status, 200);
  assert.equal(d.body.draft.price_minor, 2350);
  let live = await json(base, 'POST', '/api/quote', { lines: [{ itemId: items['tona-rosso'].id, qty: 1 }] });
  assert.equal(live.body.totals.total, 2100, 'customers still pay the published price');
  const anonPreview = await (await fetch(`${base}/en/menu?preview=1`)).text();
  assert.ok(!anonPreview.includes('Draft description'), 'preview without a session shows the live menu');
  const staffPreview = await (await fetch(`${base}/en/menu?preview=1`, { headers: { cookie: manager.cookie } })).text();
  assert.ok(staffPreview.includes('Draft description'));
  const bad = await manager.call('PUT', `/drafts/item/${items['tona-rosso'].id}`, { price_minor: 'abc' });
  assert.equal(bad.status, 422);
  const pub = await manager.call('POST', '/menu/publish');
  assert.equal(pub.status, 200);
  live = await json(base, 'POST', '/api/quote', { lines: [{ itemId: items['tona-rosso'].id, qty: 1 }] });
  assert.equal(live.body.totals.total, 2350);
  const a = await db.one("SELECT * FROM audit_log WHERE action = 'menu.publish' ORDER BY id DESC LIMIT 1");
  assert.match(a.before, /2100/);
  assert.match(a.after, /2350/);
  await manager.call('PUT', `/drafts/item/${items['tona-rosso'].id}`, { price_minor: 2100, desc_en: '' });
  await manager.call('POST', '/menu/publish');
});

test('settings validation rejects unsafe values; WhatsApp cannot be enabled unverified', async () => {
  assert.equal((await owner.call('PUT', '/settings/whatsapp', { mode: 'order_copy', number: '+966591929969', verified: false })).body.error, 'WHATSAPP_NOT_VERIFIED');
  assert.equal((await owner.call('PUT', '/settings/tax', { mode: 'inclusive', rate_bp: 99999 })).body.error, 'TAX_RATE_INVALID');
  assert.equal((await owner.call('PUT', '/settings/business', { socials: [{ network: 'x', handle: 'a', url: 'javascript:alert(1)' }] })).body.error, 'SOCIAL_URL_INVALID');
  const ok = await owner.call('PUT', '/settings/whatsapp', { mode: 'order_copy', number: '059 192 9969', verified: true });
  assert.equal(ok.body.whatsapp.number, '+966591929969');
  await owner.call('PUT', '/settings/whatsapp', { mode: 'off', number: '+966591929969', verified: false });
});

test('VAT modes: inclusive shows the VAT portion; exclusive adds it', async () => {
  await owner.call('PUT', '/settings/tax', { mode: 'inclusive', rate_bp: 1500 });
  let q = await json(base, 'POST', '/api/quote', { lines: [{ itemId: items['mozzarella-sticks'].id, qty: 1 }] });
  assert.deepEqual([q.body.totals.total, q.body.totals.tax], [1200, 157]);
  await owner.call('PUT', '/settings/tax', { mode: 'exclusive', rate_bp: 1500 });
  q = await json(base, 'POST', '/api/quote', { lines: [{ itemId: items['mozzarella-sticks'].id, qty: 1 }] });
  assert.deepEqual([q.body.totals.total, q.body.totals.tax], [1380, 180]);
  await owner.call('PUT', '/settings/tax', { mode: 'none', rate_bp: 1500 });
});

test('campaigns: draft → published → shown in the window only; countdowns need a real deadline', async () => {
  const noDeadline = await owner.call('POST', '/campaigns', { kind: 'announcement', title_en: 'x', show_countdown: true });
  assert.equal(noDeadline.body.error, 'COUNTDOWN_NEEDS_REAL_DEADLINE');
  const future = await owner.call('POST', '/campaigns', { kind: 'announcement', title_en: 'Future news', title_ar: 'خبر قادم', starts_at: new Date(Date.now() + 86400000).toISOString() });
  const now = await owner.call('POST', '/campaigns', { kind: 'announcement', title_en: 'Opening week', title_ar: 'أسبوع الافتتاح', ends_at: new Date(Date.now() + 86400000).toISOString() });
  let html = await (await fetch(`${base}/en`)).text();
  assert.ok(!html.includes('Opening week'), 'drafts are not shown');
  await owner.call('POST', `/campaigns/${now.body.id}/status`, { status: 'published' });
  await owner.call('POST', `/campaigns/${future.body.id}/status`, { status: 'published' });
  html = await (await fetch(`${base}/en`)).text();
  assert.ok(html.includes('Opening week'));
  assert.ok(!html.includes('Future news'), 'not before its start time');
  await db.run("UPDATE campaigns SET ends_at = '2020-01-01T00:00:00Z' WHERE id = ?", now.body.id);
  html = await (await fetch(`${base}/en`)).text();
  assert.ok(!html.includes('Opening week'), 'expired campaigns disappear');
});

test('uploads: only real images within limits are accepted', async () => {
  const up = (buf) => fetch(`${base}/admin/api/uploads?purpose=item`, { method: 'POST', headers: { cookie: owner.cookie, 'x-csrf-token': owner.me.csrf, 'content-type': 'application/octet-stream' }, body: buf });
  assert.equal((await up(Buffer.from('<svg onload=alert(1)></svg>'))).status, 422);
  assert.equal((await up(Buffer.from('#!/bin/sh\nrm -rf /'))).status, 422);
  const { encodePngGray } = await import('../../server/qr/render.js');
  const tiny = encodePngGray(20, 20, () => 0);
  assert.equal((await up(tiny)).status, 422, 'too small');
  const ok = await up(encodePngGray(400, 300, (x, y) => (x + y) % 255));
  assert.equal(ok.status, 201);
  const { path } = await ok.json();
  assert.match(path, /^[a-f0-9]{24}\.png$/);
  const served = await fetch(`${base}/uploads/${path}`);
  assert.equal(served.headers.get('content-type'), 'image/png');
  assert.equal((await fetch(`${base}/admin/api/uploads`, { method: 'POST', headers: { cookie: owner.cookie, 'x-csrf-token': owner.me.csrf }, body: Buffer.alloc(3 * 1024 * 1024) })).status, 413);
});

test('exports: CSV is protected against spreadsheet formula injection', async () => {
  await json(base, 'POST', '/api/orders', orderBody(items, { customer: { name: '=HYPERLINK("x")', phone: '0551234567' } }));
  const r = await fetch(`${base}/admin/api/export/orders.csv`, { headers: { cookie: owner.cookie } });
  const text = await r.text();
  assert.equal(r.status, 200);
  assert.ok(text.includes(`"'=HYPERLINK(""x"")"`) || text.includes("'=HYPERLINK"));
  assert.ok(await db.one("SELECT 1 FROM audit_log WHERE action = 'export.orders'"));
});

test('staff management: cannot remove the last owner; deactivation ends sessions', async () => {
  const self = owner.me.user.id;
  const r = await owner.call('PUT', `/users/${self}`, { role: 'manager' });
  assert.equal(r.body.error, 'LAST_OWNER');
  const weak = await owner.call('POST', '/users', { email: 'new@t.test', name: 'New', role: 'staff', password: 'short' });
  assert.equal(weak.body.error, 'PASSWORD_TOO_SHORT');
  const created = await owner.call('POST', '/users', { email: 'temp@t.test', name: 'Temp', role: 'staff', password: 'temporary-password-1' });
  const temp = await adminClient(base, 'temp@t.test', 'temporary-password-1');
  assert.equal((await temp.call('GET', '/orders')).status, 200);
  await owner.call('PUT', `/users/${created.body.id}`, { active: false });
  assert.equal((await temp.call('GET', '/orders')).status, 401);
});

test('design studio: invalid theme drafts are refused; publish requires the owner', async () => {
  const bad = await manager.call('PUT', '/theme/draft', { visual: { id: 'vis-nope' } });
  assert.equal(bad.status, 422);
  const good = await manager.call('PUT', '/theme/draft', { visual: { id: 'vis-poster-03', params: { heroHeight: 80 } }, hero3d: { id: '3d-pasta-02' } });
  assert.equal(good.status, 200);
  assert.equal((await manager.call('POST', '/theme/publish')).status, 403);
  assert.equal((await owner.call('POST', '/theme/publish')).status, 200);
  const html = await (await fetch(`${base}/en`)).text();
  assert.match(html, /data-hero="poster"/);
  await owner.call('POST', '/theme/reset');
  await owner.call('POST', '/theme/publish');
});

test('QR endpoints return decodable images for the canonical URL', async () => {
  const svg = await (await fetch(`${base}/qr/menu-ar.svg`)).text();
  assert.match(svg, /<svg[^>]+viewBox/);
  assert.match(svg, /localhost:3999\/ar\/menu/);
  const png = Buffer.from(await (await fetch(`${base}/qr/menu-en.png`)).arrayBuffer());
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const admin = await fetch(`${base}/admin/api/qr?target=offers&lang=ar&campaign=Table%20Tent!&format=svg`, { headers: { cookie: owner.cookie } });
  assert.match(await admin.text(), /utm_campaign=tabletent/);
});
