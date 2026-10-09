"""Real-browser customer journeys (headless Chromium via Playwright).

Runs against a dev server at BASE (default http://127.0.0.1:3100) started with
the development seed. Exercises the UI the way a customer does: add once and
five times, variants, edit/remove, refresh persistence, required options,
checkout, double-click, network drop + retry, order status, staff accept,
language switch, keyboard use, reduced motion, loader failure, broken images,
console errors and horizontal overflow on several screen sizes.
"""
import json, os, re, sys, time
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE', 'http://127.0.0.1:3100')
SHOTS = os.environ.get('SHOTS', '/tmp/viapasta-shots')
os.makedirs(SHOTS, exist_ok=True)
sys.path.insert(0, os.path.dirname(__file__))
from dev_credentials import OWNER_EMAIL, OWNER_PASSWORD  # noqa: E402


A11Y_JS = """() => {
  const issues = [];
  const name = (e) => (e.getAttribute('aria-label') || e.textContent || e.getAttribute('title') || (e.querySelector('img') && e.querySelector('img').alt) || '').trim();
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) issues.push('img without alt');
  for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    if (!el.offsetParent && el.type !== 'radio') continue;
    const labelled = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if (!labelled) issues.push('unlabelled field ' + (el.name || el.id));
  }
  for (const el of document.querySelectorAll('button, a[href]')) if (el.offsetParent && !el.closest('[aria-hidden=true]') && !name(el)) issues.push('control without a name: ' + el.outerHTML.slice(0, 80));
  const h1 = document.querySelectorAll('h1'); if (h1.length !== 1) issues.push('h1 count ' + h1.length);
  const lum = (c) => { let m = c.match(/[\\d.]+/g).map(Number); if (c.startsWith('color(')) m = m.map((v) => v * 255); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const bgOf = (e) => { while (e) { const b = getComputedStyle(e).backgroundColor; const a = b.match(/[\\d.]+/g); if (a && (a.length < 4 || +a[3] > 0.9)) return b; if (e.closest('.hero') || e.closest('.toast')) return null; e = e.parentElement; } return 'rgb(255,255,255)'; };
  for (const el of document.querySelectorAll('p, li, a, button, span, dt, dd, label, h1, h2, h3, th, td, small, strong')) {
    if (!el.offsetParent || !el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    if (el.closest('[aria-hidden=true], .loader, .brand')) continue;
    const bg = bgOf(el); if (!bg) continue;
    const cs = getComputedStyle(el); if (+cs.opacity < 1 || el.closest('.mi--off')) continue;
    const L1 = lum(cs.color), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5)) issues.push(`contrast ${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}" ${cs.color} on ${bg}`);
  }
  return issues;
}"""

results = []
def check(name, cond, detail=''):
    results.append({'name': name, 'ok': bool(cond), 'detail': str(detail)[:300]})
    print(('PASS ' if cond else 'FAIL ') + name + (f' — {detail}' if detail and not cond else ''))

def attach(page, bucket):
    page.on('pageerror', lambda e: bucket.append(f'pageerror: {e}'))
    page.on('console', lambda m: bucket.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('response', lambda r: bucket.append(f'http {r.status} {r.url}') if r.status >= 400 and '/api/orders/' not in r.url else None)

def badge(page):
    return int(page.locator('#cart-count').inner_text())

def no_overflow(page):
    return page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])

    # ------------------------------------------------------------------ mobile Arabic journey
    errs = []
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, locale='ar-SA', timezone_id='Asia/Riyadh')
    page = ctx.new_page(); attach(page, errs)
    page.goto(f'{BASE}/ar/menu', wait_until='networkidle')
    check('ar menu is RTL', page.evaluate('document.documentElement.dir') == 'rtl')
    check('ar menu: no horizontal overflow at 390px', no_overflow(page))
    page.evaluate("localStorage.removeItem('hb.cart')"); page.reload(wait_until='networkidle')
    check('loader removed after load', page.locator('#loader').count() == 0 or not page.locator('#loader').is_visible())

    humbo_add = page.locator('li.mi', has_text='سباغيتي بولونيز باللحم').locator('[data-add]')
    humbo_add.click()
    page.wait_for_timeout(300)
    check('add once → badge 1', badge(page) == 1, badge(page))
    toast = page.locator('.toast').first
    check('confirmation toast shown, drawer not auto-opened', toast.is_visible() and not page.locator('#cart').evaluate('d => d.open'))
    for _ in range(4):
        humbo_add.click(); page.wait_for_timeout(120)
    check('add five times → badge 5', badge(page) == 5, badge(page))
    stored = json.loads(page.evaluate("localStorage.getItem('hb.cart')"))
    check('five adds merge into one line of 5', len(stored['lines']) == 1 and stored['lines'][0]['qty'] == 5, stored)

    # required option without a default: the protein for Alfredo
    sheet = page.locator('#item-sheet')
    page.locator('li.mi', has_text='باستا بصوص الألفريدو').locator('[data-add]').click()
    expect(sheet).to_be_visible()
    sheet.locator('#sheet-add').click()
    page.wait_for_timeout(200)
    check('required option blocks add and explains why', sheet.is_visible() and sheet.locator('#sheet-missing').inner_text().strip() != '', sheet.locator('#sheet-missing').inner_text())
    check('nothing was added while the choice was missing', badge(page) == 5)
    sheet.locator('[data-close]').click(); page.wait_for_timeout(400)
    # pesto: choose chicken (+4), quantity 2
    page.locator('li.mi', has_text='باستا بصوص البيستو').locator('[data-add]').click()
    expect(sheet).to_be_visible()
    sheet.locator('label.opt', has_text='دجاج').click()
    price_before = sheet.locator('#sheet-add').inner_text()
    sheet.locator('[data-inc]').click(); page.wait_for_timeout(450)
    price_after = sheet.locator('#sheet-add').inner_text()
    check('price recalculates when quantity changes', price_before != price_after and '50' in price_after, f'{price_before} → {price_after}')
    sheet.locator('#sheet-add').click(); page.wait_for_timeout(400)
    check('chicken pesto x2 added → badge 7', badge(page) == 7, badge(page))
    page.locator('li.mi', has_text='باستا بصوص البيستو').locator('[data-add]').click()
    sheet.locator('label.opt', has_text='خضار').click(); sheet.locator('#sheet-add').click(); page.wait_for_timeout(300)
    stored = json.loads(page.evaluate("localStorage.getItem('hb.cart')"))
    check('different variants stay separate lines', len(stored['lines']) == 3, [l['key'] for l in stored['lines']])

    # refresh persistence
    page.reload(wait_until='networkidle')
    check('cart survives refresh', badge(page) == 8, badge(page))

    # drawer: quantities, totals, edit, remove
    page.locator('#cart-open').click()
    drawer = page.locator('#cart'); expect(drawer.locator('.cline').first).to_be_visible()
    page.wait_for_timeout(400)
    sub = drawer.locator('#drawer-sub').inner_text()
    check('drawer subtotal = 5×25 + 2×25 + 1×21 = 196', '196' in sub, sub)
    drawer.locator('.cline').first.locator('[data-dec]').click(); page.wait_for_timeout(500)
    check('decrease updates badge and subtotal', badge(page) == 7 and '171' in drawer.locator('#drawer-sub').inner_text(), drawer.locator('#drawer-sub').inner_text())
    regular_line = drawer.locator('.cline', has_text='خضار')
    regular_line.locator('[data-remove]').click(); page.wait_for_timeout(500)
    check('remove line', badge(page) == 6 and drawer.locator('.cline').count() == 2)
    check('focus stays inside the drawer after removing a line', page.evaluate("document.getElementById('cart').contains(document.activeElement)"))
    page.keyboard.press('Escape'); page.wait_for_timeout(500)
    check('Escape closes the drawer', not drawer.evaluate('d => d.open'))
    page.screenshot(path=f'{SHOTS}/m-ar-menu.png')

    # checkout
    page.goto(f'{BASE}/ar/checkout', wait_until='networkidle')
    page.wait_for_selector('#place-order:not([disabled])', timeout=8000)
    check('checkout shows the server total: 4×25 + 2×25 = 150', '150' in page.locator('#grand-total').inner_text(), page.locator('#grand-total').inner_text())
    check('checkout: no overflow at 390px', no_overflow(page))
    page.fill('input[name=name]', 'متصفح تجريبي')
    page.fill('input[name=phone]', '055 123 4567')
    page.check('input[name=payment][value=pay_at_pickup]')
    # simulate a dropped connection on the first submit; the order must not be duplicated
    state = {'n': 0}
    def drop_first(route):
        state['n'] += 1
        if state['n'] == 1:
            route.continue_(); time.sleep(0.05)
        else:
            route.continue_()
    page.route('**/api/orders', lambda route: route.abort('internetdisconnected') if state.setdefault('dropped', 0) == 0 and not state.update(dropped=1) else route.continue_())
    page.locator('#place-order').dblclick()
    page.wait_for_timeout(800)
    check('network failure shows a recoverable error', page.locator('#checkout-error').is_visible() and page.locator('#retry').count() == 1, page.locator('#checkout-error').inner_text())
    page.unroute('**/api/orders')
    page.locator('#retry').click()
    page.wait_for_url(re.compile(r'/ar/order/H[0-9A-Z]{6}'), timeout=10000)
    ref = page.url.split('/order/')[1].split('#')[0]
    check('retry places the order and opens its status page', bool(ref))
    page.wait_for_selector('#order-view:not([hidden])', timeout=8000)
    check('status page shows order number and waiting state', ref in page.inner_text('#order-view') and 'بانتظار قبول' in page.inner_text('#order-view'))
    check('cart cleared after order', badge(page) == 0)
    check('token removed from the address bar', '#k=' not in page.url)
    page.screenshot(path=f'{SHOTS}/m-ar-order.png', full_page=True)

    # staff accepts in the dashboard → customer page updates
    staff = browser.new_context(viewport={'width': 1366, 'height': 900}, locale='en-US')
    sp = staff.new_page(); serrs = []; attach(sp, serrs)
    sp.goto(f'{BASE}/admin/login?lang=en'); sp.fill('input[name=email]', OWNER_EMAIL); sp.fill('input[name=password]', OWNER_PASSWORD); sp.click('button[type=submit]')
    sp.wait_for_url('**/admin'); sp.wait_for_selector(f'[data-order] >> text={ref}', timeout=8000)
    count = sp.evaluate(f"""fetch('/admin/api/orders?view=all&q={ref}').then(r=>r.json()).then(j=>j.orders.length)""")
    check('exactly one order exists after drop + retry + double-click', count == 1, count)
    card = sp.locator('[data-order]', has_text=ref)
    card.locator('[data-act=accept]').click(); sp.wait_for_timeout(600)
    sp.locator('[data-order]', has_text=ref).locator('[data-act=preparing]').click(); sp.wait_for_timeout(600)
    sp.screenshot(path=f'{SHOTS}/d-orders.png')
    page.wait_for_function("document.querySelector('#order-view') && document.querySelector('#order-view').innerText.includes('قيد التجهيز')", timeout=15000)
    check('customer status updates live after staff action', True)
    check('dashboard: no console errors', not serrs, serrs[:3])
    staff.close()

    # language switch keeps the page
    page.goto(f'{BASE}/ar/menu', wait_until='networkidle')
    page.locator('a.lang').click(); page.wait_for_load_state('networkidle')
    check('language switch goes to /en/menu, LTR', page.url.endswith('/en/menu') and page.evaluate('document.documentElement.dir') == 'ltr')
    check('mobile journey: no console errors (except the simulated network drop)', not [e for e in errs if 'INTERNET_DISCONNECTED' not in e], errs[:5])
    ctx.close()

    # ------------------------------------------------------------------ desktop English, keyboard only
    errs = []
    ctx = browser.new_context(viewport={'width': 1366, 'height': 900}, locale='en-US', timezone_id='Asia/Riyadh')
    page = ctx.new_page(); attach(page, errs)
    page.goto(f'{BASE}/en', wait_until='networkidle')
    page.evaluate("localStorage.removeItem('hb.cart')")
    page.keyboard.press('Tab')
    check('first Tab reaches the skip link', page.evaluate("document.activeElement.classList.contains('skip')"))
    page.goto(f'{BASE}/en/menu', wait_until='networkidle')
    btn = page.locator('#item-mozzarella-sticks [data-add]')
    btn.focus(); page.keyboard.press('Enter'); page.wait_for_timeout(300)
    check('keyboard Enter adds an item', badge(page) == 1)
    page.locator('#cart-open').focus(); page.keyboard.press('Enter'); page.wait_for_timeout(400)
    check('drawer opens with keyboard and traps focus inside', page.evaluate("document.getElementById('cart').contains(document.activeElement)"))
    page.keyboard.press('Escape')
    back = False
    for _ in range(40):  # poll from Python: string predicates are blocked by the site's CSP (no eval), which is intended
        if page.evaluate("document.activeElement && document.activeElement.id") == 'cart-open': back = True; break
        page.wait_for_timeout(50)
    check('focus returns to the cart button after closing', back, page.evaluate("document.activeElement && (document.activeElement.id || document.activeElement.tagName)"))
    # every link on key pages resolves
    bad_links = []
    for path in ['/en', '/en/menu', '/en/visit', '/en/help', '/en/about', '/ar']:
        page.goto(f'{BASE}{path}', wait_until='domcontentloaded')
        hrefs = set(page.eval_on_selector_all('a[href^="/"]', 'els => els.map(e => e.getAttribute("href"))'))
        for h in hrefs:
            r = page.request.get(BASE + h, max_redirects=3)
            if r.status >= 400: bad_links.append((path, h, r.status))
    check('all internal links resolve', not bad_links, bad_links[:5])
    for path in ['/en', '/en/menu', '/en/checkout', '/en/visit', '/en/help']:
        page.goto(f'{BASE}{path}', wait_until='networkidle')
        check(f'desktop {path}: no horizontal overflow', no_overflow(page))
    page.goto(f'{BASE}/en', wait_until='networkidle'); page.wait_for_timeout(2500)
    page.screenshot(path=f'{SHOTS}/d-en-home.png')
    has3d = page.evaluate("document.querySelector('.hero')?.classList.contains('hero--3d-ready')")
    check('3D hero mounts on a capable desktop', has3d)
    page.goto(f'{BASE}/en/visit', wait_until='networkidle')
    check('map is not loaded until asked (privacy)', page.locator('#map iframe').count() == 0)
    page.click('#map-load')
    check('map loads on click', page.locator('#map iframe').count() == 1)
    check('desktop journey: no console errors', not [e for e in errs if 'google.com' not in e], errs[:5])
    ctx.close()

    # ------------------------------------------------------------------ reduced motion, broken loader/images/3D, tablet
    errs = []
    ctx = browser.new_context(viewport={'width': 820, 'height': 1180}, reduced_motion='reduce')
    page = ctx.new_page(); attach(page, errs)
    page.route('**/shared/fx3d/**', lambda r: r.abort())
    page.route('**/assets/fonts/**', lambda r: r.abort())
    page.goto(f'{BASE}/en', wait_until='load'); page.wait_for_timeout(1700)
    check('reduced motion: page usable, loader gone, static hero shown', page.locator('#loader').count() == 0 and page.locator('.hero__fallback').is_visible())
    check('3D failure falls back to static art', not page.evaluate("document.querySelector('.hero').classList.contains('hero--3d-ready')"))
    anims = page.evaluate("document.getAnimations().filter(a => a.playState === 'running').length")
    check('reduced motion: no running animations', anims == 0, anims)
    check('tablet: no horizontal overflow', no_overflow(page))
    ctx.close()

    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, java_script_enabled=False)
    page = ctx.new_page()
    page.goto(f'{BASE}/ar/menu'); page.wait_for_timeout(2800)
    check('no JavaScript: loader hides itself by CSS and the menu is readable', not page.locator('#loader').is_visible() and page.locator('li.mi').count() == 12)
    ctx.close()

    ctx = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = ctx.new_page()
    page.goto(f'{BASE}/en/menu'); page.evaluate("localStorage.setItem('hb.cart', JSON.stringify({v:2,branch:1,lines:[{itemId:1,optionIds:[],qty:1,note:'',key:'1||'}]}))")
    for lang in ['ar', 'en']:
        for path in ['', '/menu', '/menu/alfredo', '/checkout', '/visit', '/help', '/about', '/offers', '/privacy', '/qr']:
            page.goto(f'{BASE}/{lang}{path}', wait_until='networkidle'); page.wait_for_timeout(400)
            issues = page.evaluate(A11Y_JS)
            check(f'accessibility basics /{lang}{path}', not issues, issues[:4])
    ctx.close()

    ctx = browser.new_context(viewport={'width': 320, 'height': 640})
    page = ctx.new_page()
    for path in ['/ar', '/ar/menu', '/ar/checkout', '/en/visit']:
        page.goto(f'{BASE}{path}', wait_until='networkidle')
        check(f'320px {path}: no horizontal overflow', no_overflow(page))
    small = page.evaluate("""[...document.querySelectorAll('button, a.btn, .add-btn, input[type=radio], .cart-btn')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()).filter(r => r.width && (r.height < 40))""")
    check('touch targets ≥ 40px tall on 320px screens', len(small) == 0, small[:3])
    ctx.close()

    browser.close()

passed = sum(r['ok'] for r in results)
print(f'\n{passed}/{len(results)} browser checks passed')
json.dump(results, open(os.path.join(SHOTS, 'browser-results.json'), 'w'), indent=1)
sys.exit(0 if passed == len(results) else 1)
