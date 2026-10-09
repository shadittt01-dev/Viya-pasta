# Via Pasta — ordering website & owner dashboard

Bilingual (Arabic-first, RTL / English, LTR) pickup-ordering website for **Via Pasta (ڤيا باستا), Yanbu**, with a server, database, owner dashboard, design studio of 480 presets, and automated tests.

Built from public research (see `docs/RESEARCH.md`). Business facts that were not confirmed by the owner are switched off or flagged in the dashboard's **Launch checklist** — nothing about prices, hours, delivery or payments is invented.

## What's in it

| Area | Summary |
|---|---|
| Customer site | Home, menu (search, sections, sold-out states), item pages, cart drawer, checkout, live order status, offers, visit (hours/map), story, help/FAQ, privacy, terms, menu QR. Arabic + English with a working switch. |
| Ordering | Server-priced quotes, required/optional modifiers, pickup now or scheduled, overnight hours (to 02:00), idempotent order creation, stock reservation, coupons, delivery zones (built, off by default), pay at pickup; online payment via Moyasar (built; needs a merchant account). |
| Dashboard `/admin` | Live order board with sound/browser alerts, accept/prepare/ready/collected, printing, menu editor with draft → preview → publish, sold-out/stock toggles, hours & closures, operations/payments/VAT/WhatsApp, delivery zones, campaigns & coupons, content & SEO, design studio, QR downloads, reports, CSV exports, staff roles, audit log, launch checklist. |
| Design studio | 480 documented presets (120 layouts, 120 real WebGL 3D scenes, 120 interface motions, 120 patterns) with live previews, parameters, search, draft/publish, restore defaults. Customers download only the chosen ones. |

## Put it online (Vercel, free)

Step-by-step, no terminal needed: **[docs/VERCEL.md](docs/VERCEL.md)**. The site runs as a Vercel function, and orders and the menu live in a free Turso database added from the Vercel dashboard.

The same code also runs as a normal Node server (`npm start`), using a local SQLite file. The database layer picks Turso automatically when `TURSO_DATABASE_URL` is set.

## Quick start (development)

Requirements: **Node.js 22.13+** (uses the built-in `node:sqlite`; no npm packages are needed at runtime).

```sh
cp .env.example .env            # then set APP_ENV=development, PUBLIC_URL=http://localhost:3000
npm run dev                     # migrates, seeds business + dev data, starts on :3000
```

- Site: http://localhost:3000 → `/ar` or `/en`
- Dashboard: http://localhost:3000/admin — development accounts are listed in `seed/dev.js` (dev only; never created in production)
- Development sandbox payments: choose “Pay now online” at checkout (enabled by the dev seed) — a clearly labelled fake payment page lets you approve/decline/cancel.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Run the server (uses `.env` / environment) |
| `npm run migrate` | Apply database migrations |
| `npm run seed:business` | Load verified business data into an empty database (production-safe) |
| `npm run seed:dev` | Add test accounts, a TEST delivery zone and TEST coupons (refuses in production) |
| `npm run create-owner` | Create a dashboard account interactively |
| `npm run backup -- /path` | Consistent online backup of the database + uploads |
| `npm test` | 66 automated unit + integration tests (real HTTP server, temporary databases) |
| `npm run test:remote` | Integration tests again, through the Turso (HTTP) database driver against a local stand-in server |
| `npm run test:browser` | 74 real-browser checks + render verification of all 480 presets (needs Python Playwright + Chromium) |
| `npm run fetch-fonts` | Self-host the open-licence fonts (run once with internet access) |
| `node scripts/preset-docs.js` | Regenerate `docs/PRESETS.md` |

## Project structure

```
api/index.js       Vercel function entry (all dynamic requests) — see vercel.json
server/            HTTP app (no framework), routes, domain logic, payments, QR encoder, views
  db/migrations/   SQL schema (STRICT tables, money in minor units)
  domain/          pricing, orders (state machines), hours, zones, coupons, auth, audit, theme, notifications
  payments/        moyasar.js (live adapter), sandbox.js (development only), index.js (verification)
  routes/          site.js (pages), api.js (public JSON), admin.js (dashboard API), webhooks.js, dev.js
  views/           server-rendered HTML (escaped templates)
shared/            browser + server code: money, cart, hours, illustrations, WhatsApp, presets, motion runtime, fx3d engine
public/            css, storefront JS, dashboard JS (admin/), fonts, images
seed/              business.js (verified data) and dev.js (test data) — kept separate
scripts/           migrate, seed, create-user, backup, fetch-fonts, preset-docs
tests/             unit/, integration/ (node --test), browser/ (Playwright)
docs/              research, design, presets, deployment, owner guide, tests, handover
```

## Documentation

- `docs/HANDOVER.md` — status of every area, open owner questions, known issues, costs
- `docs/RESEARCH.md` — sourced facts, confidence, conflicts
- `docs/DESIGN.md` — creative direction, tokens, chosen presets, asset & licence notes
- `docs/PRESETS.md` — the full 480-preset catalogue
- `docs/DEPLOY.md` — hosting, environment, payments, backups, restore, rollback, security
- `docs/OWNER_GUIDE.md` — everyday use of the dashboard (Arabic & English)
- `docs/TEST_RESULTS.md` — what was executed, results, measurements, what could not be verified
