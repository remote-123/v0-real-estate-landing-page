/**
 * Migration: for every row in buildings_enriched that has a propsearch_slug,
 * update building_name_en to the title-cased version of that slug.
 *
 * e.g. "MARINA GATE TOWER NO 1 (PHASE 2)" → "Marina Gate 1"
 *      propsearch_slug = "marina-gate-1"   → "Marina Gate 1"
 *
 * Run: npx tsx --env-file=.env.local scripts/migrate/003_clean_building_names.ts
 */
import { sql } from "../ingest/db-client"

function slugToName(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
}

async function run() {
  // Fetch all buildings with a propsearch_slug
  const rows = await sql<{ building_key: string; propsearch_slug: string }[]>`
    SELECT building_key, propsearch_slug
    FROM buildings_enriched
    WHERE propsearch_slug IS NOT NULL
  `

  console.log(`Updating names for ${rows.length} buildings with propsearch_slug...`)

  let updated = 0
  for (const row of rows) {
    const cleanName = slugToName(row.propsearch_slug)
    await sql`
      UPDATE buildings_enriched
      SET building_name_en = ${cleanName}
      WHERE building_key = ${row.building_key}
    `
    updated++
    if (updated % 200 === 0) process.stdout.write(`  ${updated}/${rows.length}...\n`)
  }

  console.log(`\n✓ Updated ${updated} building names.`)
  await sql.end()
}

run().catch(e => { console.error(e); process.exit(1) })
