# Terminal Product Roadmap

> Source: `docs/TERMINAL_ROADMAP.md` — last updated 2026-03-08

## Vision
Data-first intelligence for HNW/institutional investors allocating capital into Dubai RE. Every page answers a question a portfolio manager would ask before writing a cheque — not before renting a flat.

## Phase 1 — Quick Wins ✅ COMPLETE
*Small tables, no heavy joins, fast build.*

| Page | Route | Status |
|---|---|---|
| Dubai Residential Price Index | `/terminal/price-index` | ✅ Live |
| Off-Plan Supply Pipeline | `/terminal/supply-pipeline` | ✅ Live |
| Service Charge Intelligence | `/terminal/service-charges` | ✅ Live |

## Phase 2 — Core Analytics ✅ COMPLETE
*Require queries on dld_transactions (1.66M rows) via mat views.*

| Page | Route | Status |
|---|---|---|
| Transaction Pulse | `/terminal/transaction-pulse` | ✅ Live |
| Community Screener (real data) | `/terminal/communities` | ✅ Live |
| Yield Map | `/terminal/yield-map` | ✅ Live |
| Area Momentum | `/terminal/area-momentum` | ✅ Live |
| Floor Plan Pricer | `/terminal/floor-plan-pricer` | ✅ Live |
| Rental Yield Decay | `/terminal/rental-yield-decay` | ✅ Live |
| Building Comparator | `/terminal/building-comparator` | ✅ Live |

## Phase 3 — Advanced Intelligence
*Multi-table joins, pre-computed signals.*

| Page | Route | Priority | Status |
|---|---|---|---|
| Developer Track Record | `/terminal/developer-track` | P2 | ✅ Built (not in sidebar) |
| Mortgage & Liquidity Scanner | `/terminal/liquidity` | P3 | ❌ Not built |

## Access Gating Plan (not yet implemented)
- Phase 1 pages: public (SEO/discovery)
- Phase 2 pages: gate behind free email signup
- Phase 3 pages: gate behind paid tier or verified HNW (booking a call unlocks)

## Performance Rules
- Never query `dld_transactions` raw from a page component
- All aggregations via `mv_txn_monthly` or `mv_txn_monthly_unified`
- ISR: `revalidate = 3600` (1hr) for most terminal pages
- `force-dynamic` for pages needing fresh data
- No client-side GROUP BY — all aggregation in Postgres

## Competitive Moat
- DXB.RE — listing aggregator (no investment analytics)
- Property Monitor — agent-facing CRM analytics
- Bayut — consumer portal

None show investment-grade signals (yield, supply risk, developer track record, liquidity) backed by DLD data.
