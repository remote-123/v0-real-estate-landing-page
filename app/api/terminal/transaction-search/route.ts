import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"

const FREE_LIMIT = 5
const AUTH_LIMIT = 50
const MAX_LIMIT = 100

export const dynamic = "force-dynamic"

export interface TransactionRow {
  transaction_id: string
  instance_date: string
  area_name_en: string
  building_name_en: string | null
  project_name_en: string | null
  rooms_en: string | null
  property_sub_type_en: string | null
  reg_type_en: string | null
  actual_worth: number
  meter_sale_price: number
  area_sqft: number
  nearest_metro_en: string | null
  has_parking: boolean | null
}

export interface TransactionSearchResponse {
  rows: TransactionRow[]
  total: number
  page: number
  page_size: number
  gated: boolean
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    const unlocked = await isTerminalUnlocked(session)

    const sp = new URL(req.url).searchParams
    const area = sp.get("area")?.trim() || null
    const building = sp.get("building")?.trim() || null
    const rooms = sp.get("rooms")?.trim() || null
    const regType = sp.get("reg_type")?.trim() || null
    const minPrice = sp.get("min_price") ? Number(sp.get("min_price")) : null
    const maxPrice = sp.get("max_price") ? Number(sp.get("max_price")) : null
    const dateFrom = sp.get("date_from")?.trim() || null
    const dateTo = sp.get("date_to")?.trim() || null
    const rawPage = Math.max(1, parseInt(sp.get("page") || "1", 10))

    // Require at least one meaningful filter to avoid full-table scans
    const hasFilter = area || building || rooms
    if (!hasFilter) {
      return NextResponse.json(
        { error: "Provide at least one filter: area, building, or bedrooms" },
        { status: 400 }
      )
    }

    const pageSize = unlocked ? AUTH_LIMIT : FREE_LIMIT
    const page = unlocked ? rawPage : 1
    const offset = (page - 1) * Math.min(pageSize, MAX_LIMIT)

    const [countRows, dataRows] = await Promise.all([
      sql<{ total: string }[]>`
        SELECT COUNT(*) AS total
        FROM dld_transactions
        WHERE trans_group_en = 'Sales'
          AND actual_worth > 0
          AND (${area} IS NULL OR area_name_en = ${area})
          AND (${building} IS NULL OR building_name_en ILIKE ${'%' + (building ?? '') + '%'})
          AND (${rooms} IS NULL OR rooms_en = ${rooms})
          AND (${regType} IS NULL OR reg_type_en = ${regType})
          AND (${minPrice} IS NULL OR actual_worth >= ${minPrice})
          AND (${maxPrice} IS NULL OR actual_worth <= ${maxPrice})
          AND (${dateFrom} IS NULL OR instance_date >= ${dateFrom}::date)
          AND (${dateTo} IS NULL OR instance_date <= ${dateTo}::date)
      `,
      sql<{
        transaction_id: string
        instance_date: string
        area_name_en: string
        building_name_en: string | null
        project_name_en: string | null
        rooms_en: string | null
        property_sub_type_en: string | null
        reg_type_en: string | null
        actual_worth: string
        meter_sale_price: string
        area_sqft: string
        nearest_metro_en: string | null
        has_parking: boolean | null
      }[]>`
        SELECT
          transaction_id,
          instance_date::text,
          area_name_en,
          building_name_en,
          project_name_en,
          rooms_en,
          property_sub_type_en,
          reg_type_en,
          actual_worth,
          meter_sale_price,
          ROUND((procedure_area * 10.764)::numeric, 0) AS area_sqft,
          nearest_metro_en,
          has_parking
        FROM dld_transactions
        WHERE trans_group_en = 'Sales'
          AND actual_worth > 0
          AND (${area} IS NULL OR area_name_en = ${area})
          AND (${building} IS NULL OR building_name_en ILIKE ${'%' + (building ?? '') + '%'})
          AND (${rooms} IS NULL OR rooms_en = ${rooms})
          AND (${regType} IS NULL OR reg_type_en = ${regType})
          AND (${minPrice} IS NULL OR actual_worth >= ${minPrice})
          AND (${maxPrice} IS NULL OR actual_worth <= ${maxPrice})
          AND (${dateFrom} IS NULL OR instance_date >= ${dateFrom}::date)
          AND (${dateTo} IS NULL OR instance_date <= ${dateTo}::date)
        ORDER BY instance_date DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
    ])

    const total = Number(countRows[0]?.total ?? 0)
    const rows: TransactionRow[] = dataRows.map((r) => ({
      ...r,
      actual_worth: Number(r.actual_worth),
      meter_sale_price: Number(r.meter_sale_price),
      area_sqft: Number(r.area_sqft),
    }))

    const response: TransactionSearchResponse = {
      rows,
      total,
      page,
      page_size: pageSize,
      gated: !unlocked,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("transaction-search error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
