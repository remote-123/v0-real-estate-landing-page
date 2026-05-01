# Ingestion Scripts

All scripts: `npm run ingest:*` — reads CSV from `dld_data/` (gitignored).

## Commands
| Command | Source CSV | Target Table |
|---|---|---|
| `npm run ingest:buildings` | DM building summary CSV | `buildings` |
| `npm run ingest:dld-projects` | DLD Projects + Buildings CSVs | `dld_projects` |
| `npm run ingest:dld-areas` | `dld_data/1dld_lkp_areas.csv` | `dld_areas` |
| `npm run ingest:dld-market-types` | `dld_data/3Lkp_Market_Types.csv` | `dld_market_types` |
| `npm run ingest:dld-procedures` | `dld_data/2Lkp_Transaction_Procedures.csv` | `dld_transaction_procedures` |
| `npm run ingest:dld-price-index` | `dld_data/dld_residential.csv` | `dld_price_index` |
| `npm run ingest:dld-service-charges` | `dld_data/dld_service_charge.csv` | `dld_service_charges` |
| `npm run ingest:dld-buildings-registry` | `dld_data/dld_buildings.csv` | `dld_buildings_registry` |
| `npm run ingest:dld-transactions` | `dld_data/dubai_transactions.csv` | `dld_transactions` |
| `npm run ingest:dld-units` | `dld_data/dld_units.csv` | `dld_units` |

## After Ingesting Transactions — Refresh Mat View
```sql
REFRESH MATERIALIZED VIEW mv_txn_monthly;
REFRESH MATERIALIZED VIEW mv_txn_monthly_unified;
```

## Blocked: Dubai Pulse Portal
Dubai Pulse portal broken remotely. Can't download new CSVs until in-person in Dubai.
Affects: `dld_transactions` (stale at 2026-02-17), `dld_buildings` (building age data).

## When Unblocked (in Dubai)
1. Download `dubai_transactions.csv` → run `npm run ingest:dld-transactions`
2. Download `dld_buildings.csv` → check for `dld_building_nk` / `tabu_*` column
3. Refresh both mat views
4. Check `dld_units` for new rows
