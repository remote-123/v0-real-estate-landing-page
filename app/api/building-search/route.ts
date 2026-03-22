import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])
  const rows = await sql`
    SELECT DISTINCT building_name_en, area_name_en
    FROM dld_transactions
    WHERE building_name_en ILIKE ${'%' + q + '%'}
      AND building_name_en IS NOT NULL
      AND trans_group_en = 'Sales'
    ORDER BY building_name_en
    LIMIT 15
  `
  return NextResponse.json(rows)
}
