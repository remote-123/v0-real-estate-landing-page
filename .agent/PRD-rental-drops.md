# PRD: Distress Rental Drops
*Status: Draft for review | Author: North Capital DXB | Date: 2026-03-08*

---

## 1. Problem Statement

Finding a rental in Dubai is a multi-tab, manual, mentally exhausting process. A renter currently has to:

1. Search Bayut — filter, scroll, note prices
2. Open PropertyFinder — repeat the same search
3. Manually calculate: annual quote ÷ 12 = monthly cost (obvious but tedious at volume)
4. Factor in cheque structure — a 1-cheque deal is a capital commitment, not just a monthly cost
5. Cross-reference InteractDXB to find what the community's *actual* transacted rental price is vs. the inflated listed price
6. Repeat across 3-5 areas before making a shortlist

There is no single place that aggregates listings, normalises pricing, flags genuine drops, and tells you whether the listed price is above or below the real market rate for that community.

**The gap:** Every existing tool shows you *listings*. None shows you *value*.

---

## 2. Target User

**Primary:** Expats relocating to Dubai or renewing a lease who have investable time and want to make a data-informed decision — not just pick the first thing that looks reasonable.

**Secondary:** North Capital clients who are investors evaluating whether a unit they own is competitively priced vs. the current rental market.

**Anti-user:** Someone looking for a one-bedroom under AED 40K. This tool is pitched at the AED 80K–400K range where the time/money tradeoff of doing this properly has real ROI.

---

## 3. Core Pain Points (in priority order)

| # | Pain | Severity |
|---|------|----------|
| 1 | Switching between Bayut and PF constantly | High |
| 2 | All prices are annual — mental maths for monthly is constant | High |
| 3 | No way to know if a listed price is above/below market | High |
| 4 | Cheque structure not shown — affects real affordability | High |
| 5 | No indicator of how long a unit has been listed (landlord motivation signal) | Medium |
| 6 | Can't compare across areas in one view | Medium |
| 7 | No price-per-sqft normalisation for rentals | Medium |
| 8 | No flag when a listing has been price-reduced | Medium |

---

## 4. Proposed Solution

A **Rental Intelligence Feed** inside the Investor Terminal — a single aggregated, normalised view of Dubai rental listings with:

- Unified Bayut + PropertyFinder feed
- All prices shown in **monthly, quarterly, and annual** formats simultaneously
- **Market rate comparison** — is this above or below community average?
- **Cheque structure display** — 1, 2, 4, or 12 cheques
- **Days on market** as a landlord motivation signal
- **Price drop flag** — if the listing has been reduced since it was first posted
- **Price/sqft** shown on every card
- Filter by area, bedrooms, price range, source

---

## 5. Feature Requirements

### 5.1 — Data Aggregation

| Requirement | Detail |
|-------------|--------|
| Fetch from Bayut | Rental listings, for-rent filter, completed properties only |
| Fetch from PropertyFinder | Rental listings, secondary market |
| Deduplication | If same unit appears on both sources, show once (match on address + size + price) |
| Refresh cadence | On-demand (user triggers) or cached with 6-hour TTL |
| Min dataset size | 20–50 listings per fetch before filtering |

### 5.2 — Price Normalisation (Critical)

Every listing must display:
- **Monthly:** annual ÷ 12
- **Quarterly:** annual ÷ 4
- **Annual:** as listed
- Default display: **monthly** (most intuitive for comparison)

### 5.3 — Cheque Structure

If available from API:
- Show number of cheques accepted (1, 2, 4, 12)
- Flag 1-cheque deals prominently — they require full-year capital upfront
- Flag 12-cheque deals as "monthly friendly"

### 5.4 — Market Rate Comparison

Core differentiator. For each listing, show whether the listed price is:
- **Below market** — green signal, potential value
- **At market** — neutral
- **Above market** — red signal, landlord fishing

Market rate reference options (in preference order):
1. InteractDXB community averages (if accessible via API or scrape)
2. RERA Rental Index (publicly available, per community, per bedroom count)
3. Computed average from same-area listings in our own feed

**Decision needed:** Which data source is feasible? RERA index is static but reliable. InteractDXB is dynamic but may require scraping.

### 5.5 — Distress Signals (What Makes It a "Drop")

A listing qualifies as a distress rental drop if it meets at least ONE of:
- Listed price is more than 10% below community RERA index for that bedroom count
- Days on market > 30 (landlord has not found a tenant, likely negotiable)
- Price has been reduced since original listing date (requires price history field)
- Price/sqft is more than 15% below community average in our feed

### 5.6 — Card Display

Each listing card should show:

```
[AREA] · [BEDROOMS] BR · [SIZE] sqft · [DAYS ON MARKET]d

[TITLE / BUILDING NAME]

AED [MONTHLY]/mo  ·  AED [ANNUAL]/yr
[PRICE/SQFT] per sqft

[CHEQUE BADGE]    [MARKET RATE BADGE]    [PRICE DROP BADGE]

[SOURCE]  ·  [View Listing ↗]  ·  [Book ROI Call]
```

### 5.7 — Filters

- Area (multi-select: JBR, Downtown, Business Bay, Dubai Marina, JVC, Palm, DIFC, etc.)
- Bedrooms (Studio, 1, 2, 3, 4+)
- Annual price range (slider)
- Source (All / Bayut / PF)
- Distress only (toggle — show only flagged listings)
- Sort: Days on market / Price low-high / Price/sqft / Most recent

### 5.8 — InteractDXB / RERA Reference Panel (Optional V1 Feature)

A collapsible side panel or tooltip that shows, for the selected community:
- RERA index rent range for that bedroom count
- Average price/sqft for rentals in that community
- Number of active listings (supply signal)

---

## 6. UI/UX Requirements

- Consistent with the existing terminal aesthetic (dark-mode friendly, monospace data, badge system)
- Mobile-usable — a lot of rental searching happens on mobile
- Default view: list feed (not cards grid) — density matters, users want to scan fast
- Sticky filter bar at top
- "Save listing" or "flag for follow-up" — nice to have, not V1
- No login required — open access

---

## 7. Navigation

Add to sidebar under **Terminal** section:

```
Terminal
├── Market Intelligence   ✓ live
├── Distress Deals        ✓ live
└── Rental Drops          ← new
```

Route: `/terminal/rental-drops`

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Time to find a shortlist of 5 rentals | < 10 minutes (vs. ~60 today) |
| Listings shown per load | 20–40 before filtering |
| % listings with market rate comparison | > 80% |
| Bounce rate from page | < 40% (engagement signal) |
| Conversions to calendar booking | Track and report |

---

## 9. Data Source Feasibility

| Source | Method | Known fields | Confidence |
|--------|--------|--------------|------------|
| Bayut (rental) | RapidAPI — `uae-real-estate2` | price, area, bedrooms, size, created_at, photos | High — same API we use for sales |
| PropertyFinder (rental) | RapidAPI — `propertyfinder-uae-data` | price, bedrooms, size, listed_date | High — same API |
| RERA Rental Index | Public PDF / data.dubai | Per community, per bedroom, per year | Medium — needs parsing or manual input |
| InteractDXB | Unknown — may require scraping | Community avg rent, transacted prices | Low — TBC |
| Cheque structure | Unknown — may not be in API response | Number of cheques accepted | Low — TBC, log raw response |

**Recommended approach for V1:**
- Use RERA index data (manually imported, updated quarterly) as the market rate benchmark
- Log Bayut + PF rental raw responses first to confirm available fields before building

---

## 10. Open Questions for Review

1. **InteractDXB:** Is there an API or is scraping the only option? If scraping, is that acceptable?
2. **RERA Index:** Should this be hardcoded per community and updated manually each quarter, or pulled from data.dubai dynamically?
3. **Cheque structure:** Is this important enough for V1, or deprioritise if not in API response?
4. **Scope of areas:** Which communities to cover at launch? All of Dubai, or start with the top 10 by search volume?
5. **Save/bookmark:** Should users be able to save listings? Requires auth or local storage.
6. **Price drop detection:** Is "price has been reduced" available in the API? (Answer: we don't know yet — same logging step needed as with sales)
7. **How often should the feed refresh?** On-demand vs. scheduled cache.
8. **Should this replace rental search entirely**, or position as "distress/value only" — i.e., only show listings that pass a distress filter?

---

## 11. Out of Scope for V1

- User accounts / saved searches
- Push notifications for new drops
- Direct landlord contact within the terminal
- Historical price trend charts per unit
- Neighbourhood scoring / livability index
- Short-term rental (Airbnb) yield comparison
- Mortgage vs. rent calculator integration (exists separately as ROI Engine)

---

## 12. Suggested Build Order

1. **Log Bayut + PF rental API raw responses** — confirm available fields (cheques, price history, area codes)
2. **Build the data layer** — fetch, normalise, filter rental listings
3. **Import RERA index** as static market rate benchmark (JSON or Sanity)
4. **Build the feed UI** — list view, cards, price display in monthly/annual
5. **Add distress scoring** — flag listings meeting ≥1 distress criteria
6. **Add filters** — area, bedrooms, price, distress toggle
7. **Add market rate badges** — above/below/at market based on RERA index
8. **Add images + source links** to each card (same pattern as distress deals)
