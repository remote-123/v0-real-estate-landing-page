/**
 * Ingest DLD Transactions CSV into `dld_transactions` table.
 * Run: npx tsx --env-file=.env.local scripts/ingest/dld_transactions.ts [path/to/csv]
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./neon-client"

// ── Config ──────────────────────────────────────────────────────────────────

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "dubai_transactions.csv")

// Smaller batch for wide rows (1.66M rows)
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
    transaction_id:       nullify(row["transaction_id"]),
    procedure_id:         toInt(row["procedure_id"]),
    trans_group_id:       toInt(row["trans_group_id"]),
    trans_group_en:       nullify(row["trans_group_en"]),
    procedure_name_en:    nullify(row["procedure_name_en"]),
    instance_date:        parseDDMMYYYY(row["instance_date"]),
    property_type_en:     nullify(row["property_type_en"]),
    property_sub_type_en: nullify(row["property_sub_type_en"]),
    property_usage_en:    nullify(row["property_usage_en"]),
    reg_type_en:          nullify(row["reg_type_en"]),
    area_id:              toInt(row["area_id"]),
    area_name_en:         nullify(row["area_name_en"]),
    building_name_en:     nullify(row["building_name_en"]),
    project_number:       nullify(row["project_number"]),
    project_name_en:      nullify(row["project_name_en"]),
    master_project_en:    nullify(row["master_project_en"]),
    nearest_landmark_en:  nullify(row["nearest_landmark_en"]),
    nearest_metro_en:     nullify(row["nearest_metro_en"]),
    nearest_mall_en:      nullify(row["nearest_mall_en"]),
    rooms_en:             nullify(row["rooms_en"]),
    has_parking:          parseInt(nullify(row["has_parking"]) ?? "0", 10) === 1,
    procedure_area:       toFloat(row["procedure_area"]),
    actual_worth:         toFloat(row["actual_worth"]),
    meter_sale_price:     toFloat(row["meter_sale_price"]),
    rent_value:           toFloat(row["rent_value"]),
    meter_rent_price:     toFloat(row["meter_rent_price"]),
    no_of_parties_role_1: toInt(row["no_of_parties_role_1"]),
    no_of_parties_role_2: toInt(row["no_of_parties_role_2"]),
    no_of_parties_role_3: toInt(row["no_of_parties_role_3"]),
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
      await sql`INSERT INTO dld_transactions ${sql(batch)} ON CONFLICT (transaction_id) DO NOTHING`
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
    if (!transformed.transaction_id) {
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
