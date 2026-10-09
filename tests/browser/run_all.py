"""Starts a throwaway development server on a temporary database, then runs the
browser journeys and the preset verification against it."""
import os, subprocess, sys, tempfile, time, urllib.request, sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
tmp = tempfile.mkdtemp(prefix='viapasta-browser-')
port = os.environ.get('PORT', '3197')
env = {**os.environ, 'APP_ENV': 'development', 'PORT': port, 'DATABASE_PATH': os.path.join(tmp, 'db.sqlite'), 'UPLOADS_DIR': os.path.join(tmp, 'uploads'),
       'PAYMENT_PROVIDER': 'sandbox', 'PUBLIC_URL': f'http://127.0.0.1:{port}'}
srv = subprocess.Popen([ 'node', '--disable-warning=ExperimentalWarning', 'server/main.js'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
base = f'http://127.0.0.1:{port}'
try:
    for _ in range(60):
        try:
            urllib.request.urlopen(base + '/api/health'); break
        except Exception:
            time.sleep(0.2)
    # deterministic: open around the clock in this throwaway database
    db = sqlite3.connect(env['DATABASE_PATH'])
    db.execute('DELETE FROM opening_hours')
    for d in range(7):
        db.execute("INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (1, ?, '00:00', '00:00', 1)", (d,))
    db.commit(); db.close()
    shots = os.environ.get('SHOTS', os.path.join(tmp, 'shots'))
    rc1 = subprocess.call([sys.executable, os.path.join(ROOT, 'tests/browser/journey.py')], env={**env, 'BASE': base, 'SHOTS': shots})
    rc2 = subprocess.call([sys.executable, os.path.join(ROOT, 'tests/browser/presets.py')], env={**env, 'BASE': base, 'SHOTS': shots})
    print(f'\nScreenshots and JSON results: {shots}')
    sys.exit(rc1 or rc2)
finally:
    srv.terminate()
