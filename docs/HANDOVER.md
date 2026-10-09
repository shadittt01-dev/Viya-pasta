# Handover status — Via Pasta (ڤيا باستا) website

Prepared 2026-10-09. Statuses: **Verified** (built and tested here) · **Awaiting owner information** · **Awaiting integration access** · **Blocked**.

This is a complete, tested application ready for a **staging** deployment. It is **not production-ready** until the owner confirms the open facts below and the launch checklist (Dashboard → Launch checklist) is complete.

## Status by area

| Area | Status | Notes |
|---|---|---|
| Menu and prices (12 dishes, 19 listed price points) | **Verified** against the Google Maps listing | Calories are not published (required in Saudi Arabia) and the Arabic names are translations; both are flagged for owner review |
| Arabic/English site, RTL/LTR, all pages | **Verified** | 74 browser checks; contrast, labels, keyboard, reduced motion, 320–1366 px |
| Cart (add/merge/variants/edit/remove/persist) | **Verified** | |
| Server pricing, validation, idempotent checkout, stock, coupons | **Verified** | incl. concurrency and two-process tests |
| Pickup ordering, scheduling, overnight hours, closures | **Verified** (logic) · **Awaiting owner information** (all opening times) | Seeded 13:00–02:00 daily as a placeholder; only the 2 AM closing is public |
| Order status page & live updates | **Verified** | |
| Owner dashboard (orders, menu drafts/publish, hours, operations, campaigns, content, design, QR, reports, exports, staff, audit) | **Verified** | |
| Pay at the counter | **Verified** (flow) · **Awaiting owner information** (cash? card terminal?) | Shown as "Pay at the counter"; methods listed once confirmed |
| Online payment (Moyasar) | **Awaiting integration access** | Lifecycle verified with the dev sandbox; Moyasar adapter untested against Moyasar (needs merchant account + test keys) |
| Delivery (zones, fees, minimum, free threshold, drivers) | **Verified** (logic) · **Awaiting owner information** | Off by default — the listing says delivery exists but not who delivers, where, or for what fee |
| WhatsApp | **Awaiting owner information** | Click-to-chat drafts built and tested; enabled only once the number is verified on WhatsApp. Automated messages need WhatsApp Cloud API access |
| Notifications (webhook / WhatsApp Cloud) | **Awaiting integration access** | Outbox with retries and de-duplication built; no endpoint configured |
| VAT | **Awaiting owner information** | None / inclusive / exclusive modes built and tested; VAT number field |
| Branding (logo, colours, English name) | **Awaiting owner information** | No logo was public: a street-plaque text wordmark and an Italian palette are used until the owner supplies theirs |
| Photos | **Awaiting owner information** | Illustrations used; owner photos with reuse rights can be uploaded per item |
| Domain, hosting, TLS, indexing | **Awaiting owner information** | QR codes are labelled "preview" until the live domain exists |
| Fonts self-hosting | **Blocked** in this build environment | Run `npm run fetch-fonts` once on any machine with internet |
| Privacy policy / terms | **Awaiting owner information** + legal review | Plain-language drafts marked "needs review" |
| 480-preset design studio | **Verified** | All 480 rendered in Chromium; see `docs/PRESETS.md` |

## Questions for the owner (one conversation)

See `docs/RESEARCH.md` §5. Most important: opening hours, calories, logo and photos, and whether to offer delivery.

## Known issues / limitations

- One branch is configured. The data model supports branch-specific prices/availability, but the customer UI has no branch picker (not needed for one shop).
- Driver live location is intentionally not shown (no real location source). Delivery status is updated by staff.
- Reports count accepted/completed orders placed through this site only — not walk-in sales.
- Rate limits and the live dashboard stream are per process: run one app process per database.
- Arabic headings use Readex Pro; until fonts are self-hosted, devices fall back to their system Arabic font.
- The development sandbox payment page is a fake provider for testing; it is disabled in production.

## Recurring costs (estimates — verify before committing)

| Item | Estimate |
|---|---|
| Hosting (small VPS or Node host with disk) | ≈ USD 5–15 / month (unverified) |
| Domain | ≈ USD 10–40 / year (unverified; `.sa` has its own rules) |
| TLS | free (Let's Encrypt) |
| Moyasar | per-transaction fees, no build-time cost (ask Moyasar) |
| WhatsApp Cloud API (optional) | per-conversation pricing (ask Meta) |
| Runtime software licences | none — Node.js only; fonts are SIL OFL |

## Package contents

See `README.md` for structure and commands; `docs/DEPLOY.md` for setup, environment, payments, backups, restore and rollback; `docs/OWNER_GUIDE.md` for everyday use; `docs/TEST_RESULTS.md` for what was executed; `docs/RESEARCH.md` for sources; `docs/DESIGN.md` for direction, tokens and asset licences; `docs/PRESETS.md` for the catalogue.
