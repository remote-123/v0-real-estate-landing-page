import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { auth } from '@/auth'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())

async function isAuthorized(): Promise<boolean> {
  const session = await auth()
  if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) return true
  const cookieStore = await cookies()
  return cookieStore.get('admin_auth')?.value === process.env.ADMIN_PASSCODE
}

// GET /api/admin/nc-buildings?page=1&limit=50&area=&missing=&quality=&search=
export async function GET(req: NextRequest) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '50')))
  const offset = (page - 1) * limit
  const area = searchParams.get('area') ?? ''
  const missing = searchParams.get('missing') ?? ''
  const quality = searchParams.get('quality') ?? ''
  const search = searchParams.get('search') ?? ''

  // Build filter fragments
  const areaFilter = area ? sql`AND nc_area_slug = ${area}` : sql``
  const searchFilter = search ? sql`AND name ILIKE ${`%${search}%`}` : sql``

  const missingFilter =
    missing === 'bedrooms' ? sql`AND (units_1br IS NULL AND units_2br IS NULL AND units_3br_plus IS NULL)` :
    missing === 'highway'  ? sql`AND nearest_highway IS NULL` :
    missing === 'grade'    ? sql`AND building_grade IS NULL` :
    missing === 'view'     ? sql`AND (view_type IS NULL OR array_length(view_type, 1) IS NULL)` :
    sql``

  const qualityFilter =
    quality === '1' ? sql`AND data_quality = 1` :
    quality === '2' ? sql`AND data_quality = 2` :
    quality === '3' ? sql`AND data_quality = 3` :
    sql``

  type NcBuilding = {
    slug: string
    name: string
    nc_area_slug: string | null
    building_type: string | null
    building_grade: string | null
    completion_year: number | null
    total_floors: number | null
    total_units: number | null
    units_studio: number | null
    units_1br: number | null
    units_2br: number | null
    units_3br_plus: number | null
    nearest_highway: string | null
    nearest_metro: string | null
    metro_walk_mins: number | null
    view_type: string[] | null
    has_pool: boolean | null
    has_gym: boolean | null
    has_school_nearby: boolean | null
    is_freehold: boolean | null
    service_charge_psf: string | null
    status: string | null
    developer: string | null
    data_quality: number
    notes: string | null
    updated_at: string
  }

  const rows = await sql<NcBuilding[]>`
    SELECT
      slug, name, nc_area_slug, building_type, building_grade,
      completion_year, total_floors, total_units,
      units_studio, units_1br, units_2br, units_3br_plus,
      nearest_highway, nearest_metro, metro_walk_mins,
      view_type, has_pool, has_gym, has_school_nearby,
      is_freehold, service_charge_psf,
      status, developer,
      data_quality, notes, updated_at
    FROM nc_buildings
    WHERE TRUE
    ${areaFilter}
    ${searchFilter}
    ${missingFilter}
    ${qualityFilter}
    ORDER BY data_quality ASC, name ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*) AS count
    FROM nc_buildings
    WHERE TRUE
    ${areaFilter}
    ${searchFilter}
    ${missingFilter}
    ${qualityFilter}
  `

  const total = Number(countRows[0].count)

  return NextResponse.json({
    rows: rows.map(r => ({
      ...r,
      completion_year: r.completion_year != null ? Number(r.completion_year) : null,
      total_floors: r.total_floors != null ? Number(r.total_floors) : null,
      total_units: r.total_units != null ? Number(r.total_units) : null,
      units_studio: r.units_studio != null ? Number(r.units_studio) : null,
      units_1br: r.units_1br != null ? Number(r.units_1br) : null,
      units_2br: r.units_2br != null ? Number(r.units_2br) : null,
      units_3br_plus: r.units_3br_plus != null ? Number(r.units_3br_plus) : null,
      metro_walk_mins: r.metro_walk_mins != null ? Number(r.metro_walk_mins) : null,
      service_charge_psf: r.service_charge_psf != null ? Number(r.service_charge_psf) : null,
      data_quality: Number(r.data_quality),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

// PATCH /api/admin/nc-buildings
export async function PATCH(req: NextRequest) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { slug, mark_verified, ...fields } = body

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // Whitelist editable fields
  const allowed = [
    'units_studio', 'units_1br', 'units_2br', 'units_3br_plus',
    'building_grade', 'building_type',
    'nearest_highway', 'nearest_metro', 'metro_walk_mins',
    'view_type',
    'has_pool', 'has_gym', 'has_school_nearby',
    'completion_year', 'total_floors', 'is_freehold', 'service_charge_psf',
    'notes',
  ]

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) updates[k] = v
  }

  if (Object.keys(updates).length === 0 && mark_verified == null) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Build the data_quality expression
  const newQuality = mark_verified
    ? sql`3`
    : sql`GREATEST(data_quality, 2)`

  type NcBuildingRow = {
    slug: string
    name: string
    nc_area_slug: string | null
    building_type: string | null
    building_grade: string | null
    completion_year: number | null
    total_floors: number | null
    total_units: number | null
    units_studio: number | null
    units_1br: number | null
    units_2br: number | null
    units_3br_plus: number | null
    nearest_highway: string | null
    nearest_metro: string | null
    metro_walk_mins: number | null
    view_type: string[] | null
    has_pool: boolean | null
    has_gym: boolean | null
    has_school_nearby: boolean | null
    is_freehold: boolean | null
    service_charge_psf: string | null
    data_quality: number
    notes: string | null
    updated_at: string
  }

  let updatedRows: NcBuildingRow[]

  if (Object.keys(updates).length > 0) {
    updatedRows = await sql<NcBuildingRow[]>`
      UPDATE nc_buildings
      SET ${sql(updates)},
          data_quality = ${newQuality},
          updated_at = NOW()
      WHERE slug = ${slug}
      RETURNING
        slug, name, nc_area_slug, building_type, building_grade,
        completion_year, total_floors, total_units,
        units_studio, units_1br, units_2br, units_3br_plus,
        nearest_highway, nearest_metro, metro_walk_mins,
        view_type, has_pool, has_gym, has_school_nearby,
        is_freehold, service_charge_psf,
        data_quality, notes, updated_at
    `
  } else {
    // Only updating data_quality
    updatedRows = await sql<NcBuildingRow[]>`
      UPDATE nc_buildings
      SET data_quality = ${newQuality},
          updated_at = NOW()
      WHERE slug = ${slug}
      RETURNING
        slug, name, nc_area_slug, building_type, building_grade,
        completion_year, total_floors, total_units,
        units_studio, units_1br, units_2br, units_3br_plus,
        nearest_highway, nearest_metro, metro_walk_mins,
        view_type, has_pool, has_gym, has_school_nearby,
        is_freehold, service_charge_psf,
        data_quality, notes, updated_at
    `
  }

  if (!updatedRows.length) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 })
  }

  const r = updatedRows[0]
  return NextResponse.json({
    ok: true,
    row: {
      ...r,
      completion_year: r.completion_year != null ? Number(r.completion_year) : null,
      total_floors: r.total_floors != null ? Number(r.total_floors) : null,
      total_units: r.total_units != null ? Number(r.total_units) : null,
      units_studio: r.units_studio != null ? Number(r.units_studio) : null,
      units_1br: r.units_1br != null ? Number(r.units_1br) : null,
      units_2br: r.units_2br != null ? Number(r.units_2br) : null,
      units_3br_plus: r.units_3br_plus != null ? Number(r.units_3br_plus) : null,
      metro_walk_mins: r.metro_walk_mins != null ? Number(r.metro_walk_mins) : null,
      service_charge_psf: r.service_charge_psf != null ? Number(r.service_charge_psf) : null,
      data_quality: Number(r.data_quality),
    },
  })
}
