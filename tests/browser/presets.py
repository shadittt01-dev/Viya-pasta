"""Renders every one of the 480 presets in headless Chromium and fails if any
preset produces no output, if 3D presets render blank, if visual presets are
not visually distinct, or if motion presets animate under reduced motion."""
import json, os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:3100')
OUT = os.environ.get('SHOTS', '/tmp/viapasta-shots')
os.makedirs(OUT, exist_ok=True)
summary = {}
ok_all = True
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for mode in ['no-preference', 'reduce']:
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion=mode)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f"{BASE}/dev/preset-check{'?category=motion' if mode == 'reduce' else ''}")
        pg.wait_for_selector('body[data-done="1"]', timeout=900000)
        r = pg.evaluate('window.__presetReport')
        bad = [x for x in r['results'] if not x['ok']]
        stds = [x.get('std') for x in r['results'] if x['category'] == '3d']
        summary[mode] = {'counts': r['counts'], 'checked': len(r['results']), 'failed': bad, 'validation': r.get('validation'),
                         'visualUnique': r.get('visualUniqueSignatures'), '3dPixelStdMin': min(stds) if stds else None, 'pageErrors': errs}
        if bad or errs: ok_all = False
        if mode == 'no-preference' and (r['counts']['total'] != 480 or r.get('visualUniqueSignatures') != 120 or not all(r['validation'].values())): ok_all = False
        ctx.close()
    b.close()
json.dump(summary, open(os.path.join(OUT, 'preset-results.json'), 'w'), indent=1)
for mode, s in summary.items():
    print(f"[{mode}] checked {s['checked']}, failed {len(s['failed'])}, visual distinct {s['visualUnique']}, 3D min pixel std {s['3dPixelStdMin']}, validation {s['validation']}, page errors {len(s['pageErrors'])}")
print('PRESETS OK' if ok_all else 'PRESETS FAILED')
sys.exit(0 if ok_all else 1)
