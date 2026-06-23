import { sql } from '../ingest/db-client'

async function main() {
  const rows = await sql`
    SELECT
      CASE WHEN nc_area_slug IS NULL THEN 'no_area' ELSE 'has_area' END as area_status,
      COUNT(*) as cnt
    FROM nc_buildings
    WHERE nearest_metro IS NULL
    GROUP BY 1
  `
  console.log('Missing metro breakdown:')
  for (const r of rows) console.log(`  ${r.area_status}: ${r.cnt}`)

  const areas = await sql`
    SELECT nc_area_slug, COUNT(*) as cnt
    FROM nc_buildings
    WHERE nearest_metro IS NULL AND nc_area_slug IS NOT NULL
    GROUP BY nc_area_slug
    ORDER BY cnt DESC
    LIMIT 10
  `
  console.log('\nTop areas still missing metro:')
  for (const r of areas) console.log(`  ${r.nc_area_slug}: ${r.cnt}`)

  await sql.end()
}
main().catch(console.error)
