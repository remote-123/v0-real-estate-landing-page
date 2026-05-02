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
- [ ] **Register Telegram bot commands** via BotFather `/setcommands`: `leads`, `briefing`
- [ ] **Test Admin Dashboard** at `/admin/dashboard?passcode=ADMIN_PASSCODE`

## P2 — Auth & OAuth
- [ ] **Add Better Auth env vars to Vercel** (if not done):
  - `BETTER_AUTH_SECRET` (run: `openssl rand -base64 32`)
  - `BETTER_AUTH_URL` = `https://www.northcapitaldxb.com`
- [ ] **Update Google OAuth redirect URI** in Google Cloud Console: `https://www.northcapitaldxb.com/api/auth/callback/google`
- [ ] **Apple Sign-In** — needs Apple Developer account, App ID, Services ID
- [ ] **LinkedIn Sign-In** — needs LinkedIn Developer app

## P3 — Terminal Features
- [x] **Liquidity Scanner** `/terminal/liquidity` — BUILT (as of 2026-05)
- [x] **Researcher automation** `/admin/automations/researcher` — BUILT with Gemini 2.5 Flash, 8 query types (as of 2026-05-02)
- [x] **Access gating** — Phase 2 pages gated: distress-deals, off-plan-pipeline, communities, rental-drops, floor-plan-pricer, service-charges, yield-map, area-momentum, building-comparator

## SEO (Done 2026-05-01)
- [x] thecityregistry.com sitemap, robots.txt, meta tags, schema.org
- [x] Google Search Console TXT record + meta tag verification
- [ ] Submit sitemap in Search Console dashboard

## Backlog Ideas (from MEGA_IDEAS)
- Pascal Editor (3D floor plan viewer) — integrate on building comparator
- Free tools for organic traffic (yield calculator, service charge estimator)
- Email gate on Phase 2 terminal pages
- Weekly distress deal email alert system
