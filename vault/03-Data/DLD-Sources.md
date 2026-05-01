# DLD Data Sources

## Source
Dubai Land Department (DLD) open data via Dubai Pulse portal.
Manual download — no public API. Batch CSV exports with unknown refresh cadence.

## Key Fields (dld_transactions)
| Field | Maps to |
|---|---|
| `instance_date` | Transaction date |
| `actual_worth` | Transaction price |
| `meter_sale_price` | Price per sqm |
| `procedure_area` | Built-up area sqm |
| `area_name_en` | Community name (DLD taxonomy) |
| `area_id` | DLD area ID |
| `rooms_en` | Bedroom type ("2 B/R", "Studio", etc.) |
| `trans_group_en` | "Sales" \| "Mortgages" \| "Gifts" |

## Building Age Problem
`Built` column in rental-drops terminal uses fuzzy name matching — breaks for phase-numbered developments (Sidra 1/2/3, Marina Gate 1/2, etc.).

**Fix**: Use `dld_building_nk` from Bayut raw response (`item.legal.dld_building_nk`, e.g. "tabu-222325044"). When new DLD dataset ingested with this key, cross-reference with `rental_listings.raw` (jsonb). When downloading new `dld_buildings.csv`, check for `dld_building_nk` / `building_nk` / `tabu_*` column.

## Area Name Mismatch: Bayut vs DLD
Bayut uses different community names than DLD. Examples:
- Bayut: "Jumeirah Village Circle (JVC)" → DLD: "Jumeirah Village Circle"
- Bayut: "Dubai Silicon Oasis (DSO)" → DLD: "Dubai Silicon Oasis"
- Bayut: "Business Bay" → DLD: "Business Bay" ✅

Mapping table: `area_name_mapping` (30 rows) bridges the two taxonomies.
