/**
 * Ingest DM Building Summary CSV into `buildings` table.
 * Run: npx tsx --env-file=.env.local scripts/ingest/buildings.ts [path/to/csv]
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./db-client"

// ── Config ──────────────────────────────────────────────────────────────────

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "Building_Summary_Information_2026-03-09.csv")

const BATCH_SIZE = 200

// ── Helpers ──────────────────────────────────────────────────────────────────

function nullify(val: string | null | undefined): string | null {
  if (!val || val.trim() === "" || val.trim().toLowerCase() === "null") return null
  return val.trim()
}

function toInt(val: string | null | undefined): number | null {
  const n = parseInt(nullify(val) ?? "", 10)
  return isNaN(n) ? null : n
}

function toFloat(val: string | null | undefined): number | null {
  const n = parseFloat(nullify(val) ?? "")
  return isNaN(n) ? null : n
}

function toDate(val: string | null | undefined): string | null {
  const s = nullify(val)
  if (!s) return null
  // Expect YYYY-MM-DD format from DM CSV
  return s.length >= 10 ? s.slice(0, 10) : null
}

function toBool(val: string | null | undefined): boolean | null {
  const s = nullify(val)
  if (!s) return null
  return s.toUpperCase() === "YES"
}

// ── Row transform ─────────────────────────────────────────────────────────────

function transformRow(row: Record<string, string>) {
  return {
    building_id:       nullify(row["building_id"]),
    construction_year: toInt(row["building_construction_year"]),
    completion_date:   toDate(row["building_completion_date"]),
    community_name:    nullify(row["community_name_english"]),
    community_no:      nullify(row["community_no"]),
    building_type:     nullify(row["building_type_english"]),
    building_usages:   nullify(row["building_usages_english"]),
    building_status:   nullify(row["building_status_english"]),
    no_of_lifts:       toInt(row["no_of_lifts"]),
    typical_floors:    toInt(row["typical_floors_count"]),
    total_area:        toFloat(row["building_total_area"]),
    building_height:   toFloat(row["building_height"]),
    plot_area:         toFloat(row["plot_area"]),
    is_green_building: toBool(row["is_green_building"]),
    parcel_id:         nullify(row["parcel_id"]),
    permit_no:         nullify(row["permit_no"]),
    project_no:        nullify(row["project_no"]),
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function ingest() {
  console.log(`Reading: ${CSV_PATH}`)

  const batch: ReturnType<typeof transformRow>[] = []
  let inserted = 0
  let skipped = 0

  const flush = async () => {
    if (batch.length === 0) return
    try {
      await sql`INSERT INTO buildings ${sql(batch)} ON CONFLICT (building_id) DO NOTHING`
      inserted += batch.length
      process.stdout.write(`\rInserted: ${inserted} | Skipped: ${skipped}`)
    } catch (e: any) { console.error("Insert error:", e.message) }
    batch.length = 0
  }

  const parser = fs
    .createReadStream(CSV_PATH)
    .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))

  for await (const row of parser) {
    const transformed = transformRow(row)
    if (!transformed.building_id) {
      skipped++
      continue
    }
    batch.push(transformed)
    if (batch.length >= BATCH_SIZE) await flush()
  }

  await flush()
  console.log(`\nDone. Inserted: ${inserted} rows | Skipped (no ID): ${skipped}`)
  await sql.end()
}

ingest().catch((err) => {
  console.error(err)
  process.exit(1)
})
