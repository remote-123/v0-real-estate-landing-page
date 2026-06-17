import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const [sales, rentals] = await Promise.all([
    sql`
      SELECT DISTINCT building_name_en AS name, 'sale' AS source
      FROM dld_transactions
      WHERE building_name_en ILIKE ${'%' + q + '%'}
        AND building_name_en IS NOT NULL
        AND trans_group_en = 'Sales'
      ORDER BY building_name_en
      LIMIT 10
    `,
    sql`
      SELECT DISTINCT cluster AS name, 'rent' AS source
      FROM rental_listings
      WHERE cluster ILIKE ${'%' + q + '%'}
        AND cluster IS NOT NULL
      ORDER BY cluster
      LIMIT 10
    `,
  ])

  const seen = new Set<string>()
  const results: { name: string; source: string }[] = []
  for (const row of [...sales, ...rentals]) {
    const key = (row.name as string).toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      results.push(row as { name: string; source: string })
    }
  }
  return NextResponse.json(results.slice(0, 15))
}
