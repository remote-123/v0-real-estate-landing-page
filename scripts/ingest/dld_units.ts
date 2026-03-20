/**
 * Ingest DLD Units CSV into `dld_units` table.
 * Run: npx tsx --env-file=.env.local scripts/ingest/dld_units.ts [path/to/csv]
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./neon-client"

// ── Config ──────────────────────────────────────────────────────────────────

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "dld_units.csv")

const BATCH_SIZE = 500

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

function parseDDMMYYYY(val: string | null | undefined): string | null {
  const s = nullify(val)
  if (!s) return null
  const parts = s.split("-")
  if (parts.length !== 3) return null
  return `${parts[2]}-${parts[1]}-${parts[0]}` // → YYYY-MM-DD
}

// ── Row transform ─────────────────────────────────────────────────────────────

function transformRow(row: Record<string, string>) {
  return {
    property_id:               nullify(row["property_id"]),
    area_id:                   toInt(row["area_id"]),
    zone_id:                   toInt(row["zone_id"]),
    area_name_en:              nullify(row["area_name_en"]),
    land_number:               nullify(row["land_number"]),
    land_sub_number:           nullify(row["land_sub_number"]),
    building_number:           nullify(row["building_number"]),
    unit_number:               nullify(row["unit_number"]),
    unit_balcony_area:         toFloat(row["unit_balcony_area"]),
    unit_parking_number:       nullify(row["unit_parking_number"]),
    parking_allocation_type_en: nullify(row["parking_allocation_type_en"]),
    common_area:               toFloat(row["common_area"]),
    actual_common_area:        toFloat(row["actual_common_area"]),
    floor:                     toInt(row["floor"]),
    rooms_en:                  nullify(row["rooms_en"]),
    actual_area:               toFloat(row["actual_area"]),
    property_type_en:          nullify(row["property_type_en"]),
    property_sub_type_en:      nullify(row["property_sub_type_en"]),
    parent_property_id:        nullify(row["parent_property_id"]),
    grandparent_property_id:   nullify(row["grandparent_property_id"]),
    creation_date:             parseDDMMYYYY(row["creation_date"]),
    munc_zip_code:             nullify(row["munc_zip_code"]),
    munc_number:               nullify(row["munc_number"]),
    parcel_id:                 nullify(row["parcel_id"]),
    is_free_hold:              nullify(row["is_free_hold"]) === "1",
    is_lease_hold:             nullify(row["is_lease_hold"]) === "1",
    is_registered:             nullify(row["is_registered"]) === "1",
    pre_registration_number:   nullify(row["pre_registration_number"]),
    master_project_id:         toInt(row["master_project_id"]),
    master_project_en:         nullify(row["master_project_en"]),
    project_id:                toInt(row["project_id"]),
    project_name_en:           nullify(row["project_name_en"]),
    land_type_en:              nullify(row["land_type_en"]),
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
      await sql`INSERT INTO dld_units ${sql(batch)} ON CONFLICT (property_id) DO NOTHING`
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
    if (!transformed.property_id) {
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
