import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const runtime = "nodejs"
export const revalidate = 86400 // 24h

/**
 * GET /api/area-list
 * Returns top 100 DLD areas by 12-month sales volume.
 * Used by CompareClient and any other client that needs a dynamic area list.
 *
 * Response: { areas: string[] }  — DLD area_name_en values, sorted by volume desc
 */
export async function GET() {
  try {
    const rows = await sql<{ area_name_en: string }[]>`
      SELECT area_name_en, SUM(txn_count) AS vol
      FROM mv_txn_monthly_unified
      WHERE trans_group_en = 'Sales'
        AND area_name_en IS NOT NULL
        AND txn_month >= (SELECT MAX(txn_month) FROM mv_txn_monthly_unified) - INTERVAL '11 months'
      GROUP BY area_name_en
      HAVING SUM(txn_count) >= 5
      ORDER BY vol DESC
      LIMIT 100
    `

    const areas = rows.map((r) => r.area_name_en)
    return NextResponse.json({ areas })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[area-list]", msg)
    return NextResponse.json({ areas: [] }, { status: 500 })
  }
}
