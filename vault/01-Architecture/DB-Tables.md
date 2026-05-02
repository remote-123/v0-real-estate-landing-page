# Neon DB Tables

## DLD (Static CSV Imports)
| Table | Rows | Status | Last Updated |
|---|---|---|---|
| `dld_transactions` | 1.66M | STALE — latest 2026-02-17 | Manual CSV ingest |
| `dld_projects` | 3,039 | ✅ Ingested | Manual CSV ingest |
| `dld_buildings_registry` | ~168k | ✅ Ingested | Manual CSV ingest |
| `dld_service_charges` | 45k | ✅ Ingested | Manual CSV ingest |
| `dld_areas` | 301 | ✅ Ingested | Manual CSV ingest |
| `dld_units` | 1.27M | Ingesting | Manual CSV ingest |
| `dld_price_index` | 159 | ✅ Ingested | Manual CSV ingest |
| `dld_market_types` | 2 | ✅ Ingested | Manual CSV ingest |
| `dld_transaction_procedures` | 64 | ✅ Ingested | Manual CSV ingest |
| `buildings` | 5,000 | Partial | Manual CSV ingest |

## Live (Cron-Updated)
| Table | Rows | Cron | Status |
|---|---|---|---|
| `rental_listings` | ~1,168 | Daily 06:00 UTC | ✅ Live |
| `distress_listings` | 0 | Daily 06:30 UTC | ⚠️ Table not yet created — run `npm run migrate:missing-tables` |
| `bayut_transactions` | 0 | Daily 06:45 UTC | ❌ cron-job.org entry missing |
| `market_briefings` | small | Monday 06:00 UTC | ✅ Live |
| `email_leads` | 0 | On capture | ⚠️ Table not yet created — run `npm run migrate:missing-tables` |
| `reddit_seen_posts` | 0 | Cron | Created 2026-03-21 |
| `reddit_voice_samples` | 0 | Cron | Created 2026-03-21 |

## Global Buildings Schema (re_* tables — 2026-05-01)
| Table | Rows | Purpose |
|---|---|---|
| `re_cities` | 1 | Dubai (foundation for multi-city expansion) |
| `re_areas` | 298 | Areas from dld_areas, with slugs |
| `re_buildings` | ~7,959 | Enriched buildings with global_slug = `dubai/{area}/{building}` |

## Support / Mapping
| Table | Rows | Purpose |
|---|---|---|
| `area_name_mapping` | 83 | Bayut→DLD community name bridge (expanded 2026-05-01) |
| `bayut_ingest_log` | 0 | Budget tracking per cron run |

## Materialized Views
| View | Source | Status |
|---|---|---|
| `mv_txn_monthly` | `dld_transactions` | ✅ Populated (stale — DLD freeze) |
| `mv_txn_monthly_unified` | DLD + Bayut UNION | ✅ Populated — used by all terminal pages |

## Auth Tables (Better Auth — camelCase columns!)
- `"user"` — id, name, email, emailVerified, image, createdAt, updatedAt
- `"session"` — id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId
- `"account"` — id, accountId, providerId, userId, accessToken, ...
- `"verification"` — id, identifier, value, expiresAt, createdAt, updatedAt

> ⚠️ Old NextAuth `users` table still exists — no longer used.

## Blocked: DLD Staleness
`dld_transactions` frozen at 2026-02-17. Dubai Pulse portal broken remotely — needs in-person fix in Dubai. Affects: market briefing, area momentum freshness, building age matching.
