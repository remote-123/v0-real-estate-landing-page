# PRD: Rental Drops Terminal Page

> Source: `.agent/PRD-rental-drops.md` — Status: Built (live at `/terminal/rental-drops`)
> Original spec for reference.

## Problem
Finding a rental in Dubai = multi-tab manual hell. No single place aggregates listings, normalises pricing, flags genuine drops, and shows if the listed price is above/below real market rate.

**Gap:** Every existing tool shows listings. None shows value.

## Target User
Expats relocating or renewing a lease in AED 80K–400K/yr range. Time/money tradeoff of doing this properly has real ROI.

## Core Distress Signals (qualifies as "drop" if ONE is true)
- Listed price > 10% below community RERA index for bedroom count
- Days on market > 30
- Price reduced since original listing
- Price/sqft > 15% below community average in feed

## Data Sources
| Source | Method | Status |
|---|---|---|
| PropertyFinder | RapidAPI `RAPIDAPI_KEY` | ✅ Live (rental_listings table) |
| Bayut | RapidAPI `BAYUT_RAPIDAPI_KEY` | 📋 Available |
| RERA Rental Index | Public data | 📋 Manual import needed |

## Key Features (V1)
- Unified PF + Bayut rental feed
- Monthly / quarterly / annual price display (default: monthly)
- Market rate comparison badge (below/at/above market)
- Days on market
- Price/sqft
- Distress-only toggle filter
- Area, bedrooms, price range filters

## Building Age Issue
`Built` column uses fuzzy name matching — breaks for phase-numbered developments (Sidra 1/2/3, Marina Gate 1/2 etc.).
Fix: `dld_building_nk` from Bayut raw response. See [[DLD-Sources]] for full explanation.

## V2 Ideas (out of scope for V1)
- User accounts / saved searches
- Push notifications for new drops
- Historical price trend per unit
- Short-term rental (Airbnb) yield comparison
- Cheque structure tracking
