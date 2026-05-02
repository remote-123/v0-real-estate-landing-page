import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('admin_auth')?.value
  return cookie === process.env.ADMIN_PASSCODE
}

// GET /api/admin/buildings?q=&filter=&page=&limit=
export async function GET(req: NextRequest) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const filter = searchParams.get('filter') ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = 50
  const offset = (page - 1) * limit

  type Row = {

    building_id: number
    global_slug: string
    building_name_en: string
    area_name_en: string | null
    developer_name: string | null
    completion_year: number | null
    propsearch_status: string | null
    total_floors: number | null
    total_units: number | null
    property_types: string | null
    registry_property_id: string | null
    registry_match_method: string | null
    primary_sub_type: string | null
    is_free_hold: boolean | null
    data_source: string
    txn_count: number | null
    avg_psf: string | null
  }

  const rows = await sql<Row[]>`
    SELECT
      building_id, global_slug, building_name_en, area_name_en,
      developer_name, completion_year, propsearch_status,
      total_floors, total_units, property_types,
      registry_property_id, registry_match_method, primary_sub_type,
      is_free_hold, data_source, txn_count, avg_psf
    FROM re_buildings
    WHERE (
      ${q ? sql`(building_name_en ILIKE ${`%${q}%`} OR area_name_en ILIKE ${`%${q}%`})` : sql`TRUE`}
    )
    AND (
      ${filter === 'fuzzy'   ? sql`registry_match_method = 'fuzzy'` :
        filter === 'no_data'  ? sql`(total_units IS NULL AND total_floors IS NULL AND developer_name IS NULL)` :
        filter === 'no_reg'   ? sql`registry_property_id IS NULL` :
        filter === 'registry' ? sql`data_source = 'dld_registry'` :
        sql`TRUE`}
    )
    ORDER BY COALESCE(txn_count, 0) DESC, building_name_en ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*) AS count FROM re_buildings
    WHERE (
      ${q ? sql`(building_name_en ILIKE ${`%${q}%`} OR area_name_en ILIKE ${`%${q}%`})` : sql`TRUE`}
    )
    AND (
      ${filter === 'fuzzy'   ? sql`registry_match_method = 'fuzzy'` :
        filter === 'no_data'  ? sql`(total_units IS NULL AND total_floors IS NULL AND developer_name IS NULL)` :
        filter === 'no_reg'   ? sql`registry_property_id IS NULL` :
        filter === 'registry' ? sql`data_source = 'dld_registry'` :
        sql`TRUE`}
    )
  `

  return NextResponse.json({
    rows,
    total: Number(countRows[0].count),
    page,
    limit,
  })
}

// PATCH /api/admin/buildings — update a building
export async function PATCH(req: NextRequest) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { building_id, ...fields } = body

  if (!building_id) return NextResponse.json({ error: 'building_id required' }, { status: 400 })

  // Whitelist editable fields
  const allowed = [
    'building_name_en', 'area_name_en', 'developer_name', 'master_developer_name',
    'completion_year', 'propsearch_status', 'total_floors', 'total_units',
    'property_types', 'amenities', 'is_free_hold', 'primary_sub_type',
    'verified_name',
  ]

  const updates = Object.fromEntries(
    Object.entries(fields).filter(([k]) => allowed.includes(k))
  )

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  await sql`
    UPDATE re_buildings
    SET ${sql(updates)}, stats_refreshed_at = NOW()
    WHERE building_id = ${building_id}
  `

  return NextResponse.json({ ok: true })
}
