# Project Memory

## nc_buildings — Single Source of Truth (LIVE, migration 013 done)
→ `memory/project_nc_buildings.md` — 5,799 rows. Migration 013 added status/global_slug/osm_lat/osm_lng (backfilled). Terminal /terminal/buildings queries nc_buildings+nc_areas only — no runtime JOINs. /terminal/prop-buildings redirects here.

## nc_areas — Canonical Area Table (LIVE)
→ `memory/project_nc_areas.md` — 65 Dubai communities, DLD name → retail name mapping. mv_txn_monthly_unified rebuilt to join through it. Bayut removed.

## PropSearch Scraper (resume after DB migration)
→ `memory/project_propsearch_scraper.md` — 3-stage propsearch.ae scraper built but never completed. Keep all code. Resume after DO migration.

## DB: DigitalOcean Managed Postgres
→ `memory/project_db_migration.md` — DO cluster `main-postgres`, nyc1, PG17, $15/mo. DB = `defaultdb`. DATABASE_URL updated in Vercel + .env.local. Neon fully removed.

## Workflow: wait for local verify before push
→ `memory/feedback_commit_workflow.md` — never commit+push until user confirms locally.

## Auth System (NextAuth v5 — fully working 2026-06-18)
→ `memory/project_auth.md` — Google OAuth, pg adapter on DO. Critical: /sign-in must NOT be in proxy.ts NORTHCAPITAL_ONLY_PATHS (OAuth callback domain mismatch). SSL fix in auth.ts + lib/db.ts.

## Architecture
→ see CLAUDE.md and vault/01-Architecture/

## Sanity Client Guard Pattern
Sanity env vars on Vercel may be stale/invalid (not just missing). `sanity/lib/client.ts` validates projectId with regex before `createClient`, exports `null` when invalid. All pages importing `client` must guard with `client ? client.fetch(...) : fallback`. `sanity.config.ts` uses `'placeholder'` fallback for `defineConfig`.

## Vercel Fluid CPU — prop-buildings redirect fix (2026-06-30)
Replaced serverless `redirect()` in `app/terminal/prop-buildings/` with CDN-level wildcard 301s in `next.config.mjs`. ~87.5% of Fluid CPU hits were these redirects. Deleted the old redirect pages. Monitor July billing cycle to confirm reduction.

## DLD Transactions Refresh (2026-10-03)
Dubai Pulse portal is gone — DLD data now on **data.dubai** (dataset id `470061`), has an official API-key request path. `dld_transactions` latest `instance_date` was stuck at 2026-06-18 (3.5mo stale); refreshed via manually-exported CSV + new `scripts/ingest/dld_transactions_csv_v2.ts` (mirrors `/api/admin/ingest-transactions` upsert logic for local bulk loads). Now current through 2026-10-03. `mv_txn_monthly`/`mv_txn_monthly_unified` refreshed too — still needs explicit `REFRESH MATERIALIZED VIEW` after every load, not automatic. Refresh is manual for now; no weekly automation yet.

## Telegram Pipelines (REMOVED)
Removed all Telegram content/digest automation (ops-digest, telegram-distress-digest, cofounder-heartbeat, xpost approval flow). Keep only: `lib/telegram.ts` sendTelegramError() for error alerting, and the Telegram MCP plugin for Claude sessions.
