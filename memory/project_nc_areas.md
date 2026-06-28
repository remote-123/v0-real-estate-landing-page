---
name: nc_areas canonical area table
description: Dubai area name mapping — DLD cryptic names to retail display names, used by mv_txn_monthly_unified
type: project
---

# nc_areas — Canonical Area Reference

**Created**: 2026-06-18  
**Migration**: `scripts/migrate/011_nc_areas.ts`  
**Rows**: 65 areas (52 top-level, 13 sub-communities)

## Purpose

Resolves the DLD cryptic area name problem. `dld_transactions.area_name_en` uses Arabic transliterations ("Marsa Dubai", "Burj Khalifa", "Al Barsha South Fourth") that no user recognises. `nc_areas` maps these to retail/community names.

## Key mappings

| DLD area_name_en | nc_display_name | nc_slug |
|---|---|---|
| Marsa Dubai | Dubai Marina | dubai-marina |
| Burj Khalifa | Downtown Dubai | downtown-dubai |
| Al Barsha South Fourth | Jumeirah Village Circle | jumeirah-village-circle |
| Al Thanyah Fifth | Jumeirah Lake Towers | jumeirah-lake-towers |
| Hadaeq Sheikh Mohammed Bin Rashid | Dubai Hills Estate | dubai-hills-estate |
| Al Merkadh | Mohammed Bin Rashid City | mbr-city |
| Madinat Al Mataar | Dubai South | dubai-south |
| Nadd Hessa | Dubai Silicon Oasis | dubai-silicon-oasis |
| Al Hebiah Third | DAMAC Hills | damac-hills |
| Al Hebiah Fourth | Dubai Sports City | dubai-sports-city |
| Wadi Al Safa 6 | Arabian Ranches | arabian-ranches |
| Wadi Al Safa 7 | Arabian Ranches 2 | arabian-ranches-2 |
| Wadi Al Safa 5 | Arabian Ranches 3 | arabian-ranches-3 |
| Al Yelayiss 2 | Town Square | town-square |
| Al Thanyah Third | Emirates Living | emirates-living |
| Al Thanayah Fourth | Emirates Living | emirates-living |
| Jabal Ali First | Al Furjan | al-furjan |

## Schema

```sql
nc_areas (
  slug              TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  aliases           TEXT[],
  dld_area_names    TEXT[],        -- GIN indexed, used in WHERE
  propsearch_slug   TEXT,          -- matches prop_areas.slug
  area_type         TEXT,          -- master-community | sub-community | district | free-zone
  parent_slug       TEXT,          -- FK to nc_areas (MBR City → Dubai Hills Estate)
  developer         TEXT,
  display_order     INT,
  notes             TEXT
)
```

## Usage pattern

```sql
-- Filter transactions by retail community name
WHERE area_name_en = ANY(
  SELECT UNNEST(dld_area_names) FROM nc_areas WHERE slug = 'dubai-marina'
)

-- Include sub-communities when parent selected
WHERE area_name_en = ANY(
  SELECT UNNEST(dld_area_names) FROM nc_areas
  WHERE slug = 'mbr-city' OR parent_slug = 'mbr-city'
)
```

## mv_txn_monthly_unified integration

The materialized view now includes `nc_display_name`, `nc_slug`, `nc_parent_slug` columns.
All 16 terminal pages that query this view automatically get canonical names.
DISTINCT ON logic prefers sub-community matches over parent matches where unambiguous.

## 3 areas with no DLD transactions (correct, not a bug)

- `emirates-hills` — ultra-luxury, almost no registered transfers
- `dubai-islands` — pre-sales only, DLD registrations not yet in dataset
- `palm-jebel-ali` — relaunched 2023, no completions yet
