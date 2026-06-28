/**
 * 012_nc_buildings.ts
 *
 * Creates nc_buildings — North Capital canonical building reference table.
 *
 * This is the in-house curated building database. It combines auto-populated
 * data from prop_building_details (propsearch.ae) and dld_units (bedroom counts)
 * with manually verified fields (highway, view type, grade, etc.).
 *
 * data_quality levels:
 *   0 = stub (slug + name only)
 *   1 = auto from prop_building_details
 *   2 = bedroom counts matched from dld_units
 *   3 = manually verified
 *
 * Run: npx tsx --env-file=.env.local scripts/migrate/012_nc_buildings.ts
 */

import { sql } from "../ingest/db-client"

async function run() {
  console.log("Creating nc_buildings table...")

  await sql`
    CREATE TABLE IF NOT EXISTS nc_buildings (
      slug                TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      nc_area_slug        TEXT REFERENCES nc_areas(slug),
      propsearch_slug     TEXT UNIQUE,           -- FK to prop_building_details.building_slug
      developer           TEXT,
      master_developer    TEXT,
      completion_year     INTEGER,
      total_floors        INTEGER,
      total_units         INTEGER,
      units_studio        INTEGER,
      units_1br           INTEGER,
      units_2br           INTEGER,
      units_3br_plus      INTEGER,
      building_type       TEXT,                  -- apartment | villa | mixed | hotel-apartment | penthouse
      building_grade      TEXT,                  -- luxury | premium | mid | affordable
      is_freehold         BOOLEAN,
      service_charge_psf  NUMERIC(8,2),
      nearest_highway     TEXT,                  -- E11, E311, E611, D63, etc.
      nearest_metro       TEXT,                  -- station name
      metro_walk_mins     INTEGER,
      view_type           TEXT[],                -- ['sea','marina','city','park','golf','community']
      has_pool            BOOLEAN DEFAULT false,
      has_gym             BOOLEAN DEFAULT false,
      has_school_nearby   BOOLEAN DEFAULT false,
      dld_building_nk     TEXT,                  -- tabu key — populate when DLD dataset includes it
      notes               TEXT,
      data_quality        SMALLINT DEFAULT 0,    -- 0=stub 1=auto 2=bedrooms-matched 3=manual
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  console.log("✓ nc_buildings table created")

  await sql`
    CREATE INDEX IF NOT EXISTS nc_buildings_nc_area_slug_idx ON nc_buildings (nc_area_slug)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS nc_buildings_developer_idx ON nc_buildings (developer)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS nc_buildings_completion_year_idx ON nc_buildings (completion_year)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS nc_buildings_data_quality_idx ON nc_buildings (data_quality)
  `
  console.log("✓ Indexes created")

  await sql.end()
  console.log("\nDone.")
}

run().catch(err => { console.error(err); process.exit(1) })
