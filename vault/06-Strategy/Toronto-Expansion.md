# Toronto Expansion Strategy

> Status: **Planning** — research complete 2026-05-06
> Tech stack reuse: Next.js App Router, Neon, same x-site/x-city middleware pattern

## Central Constraint

Dubai works because DLD is an open government registry with bulk CSV downloads. Toronto's TRREB MLS data is **gated** — requires brokerage membership, no public bulk download. This shapes the entire MVP scope.

**The moat**: Tarion (Ontario's builder warranty registry) IS open data with no good consumer interface. Build on Tarion first.

---

## Competitive Landscape

### Market Structure

| Tier | Players | Weakness |
|---|---|---|
| Consumer | HouseSigma, Wahi, MoveSmartly | No institutional depth, no yield/pipeline data |
| Institutional | Urbanation ($50k+/yr PDFs), Altus Group (enterprise CRE) | Not self-serve, lagged, no terminal UX |
| **VOID** | **Self-serve investor/analyst terminal** | **Nobody serves pre-con buyer, small fund, family office** |

### Don't Build (Commoditized)

- Active listings map — Realtor.ca, Zolo, HouseSigma
- Sold price by address — HouseSigma free
- City-level avg price trends — TRREB publishes free monthly
- City-level rent reports — Rentals.ca, Zumper/Padmapper
- Neighbourhood bid/ask ratio — Wahi Market Pulse (400 GTA hoods)
- Basic HPI charting — every brokerage website
- Mortgage calculator — every bank + ratehub.ca

### Top 3 Unserved Niches

**1. Investor-grade residential terminal (self-serve, real-time)**
No platform shows PSF trend + achieved rents + gross yield + DOM + price vs. ask + supply risk for a specific building or neighbourhood. HouseSigma has raw MLS data but hasn't built the institutional view.

**2. Developer accountability scorecard**
No one combined Tarion warranty claims + project timeline data + actual closing PSF vs. pre-con asking price. Pre-con buyers commit $500k+ with zero objective builder data.

**3. Pre-construction return modelling**
"Buy at $1,200 PSF today for delivery in 3 years — what will it rent for?" Urbanation gets closest but it's a consulting engagement. No self-serve tool exists.

### Phase 2 Data Moat: Teranet

Teranet operates the Ontario land registry — equivalent to DLD, every property transfer in bulk. Licensed at ~$50k–200k/yr enterprise. Nobody has productized it in a self-serve terminal. This is the unlock after proving traction with Tarion-based v1.

---

## MVP Feature Set (Toronto v1)

### Build — High Value, Data Available

| Feature | Data Source | Complexity | Differentiator |
|---|---|---|---|
| HPI Price Index | CREA MLS HPI CSV (monthly) | Low — same as `dld_price_index` | Medium |
| Pre-Construction Pipeline | Tarion New Home Enrolments | Medium | Very High — no consumer interface |
| Builder Track Record | Tarion Builder Directory + warranty claims | Low-Medium | Very High — quality signals Dubai can't have |
| Rental Listings + Yield Map | Realtor.ca RapidAPI + Rentals.ca | Low — same cron pattern | High |
| Rent Control Zone Tracker ⭐ | Tarion occupancy dates (pre/post Nov 2018) | Medium | Very High — nobody maps this publicly |
| Condo Maintenance Fee Intel | Realtor.ca listing fees, aggregated by building | Medium | High |
| Ontario LTT Calculator | Pure frontend, public formula | Low | Medium — SEO tool |

### Toronto-Specific (No Dubai Equivalent)

- **Assignment Market Scanner** — pre-con APS resales. Realtor.ca API filtered for "assignment sale". Very High differentiation.
- **Laneway/Garden Suite Tracker** — Toronto Open Data building permits + zoning GeoJSON. High differentiation.

### Skip

- Floor Plan Pricer — HouseSigma does it free; no TRREB raw transactions
- Area Momentum / Transaction Pulse (granular) — needs TRREB access
- School District Overlay — consumer feature, zero investor differentiation
- NRST/Foreign Buyer Ban Calculator — one-page explainer only
- Market Briefing — build only after real transaction data
- Golden Visa equivalent — doesn't exist in Canada

---

## Data Sources

| Dubai Concept | Toronto Equivalent | Quality |
|---|---|---|
| DLD transaction registry | No open equivalent. CREA HPI benchmarks only. Teranet has raw data ($$$). | Poor for transactions |
| `dld_projects` | Tarion New Home Enrolments | Good — structured bulk data |
| DLD developer registry | Tarion Builder Directory (+ warranty claims/deficiency rates) | Very Good — better than DLD |
| Bayut listings | Realtor.ca via RapidAPI (`realtor-ca.p.rapidapi.com`) or Houski API | Good |
| DLD area taxonomy | 158 Toronto social planning neighbourhoods (open GeoJSON) + FSA postal codes | Medium |
| RERA service charges | Realtor.ca listing maintenance fees + CAO registry | Medium |

### Tier 1 — Free, Build Now

| Source | URL | Update | Format | Powers |
|---|---|---|---|---|
| CREA MLS HPI | `crea.ca/housing-market-stats/mls-home-price-index/hpi-tool/` | Monthly Excel | .xlsx | Price index page |
| Stats Canada NHPI | Table `18-10-0245-01` via CKAN API | Monthly | API/CSV | New-build price tracker |
| CMHC Housing Starts | Table `34-10-0148-01` | Monthly | API/CSV | Supply pipeline |
| CMHC Rental Survey | `cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market` | Annual (Oct) | Excel | Rental yield + vacancy |
| Toronto Building Permits | `open.toronto.ca` CKAN API | Annual (per year) | CSV | Permit/pipeline view |
| Toronto Neighbourhoods | `open.toronto.ca` GeoJSON | Periodic | GeoJSON | Community taxonomy (158 hoods) |

### Tier 2 — Paid, High Value

| Source | URL | Cost | Powers |
|---|---|---|---|
| Houski API | `houski.ca/property-api` | Pay-per-use (fractions of ¢/record) | Building-level enrichment (no MLS needed) |
| TRREB Monthly PDFs | `trreb.ca/market-data/market-watch/` | Free (public PDFs, parse with pdfplumber) | Transaction pulse monthly aggregates |
| GeoWarehouse / Teranet | `geowarehouse.ca` | ~$3,300/yr | Actual transaction prices by address |
| Urbanation | `urbanation.ca` | ~$5k–15k+/yr | Pre-con pipeline + developer track granular |

### Geographic Taxonomy

- **158 Social Planning Neighbourhoods** — named areas (Annex, Leslieville, etc.), census-aligned, free shapefiles. Best Dubai "communities" equivalent.
- **FSA postal codes** — first 3 chars (M4W, M5A). ~29 in Toronto. Appears on every listing. Best for yield maps.
- **TRREB Districts** — ~35 districts (C01 = downtown core, E01 = East York). Used in MLS HPI data.
- **CMHC Zones** — ~9 sub-zones within Toronto CMA. Used in rental data.

---

## Ingestion Order

**Week 1 — Free CSVs**
1. CREA HPI Toronto CSV → `toronto_price_index`
2. Tarion Builder Directory → `toronto_builders`
3. Tarion New Home Enrolments → `toronto_projects`

**Week 2 — API**
4. Realtor.ca RapidAPI → `toronto_sale_listings` (daily cron)
5. Rentals.ca or Zumper → `toronto_rental_listings`

**Week 3 — Derived**
6. Materialised view `toronto_mv_monthly` (group by FSA + bedroom + month)
7. Tarion occupancy date join → `toronto_rent_control` lookup

**Week 4 — City Switcher**
8. `middleware.ts` adds `x-city: toronto | dubai` header
9. Routes: `/toronto/terminal/*` or `toronto.thecityregistry.com`
10. `terminalPageMeta` reads `x-city` same as it reads `x-site`

---

## Phase 2 Unlock: TRREB Access

TRREB transaction-level data requires brokerage membership. Path:
- Build traction with Tarion-based features first
- Negotiate data partnership with Toronto brokerage (attribution in exchange for feed)
- This is how HouseSigma and Strata.ca operate

Once TRREB access is achieved: Area Momentum, Floor Plan Pricer, Transaction Pulse (granular) all become viable — same product Dubai already has.

---

## Competitive Landscape

- **HouseSigma** — TRREB-connected, sold price history, free. Built by ex-TRREB agent.
- **Wahi** — consumer-facing, brokerage model, no investor analytics
- **Urbanation** — institutional, $$$, condo-focused research reports. Main competitor for Tarion intelligence angle.
- **Altus Group** — enterprise ARGUS suite, not a data terminal, sold to developers/lenders
- **Strata.ca** — condo-specific, building-level data, requires TRREB feed

**Gap**: Nobody has built a Tarion analytics interface. Nobody publishes rent control status by building. Nobody does yield by FSA for investors specifically (vs consumers).
