# Deployment, operations and recovery

> **Easiest option:** Vercel + Turso, both free and set up from a browser. See [VERCEL.md](VERCEL.md). The rest of this page covers running it on your own server (VPS).

## 1. What you need

| Item | Notes | Cost (verify before buying) |
|---|---|---|
| A small Linux server or Node host with a persistent disk | 1 vCPU / 1 GB RAM is plenty for one branch. Needs Node.js **22.13+** and a persistent volume for the SQLite file and uploads. Examples: a VPS (Hetzner, DigitalOcean, Lightsail), Render/Railway/Fly.io with a volume. | typically USD 5–15 / month — **unverified, check current pricing** |
| Domain name | e.g. a `.sa` or `.com` domain. `.sa` domains require Saudi registrar rules. | ≈ USD 10–40 / year — **unverified** |
| TLS certificate | Free via Let's Encrypt (Caddy does this automatically) | free |
| Moyasar merchant account (optional) | Only if the owner wants online payment. Requires Saudi commercial registration and KYC; fees are per transaction. | per-transaction fees — **ask Moyasar** |
| WhatsApp Business Cloud API (optional) | Only for automated status messages; needs a Meta business account and an approved template. | per-conversation pricing — **ask Meta** |

No paid services were created or contracted during the build.

## 2. First deployment (example: Ubuntu VPS + Caddy + systemd)

```sh
# as root
adduser --system --group viapasta && mkdir -p /opt/viapasta /var/lib/viapasta && chown viapasta:viapasta /var/lib/viapasta
# copy the project to /opt/viapasta (git clone or upload the zip), then:
cd /opt/viapasta
cp .env.example .env && nano .env        # set PUBLIC_URL, SESSION_SECRET (openssl rand -base64 48), paths
sudo -u viapasta npm run migrate
sudo -u viapasta npm run seed:business      # verified menu, branch, hours, text — once, on an empty DB
sudo -u viapasta npm run create-owner       # the owner's dashboard account
sudo -u viapasta npm run fetch-fonts        # self-host fonts (needs internet once)
```

`/etc/systemd/system/viapasta.service`

```ini
[Unit]
Description=Via Pasta ordering site
After=network.target
[Service]
User=viapasta
WorkingDirectory=/opt/viapasta
EnvironmentFile=/opt/viapasta/.env
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server/main.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/viapasta
[Install]
WantedBy=multi-user.target
```

`/etc/caddy/Caddyfile`

```
viapasta.example {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
```

`systemctl enable --now viapasta caddy`. The app refuses to start in production without a 32+ character `SESSION_SECRET` and an `https://` `PUBLIC_URL`, and never loads the sandbox payment provider or development routes in production.

Run **one** app process per database file (SQLite with WAL handles many concurrent requests; cross-process safety is tested, but one process keeps the in-memory rate limits and live dashboard stream simple). Background jobs (payment expiry, notification retries, session pruning) run inside the app.

## 3. Going live checklist

1. Owner confirms everything in **Dashboard → Launch checklist** (hours, payments, VAT, WhatsApp, Arabic name, address, logo, text).
2. Point DNS to the server; confirm `https://` works.
3. Set `ALLOW_INDEXING=1` (only now — staging stays `noindex`).
4. Regenerate and **scan** the QR codes on the live domain (Dashboard → QR codes) before printing.
5. Add the site URL and "Order online" link to the Google Business Profile.
6. Place one real test order end to end and cancel it from the dashboard.

## 4. Online payments (Moyasar) — not live yet

The adapter (`server/payments/moyasar.js`) creates hosted **invoices** (amounts in halalas), receives webhooks at `POST /webhooks/moyasar`, compares the webhook `secret_token` in constant time **and re-fetches the invoice from Moyasar before marking anything paid**. Browser redirects never mark orders paid.

To enable after the owner has a Moyasar account:
1. In Moyasar's dashboard, create a webhook to `https://YOUR-DOMAIN/webhooks/moyasar` with a secret token; subscribe to payment events.
2. Set `PAYMENT_PROVIDER=moyasar`, `MOYASAR_SECRET_KEY`, `MOYASAR_WEBHOOK_SECRET` in `.env`; restart.
3. **First with test keys (`sk_test_…`)**: run successful, declined and cancelled test payments; check orders move to the kitchen only when paid. The adapter was written against Moyasar's public documentation and has **not** been exercised against Moyasar's servers (no account access) — this step is required before taking real money.
4. Dashboard → Operations → enable "Online payment".

Refunds are made in Moyasar's dashboard; record them in the order (owner/manager can "Record refund"). A refund webhook also updates the order.

## 5. Backups, restore, rollback

**Backup** (safe while running; consistent snapshot + integrity check):
```sh
sudo -u viapasta npm run backup -- /var/lib/viapasta/backups
```
Schedule daily, e.g. `/etc/cron.d/viapasta`: `15 4 * * * viapasta cd /opt/viapasta && npm run backup -- /var/lib/viapasta/backups >> /var/log/viapasta-backup.log 2>&1`
Copy backups off the server (object storage or another machine) and keep 14–30 days.

**Restore:**
```sh
systemctl stop viapasta
cp /var/lib/viapasta/production.sqlite /var/lib/viapasta/production.sqlite.before-restore
cp /var/lib/viapasta/backups/viapasta-production-YYYY….sqlite /var/lib/viapasta/production.sqlite
rm -f /var/lib/viapasta/production.sqlite-wal /var/lib/viapasta/production.sqlite-shm
cp -r /var/lib/viapasta/backups/uploads-YYYY…/* /var/lib/viapasta/uploads/   # photos, if needed
chown viapasta:viapasta /var/lib/viapasta -R && systemctl start viapasta
```

**Code rollback:** deploy releases into `/opt/viapasta-releases/<version>` and point `/opt/viapasta` (symlink) at the current one. To roll back: take a backup, switch the symlink to the previous release, `systemctl restart viapasta`. Migrations only add tables/columns; if a release added a migration, restore the pre-deploy backup when rolling back past it.

**Migrations:** add `server/db/migrations/00N_name.sql`; they run in order inside a transaction on start (`npm run migrate` to run explicitly). Always back up first.

**Design / menu rollback:** menu changes and themes are drafts until published; every publish is in the audit log with before/after values. "Restore defaults" resets the design.

## 6. Security notes

- Prices, discounts, stock, slots and totals are always recomputed on the server; browser totals are ignored (tested).
- Orders are created with an idempotency key under a write lock — double clicks, retries and two server processes cannot create duplicates (tested).
- Dashboard: scrypt password hashes, server-side sessions (hashed tokens, HttpOnly, SameSite=Strict, Secure in production), CSRF token + origin check on every change, lockout after 8 failed logins, role permissions enforced on the server, audit log of sensitive changes.
- Order status pages need a per-order secret (HttpOnly cookie, or `#k=` fragment that is never sent to servers or logs); wrong token and unknown order are indistinguishable.
- Content-Security-Policy with nonces, `nosniff`, `frame-ancestors 'none'`, HSTS in production, `noindex` outside production.
- Uploads: images only (signature-checked PNG/JPEG/WebP), size and dimension limits, random file names, served from a separate path with no script types.
- Logs contain method, path, status and timing only — no query strings, bodies, names, phones or IPs. Audit log stores a salted hash of the IP.
- Rate limits on ordering, quotes, status checks, webhooks and login (per IP and per email).
- No runtime npm dependencies → no third-party package supply chain in production. Dependency review: Node.js itself only; keep Node 22 LTS patched.
- Privacy: no cookies for analytics; Google Maps loads only when the visitor taps "Show map". The privacy text is a plain-language draft — **have it reviewed against Saudi PDPL by a qualified advisor** before launch.
