/**
 * Enriches buildings_enriched from propsearch_data/building_details.csv.
 *
 * For every row in buildings_enriched that has a propsearch_slug,
 * looks up the matching row in building_details.csv and updates:
 *   - completion_year  (only if currently NULL)
 *   - total_floors
 *   - total_units
 *   - property_types
 *   - amenities
 *   - ps_service_charge
 *
 * Run: npx tsx --env-file=.env.local scripts/ingest/enrich_from_propsearch_csv.ts
 */
import { sql } from "./db-client"
import fs from "fs"
import path from "path"
import readline from "readline"

const CSV_PATH = path.join(process.cwd(), "propsearch_data", "building_details.csv")

interface DetailRow {
  building_slug:    string
  name:             string
  developer:        string
  completion_year:  string
  total_floors:     string
  total_units:      string
  property_types:   string
  amenities:        string
  service_charge:   string
  description:      string
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      fields.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

async function loadDetailsCsv(): Promise<Map<string, DetailRow>> {
  const map = new Map<string, DetailRow>()

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`)
    process.exit(1)
  }

  const rl = readline.createInterface({ input: fs.createReadStream(CSV_PATH) })
  let headers: string[] = []
  let lineNo = 0

  for await (const line of rl) {
    lineNo++
    if (lineNo === 1) { headers = parseCsvLine(line); continue }
    const vals = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? "" })
    map.set(row.building_slug, row as unknown as DetailRow)
  }

  return map
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading building_details.csv...")
  const details = await loadDetailsCsv()
  console.log(`  ${details.size} detail rows loaded`)

  // Fetch all buildings that have a propsearch_slug
  const rows = await sql<{ building_key: string; propsearch_slug: string; completion_year: number | null }[]>`
    SELECT building_key, propsearch_slug, completion_year
    FROM buildings_enriched
    WHERE propsearch_slug IS NOT NULL
  `
  console.log(`  ${rows.length} buildings in DB with propsearch_slug\n`)

  let updated = 0, skipped = 0

  for (const row of rows) {
    const d = details.get(row.propsearch_slug)
    if (!d) { skipped++; continue }

    const floors      = d.total_floors   ? parseInt(d.total_floors)   : null
    const units       = d.total_units    ? parseInt(d.total_units)    : null
    const year        = d.completion_year ? parseInt(d.completion_year) : null
    const propTypes   = d.property_types  || null
    const amenities   = d.amenities       || null
    const svcCharge   = d.service_charge  || null

    await sql`
      UPDATE buildings_enriched SET
        total_floors      = ${floors},
        total_units       = ${units},
        property_types    = ${propTypes},
        amenities         = ${amenities},
        ps_service_charge = ${svcCharge},
        completion_year   = COALESCE(completion_year, ${year}),
        enriched_at       = now()
      WHERE building_key = ${row.building_key}
    `
    updated++
    if (updated % 500 === 0) process.stdout.write(`  ${updated}/${rows.length}...\n`)
  }

  console.log(`\nDone.`)
  console.log(`  Updated: ${updated}`)
  console.log(`  No CSV match: ${skipped}`)
  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
