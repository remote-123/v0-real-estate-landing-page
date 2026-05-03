import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 })

  try {
    // Find area name from slug
    const areas = await sql<{ area_name_en: string }[]>`
      SELECT DISTINCT area_name_en FROM mv_txn_monthly_unified
      WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
    `
    const match = areas.find(a => toSlug(a.area_name_en) === slug)
    if (!match) return NextResponse.json({ error: "not found" }, { status: 404 })

    const areaName = match.area_name_en

    // Current month stats
    const [stats] = await sql<{
      txn_count: string
      avg_psf: string
      avg_value: string
      mom_change: string | null
    }[]>`
      WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified),
      curr AS (
        SELECT
          SUM(txn_count) AS txn_count,
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS avg_psm,
          SUM(txn_count * avg_price)     / NULLIF(SUM(txn_count), 0) AS avg_val
        FROM mv_txn_monthly_unified, latest
        WHERE txn_month = latest.m
          AND area_name_en = ${areaName}
          AND trans_group_en = 'Sales'
          AND property_type_en = 'Unit'
      ),
      prev AS (
        SELECT SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS avg_psm
        FROM mv_txn_monthly_unified, latest
        WHERE txn_month = latest.m - INTERVAL '1 month'
          AND area_name_en = ${areaName}
          AND trans_group_en = 'Sales'
          AND property_type_en = 'Unit'
      )
      SELECT
        curr.txn_count,
        curr.avg_psm * 10.764 AS avg_psf,
        curr.avg_val AS avg_value,
        CASE WHEN prev.avg_psm > 0
          THEN ROUND(((curr.avg_psm - prev.avg_psm) / prev.avg_psm * 100)::numeric, 2)
          ELSE NULL
        END AS mom_change
      FROM curr, prev
    `

    // 12-month PSF trend
    const trend = await sql<{ month: string; avg_psf: string }[]>`
      SELECT
        TO_CHAR(txn_month, 'Mon YY') AS month,
        SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) * 10.764 AS avg_psf
      FROM mv_txn_monthly_unified
      WHERE area_name_en = ${areaName}
        AND trans_group_en = 'Sales'
        AND property_type_en = 'Unit'
        AND txn_month >= (SELECT MAX(txn_month) FROM mv_txn_monthly_unified) - INTERVAL '11 months'
      GROUP BY txn_month
      ORDER BY txn_month ASC
    `

    // Property type breakdown
    const breakdown = await sql<{ sub_type: string; count: string }[]>`
      SELECT
        COALESCE(property_sub_type_en, property_type_en) AS sub_type,
        SUM(txn_count) AS count
      FROM mv_txn_monthly_unified
      WHERE area_name_en = ${areaName}
        AND trans_group_en = 'Sales'
        AND txn_month >= (SELECT MAX(txn_month) FROM mv_txn_monthly_unified) - INTERVAL '11 months'
      GROUP BY sub_type
      ORDER BY count DESC
      LIMIT 5
    `

    // 12-month total transactions
    const [{ total12m }] = await sql<{ total12m: string }[]>`
      SELECT COALESCE(SUM(txn_count), 0) AS total12m
      FROM mv_txn_monthly_unified
      WHERE area_name_en = ${areaName}
        AND trans_group_en = 'Sales'
        AND txn_month >= (SELECT MAX(txn_month) FROM mv_txn_monthly_unified) - INTERVAL '11 months'
    `

    return NextResponse.json({
      name: areaName,
      slug,
      stats: {
        txn_count: Number(stats?.txn_count ?? 0),
        avg_psf: Math.round(Number(stats?.avg_psf ?? 0)),
        avg_value: Math.round(Number(stats?.avg_value ?? 0)),
        mom_change: stats?.mom_change != null ? Number(stats.mom_change) : null,
        total_12m: Number(total12m),
      },
      trend: trend.map(r => ({ month: r.month, avg_psf: Math.round(Number(r.avg_psf)) })),
      breakdown: breakdown.map(r => ({ sub_type: r.sub_type, count: Number(r.count) })),
    })
  } catch (e) {
    console.error("[area-summary]", e)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
