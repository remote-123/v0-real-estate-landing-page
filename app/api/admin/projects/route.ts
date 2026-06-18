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

export async function GET(req: NextRequest) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = 50
  const offset = (page - 1) * limit

  const rows = await sql`
    SELECT
      project_id, project_name_en, developer_name, master_developer_name,
      project_status, percent_completed,
      project_start_date::text, project_end_date::text, completion_date::text,
      area_name_en, master_project_en,
      no_of_buildings, no_of_units
    FROM dld_projects
    WHERE ${q ? sql`(project_name_en ILIKE ${`%${q}%`} OR developer_name ILIKE ${`%${q}%`} OR area_name_en ILIKE ${`%${q}%`})` : sql`TRUE`}
    ORDER BY project_name_en ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countRow = await sql`
    SELECT COUNT(*) AS count FROM dld_projects
    WHERE ${q ? sql`(project_name_en ILIKE ${`%${q}%`} OR developer_name ILIKE ${`%${q}%`} OR area_name_en ILIKE ${`%${q}%`})` : sql`TRUE`}
  `

  return NextResponse.json({ rows, total: Number(countRow[0].count), page, limit })
}

export async function PATCH(req: NextRequest) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { project_id, ...fields } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const allowed = ['project_name_en', 'developer_name', 'master_developer_name', 'project_status', 'percent_completed', 'completion_date', 'area_name_en']
  const updates = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  await sql`UPDATE dld_projects SET ${sql(updates)} WHERE project_id = ${project_id}`
  return NextResponse.json({ ok: true })
}
