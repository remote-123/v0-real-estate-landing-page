import { sql } from '../ingest/db-client'

async function main() {
  const [r] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE nearest_metro IS NOT NULL) as metro_filled,
      COUNT(*) FILTER (WHERE nearest_metro IS NULL) as metro_null,
      COUNT(*) FILTER (WHERE nearest_highway IS NOT NULL) as highway_filled,
      COUNT(*) FILTER (WHERE nearest_highway IS NULL) as highway_null,
      COUNT(*) FILTER (WHERE developer IS NOT NULL) as dev_filled,
      COUNT(*) FILTER (WHERE completion_year IS NOT NULL) as year_filled,
      COUNT(*) FILTER (WHERE status = 'complete' AND completion_year IS NULL) as complete_no_year,
      COUNT(*) as total
    FROM nc_buildings
  `

  const total = Number(r.total)
  const pct = (n: string) => ((Number(n) / total) * 100).toFixed(1)

  console.log(`\n══ nc_buildings Enrichment Status ══`)
  console.log(`Total buildings: ${total}\n`)
  console.log(`Metro:    ${r.metro_filled} filled (${pct(r.metro_filled)}%) | ${r.metro_null} missing`)
  console.log(`Highway:  ${r.highway_filled} filled (${pct(r.highway_filled)}%) | ${r.highway_null} missing`)
  console.log(`Developer:${r.dev_filled} filled (${pct(r.dev_filled)}%)`)
  console.log(`Year:     ${r.year_filled} filled (${pct(r.year_filled)}%)`)
  console.log(`\nComplete status, no year: ${r.complete_no_year}`)
  console.log()

  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
