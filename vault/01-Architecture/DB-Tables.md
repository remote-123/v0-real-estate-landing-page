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
| `distress_listings` | growing | Daily 06:30 UTC | ✅ Live |
| `bayut_transactions` | 0 | Daily 06:45 UTC | ❌ cron-job.org entry missing |
| `market_briefings` | small | Monday 06:00 UTC | ✅ Live |
| `email_leads` | small | On capture | ✅ Live |
| `reddit_seen_posts` | 0 | Cron | Created 2026-03-21 |
| `reddit_voice_samples` | 0 | Cron | Created 2026-03-21 |

## Support / Mapping
| Table | Rows | Purpose |
|---|---|---|
| `area_name_mapping` | 30 | Bayut→DLD community name bridge |
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
