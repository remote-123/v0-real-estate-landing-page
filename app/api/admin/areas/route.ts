import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_auth')?.value === process.env.ADMIN_PASSCODE
}

// GET — all area mappings
export async function GET() {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await sql`SELECT bayut_name, dld_name FROM area_name_mapping ORDER BY bayut_name`
  return NextResponse.json(rows)
}

// PUT — upsert a mapping
export async function PUT(req: NextRequest) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { bayut_name, dld_name, old_bayut_name } = await req.json()
  if (!bayut_name?.trim() || !dld_name?.trim()) return NextResponse.json({ error: 'Both fields required' }, { status: 400 })

  if (old_bayut_name && old_bayut_name !== bayut_name) {
    // Rename: delete old, insert new
    await sql`DELETE FROM area_name_mapping WHERE bayut_name = ${old_bayut_name}`
  }
  await sql`
    INSERT INTO area_name_mapping (bayut_name, dld_name)
    VALUES (${bayut_name.trim()}, ${dld_name.trim()})
    ON CONFLICT (bayut_name) DO UPDATE SET dld_name = EXCLUDED.dld_name
  `
  return NextResponse.json({ ok: true })
}

// DELETE — remove a mapping
export async function DELETE(req: NextRequest) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { bayut_name } = await req.json()
  await sql`DELETE FROM area_name_mapping WHERE bayut_name = ${bayut_name}`
  return NextResponse.json({ ok: true })
}
