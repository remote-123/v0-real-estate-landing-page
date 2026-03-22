/**
 * Ingest DLD Transactions CSV in the newer column format (as of Mar 2026).
 * Column names differ from the original dubai_transactions.csv.
 *
 * Run: npx tsx --env-file=.env.local scripts/ingest/dld_transactions_v2.ts [path/to/csv]
 *
 * New format columns:
 *   TRANSACTION_NUMBER, INSTANCE_DATE (YYYY-MM-DD HH:MM:SS), GROUP_EN, PROCEDURE_EN,
 *   IS_OFFPLAN_EN, IS_FREE_HOLD_EN, USAGE_EN, AREA_EN, PROP_TYPE_EN, PROP_SB_TYPE_EN,
 *   TRANS_VALUE, PROCEDURE_AREA, ACTUAL_AREA, ROOMS_EN, PARKING,
 *   NEAREST_METRO_EN, NEAREST_MALL_EN, NEAREST_LANDMARK_EN,
 *   TOTAL_BUYER, TOTAL_SELLER, MASTER_PROJECT_EN, PROJECT_EN
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./neon-client"

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "transactions-2026-03-22.csv")

const BATCH_SIZE = 200

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

// INSTANCE_DATE is "YYYY-MM-DD HH:MM:SS" — just take the date part
function parseDate(val: string | null | undefined): string | null {
  const s = nullify(val)
  if (!s) return null
  return s.slice(0, 10) // "YYYY-MM-DD"
}

function transformRow(row: Record<string, string>) {
  const transValue = toFloat(row["TRANS_VALUE"])
  const actualArea = toFloat(row["ACTUAL_AREA"])
  const procedureArea = toFloat(row["PROCEDURE_AREA"])

  // Derive price per sqm (TRANS_VALUE is AED, ACTUAL_AREA is sqm)
  const area = actualArea && actualArea > 0 ? actualArea : procedureArea
  const meterSalePrice =
    transValue && area && area > 0 ? transValue / area : null

  return {
    transaction_id:       nullify(row["TRANSACTION_NUMBER"]),
    procedure_id:         null,
    trans_group_id:       null,
    trans_group_en:       nullify(row["GROUP_EN"]),
    procedure_name_en:    nullify(row["PROCEDURE_EN"]),
    instance_date:        parseDate(row["INSTANCE_DATE"]),
    property_type_en:     nullify(row["PROP_TYPE_EN"]),
    property_sub_type_en: nullify(row["PROP_SB_TYPE_EN"]),
    property_usage_en:    nullify(row["USAGE_EN"]),
    reg_type_en:          nullify(row["IS_FREE_HOLD_EN"]),
    area_id:              null,
    area_name_en:         nullify(row["AREA_EN"]),
    building_name_en:     null,
    project_number:       null,
    project_name_en:      nullify(row["PROJECT_EN"]),
    master_project_en:    nullify(row["MASTER_PROJECT_EN"]),
    nearest_landmark_en:  nullify(row["NEAREST_LANDMARK_EN"]),
    nearest_metro_en:     nullify(row["NEAREST_METRO_EN"]),
    nearest_mall_en:      nullify(row["NEAREST_MALL_EN"]),
    rooms_en:             nullify(row["ROOMS_EN"]),
    has_parking:          parseInt(nullify(row["PARKING"]) ?? "0", 10) === 1,
    procedure_area:       procedureArea,
    actual_worth:         transValue,
    meter_sale_price:     meterSalePrice,
    rent_value:           null,
    meter_rent_price:     null,
    no_of_parties_role_1: toInt(row["TOTAL_BUYER"]),
    no_of_parties_role_2: toInt(row["TOTAL_SELLER"]),
    no_of_parties_role_3: null,
  }
}

async function ingest() {
  console.log(`Reading: ${CSV_PATH}`)

  const batch: ReturnType<typeof transformRow>[] = []
  let inserted = 0
  let skipped = 0
  let errors = 0

  const flush = async () => {
    if (batch.length === 0) return
    try {
      await sql`INSERT INTO dld_transactions ${sql(batch)} ON CONFLICT (transaction_id) DO NOTHING`
      inserted += batch.length
      process.stdout.write(`\rInserted: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`)
    } catch (e: any) {
      console.error("\nInsert error:", e.message)
      errors += batch.length
    }
    batch.length = 0
  }

  const parser = fs
    .createReadStream(CSV_PATH)
    .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, bom: true }))

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
  console.log(`\nDone. Inserted: ${inserted} | Skipped (no ID): ${skipped} | Errors: ${errors}`)
  await sql.end()
}

ingest().catch((err) => {
  console.error(err)
  process.exit(1)
})
