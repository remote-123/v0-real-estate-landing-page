import { sql } from '../ingest/db-client'

async function main() {
  // How many total have no nc_area_slug?
  const [counts] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE nc_area_slug IS NULL) as no_area,
      COUNT(*) FILTER (WHERE nc_area_slug IS NOT NULL) as has_area,
      COUNT(*) as total
    FROM nc_buildings
  `
  console.log(`No area: ${counts.no_area} / ${counts.total}`)

  // Sample of no-area buildings - what data do they have?
  const sample = await sql`
    SELECT slug, name, nearest_highway, developer, status
    FROM nc_buildings
    WHERE nc_area_slug IS NULL
    ORDER BY data_quality DESC, name ASC
    LIMIT 20
  `
  console.log('\nSample no-area buildings:')
  for (const r of sample) {
    console.log(`  ${r.name} | hw:${r.nearest_highway ?? '-'} | dev:${(r.developer ?? '-').slice(0,30)} | ${r.status ?? '-'}`)
  }

  await sql.end()
}
main().catch(console.error)
