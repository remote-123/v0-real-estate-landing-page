import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const runtime = "nodejs"
export const revalidate = 86400 // 24h — DLD data doesn't change intraday

/**
 * GET /api/area-psf-trend?area=Dubai+Marina&type=APARTMENT
 *
 * Returns 18 monthly avg PSF data points for an area+type combination.
 * Used by the distress-deals modal PSF trend chart.
 *
 * meter_sale_price is AED/sqm in DLD — divide by 10.764 for AED/sqft
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const area = searchParams.get("area")?.trim() || ""
  const type = searchParams.get("type")?.trim().toUpperCase() || "APARTMENT"

  if (!area) return NextResponse.json({ error: "area required" }, { status: 400 })

  // Map PF type → DLD property_sub_type_en values
  const typeFilter =
    type.includes("VILLA")
      ? ["Villa", "Villa Compound"]
      : type.includes("TOWN")
      ? ["Townhouse"]
      : ["Flat", "Hotel Apartment", "Penthouse"]

  try {
    const rows = await sql<{ month: string; avg_psf: number; txn_count: number }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', instance_date), 'YYYY-MM') AS month,
        ROUND(AVG(meter_sale_price / 10.764)::numeric, 0)::integer  AS avg_psf,
        COUNT(*)::integer                                            AS txn_count
      FROM dld_transactions
      WHERE trans_group_en  = 'Sales'
        AND area_name_en    ILIKE ${`%${area}%`}
        AND property_sub_type_en = ANY(${typeFilter})
        AND meter_sale_price BETWEEN 500 AND 150000
        AND instance_date >= NOW() - INTERVAL '18 months'
      GROUP BY DATE_TRUNC('month', instance_date)
      ORDER BY DATE_TRUNC('month', instance_date)
    `

    const data = rows.map(r => ({
      month: r.month,
      avg_psf: Number(r.avg_psf),
      txn_count: Number(r.txn_count),
    }))

    return NextResponse.json({ area, type, data })
  } catch (err: any) {
    console.error("[area-psf-trend]", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
