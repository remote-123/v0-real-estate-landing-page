# Community Intelligence Table — Feature Plan
*North Capital DXB | Terminal v2*

---

## 1. What We're Building

A DexScreener-style data table at `/terminal/communities` listing every Dubai community with live investment metrics across sortable columns. Clicking any row drills into a dedicated community page with charts, transaction history, supply pipeline, and rental yield data.

The goal is to make this the most useful free community-level intelligence tool in the Dubai market — converting serious investors to North Capital advisees.

---

## 2. Data Sources Research

### 2.1 Dubai Land Department Open Data (Free — Primary Source)

**URL**: dubailand.gov.ae/en/open-data/real-estate-data
**Access**: CSV download (no API, but downloadable and automatable via scripts)
**Update cadence**: Regular government updates

| Dataset | Key Fields | Use For |
|---------|-----------|---------|
| **Transactions** | Date, community, property type, area sqft, amount AED, buyer/seller nationality | Avg price/sqft, transaction velocity, price trends |
| **Rents** | Contract date, community, unit type, annual rent AED, duration | Gross rental yield calculation |
| **Projects** | Developer, community, completion %, units planned, handover date | Upcoming supply pipeline |
| **Buildings** | Community, total floors, total units, shops, pools | Unit count per community |
| **Units** | Building, unit type (apt/villa), sqft, bedrooms | Type breakdown (apts vs villas) |

**This is the gold standard dataset for all core metrics.** It's official, free, and comprehensive.

### 2.2 RapidAPI — PropertyFinder (Already Integrated)

Provides: current listing prices, community names, listing velocity, bedroom breakdown
Use for: live asking price vs. DLD transacted price spread (liquidity signal)

### 2.3 RapidAPI — Bayut (Already Integrated)

Provides: listing prices by community, rental listings
Use for: cross-referencing asking rents vs. DLD registered rents

### 2.4 PropertyMonitor / REIDIN / Core Savills (Paid — Future)

Premium real estate data platforms with cleaned, API-accessible community analytics. Cost: typically $500–2,000/month. Not needed for Phase 1 — DLD data is sufficient.

---

## 3. Metrics We Can Calculate

All metrics derive from DLD + existing API data:

| Metric | Calculation | Source |
|--------|------------|--------|
| Avg AED/sqft | Total transaction value ÷ Total sqft (rolling 12 months) | DLD Transactions |
| Avg unit price | Median transaction price (12 months) | DLD Transactions |
| Total units | Count of units in Buildings + Units tables | DLD Buildings/Units |
| Apartments | Count where unit_type = apartment | DLD Units |
| Villas | Count where unit_type = villa | DLD Units |
| Apt:Villa ratio | Apartments ÷ Total units | DLD Units |
| Gross rental yield | (Avg annual rent ÷ Avg sale price) × 100 | DLD Transactions + Rents |
| Transaction velocity | Count of transactions in last 30/90 days | DLD Transactions |
| Upcoming supply | Units in Projects with completion_date < 24 months | DLD Projects |
| Supply ratio | Upcoming units ÷ Existing units | DLD Projects + Buildings |
| MoM price change | (Current month avg/sqft − Previous month avg/sqft) ÷ previous | DLD Transactions |
| Avg days on market | Median listing age from PropertyFinder/Bayut listings | RapidAPI |
| Demand score | Transaction velocity × (1 + MoM change) | Derived |

---

## 4. Database Architecture

**Recommended stack**: Supabase (PostgreSQL) — integrates with Next.js/Vercel natively, free tier sufficient for Phase 1, has REST API and Row-Level Security built in.

### 4.1 Schema Design

```sql
-- Master community list (seed from DLD data)
CREATE TABLE communities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,           -- url-safe name
  name        TEXT NOT NULL,                  -- official DLD name
  area        TEXT,                           -- e.g. "Dubai Marina", "Downtown"
  is_freehold BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Raw DLD transactions (partitioned by year)
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID REFERENCES communities(id),
  transaction_date DATE NOT NULL,
  property_type   TEXT,                       -- apartment, villa, townhouse
  bedrooms        INT,
  size_sqft       NUMERIC,
  amount_aed      NUMERIC NOT NULL,
  price_per_sqft  NUMERIC GENERATED ALWAYS AS (amount_aed / NULLIF(size_sqft, 0)) STORED,
  transaction_type TEXT,                      -- sale, mortgage, gift
  source          TEXT DEFAULT 'dld',
  imported_at     TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (transaction_date);

-- Raw DLD rental contracts
CREATE TABLE rental_contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID REFERENCES communities(id),
  contract_date   DATE NOT NULL,
  property_type   TEXT,
  bedrooms        INT,
  size_sqft       NUMERIC,
  annual_rent_aed NUMERIC NOT NULL,
  duration_months INT,
  source          TEXT DEFAULT 'dld',
  imported_at     TIMESTAMPTZ DEFAULT NOW()
);

-- DLD projects (upcoming supply pipeline)
CREATE TABLE supply_pipeline (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID REFERENCES communities(id),
  project_name     TEXT,
  developer        TEXT,
  total_units      INT,
  completion_pct   NUMERIC,
  expected_handover DATE,
  source           TEXT DEFAULT 'dld',
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-computed community metrics (refreshed by pipeline)
-- This is what the frontend reads — never compute on-the-fly
CREATE TABLE community_metrics (
  community_id         UUID PRIMARY KEY REFERENCES communities(id),
  avg_price_per_sqft   NUMERIC,
  median_sale_price    NUMERIC,
  total_units          INT,
  apartment_count      INT,
  villa_count          INT,
  gross_rental_yield   NUMERIC,              -- percentage e.g. 6.5
  transactions_30d     INT,
  transactions_90d     INT,
  upcoming_supply_units INT,
  supply_ratio         NUMERIC,              -- upcoming / existing
  mom_price_change_pct NUMERIC,             -- month-over-month %
  avg_days_on_market   NUMERIC,             -- from listing APIs
  last_calculated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for table queries
CREATE INDEX idx_transactions_community_date ON transactions (community_id, transaction_date DESC);
CREATE INDEX idx_transactions_date ON transactions (transaction_date DESC);
CREATE INDEX idx_rentals_community_date ON rental_contracts (community_id, contract_date DESC);
```

### 4.2 Key Design Decisions

- **Partition transactions by year** — DLD has years of data, partitioning keeps queries fast
- **Pre-computed metrics table** — the community table page reads from `community_metrics` only, never does live aggregations. Metrics refresh on pipeline run.
- **Generated `price_per_sqft` column** — computed automatically on insert, no transform logic needed
- **Slug on communities** — enables clean URLs: `/terminal/communities/dubai-marina`

---

## 5. Data Pipeline Architecture

### 5.1 DLD CSV Import (Initial Load + Periodic Refresh)

DLD data is CSV download only. The pipeline:

1. **Manual initial load**: Download DLD CSVs → script parses and bulk-inserts into Supabase
2. **Periodic refresh**: Monthly cron downloads latest CSVs, upserts new records (avoid duplicates by transaction number)
3. **After import**: Trigger metric recalculation job

```
DLD Portal (manual/scripted CSV download)
  → parse-dld.ts script
  → Supabase upsert (transactions, rents, projects, buildings, units)
  → recalculate-metrics.ts
  → community_metrics table updated
```

### 5.2 Listing API Refresh (Every 4 Hours — Already Running)

Extend the existing PropertyFinder/Bayut cron to also:
- Extract days-on-market per listing
- Group by community
- Update `avg_days_on_market` in `community_metrics`

### 5.3 Metric Calculation Job

`/api/cron/recalculate-community-metrics` — runs after any data import:

```typescript
// Pseudocode for metric calculation
for each community:
  avg_price_per_sqft = AVG(price_per_sqft) WHERE transaction_date > NOW() - 12 months
  median_sale_price  = PERCENTILE_CONT(0.5) of amount_aed (12 months)
  gross_yield        = (AVG annual_rent / AVG sale_price) * 100
  transactions_30d   = COUNT WHERE transaction_date > NOW() - 30 days
  supply_ratio       = SUM(upcoming_units) / total_units
  mom_change         = (this_month_avg - last_month_avg) / last_month_avg * 100
  → UPSERT into community_metrics
```

### 5.4 Pipeline Failure Handling

- Zod schema validation on all CSV rows before insert
- Failed rows logged to `import_errors` table (not silently dropped)
- Telegram alert on pipeline failure (existing `sendTelegram` utility)
- Partial success: load what validates, alert on failures

---

## 6. Frontend Design

### 6.1 Table Page — `/terminal/communities`

**Component**: TanStack Table + `@tanstack/react-virtual` for virtualisation (500+ communities)

**Columns (default visible):**

| Column | Format | Sortable | Notes |
|--------|--------|----------|-------|
| Community | Text + area badge | ✅ | Links to drill-down |
| AED/sqft | `1,234` | ✅ | 12-month rolling avg |
| Median Price | `AED 1.2M` | ✅ | |
| Units | `2,340` | ✅ | Total in community |
| Apts / Villas | `87% / 13%` | ✅ | Ratio bar |
| Gross Yield | `6.5%` colour-coded | ✅ | Green >6%, amber 4-6%, red <4% |
| Txns (30d) | `42` | ✅ | Transaction velocity |
| Supply Pipeline | `+340 units` | ✅ | Upcoming <24 months |
| MoM Δ | `+2.3%` with arrow | ✅ | Green/red + icon |

**Filters (sidebar or top bar):**
- Area (Downtown, Marina, JVC, etc.)
- Property type (apartments only / villas only / mixed)
- Min yield
- Freehold only toggle

**UX pattern:**
- Sticky header row
- Row highlight on hover
- Click anywhere on row → navigate to drill-down
- Column visibility toggle (show/hide less common metrics)
- Search by community name

### 6.2 Drill-Down Page — `/terminal/communities/[slug]`

**Tabs:**
1. **Overview** — key metrics at a glance (KPI cards: avg price/sqft, yield, units, supply ratio)
2. **Price History** — 24-month line chart of avg AED/sqft (Recharts)
3. **Transactions** — table of last 50 transactions (date, type, sqft, price, AED/sqft)
4. **Rental Market** — avg rent by bedroom count, yield curve over time
5. **Supply Pipeline** — table of upcoming projects with developer, units, handover date

**Pre-rendering strategy:**
- `generateStaticParams` for top 100 communities by transaction volume
- Remaining communities: ISR with 24h revalidation
- Charts: client component, data fetched from Supabase on page load

---

## 7. Implementation Phases

### Phase 1 — Data Foundation
- [ ] Set up Supabase project, run schema migrations
- [ ] Build `parse-dld.ts` script to import CSV datasets
- [ ] Seed `communities` table (official DLD community names)
- [ ] Import DLD transactions, rents, projects, buildings, units
- [ ] Build `recalculate-community-metrics` function
- [ ] Verify metrics are calculating correctly for 5 known communities

### Phase 2 — Core Table
- [ ] Build `/terminal/communities` page with TanStack Table
- [ ] Connect to Supabase `community_metrics` via server component
- [ ] Implement sorting, basic filtering, search
- [ ] Mobile-responsive (horizontal scroll on small screens)
- [ ] Add to terminal navigation

### Phase 3 — Drill-Down Pages
- [ ] Build `/terminal/communities/[slug]` dynamic route
- [ ] Overview KPI cards
- [ ] Price history chart (Recharts)
- [ ] Recent transactions table
- [ ] `generateStaticParams` for top 100 communities

### Phase 4 — Automated Pipeline
- [ ] Extend existing cron to update `avg_days_on_market` from listing APIs
- [ ] Monthly DLD CSV refresh script (manual trigger via admin endpoint)
- [ ] Telegram alerts on pipeline failure
- [ ] Add rental and supply tabs to drill-down

### Phase 5 — Intelligence Layer
- [ ] Demand score composite metric
- [ ] "North Capital Verdict" badge for high-conviction communities
- [ ] Comparison mode: select 2–3 communities side-by-side
- [ ] Export to PDF for client briefings

---

## 8. Open Questions

1. **DLD CSV automation**: Can we programmatically download CSVs from dubailand.gov.ae, or will this always be a manual step? (Check if they have a data API behind the download portal)

2. **Community name normalisation**: DLD, PropertyFinder, and Bayut all use slightly different names for the same community ("Dubai Marina" vs "DUBAI MARINA" vs "The Marina"). Need a normalisation/alias table.

3. **Historical data depth**: How many years of DLD transactions do we load initially? More history = better trend analysis, but larger initial import. Recommend starting with 3 years.

4. **Supabase tier**: Free tier is 500MB storage. DLD transactions could be large (millions of rows). May need to start with Pro plan (~$25/month) or aggressive data pruning (only store aggregated data, not raw transactions).

5. **Community count**: Dubai has approximately 400–800 named communities depending on classification granularity. Need to decide on the master list source (DLD is authoritative).

6. **Yield calculation methodology**: Gross yield is simple. Net yield requires maintenance cost assumptions. Decide whether to show gross, net, or both — and what cost assumption to use.

---

## 9. Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Database | Supabase (PostgreSQL) | Vercel-native, free to start, REST API |
| Data import | TypeScript scripts + Node.js | Consistent with existing codebase |
| Orchestration | cron-job.org + Next.js API routes | Already in use |
| Table UI | TanStack Table + react-virtual | Best-in-class for sortable/filterable data tables |
| Charts | Recharts | Likely already in project |
| Validation | Zod | TypeScript-first, lightweight |
| Alerts | Telegram | Already built |
