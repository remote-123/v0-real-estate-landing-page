# Bayut14 RapidAPI

## Config
- **Host**: `bayut14.p.rapidapi.com` by `happyendpoint` on RapidAPI
- **Env var**: `BAYUT_RAPIDAPI_KEY`
- **Budget**: 900 req/month
- **Cron**: Daily 06:45 UTC — 25 pages/day (12 for-sale + 13 for-rent) = 750/mo

## Why
Previous Bayut API (ApiDojo) discontinued 2026-03-21.
PropertyFinder still active (`RAPIDAPI_KEY`, 700/mo).
Bayut14 = rolling fresh window for transactions (DLD CSV always lags weeks/months).

## Key Transaction Fields
| Bayut Field | DLD Equivalent |
|---|---|
| `transaction_hash_id` | (unique Bayut PK) |
| `date_transaction_nk` | `instance_date` |
| `transaction_amount` | `actual_worth` |
| `transaction_per_sqm_amount` | `meter_sale_price` |
| `builtup_area_sqm` | `procedure_area` |
| `beds` | `rooms_en` (numeric, not "2 B/R" format) |
| `bayut_location_l3_name_en` | `area_name_en` (different taxonomy!) |
| `latitude` / `longitude` | GPS coords ✅ |
| `property_completion_status_sk` | "off-plan" \| "ready" \| "na" |
| `transaction_category_l1_name` | "Sales" \| "Rent" |

## Integration Files
- `lib/bayut14.ts` — API client, transformer, beds→rooms_en normaliser
- `app/api/cron/fetch-bayut-transactions/route.ts` — daily cron
- `scripts/migrate/005_bayut_integration.ts` — created tables

## Unified View
`mv_txn_monthly_unified` = DLD all months UNION Bayut months ≥ 2026-03-01
All terminal pages query this view.

## Known Issue
`bayut_transactions` table has 0 rows — cron-job.org entry missing.
Need: GET `/api/cron/fetch-bayut-transactions` Bearer CRON_SECRET at 06:45 UTC.
