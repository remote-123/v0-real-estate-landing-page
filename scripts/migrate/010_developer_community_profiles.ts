/**
 * Migration 010: Developer profiles + community transport metadata
 * Run with: npx tsx scripts/migrate/010_developer_community_profiles.ts
 */

import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING!, { ssl: "require" })

async function main() {
  console.log("Running migration 010...")

  await sql`
    CREATE TABLE IF NOT EXISTS developer_profiles (
      id              SERIAL PRIMARY KEY,
      dld_name        TEXT NOT NULL UNIQUE,  -- exact name from DLD records
      brand_name      TEXT NOT NULL,          -- consumer-facing brand name
      founded         INTEGER,
      hq              TEXT,
      market_type     TEXT,                   -- Luxury / Affordable / Mid-market / Ultra-luxury / Mixed
      flagship_project TEXT,
      active_areas    TEXT[],
      listed          BOOLEAN DEFAULT FALSE,
      tagline         TEXT,
      website         TEXT,
      logo_url        TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log("✓ developer_profiles table created")

  await sql`
    CREATE TABLE IF NOT EXISTS community_transport_meta (
      id              SERIAL PRIMARY KEY,
      slug            TEXT NOT NULL UNIQUE,   -- brand slug (e.g. "downtown-dubai")
      metro_stations  TEXT[],                 -- nearest metro stations with line
      bus_routes      TEXT[],                 -- key bus route numbers
      tram_access     BOOLEAN DEFAULT FALSE,
      yield_range     TEXT,                   -- e.g. "5.5–7.2%"
      psf_range       TEXT,                   -- e.g. "AED 1,800–2,400"
      community_type  TEXT,                   -- e.g. "Waterfront apartments"
      notable_streets TEXT[],
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log("✓ community_transport_meta table created")

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_dev_profiles_dld_name ON developer_profiles(LOWER(dld_name))`
  await sql`CREATE INDEX IF NOT EXISTS idx_community_meta_slug ON community_transport_meta(slug)`
  console.log("✓ Indexes created")

  await sql.end()
  console.log("Migration 010 complete.")
}

main().catch(e => { console.error(e); process.exit(1) })
