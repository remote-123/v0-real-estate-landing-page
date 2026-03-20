# NorthCapital DXB Terminal — Product Roadmap

## Vision

The NorthCapital DXB Terminal is a data-first intelligence layer for HNW and institutional investors
allocating capital into Dubai real estate. Unlike DXB.RE (listing aggregator), Property Monitor
(agent-facing CRM analytics), or Bayut (consumer portal), the terminal is built around investment
decisions — yield discovery, capital deployment timing, supply-risk assessment, and exit liquidity.
Every page answers a specific question a portfolio manager would ask before writing a cheque, not
before renting a flat. All data is sourced directly from DLD (the only authoritative record in the
emirate), enriched with live listing signals, and presented in the visual language of a financial
terminal — not a property portal.

---

## Current Terminal (v1)

| Page | Route | Status | Data Source | Notes |
|---|---|---|---|---|
| Market Intelligence Hub | `/terminal` | Live | Sanity CMS | Category grid with Sanity-managed metrics; DUBAIRESI token + DFM index ticker; UAE base rate card |
| Distress Deals | `/terminal/distress-deals` | Live | RapidAPI (Bayut + PF) | Live listing feed; "distress" discount is synthetic/estimated — not real DLD price-cut data |
| ROI Engine | `/terminal/roi-engine` | Live | Manual inputs | Static yield calculator; no live data binding |
| Community Screener | `/terminal/communities` | Live (mock) | `rental_listings` (partial) + MOCK_COMMUNITIES | Table of communities; yield is estimated (annual_rent / price_per_sqft heuristic); MoM change is random; transactions30d is approximated; community detail page uses 100% mock data |
| Community Detail | `/terminal/communities/[slug]` | Live (mock) | MOCK_COMMUNITIES | All charts and transactions are generated from mock helpers; says "DLD integration coming" inline |
| Category Drill-Down | `/terminal/[category]` | Live | Sanity CMS | Static content cards from Sanity; no live data |
| Rental Drops | `/terminal/rental-drops` | Live (limited) | `rental_listings` (248 rows) + `buildings` | Shows live listings; building age match is fuzzy and broken for phased developments |

**Key v1 gaps:**
- Community Screener and detail pages are backed by mock data — yields and MoM are not real
- Distress discount calculation is synthetic (pseudo-random based on property ID)
- No time-series charts backed by real DLD data
- No sales transaction data (only rentals ingested so far)
- No supply pipeline data connected to real DLD projects table

---

## Data Foundation

| Table | Rows | Freshness | Key Columns for Terminal |
|---|---|---|---|
| `rental_listings` | 248 | Daily cron (Bayut + PF) | `area`, `cluster`, `type`, `bedrooms`, `size_sqft`, `annual_price`, `price_per_sqft`, `listed_at` |
| `buildings` | 5,000 | Static (DM registry) | `community_name`, `construction_year`, `typical_floors`, `building_type` |
| `dld_projects` | 3,039 | Static (last ingest) | `project_name`, `area`, `developer`, `status`, `completion_date`, `percent_completed`, `no_of_units` |
| `dld_transactions` | 1.66M | Being ingested | `instance_date`, `area_name_en`, `trans_group_en`, `property_type_en`, `rooms_en`, `procedure_area`, `actual_worth`, `meter_sale_price`, `rent_value`, `meter_rent_price`, `nearest_metro_en`, `nearest_mall_en`, `master_project_en` |
| `dld_units` | 2.38M | Being ingested | `property_id`, `area_name_en`, `project_name_en`, `master_project_en`, `rooms_en`, `actual_area`, `floor`, `property_type_en`, `property_sub_type_en`, `is_free_hold` |
| `dld_buildings_registry` | 243k | Being ingested | Building names, areas, linked projects |
| `dld_service_charges` | 91k | Being ingested | `service_cost`, `project_name`, `budget_year`, `service_category`, `master_community`, `management_company` |
| `dld_price_index` | 159 | Being ingested | `flat_monthly_index`, `villa_monthly_index`, `all_monthly_price_index` (monthly from 2011) |
| `dld_areas` | 301 | Being ingested | Area lookup with municipality numbers |
| `dld_transaction_procedures` | 64 | Static | Procedure type taxonomy |

---

## Roadmap

---

### Phase 1 — Quick Wins
*Use `dld_price_index`, `dld_projects`, `dld_service_charges` — no heavy joins on 1.66M rows. Build time: 3-5 days each.*

---

#### 1. Dubai Residential Price Index

**Route:** `/terminal/price-index`

**Investor problem it solves:**
An investor evaluating entry timing needs to know whether the market is accelerating, plateauing,
or correcting at the macro level. There is currently no single chart in the terminal showing
decade-long price momentum. Without it, all yield calculations lack context.

**Data sources:**
- `dld_price_index`: `flat_monthly_index`, `villa_monthly_index`, `all_monthly_price_index`,
  `instance_date` (monthly observations from 2011 — 159 rows, trivial query cost)

**Key metrics / visualisations:**
- Time-series line chart: flats vs. villas vs. all-residential index from 2011 to current month
- Selectable date range: 1Y / 3Y / 5Y / All
- Annotated inflection points: COVID crash (Mar 2020), recovery (Q4 2020), 2022 peak, 2024 rate cuts
- Current index value vs. 12-month prior (YoY % change) shown as headline stat cards
- Compound annual growth rate (CAGR) calculated from any user-selected start date to today

**MVP scope:**
Three-line chart with YoY cards and date range picker. Annotations can be added post-launch.
No filtering by bedroom type (that requires `dld_transactions`).

**Priority:** P1 | Complexity: S

---

#### 2. Off-Plan Supply Pipeline

**Route:** `/terminal/supply-pipeline`

**Investor problem it solves:**
A common mistake in Dubai is buying into a community just before 3,000 new units are delivered
by the same developer, compressing rents and exit prices. The Communities Screener shows an
`upcomingSupply` column but it is hardcoded to zero. This page makes supply risk the primary lens.

**Data sources:**
- `dld_projects`: `project_name`, `area`, `developer`, `status`, `completion_date`,
  `percent_completed`, `no_of_units`
- Filter to `status IN ('Under Construction', 'Not Started')` and `completion_date` within
  user-selected horizon (12/24/36 months)

**Key metrics / visualisations:**
- Sortable table: project name, area, developer, units, % complete, expected delivery, status badge
- Bar chart: total units by area coming online per quarter for next 8 quarters
- Summary cards: total pipeline units, top 3 areas by incoming supply, top 3 developers by pipeline
- Filter: area, developer, status, delivery horizon (12 / 24 / 36 months)
- Supply pressure indicator per area: pipeline units / existing stock from `dld_units` (computed)

**MVP scope:**
Sortable table with filters and the bar chart. Summary cards. No map view in MVP.

**Priority:** P1 | Complexity: S

---

#### 3. Service Charge Intelligence

**Route:** `/terminal/service-charges`

**Investor problem it solves:**
Gross yield is meaningless without knowing service charges. A property yielding 7% gross in a
community with AED 35/sqft/year service charges nets below 5%. This data is public via DLD but
scattered — no portal surfaces it in a scannable format next to yield data.

**Data sources:**
- `dld_service_charges`: `project_name`, `master_community`, `budget_year`, `service_category`,
  `service_cost`, `management_company`
- Aggregate by `project_name` + `budget_year` to get total annual service cost
- Join with `dld_units`.`actual_area` (or estimate from `dld_projects`.`no_of_units`) to
  compute per-sqft annual cost

**Key metrics / visualisations:**
- Searchable table: project, community, management company, AED/sqft/year, budget year,
  breakdown by category (General, Insurance, Shared Services, Reserve Fund)
- Top 20 most expensive vs. cheapest projects by AED/sqft (bar chart)
- YoY change in service cost per project (where multiple budget years exist)
- Filter by master community, management company, budget year
- "Net Yield Estimator" widget: enter gross yield + select project, see estimated net yield after
  service charges

**MVP scope:**
Searchable table with community filter and AED/sqft column. The net yield estimator can be a
follow-on iteration.

**Priority:** P1 | Complexity: S

---

### Phase 2 — Core Analytics
*Require live queries on `dld_transactions` (1.66M rows). Materialised views or pre-aggregated
summary tables in Supabase are non-negotiable before building these pages. Build time: 1-2 weeks each.*

---

#### 4. Transaction Pulse

**Route:** `/terminal/transactions`

**Investor problem it solves:**
Volume precedes price. An investor watching a specific area wants to know if transaction velocity
is accelerating (demand signal) or declining (possible liquidity risk) before committing. No
public source shows this at the sub-area level with bedroom-type granularity and a rolling window.

**Data sources:**
- `dld_transactions`: `instance_date`, `area_name_en`, `trans_group_en` (Sales only),
  `property_type_en`, `rooms_en`, `actual_worth`, `meter_sale_price`, `procedure_area`
- Pre-aggregate into a Supabase materialised view: `mv_txn_monthly` with columns
  `year_month`, `area_name_en`, `rooms_en`, `property_type_en`, `txn_count`,
  `median_meter_sale_price`, `total_worth`

**Key metrics / visualisations:**
- Monthly transaction volume chart by area (stacked bar or line, last 24 months)
- Median AED/sqft by area and bedroom type — rolling 3-month vs. 12-month trailing comparison
- Heatmap table: areas as rows, months as columns, colour-coded by volume change
- Top 10 areas by volume in last 30 days, with MoM delta
- Filters: area (multi-select), bedroom type, property type (apartment / villa / townhouse),
  date range
- Toggle: view by count vs. by total AED value

**MVP scope:**
Monthly volume chart for top 15 areas + sortable summary table with median AED/sqft and
30d transaction count. Filters for area and bedroom type. No heatmap in MVP.

**Priority:** P1 | Complexity: M

---

#### 5. Community Screener — Real Data

**Route:** `/terminal/communities` (replaces current mock-backed page)

**Investor problem it solves:**
The existing Community Screener is the most visited page in the terminal but every number on it
is fabricated. An investor who discovers this loses trust in the entire product. Connecting it
to real DLD data is the highest-leverage single fix in the entire backlog.

**Data sources:**
- `dld_transactions` (via `mv_txn_monthly`): transaction count (30d, 90d), median AED/sqft,
  MoM price change per `area_name_en`
- `dld_projects`: `no_of_units` for pipeline sum by area
- `dld_units`: total unit count by area for stock denominator
- `rental_listings`: `annual_price`, `price_per_sqft` by cluster/area for yield numerator
- `buildings`: `construction_year` for area vintage signal
- Gross yield = median annual rent (from `rental_listings`) / median sale price per sqft
  (from `dld_transactions`) * 100

**Key metrics / visualisations:**
- All existing columns but live: AED/sqft (sale), gross yield, transactions (30d), pipeline,
  MoM change, DOM
- Add: median sale price, freehold indicator (from `dld_units.is_free_hold`),
  last transaction date
- Community detail page: replace `getMockPriceHistory` and `getMockTransactions` with live
  DLD queries; 24-month price/sqft chart per area from `mv_txn_monthly`

**MVP scope:**
Replace mock data on screener table with real aggregates. Community detail page gets live
transaction table (last 50 sales in area) and a real price/sqft chart. Supply pipeline column
populated from `dld_projects`.

**Priority:** P1 | Complexity: M

---

#### 6. Rental vs. Sales Yield Map

**Route:** `/terminal/yield-map`

**Investor problem it solves:**
An investor comparing two shortlisted communities needs one screen that shows rental income
potential against capital cost — without opening four tabs. Filtering by bedroom type is
critical because a 1BR in Dubai Marina and a 3BR in Arabian Ranches have entirely different
yield profiles.

**Data sources:**
- `dld_transactions`: `area_name_en`, `rooms_en`, `meter_sale_price` (sale price AED/sqft,
  where `trans_group_en = 'Sales'`)
- `dld_transactions`: `area_name_en`, `rooms_en`, `meter_rent_price` (rent AED/sqft/year,
  where `trans_group_en = 'Rents'`)
- Gross yield = (median `meter_rent_price` * 12) / median `meter_sale_price` * 100,
  grouped by area + bedroom type, last 12 months
- `dld_areas`: to resolve area names for display

**Key metrics / visualisations:**
- Sortable yield table: area, bedroom type, median sale AED/sqft, median annual rent AED/sqft,
  gross yield %, sample size (n transactions)
- Scatter plot: x = median sale AED/sqft, y = gross yield %, bubble size = transaction volume,
  colour = bedroom type
- Filter: bedroom type (Studio / 1BR / 2BR / 3BR / 4BR+), property type, minimum sample size
- Highlight: top 10 yield opportunities by bedroom type

**MVP scope:**
Sortable table with filters and the scatter plot. Minimum n=10 transactions to show a data
point (suppress noise from thin markets). No map visualisation in MVP.

**Priority:** P2 | Complexity: M

---

### Phase 3 — Advanced Intelligence
*Require multi-table joins and either client-side compute or pre-computed signals stored in
Supabase. These are the pages that create a durable competitive moat. Build time: 2-4 weeks each.*

---

#### 7. Developer Track Record

**Route:** `/terminal/developers`

**Investor problem it solves:**
Off-plan buyers in Dubai routinely discover after purchase that their developer has a history
of 24-month delays and inflated original prices. No public tool surfaces per-developer delivery
performance using actual DLD completion records rather than developer marketing. This is the
most-requested data point among HNW investors entering the off-plan market.

**Data sources:**
- `dld_projects`: `developer`, `project_name`, `area`, `completion_date`, `status`,
  `percent_completed`, `no_of_units` — compare declared `completion_date` vs. actual
  completion (derived from first transaction in `dld_transactions` for that project)
- `dld_transactions`: `master_project_en`, `instance_date` — earliest sale date per project
  as proxy for practical completion
- `dld_units`: unit count and freehold mix per developer across all projects
- Computed: average delay in months = (first_txn_date - declared_completion_date),
  on-time delivery rate, total units delivered to date

**Key metrics / visualisations:**
- Developer scorecard table: developer name, total projects, delivered on time %, avg delay
  (months), total units delivered, areas of operation, active pipeline units
- Project history drill-down per developer: all projects, declared vs. actual delivery,
  on-time badge or delay badge
- Scatter plot: units delivered (x) vs. avg delivery delay (y) — identify reliable large
  developers vs. unreliable small ones
- Filter: area, delivery year range, minimum project count

**MVP scope:**
Developer table with on-time rate and avg delay. Drill-down list of projects per developer
with declared vs. first-transaction date. Scatter plot deferred to v2.

**Priority:** P2 | Complexity: L

---

#### 8. Mortgage & Liquidity Scanner

**Route:** `/terminal/liquidity`

**Investor problem it solves:**
Before selling an investment property, a sophisticated investor wants to know two things:
how many similar units have transacted recently (exit liquidity), and what proportion of
comparable purchases were cash vs. mortgaged (buyer quality / market leverage signal).
A highly mortgaged market is more vulnerable to rate rises; a cash-dominated market
signals stronger conviction buyers.

**Data sources:**
- `dld_transactions`: `trans_group_en` (distinguish 'Sales' vs. 'Mortgages'),
  `area_name_en`, `rooms_en`, `procedure_area`, `actual_worth`, `instance_date`
- `dld_transaction_procedures`: procedure taxonomy to classify cash vs. financed
- Mortgage-to-cash ratio: count of mortgage registrations / count of sales transactions
  per area per quarter
- Liquidity score: rolling 90-day transaction count per area + bedroom type

**Key metrics / visualisations:**
- Area-level mortgage ratio chart: % of transactions that were financed vs. cash,
  per area, last 8 quarters (stacked bar)
- Liquidity table: area, bedroom type, transactions (90d), median DOM (from `rental_listings`
  as proxy), cash % share, mortgage %
- Trend line: citywide mortgage ratio over time (is leverage increasing?)
- Filter: area, bedroom type, date range
- Highlight: areas where cash % > 70% (strong buyer conviction signal)

**MVP scope:**
Citywide mortgage ratio trend chart (single query on full `dld_transactions`, group by quarter
and `trans_group_en`). Area-level table with 90d volume and mortgage ratio. DOM column deferred
pending DOM data availability.

**Priority:** P3 | Complexity: L

---

## Cross-Cutting Concerns

### Auth / Access Gating

The current terminal is fully public. The recommended phased approach:

- **Phase 1 pages** (Price Index, Supply Pipeline, Service Charges): remain public — they are
  discovery and SEO assets that pull investors into the funnel
- **Phase 2 pages** (Transaction Pulse, Real Community Screener, Yield Map): gate behind
  free email signup. Collect investor profile at registration (budget range, target area,
  investment type) to enable future segmentation
- **Phase 3 pages** (Developer Track Record, Liquidity Scanner): gate behind paid tier or
  verified HNW status (booking a call unlocks access). These pages contain the highest
  proprietary-signal data and should not be indexed by competitors

Implementation: Supabase Auth with Next.js middleware. Store tier in `user_metadata`.
No third-party auth library needed — Supabase handles magic link + social.

---

### Performance for Large Tables

`dld_transactions` (1.66M rows) and `dld_units` (2.38M rows) must never be queried raw
from a page component. The following strategy is mandatory before any Phase 2 page ships:

1. **Materialised views in Supabase**: Create `mv_txn_monthly` (GROUP BY year_month,
   area_name_en, rooms_en, property_type_en with pre-computed median, count, total worth).
   Refresh nightly via a Supabase scheduled function or cron-job.org webhook.

2. **Indexed columns**: `instance_date`, `area_name_en`, `trans_group_en`, `rooms_en`
   must be indexed. Composite index on `(area_name_en, instance_date)` for time-series
   queries.

3. **API route caching**: All `/api/terminal/*` routes should set
   `next: { revalidate: 3600 }` (1-hour ISR). Phase 1 pages (from small tables) can use
   `revalidate: 86400`.

4. **Pagination**: Transaction tables in the UI should never load more than 100 rows at once.
   Use cursor-based pagination (`instance_date` as cursor).

5. **No client-side aggregation**: All GROUP BY / median calculations happen in Postgres,
   not in the browser or server component. Median requires `percentile_cont(0.5)` in SQL.

---

### Mobile Considerations

The terminal currently has a hamburger-sheet sidebar on mobile, which works. However:

- Phase 2 tables (Yield Map, Transaction Pulse) have 7-9 columns — they will break on
  320px-375px screens. Use a horizontal scroll wrapper with a sticky first column
  (community / area name), matching the pattern already in `communities-table.tsx`.
- Charts (Recharts) should be responsive by default (`ResponsiveContainer`) — verify
  this is set on all new chart components before shipping.
- Phase 3 pages (Developer scatter plot, Liquidity bar chart) should fall back to a
  simplified table view on screens narrower than 640px. Do not attempt to render
  complex scatter plots on mobile.
- The sticky header (`top-0 z-30`) in `layout.tsx` already handles mobile — preserve this
  pattern in all new page layouts.
