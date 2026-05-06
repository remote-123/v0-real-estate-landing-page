/**
 * Seed community_transport_meta table from static TypeScript data.
 * Run: npx tsx scripts/seed/seed-community-transport.ts
 */

import { config } from "dotenv"
import postgres from "postgres"
import { COMMUNITY_TRANSPORT_META } from "../../lib/area-data/community-transport-meta"

config({ path: ".env.local" })

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING!, { ssl: "require" })

async function main() {
  console.log(`Seeding ${Object.keys(COMMUNITY_TRANSPORT_META).length} communities...`)

  for (const [slug, meta] of Object.entries(COMMUNITY_TRANSPORT_META)) {
    await sql`
      INSERT INTO community_transport_meta
        (slug, metro_stations, bus_routes, tram_access, yield_range, psf_range, community_type, notable_streets)
      VALUES
        (${slug}, ${meta.metro}, ${meta.bus}, ${meta.tram}, ${meta.yield_range}, ${meta.psf_range}, ${meta.community_type}, ${meta.notable_streets})
      ON CONFLICT (slug) DO UPDATE SET
        metro_stations = EXCLUDED.metro_stations,
        bus_routes     = EXCLUDED.bus_routes,
        tram_access    = EXCLUDED.tram_access,
        yield_range    = EXCLUDED.yield_range,
        psf_range      = EXCLUDED.psf_range,
        community_type = EXCLUDED.community_type,
        notable_streets = EXCLUDED.notable_streets,
        updated_at     = NOW()
    `
    console.log(`  ✓ ${slug}`)
  }

  await sql.end()
  console.log("Done.")
}

main().catch(e => { console.error(e); process.exit(1) })
