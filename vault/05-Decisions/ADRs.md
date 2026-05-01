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

## ADR-005 — Single CRON_SECRET (2026-03-25)
**Decision**: Consolidate CRON_SECRET2 (used for fetch-listings) into single CRON_SECRET.
**Why**: fetch-listings route removed, replaced by fetch-rental-listings. No need for second secret.
**Status**: Complete.
