# Terminal Pages

All pages: `/terminal/*` — server components, query Neon directly via `sql` from `@/lib/db`.
All pages query `mv_txn_monthly_unified` (DLD + Bayut UNION).

## Layout
- `app/terminal/layout.tsx` — sidebar + header, dynamic metadata per domain
- `components/terminal/sidebar.tsx` — links, brand name swap
- `components/terminal/mobile-nav.tsx` — mobile sheet nav

## UI Patterns
- Dark card aesthetic: `border-border/40 bg-card/40`
- Muted text: `text-muted-foreground`, accent green: `emerald-500`
- Page header: `<h1>` with `text-[10px] uppercase tracking-widest` label + large bold title
- StatCard: `components/terminal/stat-card.tsx` — props: label, value, trend, trendDir, icon, description
- Charts: Recharts `ResponsiveContainer`

## Phase 1 Pages ✅
| Page | Route | Key Component |
|---|---|---|
| Price Index | `/terminal/price-index` | — |
| Supply Pipeline | `/terminal/supply-pipeline` | — |
| Service Charges | `/terminal/service-charges` | — |

## Phase 2 Pages ✅
| Page | Route | Key Components |
|---|---|---|
| Transaction Pulse | `/terminal/transaction-pulse` | `transaction-pulse-chart.tsx`, `transaction-heatmap.tsx` |
| Communities | `/terminal/communities` | force-dynamic, real DLD data |
| Community [slug] | `/terminal/communities/[slug]` | — |
| Yield Map | `/terminal/yield-map` | `yield-map-table.tsx` |
| Area Momentum | `/terminal/area-momentum` | momentum_score = (price_delta + vol_delta) × 50 |
| Floor Plan Pricer | `/terminal/floor-plan-pricer` | `pricer-controls.tsx`, P10–P90 distribution |
| Rental Yield Decay | `/terminal/rental-yield-decay` | `yield-decay-controls.tsx` |
| Building Comparator | `/terminal/building-comparator` | dual typeahead, PSM trend chart |

## Phase 2 (Active Data)
| Page | Route | Data Source |
|---|---|---|
| Distress Deals | `/terminal/distress-deals` | `distress_listings` (PF cron) |
| Rental Drops | `/terminal/rental-drops` | `rental_listings` (PF cron) |
| Buildings | `/terminal/buildings` | `nc_buildings` (single source of truth) + `nc_areas` — server-side pagination, filters (status/grade/type/freehold/year), GradeBadge/StatusBadge. `/terminal/prop-buildings` redirects here. |

## Tools
| Page | Route |
|---|---|
| ROI Engine | `/terminal/roi-engine` |
| Mortgage Calculator | `/terminal/mortgage-calculator` |
| Rental Yield | `/terminal/rental-yield` |

## Dynamic Detail Pages
| Page | Route | Data Source | Notes |
|---|---|---|---|
| Area Deep-Dive | `/terminal/areas/[slug]` | `mv_txn_monthly_unified` | ISR revalidate=3600; top 50 pre-rendered; 6 stat cards: PSF, MoM, YoY, Deals 12M, Distress, Pipeline |
| Community | `/terminal/communities/[slug]` | `mv_txn_monthly_unified` | — |
| Building | `/terminal/buildings/[...slug]` | `buildings` + `dld_buildings_registry` + `dld_service_charges` | ApartmentComplex schema |

## Phase 3 (Planned)
- `/terminal/liquidity` — Mortgage & Liquidity Scanner (EXISTS — built but gated)
- `/terminal/developer-track` — EXISTS and live

## Sidebar Links
Edit `sidebarLinks` array in `components/terminal/sidebar.tsx` to add new pages.
