/**
 * Ingest DLD Transactions — new API CSV format (2026+).
 *
 * New CSV columns differ from the old format:
 *   TRANSACTION_NUMBER, INSTANCE_DATE, GROUP_EN, PROCEDURE_EN,
 *   IS_OFFPLAN_EN, IS_FREE_HOLD_EN, USAGE_EN, AREA_EN,
 *   PROP_TYPE_EN, PROP_SB_TYPE_EN, TRANS_VALUE, PROCEDURE_AREA,
 *   ACTUAL_AREA, ROOMS_EN, PARKING, NEAREST_METRO_EN,
 *   NEAREST_MALL_EN, NEAREST_LANDMARK_EN, TOTAL_BUYER,
 *   TOTAL_SELLER, MASTER_PROJECT_EN, PROJECT_EN
 *
 * Key mapping changes vs v1:
 *   - building_name_en  <- PROJECT_EN   (closest available)
 *   - transaction_id    <- TRANSACTION_NUMBER
 *   - actual_worth      <- TRANS_VALUE
 *   - trans_group_en    <- GROUP_EN
 *   - meter_sale_price  computed: TRANS_VALUE / PROCEDURE_AREA (AED/sqm)
 *   - has_parking       <- PARKING non-empty/non-zero
 *   - instance_date     <- INSTANCE_DATE (ISO datetime -> date)
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/ingest/dld_transactions_v2.ts [path/to/csv]
 */

import fs from "fs"
import path from "path"
import { parse } from "csv-parse"
import { sql } from "./neon-client"

const CSV_PATH =
  process.argv[2] ??
  path.join(process.cwd(), "dld_data", "dubai_transactions.csv")

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
  // "2026-03-23 14:53:48" -> "2026-03-23"
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
    transaction_id:       nullify(row["TRANSACTION_NUMBER"]),
    procedure_id:         null as number | null,
    trans_group_id:       null as number | null,
    trans_group_en:       nullify(row["GROUP_EN"]),
    procedure_name_en:    nullify(row["PROCEDURE_EN"]),
    instance_date:        parseDate(row["INSTANCE_DATE"]),
    property_type_en:     nullify(row["PROP_TYPE_EN"]),
    property_sub_type_en: nullify(row["PROP_SB_TYPE_EN"]),
    property_usage_en:    nullify(row["USAGE_EN"]),
    reg_type_en:          nullify(row["IS_FREE_HOLD_EN"]),
    area_id:              null as number | null,
    area_name_en:         nullify(row["AREA_EN"]),
    building_name_en:     nullify(row["PROJECT_EN"]),
    project_number:       null as string | null,
    project_name_en:      nullify(row["PROJECT_EN"]),
    master_project_en:    nullify(row["MASTER_PROJECT_EN"]),
    nearest_landmark_en:  nullify(row["NEAREST_LANDMARK_EN"]),
    nearest_metro_en:     nullify(row["NEAREST_METRO_EN"]),
    nearest_mall_en:      nullify(row["NEAREST_MALL_EN"]),
    rooms_en:             nullify(row["ROOMS_EN"]),
    has_parking:          parkingBool(row["PARKING"]),
    procedure_area:       procedureArea,
    actual_worth:         transValue,
    meter_sale_price:     meterSalePrice,
    rent_value:           null as number | null,
    meter_rent_price:     null as number | null,
    no_of_parties_role_1: toInt(row["TOTAL_BUYER"]),
    no_of_parties_role_2: toInt(row["TOTAL_SELLER"]),
    no_of_parties_role_3: null as number | null,
  }
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`)
    process.exit(1)
  }

  console.log(`Ingesting: ${CSV_PATH}`)

  const stream = fs.createReadStream(CSV_PATH).pipe(
    parse({ columns: true, skip_empty_lines: true, bom: true, trim: true })
  )

  let batch: ReturnType<typeof transformRow>[] = []
  let total = 0
  let skipped = 0

  async function flush() {
    if (batch.length === 0) return
    // dedupe within batch — DLD CSV sometimes has duplicate TRANSACTION_NUMBER
    const seen = new Set<string>()
    const valid = batch.filter(r => {
      if (!r.transaction_id || !r.instance_date) return false
      if (seen.has(r.transaction_id)) return false
      seen.add(r.transaction_id)
      return true
    })
    skipped += batch.length - valid.length
    if (valid.length === 0) { batch = []; return }
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
      total += valid.length
    } catch (e: any) {
      console.error('\nInsert error:', e.message?.slice(0, 120))
    }
    process.stdout.write(`  ${total.toLocaleString()} rows upserted\r`)
    batch = []
  }

  for await (const row of stream) {
    batch.push(transformRow(row as Record<string, string>))
    if (batch.length >= BATCH_SIZE) await flush()
  }
  await flush()

  console.log(`\nDone — ${total.toLocaleString()} upserted, ${skipped} skipped (missing id/date)`)
  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
