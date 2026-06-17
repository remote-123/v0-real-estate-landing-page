# Architecture Decision Records

## ADR-001 — Neon over Supabase (2026-03-21)
**Decision**: Migrate from Supabase to Neon PostgreSQL.
**Why**: Supabase deprecated for this project. Neon integrates directly with Vercel, simpler connection pooling, same PostgreSQL.
**Status**: Complete. Supabase project (artosxdjedjlexnzfgun) still has data but app reads/writes Neon exclusively.

## ADR-002 — Better Auth over NextAuth (2026-04-07)
**Decision**: Replace next-auth v5 beta with better-auth v1.
**Why**: NextAuth v5 beta was unstable. Better Auth has cleaner API, postgres adapter, same Google OAuth support.
**Status**: Complete. Tables use camelCase columns (quoted in Postgres).
**Known issue**: @better-auth/infra dashboard plugin incompatible — skip until fixed.

## ADR-003 — Bayut14 as DLD Freshness Layer (2026-04-07)
**Decision**: Add Bayut14 RapidAPI as rolling fresh window on top of stale DLD CSVs.
**Why**: DLD CSV portal broken remotely. Bayut14 provides up-to-April data.
**Status**: Integration complete. `mv_txn_monthly_unified` = DLD historical + Bayut rolling. Cron-job.org trigger still missing.

## ADR-004 — thecityregistry.com as Separate Brand (2026-05-01)
**Decision**: Split data platform into separate brand on same codebase via middleware.
**Why**: Terminal traffic outpacing agency site. Acquisition positioning — PropTech buyers (Bayut, CoStar, REA Group) want "the data platform" not "the agency with a dashboard".
**Status**: Live. Middleware, layout, SEO, Google Search Console all configured.

## ADR-006 — Full Domain Split: Agency vs Data Platform (2026-05-01)
**Decision**: Hard split the two domains. NorthCapital = agency only. City Registry = data platform only.
**Why**: Running both with identical terminal pages causes SEO cannibalization and brand confusion. Two distinct audiences, two distinct conversion goals.
**NorthCapital DXB** (agency/conversion):
- Remove `/terminal/*` — 301 redirect all terminal URLs → thecityregistry.com/terminal/*
- Keep: homepage, blog (agency/project news only), contact, about, agent roster, off-plan project showcase
- CTAs: WhatsApp, book viewing, lead gen
- SEO angle: "Dubai property investment agency", developer launches

**The City Registry** (data platform/authority):
- Terminal is the entire product
- Add thin landing page before terminal (explains platform, email capture)
- Blog moves here — data-driven market analysis fits this brand
- Small footer link → northcapitaldxb.com for investment enquiries
- SEO angle: "Dubai real estate data", "property market intelligence"

**Flow**: City Registry builds audience + SEO authority → warm leads funnel to NorthCapital for conversion.
**Status**: Decision made. Not yet implemented.

## ADR-007 — DB Migration: Neon → Railway or DigitalOcean (2026-06-17)
**Decision**: Under evaluation. Migrate away from Neon due to CU-hour billing model.
**Why**: Neon charges $0.106/CU-hour. With 7+ daily crons + Telegram webhooks + terminal page renders, compute never fully sleeps. Bill accumulates even on low traffic. Caching (`unstable_cache`) reduced but didn't eliminate cost.
**DB size**: ~1.3GB total (dld_transactions 788MB + dld_units 424MB dominate — static ingested data).
**Candidates evaluated**:

| Option | Cost | Pooling | Latency (vs Vercel iad1) | Ops burden |
|---|---|---|---|---|
| Railway Postgres | ~$5-15/mo usage | Built-in | Low (US East) | None |
| DigitalOcean Managed | $15/mo flat | pgBouncer | Low (NYC1) | Minimal |
| Hetzner + self-hosted | ~€5-8/mo | Manual PgBouncer | High (EU-only) | High |
| Supabase Pro | $25/mo flat | pgBouncer | Low (US East) | None |

**Railway vs DigitalOcean**:
- Railway: usage-based billing (cheaper at low traffic, unpredictable at spikes), better DX, instant provisioning, no dashboard complexity
- DigitalOcean: flat $15/mo regardless of query count, more mature managed DB product, manual pgBouncer pool setup needed for Vercel serverless scale

**Recommendation**: Railway for now (cheapest, lowest friction). Switch to DO Managed if monthly bill exceeds $15 or connection issues appear under user load.
**Migration**: `pg_dump` Neon → `pg_restore` target → swap `DATABASE_URL` in Vercel env → redeploy. No code changes except possibly `lib/db.ts` SSL flag.
**Status**: Decision pending. Not yet migrated.

## ADR-005 — Single CRON_SECRET (2026-03-25)
**Decision**: Consolidate CRON_SECRET2 (used for fetch-listings) into single CRON_SECRET.
**Why**: fetch-listings route removed, replaced by fetch-rental-listings. No need for second secret.
**Status**: Complete.
