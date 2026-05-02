# Open Actions & Backlog

> Source: `docs/HUMAN_ACTIONS_REQUIRED.md` — last updated 2026-05-01
> Check this doc for current status — items may be stale.

## P0 — Blocked (In-Person Required)
- [ ] **Fresh DLD transaction data** — visit DLD in Dubai in person
  - Current CSV stale (latest `instance_date` Feb 2026)
  - Goal: direct data feed / bulk export agreement with DLD
  - Ask about: API access, `dld_building_nk` key, data licensing for commercial use
  - Blocks: area momentum freshness (still uses stale DLD for absolute dates), building age matching
  - NOTE (2026-05-02): Market briefing, rental yield, ROI engine, distress deals, floor-plan pricer
    now all migrated to mv_txn_monthly_unified — these work with fresh Bayut data. Only building-
    level pages (building comparator trend lines) still depend on raw dld_transactions.

## P1 — Live Feature Blockers
- [ ] **Add Bayut cron to cron-job.org**: `GET /api/cron/fetch-bayut-transactions` Bearer CRON_SECRET at 06:45 UTC — `bayut_transactions` has 0 rows because this was never added
- [ ] **Register Telegram bot commands** via BotFather `/setcommands`: `leads`, `briefing`, `area`, `distress`, `price` — CODE BUILT Cycle 32 (2026-05-02). Human action: register via BotFather.
  - `leads` — Lead report (email + WhatsApp)
  - `briefing` — Latest market briefing preview
  - `area [name]` — Area PSF + YoY% + 12m transactions
  - `distress` — Top 5 confirmed distress deals
  - `price [area] [beds]` — Rolling 12m avg PSF by area + bedroom type
- [ ] **Test Admin Dashboard** at `/admin/dashboard?passcode=ADMIN_PASSCODE`

## P2 — Auth & OAuth
- [ ] **Add Better Auth env vars to Vercel** (if not done):
  - `BETTER_AUTH_SECRET` (run: `openssl rand -base64 32`)
  - `BETTER_AUTH_URL` = `https://www.northcapitaldxb.com`
- [ ] **Update Google OAuth redirect URI** in Google Cloud Console: `https://www.northcapitaldxb.com/api/auth/callback/google`
- [ ] **Apple Sign-In** — needs Apple Developer account, App ID, Services ID
- [ ] **LinkedIn Sign-In** — needs LinkedIn Developer app

## P3 — Terminal Features
- [x] **Unit Registry** `/terminal/unit-registry` — BUILT + gated (Cycle 31 2026-05-02): 1.27M dld_units rows, 7 filters (project/area/rooms/floor/sqm), freehold flag, parking, CSV export, 13 tests.
- [x] **Comparable Sales Search** `/terminal/transaction-search` — BUILT + gated (Cycle 30 2026-05-02): 8-filter form, 1.66M DLD rows, 5 free / 50 auth, CSV export, 12 tests. Uses `new URL(req.url)` not `req.nextUrl` for test compat.
- [x] **Market Pulse** `/terminal/market-pulse` — BUILT + gated (Cycle 29 2026-05-02): Consolidated dashboard — KPIs, top 5 bull signals, top 5 bear signals (free), volume leaders + pipeline risk (gated). 5 parallel SQL queries, scoreBar progress bars, cross-links.
- [x] **Bull Case Screener** `/terminal/bull-cases` — BUILT + gated (Cycle 27 2026-05-02): Bull Score (appreciation + volume + scarcity), cross-linked with bear-cases
- [x] **Bear Case Screener** `/terminal/bear-cases` — BUILT + gated (Cycle 26 2026-05-02): Bear Score formula, 5-CTE SQL, signal badges, row-gated 5 free rows
- [x] **Liquidity Scanner** `/terminal/liquidity` — BUILT + gated (as of 2026-05)
- [x] **Researcher automation** `/admin/automations/researcher` — BUILT with Gemini 2.5 Flash, 8 query types (as of 2026-05-02)
- [x] **Access gating — ALL data terminal pages** — DONE 2026-05-02 (Cycles 11+19+20): distress-deals, off-plan-pipeline, communities, rental-drops, floor-plan-pricer, service-charges, yield-map, area-momentum, building-comparator, supply-pipeline, developer-track, transaction-pulse, buildings, liquidity
- [x] **Market Briefing table + seed** — `market_briefings` table created, first briefing seeded May 2 2026, Monday 06:00 UTC cron ready (Cycle 17)
- [x] **Dynamic area list** — `/api/area-list` endpoint, `CompareClient` now fetches top-100 DLD areas by volume instead of hardcoded 40 (Cycle 18)
- [ ] **Add market-briefing cron to cron-job.org**: `GET /api/cron/generate-market-briefing` Bearer CRON_SECRET — Monday 06:00 UTC

## SEO (Done 2026-05-01)
- [x] thecityregistry.com sitemap, robots.txt, meta tags, schema.org
- [x] Google Search Console TXT record + meta tag verification
- [ ] Submit sitemap in Search Console dashboard

## Testing (Added 2026-05-02)
- [x] **Vitest test infrastructure** — BUILT Cycle 25: vitest.config.ts, 5 test files, 44 passing tests. `npm test` command. Coverage: lib/area-names, lib/rate-limit, api/unsubscribe, api/email-capture, api/telegram-webhook.
- [x] **Expand test coverage — cron routes (Cycle 28 2026-05-02)**: generate-market-briefing (7), fetch-bayut-transactions (11), weekly-distress-digest (15). 73 total tests passing.
- [x] **Expand test coverage — lib utilities (Cycle 33 2026-05-02)**: terminal-gate (13 tests), telegram (17 tests). 140 total tests passing.
- [ ] **Expand test coverage**: component tests, db utility functions (api-budget, bayut14)

## Known Risks / Tech Debt
- `whatsapp_intents.created_at` — column existence assumed in Telegram `/leads` command handler. Test documents this assumption. Verify schema when checking whatsapp_intents table.

## Backlog Ideas (from MEGA_IDEAS)
- Pascal Editor (3D floor plan viewer) — integrate on building comparator
- [x] **Rental yield calculator** `/tools/rental-yield-calculator` — BUILT 2026-05-02 (live benchmarks, JSON-LD, FAQ schema, sitemap)
- [x] **Service charge estimator** `/tools/service-charge-estimator` — BUILT 2026-05-02 (Cycle 12): typeahead, YoY budget trend, per-unit + AED/sqft estimates, category breakdown
- [x] **Email gate on Phase 2 terminal pages** — BUILT 2026-05-02 (Cycle 11): inline email form overlay, cookie unlock, router.refresh() re-render
- [x] **Weekly distress deal email alert system** — BUILT + improved (Cycle 24 2026-05-02): proper institutional HTML email template with deal cards, tier badges, PSF discount %; Telegram /leads bug fixed (subscribed_at)
