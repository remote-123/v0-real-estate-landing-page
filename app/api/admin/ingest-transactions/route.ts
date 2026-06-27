/**
 * POST /api/admin/ingest-transactions
 *
 * Accepts a DLD transactions CSV (new API format, columns: TRANSACTION_NUMBER,
 * INSTANCE_DATE, GROUP_EN, PROCEDURE_EN, IS_OFFPLAN_EN, IS_FREE_HOLD_EN,
 * USAGE_EN, AREA_EN, PROP_TYPE_EN, PROP_SB_TYPE_EN, TRANS_VALUE, PROCEDURE_AREA,
 * ACTUAL_AREA, ROOMS_EN, PARKING, NEAREST_METRO_EN, NEAREST_MALL_EN,
 * NEAREST_LANDMARK_EN, TOTAL_BUYER, TOTAL_SELLER, MASTER_PROJECT_EN, PROJECT_EN).
 *
 * Upserts into dld_transactions, then refreshes mv_txn_monthly and
 * mv_txn_monthly_unified concurrently.
 *
 * Auth: admin session OR admin_auth cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { parse } from 'csv-parse/sync'
import { sql } from '@/lib/db'
import { auth } from '@/auth'

/** Terminal paths to revalidate after transaction ingestion */
const TXN_DEPENDENT_PATHS = [
  '/terminal/transaction-pulse',
  '/terminal/communities',
  '/terminal/area-momentum',
  '/terminal/market-pulse',
  '/terminal/floor-plan-pricer',
  '/terminal/liquidity',
  '/terminal/bear-cases',
  '/terminal/bull-cases',
  '/terminal/developer-track',
  '/terminal/calculators',
]

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
const BATCH_SIZE = 300
const MAX_BYTES = 150 * 1024 * 1024 // 150 MB

async function isAuthorized(): Promise<boolean> {
  const session = await auth()
  if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) return true
  const cookieStore = await cookies()
  return cookieStore.get('admin_auth')?.value === process.env.ADMIN_PASSCODE
}

function nullify(val: string | null | undefined): string | null {
  if (!val || val.trim() === '' || val.trim().toLowerCase() === 'null') return null
  return val.trim()
}
function toInt(val: string | null | undefined): number | null {
  const n = parseInt(nullify(val) ?? '', 10)
  return isNaN(n) ? null : n
}
function toFloat(val: string | null | undefined): number | null {
  const n = parseFloat((nullify(val) ?? '').replace(/,/g, ''))
  return isNaN(n) ? null : n
}
function parseDate(val: string | null | undefined): string | null {
  const s = nullify(val)
  if (!s) return null
  return s.slice(0, 10)
}
function parkingBool(val: string | null | undefined): boolean {
  const s = nullify(val)
  if (!s || s === '0') return false
  return true
}

type TransactionRow = {
  transaction_id: string | null
  procedure_id: null
  trans_group_id: null
  trans_group_en: string | null
  procedure_name_en: string | null
  instance_date: string | null
  property_type_en: string | null
  property_sub_type_en: string | null
  property_usage_en: string | null
  reg_type_en: string | null
  area_id: null
  area_name_en: string | null
  building_name_en: string | null
  project_number: null
  project_name_en: string | null
  master_project_en: string | null
  nearest_landmark_en: string | null
  nearest_metro_en: string | null
  nearest_mall_en: string | null
  rooms_en: string | null
  has_parking: boolean
  procedure_area: number | null
  actual_worth: number | null
  meter_sale_price: number | null
  rent_value: null
  meter_rent_price: null
  no_of_parties_role_1: number | null
  no_of_parties_role_2: number | null
  no_of_parties_role_3: null
}

function transformRow(row: Record<string, string>): TransactionRow {
  const transValue = toFloat(row['TRANS_VALUE'])
  const procedureArea = toFloat(row['PROCEDURE_AREA'])
  const meterSalePrice =
    transValue && procedureArea && procedureArea > 0
      ? Math.round((transValue / procedureArea) * 100) / 100
      : null

  return {
    transaction_id: nullify(row['TRANSACTION_NUMBER']),
    procedure_id: null,
    trans_group_id: null,
    trans_group_en: nullify(row['GROUP_EN']),
    procedure_name_en: nullify(row['PROCEDURE_EN']),
    instance_date: parseDate(row['INSTANCE_DATE']),
    property_type_en: nullify(row['PROP_TYPE_EN']),
    property_sub_type_en: nullify(row['PROP_SB_TYPE_EN']),
    property_usage_en: nullify(row['USAGE_EN']),
    reg_type_en: nullify(row['IS_FREE_HOLD_EN']),
    area_id: null,
    area_name_en: nullify(row['AREA_EN']),
    building_name_en: nullify(row['PROJECT_EN']),
    project_number: null,
    project_name_en: nullify(row['PROJECT_EN']),
    master_project_en: nullify(row['MASTER_PROJECT_EN']),
    nearest_landmark_en: nullify(row['NEAREST_LANDMARK_EN']),
    nearest_metro_en: nullify(row['NEAREST_METRO_EN']),
    nearest_mall_en: nullify(row['NEAREST_MALL_EN']),
    rooms_en: nullify(row['ROOMS_EN']),
    has_parking: parkingBool(row['PARKING']),
    procedure_area: procedureArea,
    actual_worth: transValue,
    meter_sale_price: meterSalePrice,
    rent_value: null,
    meter_rent_price: null,
    no_of_parties_role_1: toInt(row['TOTAL_BUYER']),
    no_of_parties_role_2: toInt(row['TOTAL_SELLER']),
    no_of_parties_role_3: null,
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse multipart form
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  if (!file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'File must be a .csv' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 150 MB limit' }, { status: 413 })
  }

  // Read file to string
  const buf = await file.arrayBuffer()
  const csvText = new TextDecoder('utf-8').decode(buf)

  // Parse CSV
  let records: Record<string, string>[]
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }) as Record<string, string>[]
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `CSV parse error: ${msg}` }, { status: 422 })
  }

  if (records.length === 0) {
    return NextResponse.json({ error: 'CSV is empty or has no data rows' }, { status: 422 })
  }

  // Transform + batch upsert
  const rows = records.map(transformRow)
  let upserted = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const seen = new Set<string>()
    const valid = batch.filter(r => {
      if (!r.transaction_id || !r.instance_date) { skipped++; return false }
      if (seen.has(r.transaction_id)) { skipped++; return false }
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[ingest-transactions] batch error:', msg?.slice(0, 200))
    }
  }

  // Refresh materialized views
  let refreshError: string | null = null
  try {
    await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_txn_monthly_unified`
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    refreshError = msg?.slice(0, 200)
    console.error('[ingest-transactions] refresh error:', refreshError)
  }

  // Bust all terminal page caches that depend on transaction data
  for (const p of TXN_DEPENDENT_PATHS) {
    revalidatePath(p)
  }

  // New last date
  const [latest] = await sql<{ latest_date: string | null }[]>`
    SELECT MAX(instance_date)::text AS latest_date FROM dld_transactions
  `

  return NextResponse.json({
    ok: true,
    rows_parsed: records.length,
    upserted,
    skipped,
    new_latest_date: latest?.latest_date ?? null,
    refresh_error: refreshError,
    paths_revalidated: TXN_DEPENDENT_PATHS.length,
  })
}
