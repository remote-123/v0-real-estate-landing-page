import { sql } from "../ingest/db-client"

async function run() {
  await sql`ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS total_floors   INTEGER`
  await sql`ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS total_units    INTEGER`
  await sql`ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS property_types TEXT`
  await sql`ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS amenities      TEXT`
  await sql`ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS ps_service_charge TEXT`
  console.log("✓ columns added: total_floors, total_units, property_types, amenities, ps_service_charge")
  await sql.end()
}

run().catch(e => { console.error(e); process.exit(1) })
