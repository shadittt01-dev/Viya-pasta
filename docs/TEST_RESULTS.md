# Test results

Executed on 2026-10-09 in a Linux build container (Node.js 22.22, Chromium via Playwright 1.56, SwiftShader software GPU). Nothing below was run against live payment, WhatsApp or delivery providers, real devices, or the production domain.

## Summary

| Suite | Command | Result |
|---|---|---|
| Unit + integration (real HTTP server, temporary SQLite databases, a second server process for cross-process tests) | `npm test` | **66 / 66 passed** |
| Same integration tests through the Turso/libSQL web driver (stand-in server) | `npm run test:remote` | **47 / 47 passed** |
| Real-browser customer & staff journeys (mobile 390 px Arabic, desktop English, tablet, 320 px, no-JS, reduced motion) | `npm run test:browser` | **74 / 74 passed** |
| Preset render verification — every declared preset rendered in Chromium | `npm run test:browser` | **480 / 480 rendered**; 120/120 visual presets produce distinct computed styles; every 3D preset produced non-blank WebGL output (minimum pixel std-dev 12.4); 120/120 motion presets produce no animation under reduced motion; parameter validation rejects bad options, clamps ranges and flags unknown keys |
| QR decoding (same encoder as the base system; not re-run for this build) | ad-hoc, OpenCV `QRCodeDetector` + `QRCodeDetectorAruco` | 100 / 100 generated codes (versions 1–10, levels L/M/Q/H) decoded to the exact URL by at least one decoder; 97/100 by both |
| Production safeguards | manual run with `APP_ENV=production` | refuses to start without a strong `SESSION_SECRET` / https `PUBLIC_URL`; dev routes and sandbox payments return 404; `robots.txt` disallows until `ALLOW_INDEXING=1`; HSTS sent; no test users, coupons or zones in a production database |
| Backup (not re-run for this build) | `npm run backup` | consistent snapshot written, `PRAGMA integrity_check` = ok |

## Unit and integration tests (66)

- ✅ menu prices match the published listing, including every protein combination (minor units)
- ✅ quote: one item and five items give matching counts and totals
- ✅ quote: modifiers price correctly and different variants stay separate
- ✅ quote: required options, invalid options and too many options are rejected
- ✅ server ignores any price sent by the browser
- ✅ expectedTotal mismatch returns PRICE_CHANGED with a fresh quote and creates nothing
- ✅ idempotency: double-click / retry returns the same order; reuse with different content is refused
- ✅ idempotency holds across two server processes sharing the database
- ✅ order snapshot keeps the price paid even after the menu price changes
- ✅ sold-out items and sold-out options cannot be ordered
- ✅ concurrent purchases cannot oversell tracked stock
- ✅ coupons: discount math, minimums, single-use under concurrency, per-customer limit
- ✅ delivery: disabled by default; in-zone, out-of-zone, minimum and free-delivery threshold
- ✅ closed hours and scheduled pickup: ASAP refused when closed, valid slots accepted, invalid slots refused
- ✅ customer validation: name and Saudi mobile formats
- ✅ order status is private: needs the order token; wrong token looks identical to a missing order
- ✅ staff workflow: accept → preparing → ready → collected; illegal transitions are refused; customer sees each step
- ✅ orders appear in the owner inbox; analytics events never store personal data
- ✅ ordering can be paused by the owner
- ✅ online order starts awaiting payment, invisible to the kitchen, with a checkout URL
- ✅ browser redirect alone never marks an order paid
- ✅ webhooks need a valid signature
- ✅ successful payment: verified with the provider, order moves to the kitchen; duplicates are ignored
- ✅ a forged "paid" event is not trusted: status is re-checked with the provider
- ✅ amount mismatch at the provider is rejected
- ✅ declined then retried then paid; a late "failed" event cannot undo a payment (out of order)
- ✅ cancelled at checkout leaves the order retryable; pending stays pending
- ✅ the sandbox checkout page drives the same verified path
- ✅ unpaid orders expire, release holds; a payment arriving after expiry is recorded for refund
- ✅ online payment is not offered when no provider is configured
- ✅ every customer page renders in both languages with correct lang/dir and no server errors
- ✅ menu page shows all 12 items with listed prices, no invented calories; JSON-LD matches
- ✅ staging is kept out of search: robots disallow, noindex meta and header
- ✅ security headers are set on pages
- ✅ static files cannot escape their folders
- ✅ login: wrong password fails; repeated failures lock the account
- ✅ dashboard APIs require a session; mutations require the CSRF token and same origin
- ✅ roles are enforced on the server, not just hidden in the UI
- ✅ menu edits are drafts until published; preview shows drafts only to signed-in staff; publish is audited
- ✅ settings validation rejects unsafe values; WhatsApp cannot be enabled unverified
- ✅ VAT modes: inclusive shows the VAT portion; exclusive adds it
- ✅ campaigns: draft → published → shown in the window only; countdowns need a real deadline
- ✅ uploads: only real images within limits are accepted
- ✅ exports: CSV is protected against spreadsheet formula injection
- ✅ staff management: cannot remove the last owner; deactivation ends sessions
- ✅ design studio: invalid theme drafts are refused; publish requires the owner
- ✅ QR endpoints return decodable images for the canonical URL
- ✅ overnight hours: open at 01:00 after the evening shift, closed at 04:00
- ✅ a day with no hours is closed; only Friday open
- ✅ closures remove time from opening hours
- ✅ slots: ASAP only while open with enough time before cutoff; scheduled slots are aligned
- ✅ timezone maths handles daylight saving zones
- ✅ money: minor units respect each currency exponent
- ✅ money: display drops decimals only for whole amounts
- ✅ money: VAT portion of an inclusive total and rate application
- ✅ cart: identical configurations merge, different ones stay separate
- ✅ cart: quantity edits, removal, editing options merges into an existing line
- ✅ cart: persisted data is normalised and corrupt data is discarded
- ✅ preset registry: exactly 120 per category, 480 total, stable unique ids
- ✅ preset registry: kinds are labelled honestly
- ✅ preset registry: no renamed copies — every preset differs structurally, not only by colour
- ✅ every pattern preset renders a valid, distinct SVG tile
- ✅ parameter validation rejects invalid input and clamps ranges
- ✅ theme: only the chosen presets are shipped; invalid selections fall back safely
- ✅ QR: encoder output has correct size, finder patterns and quiet zone
- ✅ WhatsApp: summary is readable and fully URL-encoded; opening it is only a draft

## Browser checks (74)

- ✅ ar menu is RTL
- ✅ ar menu: no horizontal overflow at 390px
- ✅ loader removed after load
- ✅ add once → badge 1
- ✅ confirmation toast shown, drawer not auto-opened
- ✅ add five times → badge 5
- ✅ five adds merge into one line of 5
- ✅ required option blocks add and explains why
- ✅ nothing was added while the choice was missing
- ✅ price recalculates when quantity changes
- ✅ chicken pesto x2 added → badge 7
- ✅ different variants stay separate lines
- ✅ cart survives refresh
- ✅ drawer subtotal = 5×25 + 2×25 + 1×21 = 196
- ✅ decrease updates badge and subtotal
- ✅ remove line
- ✅ focus stays inside the drawer after removing a line
- ✅ Escape closes the drawer
- ✅ checkout shows the server total: 4×25 + 2×25 = 150
- ✅ checkout: no overflow at 390px
- ✅ network failure shows a recoverable error
- ✅ retry places the order and opens its status page
- ✅ status page shows order number and waiting state
- ✅ cart cleared after order
- ✅ token removed from the address bar
- ✅ exactly one order exists after drop + retry + double-click
- ✅ customer status updates live after staff action
- ✅ dashboard: no console errors
- ✅ language switch goes to /en/menu, LTR
- ✅ mobile journey: no console errors (except the simulated network drop)
- ✅ first Tab reaches the skip link
- ✅ keyboard Enter adds an item
- ✅ drawer opens with keyboard and traps focus inside
- ✅ focus returns to the cart button after closing
- ✅ all internal links resolve
- ✅ desktop /en: no horizontal overflow
- ✅ desktop /en/menu: no horizontal overflow
- ✅ desktop /en/checkout: no horizontal overflow
- ✅ desktop /en/visit: no horizontal overflow
- ✅ desktop /en/help: no horizontal overflow
- ✅ 3D hero mounts on a capable desktop
- ✅ map is not loaded until asked (privacy)
- ✅ map loads on click
- ✅ desktop journey: no console errors
- ✅ reduced motion: page usable, loader gone, static hero shown
- ✅ 3D failure falls back to static art
- ✅ reduced motion: no running animations
- ✅ tablet: no horizontal overflow
- ✅ no JavaScript: loader hides itself by CSS and the menu is readable
- ✅ accessibility basics /ar
- ✅ accessibility basics /ar/menu
- ✅ accessibility basics /ar/menu/viapasta
- ✅ accessibility basics /ar/checkout
- ✅ accessibility basics /ar/visit
- ✅ accessibility basics /ar/help
- ✅ accessibility basics /ar/about
- ✅ accessibility basics /ar/offers
- ✅ accessibility basics /ar/privacy
- ✅ accessibility basics /ar/qr
- ✅ accessibility basics /en
- ✅ accessibility basics /en/menu
- ✅ accessibility basics /en/menu/viapasta
- ✅ accessibility basics /en/checkout
- ✅ accessibility basics /en/visit
- ✅ accessibility basics /en/help
- ✅ accessibility basics /en/about
- ✅ accessibility basics /en/offers
- ✅ accessibility basics /en/privacy
- ✅ accessibility basics /en/qr
- ✅ 320px /ar: no horizontal overflow
- ✅ 320px /ar/menu: no horizontal overflow
- ✅ 320px /ar/checkout: no horizontal overflow
- ✅ 320px /en/visit: no horizontal overflow
- ✅ touch targets ≥ 40px tall on 320px screens

## Performance (measured, not estimated)

Local server, Chromium. "mobile" = 390×844, 4× CPU throttling, ~150 ms latency and ~1 MB/s download emulation; "desktop" = 1366×900, no throttling. Values in ms except CLS, KB and request counts. Fonts were not self-hosted during measurement (system fonts).

| Page | TTFB | FCP | LCP | CLS | Transfer KB | JS KB | Requests |
|---|---|---|---|---|---|---|---|
| mobile /ar | 22 | 1212 | 1212 | 0 | 64 | 41 | 18 |
| mobile /ar/menu | 21 | 752 | 752 | 0 | 50 | 25 | 13 |
| mobile /ar/checkout | 17 | 404 | 404 | 0.005 | 25 | 10 | 18 |
| desktop /ar | 10 | 428 | 428 | 0 | 64 | 41 | 18 |
| desktop /ar/menu | 16 | 228 | 228 | 0 | 50 | 25 | 13 |
| desktop /ar/checkout | 12 | 132 | 132 | 0.002 | 25 | 10 | 18 |

Budgets set for this project: mobile LCP < 2.5 s, CLS < 0.1, checkout JS < 60 KB, home transfer < 300 KB (before photos). All met in this environment. The 3D hero loads after the page is interactive and is excluded from the critical path; it is skipped on low-memory devices, Save-Data and 2G.

## Defects found by testing and fixed

- Checkout script crashed on start (temporal dead zone) → order button stayed disabled. Fixed; covered by browser checks.
- Ordering a single sold-out item reported "cart empty" instead of "sold out". Fixed; covered by integration test.
- Theme fallback for an invalid layout preset returned the wrong shape; motion presets could be assigned to the wrong slot silently. Fixed; unit tests added.
- Horizontal overflow at 390 px on checkout (fieldset min-content, coupon input, closed mobile menu). Fixed; overflow checks on 320/390/820/1366 px.
- Layout shift 0.137 on checkout → 0.005 by reserving space for script-filled sections.
- Missing Arabic/English strings on the order page ("home.directions"). Fixed.
- A stalled animation could delay closing dialogs; motion is now capped and never blocks the interface.
- 3D sign rendered washed-out pink; now renders the exact brand maroon (unlit face).

## Not verified (needs the owner, a provider account or a real device)

- Moyasar live/test API calls and real webhooks (adapter built from public docs; sandbox provider used for lifecycle tests).
- WhatsApp Cloud API delivery; notification webhook to a real endpoint.
- Real iOS Safari / Android Chrome devices, real GPUs, screen readers (VoiceOver/TalkBack) — only automated checks were run.
- QR scanning with a phone camera on the final domain (the domain does not exist yet).
- Self-hosted font files (blocked from this environment; script provided).
- Load testing beyond the concurrency tests (6–8 simultaneous checkouts, two processes).
- Legal review of privacy/terms text (PDPL) and VAT treatment.
