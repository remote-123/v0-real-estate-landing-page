/**
 * Migration: create prop_areas, prop_buildings, prop_building_details tables.
 * Run: npx tsx --env-file=.env.local scripts/migrate/prop-buildings.ts
 */

import { sql } from "../../lib/db"

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS prop_areas (
      id               SERIAL PRIMARY KEY,
      slug             TEXT UNIQUE NOT NULL,
      name             TEXT NOT NULL,
      total_buildings  INTEGER,
      first_scraped_at TIMESTAMPTZ DEFAULT NOW(),
      last_scraped_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log("✓ prop_areas")

  await sql`
    CREATE TABLE IF NOT EXISTS prop_buildings (
      id             SERIAL PRIMARY KEY,
      area_slug      TEXT NOT NULL,
      building_slug  TEXT NOT NULL,
      building_name  TEXT,
      status         TEXT,
      first_seen_at  TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(area_slug, building_slug)
    )
  `
  console.log("✓ prop_buildings")

  await sql`
    CREATE TABLE IF NOT EXISTS prop_building_details (
      id                  SERIAL PRIMARY KEY,
      building_slug       TEXT UNIQUE NOT NULL,
      area_slug           TEXT,
      name                TEXT,
      developer           TEXT,
      master_developer    TEXT,
      building_type       TEXT,
      status              TEXT,
      completion_year     INTEGER,
      total_floors        INTEGER,
      total_units         INTEGER,
      property_types      TEXT,
      amenities           TEXT,
      is_freehold         BOOLEAN,
      service_charge_psf  NUMERIC,
      project_value_aed   BIGINT,
      description         TEXT,
      scraped_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log("✓ prop_building_details")

  console.log("\nAll prop_* tables ready.")
  await sql.end()
}

run().catch(err => { console.error(err); process.exit(1) })
