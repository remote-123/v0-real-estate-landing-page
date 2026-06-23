import { sql } from "../ingest/db-client"

async function run() {
  const [stats] = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE developer IS NULL)::int AS no_developer,
      COUNT(*) FILTER (WHERE completion_year IS NULL)::int AS no_year,
      COUNT(*) FILTER (WHERE nearest_metro IS NULL)::int AS no_metro,
      COUNT(*) FILTER (WHERE nearest_highway IS NULL)::int AS no_highway,
      COUNT(*) FILTER (WHERE total_units IS NULL)::int AS no_units,
      COUNT(*)::int AS total
    FROM nc_buildings
  `
  console.log("Enrichment gaps:", stats)

  const sample = await sql`
    SELECT slug, name, nc_area_slug
    FROM nc_buildings
    WHERE name ILIKE '%address%'
    LIMIT 5
  `
  console.log("\nTest candidates (Address* buildings):")
  for (const r of sample) console.log(`  [${r.slug}] ${r.name} — area: ${r.nc_area_slug}`)
  await sql.end()
}
run().catch(console.error)
