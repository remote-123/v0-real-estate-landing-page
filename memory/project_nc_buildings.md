---
name: nc_buildings table
description: In-house curated building database — 5,799 rows seeded from propsearch + dld_units bedroom match
type: project
---

# nc_buildings

**Created**: 2026-06-19  
**Migration**: `scripts/migrate/012_nc_buildings.ts`  
**Seed**: `scripts/ingest/seed-nc-buildings.ts`  
**Rows**: 5,799

## Purpose

Canonical building reference table for North Capital. Supplements `prop_building_details` (raw scrape) with curated data including bedroom counts, highway proximity, view type, and building grade.

## data_quality levels

| Level | Label | Count | Meaning |
|-------|-------|-------|---------|
| 0 | stub | 0 | name + slug only |
| 1 | auto | 4,634 | populated from prop_building_details |
| 2 | bedrooms-matched | 1,165 | + bedroom counts from dld_units |
| 3 | manual-verified | 0 | manually reviewed/corrected |

## Key schema fields

```sql
slug                TEXT PRIMARY KEY
name                TEXT
nc_area_slug        TEXT REFERENCES nc_areas(slug)
propsearch_slug     TEXT UNIQUE  -- links to prop_building_details.building_slug
units_studio        INTEGER      -- from dld_units.project_name_en match
units_1br           INTEGER
units_2br           INTEGER
units_3br_plus      INTEGER
building_grade      TEXT         -- luxury|premium|mid|affordable (manual)
nearest_highway     TEXT         -- E11/E311/E611 etc (manual)
view_type           TEXT[]       -- sea/park/golf/city/community (manual)
dld_building_nk     TEXT         -- tabu key — empty until DLD dataset has it
data_quality        SMALLINT
```

## Bedroom match source

`dld_units.project_name_en` grouped and normalised to match `prop_building_details.name`. 2,656 unique project names in dld_units; 1,165 matched to buildings.

## Fields needing manual curation (admin UI)

- `nearest_highway` — all rows null
- `view_type` — all rows null
- `building_grade` — all rows null
- `units_1br/2br/3br_plus` — 4,634 rows still null
- `dld_building_nk` — pending DLD dataset with tabu key

## Migration 013 — static enrichment (2026-06-19)

`scripts/migrate/013_nc_buildings_enrich.ts` adds + backfills:
- `status TEXT` — from `prop_building_details` via `pbd.building_slug = nb.propsearch_slug` → 5,415 rows
- `global_slug TEXT` — from `re_buildings` → 3,683 rows
- `osm_lat/osm_lng DOUBLE PRECISION` — from `re_buildings` (mostly null; don't expose in list UI)
- `master_developer TEXT` — from `re_buildings` where missing → 609 rows
- Indexes: `nc_buildings_status_idx`, `nc_buildings_global_slug_idx`
- Run: `npm run migrate:nc-buildings-enrich`

After 013, `nc_buildings` is the single source of truth — terminal pages query it + `nc_areas` only, no runtime JOINs to `re_buildings` or `prop_building_details`.

## Terminal page pattern

```sql
SELECT nb.*, na.display_name AS area_display
FROM nc_buildings nb
LEFT JOIN nc_areas na ON na.slug = nb.nc_area_slug
WHERE nb.name IS NOT NULL
  AND nb.status = $status        -- optional SQL fragment
  AND nb.building_grade = $grade -- optional SQL fragment
  -- ... etc
ORDER BY nb.name
LIMIT 100 OFFSET $offset
```

`/terminal/prop-buildings` redirects to `/terminal/buildings`.

## npm commands

```bash
npm run migrate:nc-buildings          # create table (012)
npm run seed:nc-buildings             # seed/reseed from prop_building_details + dld_units
npm run seed:nc-buildings -- --mode=insert-only  # skip existing rows
npm run migrate:nc-buildings-enrich   # 013 — add status/global_slug/coords + backfill
```
