import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"

const FREE_LIMIT = 5
const AUTH_LIMIT = 50
const MAX_LIMIT = 100

export const dynamic = "force-dynamic"

export interface UnitRow {
  property_id: string
  unit_number: string | null
  building_number: string | null
  floor: number | null
  rooms_en: string | null
  actual_area_sqft: number
  actual_area_sqm: number
  property_sub_type_en: string | null
  unit_parking_number: string | null
  is_free_hold: boolean | null
  is_lease_hold: boolean | null
  project_name_en: string | null
  master_project_en: string | null
  area_name_en: string | null
}

export interface UnitRegistryResponse {
  rows: UnitRow[]
  total: number
  page: number
  page_size: number
  gated: boolean
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const session = await auth()
    const unlocked = await isTerminalUnlocked(session)

    const sp = new URL(req.url).searchParams
    const project = sp.get("project")?.trim() || null
    const area = sp.get("area")?.trim() || null
    const rooms = sp.get("rooms")?.trim() || null
    const minFloor = sp.get("min_floor") ? parseInt(sp.get("min_floor")!, 10) : null
    const maxFloor = sp.get("max_floor") ? parseInt(sp.get("max_floor")!, 10) : null
    const minSqm = sp.get("min_sqm") ? Number(sp.get("min_sqm")) : null
    const maxSqm = sp.get("max_sqm") ? Number(sp.get("max_sqm")) : null
    const rawPage = Math.max(1, parseInt(sp.get("page") || "1", 10))

    // Require at least one meaningful filter to prevent full-table scan
    const hasFilter = project || area || rooms
    if (!hasFilter) {
      return NextResponse.json(
        { error: "Provide at least one filter: project, area, or bedrooms" },
        { status: 400 }
      )
    }

    const pageSize = unlocked ? AUTH_LIMIT : FREE_LIMIT
    const page = unlocked ? rawPage : 1
    const offset = (page - 1) * Math.min(pageSize, MAX_LIMIT)

    const projectPattern = project ? `%${project}%` : null

    const [countRows, dataRows] = await Promise.all([
      sql<{ total: string }[]>`
        SELECT COUNT(*) AS total
        FROM dld_units
        WHERE
          (${projectPattern} IS NULL OR project_name_en ILIKE ${projectPattern})
          AND (${area} IS NULL OR area_name_en = ${area})
          AND (${rooms} IS NULL OR rooms_en = ${rooms})
          AND (${minFloor} IS NULL OR floor >= ${minFloor})
          AND (${maxFloor} IS NULL OR floor <= ${maxFloor})
          AND (${minSqm} IS NULL OR actual_area >= ${minSqm})
          AND (${maxSqm} IS NULL OR actual_area <= ${maxSqm})
      `,
      sql<{
        property_id: string
        unit_number: string | null
        building_number: string | null
        floor: number | null
        rooms_en: string | null
        actual_area_sqft: string
        actual_area_sqm: string
        property_sub_type_en: string | null
        unit_parking_number: string | null
        is_free_hold: boolean | null
        is_lease_hold: boolean | null
        project_name_en: string | null
        master_project_en: string | null
        area_name_en: string | null
      }[]>`
        SELECT
          property_id,
          unit_number,
          building_number,
          floor,
          rooms_en,
          ROUND((actual_area * 10.764)::numeric, 0) AS actual_area_sqft,
          ROUND(actual_area::numeric, 1)              AS actual_area_sqm,
          property_sub_type_en,
          unit_parking_number,
          is_free_hold,
          is_lease_hold,
          project_name_en,
          master_project_en,
          area_name_en
        FROM dld_units
        WHERE
          (${projectPattern} IS NULL OR project_name_en ILIKE ${projectPattern})
          AND (${area} IS NULL OR area_name_en = ${area})
          AND (${rooms} IS NULL OR rooms_en = ${rooms})
          AND (${minFloor} IS NULL OR floor >= ${minFloor})
          AND (${maxFloor} IS NULL OR floor <= ${maxFloor})
          AND (${minSqm} IS NULL OR actual_area >= ${minSqm})
          AND (${maxSqm} IS NULL OR actual_area <= ${maxSqm})
        ORDER BY project_name_en NULLS LAST, floor ASC NULLS LAST, unit_number ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
    ])

    const total = Number(countRows[0]?.total ?? 0)
    const rows: UnitRow[] = dataRows.map((r) => ({
      ...r,
      actual_area_sqft: Number(r.actual_area_sqft),
      actual_area_sqm: Number(r.actual_area_sqm),
    }))

    const response: UnitRegistryResponse = {
      rows,
      total,
      page,
      page_size: pageSize,
      gated: !unlocked,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("unit-registry error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
