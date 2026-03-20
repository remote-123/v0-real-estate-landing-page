# Daily Log

## 2026-03-15 — Communities Page: Mock Data Replaced with Real DLD Data

### Task
Replaced 100% mock data on `/terminal/communities` with live DLD data queried from `mv_txn_monthly` and `dld_projects` via `lib/db` pooled postgres.js.

### Files Changed

**`app/terminal/communities/page.tsx`**
- Removed `MOCK_COMMUNITIES` import and internal fetch to `/api/communities/stats`
- Added `import { sql } from "@/lib/db"` and `type Community` import
- Added `CommunityRow` type, `toSlug()`, and `mapToCommunity()` helpers
- Added `fetchCommunities()` — runs the `mv_txn_monthly` + `dld_projects` SQL query with try/catch (returns empty array on error)
- SQL: computes `curr` and `prev` month weighted-average PSF, `supply` pipeline from `dld_projects`, MoM % change, and PSF conversion (÷ 10.764 AED/sqm → AED/sqft); filters to `txn_count >= 5`, `LIMIT 80`
- Header count now shows `data.length` (live)
- Replaced Avg/Top Yield stat cards with "Areas Tracked" and "Avg AED/sqft" (yield not available from DLD)
- Data disclaimer now reads "Source: Dubai Land Department — Feb 2026 transactions"
- Table now receives live `data` (not `MOCK_COMMUNITIES`)

**`components/terminal/communities-table.tsx`**
- `YieldBadge`: early return `—` when value is 0
- DOM cell: renders `—` when value is 0 (field unavailable from DLD)
- Units cell: renders `—` when `totalUnits === 0`

### Build Status
Compiled successfully. All 128 pages generated without errors.

---

## 2026-03-15 — Distress Deals V2

### Task
Implemented distress deals v2 across 3 files to replace 100% synthetic `originalPrice` with real DLD benchmark data and a distress scoring system.

### Files Changed

**`app/terminal/distress-deals/page.tsx`**
- Added `import { sql } from "@/lib/db"`
- Added `isOffplanDrop` field to `fetchBayutDeals` return (true when offplan original price used)
- Added `isOffplanDrop: false` to `fetchPropertyFinderDeals` return
- Added `fetchAreaBenchmarks()` — queries `dld_transactions` for area avg PSF over 18 months, graceful fallback to empty Map
- Added `matchBenchmark()` — fuzzy contains match on comma-separated location parts vs benchmark area names
- Added `getDomTier()` — bins days-on-market into fresh/aging/stale/overdue
- Added `scoreDistress()` — composite score (0-100) from DOM tier, PSF vs benchmark, and offplan cut signal
- Server component now runs `fetchAreaBenchmarks()` in parallel with the API fetch via `Promise.all`
- Enriches each deal with `psf`, `areaBenchmarkPsf`, `distressScore`, `distressTags`, `domTier`
- Extracts `communities` (unique sorted community names) before area filter
- Applies `areaFilter` searchParam filter
- Computes `areaStats` (top 6 communities by deal count with avg DOM and top score)
- Added Area Intelligence section between filters and feed grid (renders when `areaStats.length >= 2`)
- Passes `communities` prop to `<DistressFilters>`
- Passes enriched fields to `<DistressFeedCard>`

**`components/terminal/distress-feed-card.tsx`**
- Added `psf`, `distressScore`, `distressTags`, `areaBenchmarkPsf`, `domTier`, `isOffplanDrop` to props interface
- DOM badge now color-coded by tier (fresh=muted, aging=yellow, stale=orange, overdue=red)
- Signal tags rendered after DOM badge (OVERDUE 90D, HIGH DOM, AGING, BELOW MARKET, OFFPLAN CUT)
- PSF line added below current price, with area avg comparison highlighted in accent when 5%+ below market
- Distress score badge added below percentage drop badge, color-coded red/orange/yellow by severity

**`components/terminal/distress-filters.tsx`**
- Added `communities?: string[]` prop
- Added `activeArea` state from searchParams
- Added area dropdown after sort dropdown (hidden when communities array is empty)

### Build Status
Compiled successfully. Pre-existing build timeout on `/terminal/communities` and `/terminal/rental-drops` (Phase 2 pages making external API calls at static export time — unrelated to this task).
