import { sql } from "../ingest/db-client"

async function run() {
  await sql`
    ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS osm_lat NUMERIC
  `
  await sql`
    ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS osm_lng NUMERIC
  `
  console.log("osm_lat and osm_lng columns added to buildings_enriched")
  await sql.end()
}

run().catch(e => { console.error(e); process.exit(1) })
