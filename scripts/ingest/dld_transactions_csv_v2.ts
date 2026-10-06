/**
 * Ingest a "new API format" DLD transactions CSV (columns: TRANSACTION_NUMBER,
 * INSTANCE_DATE, GROUP_EN, PROCEDURE_EN, IS_OFFPLAN_EN, IS_FREE_HOLD_EN,
 * USAGE_EN, AREA_EN, PROP_TYPE_EN, PROP_SB_TYPE_EN, TRANS_VALUE, PROCEDURE_AREA,
 * ACTUAL_AREA, ROOMS_EN, PARKING, NEAREST_METRO_EN, NEAREST_MALL_EN,
 * NEAREST_LANDMARK_EN, TOTAL_BUYER, TOTAL_SELLER, MASTER_PROJECT_EN, PROJECT_EN)
 * into `dld_transactions`, then refreshes mv_txn_monthly and
 * mv_txn_monthly_unified.
 *
 * Mirrors the transform logic in app/api/admin/ingest-transactions/route.ts
 * (same CSV shape) so a local bulk file can be loaded without going through
 * the HTTP upload endpoint.
 *
 * Run: npx tsx --env-file=.env.local scripts/ingest/dld_transactions_csv_v2.ts <path/to/csv>
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse/sync"
import { sql } from "./db-client"

const CSV_PATH = process.argv[2]
if (!CSV_PATH) {
  console.error("Usage: dld_transactions_csv_v2.ts <path/to/csv>")
  process.exit(1)
}

const BATCH_SIZE = 300

function nullify(val: string | null | undefined): string | null {
  if (!val || val.trim() === "" || val.trim().toLowerCase() === "null") return null
  return val.trim()
}
function toInt(val: string | null | undefined): number | null {
  const n = parseInt(nullify(val) ?? "", 10)
  return isNaN(n) ? null : n
}
function toFloat(val: string | null | undefined): number | null {
  const n = parseFloat((nullify(val) ?? "").replace(/,/g, ""))
  return isNaN(n) ? null : n
}
function parseDate(val: string | null | undefined): string | null {
  const s = nullify(val)
  if (!s) return null
  return s.slice(0, 10)
}
function parkingBool(val: string | null | undefined): boolean {
  const s = nullify(val)
  if (!s || s === "0") return false
  return true
}

function transformRow(row: Record<string, string>) {
  const transValue = toFloat(row["TRANS_VALUE"])
  const procedureArea = toFloat(row["PROCEDURE_AREA"])
  const meterSalePrice =
    transValue && procedureArea && procedureArea > 0
      ? Math.round((transValue / procedureArea) * 100) / 100
      : null

  return {
    transaction_id: nullify(row["TRANSACTION_NUMBER"]),
    procedure_id: null,
    trans_group_id: null,
    trans_group_en: nullify(row["GROUP_EN"]),
    procedure_name_en: nullify(row["PROCEDURE_EN"]),
    instance_date: parseDate(row["INSTANCE_DATE"]),
    property_type_en: nullify(row["PROP_TYPE_EN"]),
    property_sub_type_en: nullify(row["PROP_SB_TYPE_EN"]),
    property_usage_en: nullify(row["USAGE_EN"]),
    reg_type_en: nullify(row["IS_FREE_HOLD_EN"]),
    area_id: null,
    area_name_en: nullify(row["AREA_EN"]),
    building_name_en: nullify(row["PROJECT_EN"]),
    project_number: null,
    project_name_en: nullify(row["PROJECT_EN"]),
    master_project_en: nullify(row["MASTER_PROJECT_EN"]),
    nearest_landmark_en: nullify(row["NEAREST_LANDMARK_EN"]),
    nearest_metro_en: nullify(row["NEAREST_METRO_EN"]),
    nearest_mall_en: nullify(row["NEAREST_MALL_EN"]),
    rooms_en: nullify(row["ROOMS_EN"]),
    has_parking: parkingBool(row["PARKING"]),
    procedure_area: procedureArea,
    actual_worth: transValue,
    meter_sale_price: meterSalePrice,
    rent_value: null,
    meter_rent_price: null,
    no_of_parties_role_1: toInt(row["TOTAL_BUYER"]),
    no_of_parties_role_2: toInt(row["TOTAL_SELLER"]),
    no_of_parties_role_3: null,
  }
}

async function main() {
  const csvText = fs.readFileSync(path.resolve(CSV_PATH), "utf-8")
  const records: Record<string, string>[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  })

  console.log(`Parsed ${records.length} rows from ${CSV_PATH}`)

  const rows = records.map(transformRow)
  let upserted = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const seen = new Set<string>()
    const valid = batch.filter((r) => {
      if (!r.transaction_id || !r.instance_date) {
        skipped++
        return false
      }
      if (seen.has(r.transaction_id)) {
        skipped++
        return false
      }
      seen.add(r.transaction_id)
      return true
    })
    if (valid.length === 0) continue
    try {
      await sql`
        INSERT INTO dld_transactions ${sql(valid)}
        ON CONFLICT (transaction_id) DO UPDATE SET
          trans_group_en       = EXCLUDED.trans_group_en,
          procedure_name_en    = EXCLUDED.procedure_name_en,
          instance_date        = EXCLUDED.instance_date,
          building_name_en     = EXCLUDED.building_name_en,
          area_name_en         = EXCLUDED.area_name_en,
          rooms_en             = EXCLUDED.rooms_en,
          procedure_area       = EXCLUDED.procedure_area,
          actual_worth         = EXCLUDED.actual_worth,
          meter_sale_price     = EXCLUDED.meter_sale_price,
          has_parking          = EXCLUDED.has_parking,
          nearest_metro_en     = EXCLUDED.nearest_metro_en,
          property_usage_en    = EXCLUDED.property_usage_en,
          reg_type_en          = EXCLUDED.reg_type_en,
          master_project_en    = EXCLUDED.master_project_en,
          project_name_en      = EXCLUDED.project_name_en,
          no_of_parties_role_1 = EXCLUDED.no_of_parties_role_1,
          no_of_parties_role_2 = EXCLUDED.no_of_parties_role_2,
          ingested_at          = NOW()
      `
      upserted += valid.length
      process.stdout.write(`\rUpserted ${upserted}/${records.length}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`\nBatch ${i} error:`, msg.slice(0, 300))
    }
  }
  console.log(`\nDone. Upserted ${upserted}, skipped ${skipped}`)

  console.log("Refreshing mv_txn_monthly...")
  await sql`REFRESH MATERIALIZED VIEW mv_txn_monthly`
  console.log("Refreshing mv_txn_monthly_unified...")
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_txn_monthly_unified`

  const [latest] = await sql<{ latest_date: string | null }[]>`
    SELECT MAX(instance_date)::text AS latest_date FROM dld_transactions
  `
  const [month] = await sql<{ m: string | null }[]>`
    SELECT MAX(txn_month)::text AS m FROM mv_txn_monthly_unified
  `
  console.log(`New latest instance_date: ${latest?.latest_date}`)
  console.log(`New latest mv_txn_monthly_unified month: ${month?.m}`)

  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
