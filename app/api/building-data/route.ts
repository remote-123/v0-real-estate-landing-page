import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const a = req.nextUrl.searchParams.get('a') ?? ''
  const b = req.nextUrl.searchParams.get('b') ?? ''
  const beds = req.nextUrl.searchParams.get('beds') ?? '' // e.g. "1 B/R", "Studio", ""
  if (!a) return NextResponse.json({ quarterly: [], serviceCharges: [] })

  const buildings = [a, b].filter(Boolean)

  const quarterly = beds
    ? await sql`
        SELECT
          building_name_en,
          DATE_TRUNC('quarter', instance_date)::date::text AS qtr,
          ROUND(AVG(meter_sale_price)::numeric, 0)::integer AS avg_psm,
          COUNT(*)::integer AS deals,
          MODE() WITHIN GROUP (ORDER BY nearest_metro_en) AS nearest_metro
        FROM dld_transactions
        WHERE building_name_en = ANY(${buildings})
          AND trans_group_en = 'Sales'
          AND meter_sale_price > 200
          AND meter_sale_price < 15000
          AND rooms_en = ${beds}
          AND instance_date >= (SELECT MAX(instance_date) FROM dld_transactions) - INTERVAL '3 years'
        GROUP BY building_name_en, DATE_TRUNC('quarter', instance_date)
        ORDER BY building_name_en, qtr
      `
    : await sql`
        SELECT
          building_name_en,
          DATE_TRUNC('quarter', instance_date)::date::text AS qtr,
          ROUND(AVG(meter_sale_price)::numeric, 0)::integer AS avg_psm,
          COUNT(*)::integer AS deals,
          MODE() WITHIN GROUP (ORDER BY nearest_metro_en) AS nearest_metro
        FROM dld_transactions
        WHERE building_name_en = ANY(${buildings})
          AND trans_group_en = 'Sales'
          AND meter_sale_price > 200
          AND meter_sale_price < 15000
          AND instance_date >= (SELECT MAX(instance_date) FROM dld_transactions) - INTERVAL '3 years'
        GROUP BY building_name_en, DATE_TRUNC('quarter', instance_date)
        ORDER BY building_name_en, qtr
      `

  const serviceCharges = await sql`
    SELECT project_name, budget_year::integer, SUM(service_cost)::numeric AS total_cost
    FROM dld_service_charges
    WHERE usage_name_en = 'Residential'
      AND project_name ILIKE ANY(${buildings.map((b: string) => '%' + b + '%')})
    GROUP BY project_name, budget_year
    ORDER BY project_name, budget_year DESC
    LIMIT 20
  `

  const rentals = await sql`
    SELECT
      cluster AS building_match,
      bedrooms,
      COUNT(*)::integer AS listings,
      ROUND(AVG(annual_price)::numeric, 0)::integer AS avg_annual,
      ROUND(AVG(monthly_price)::numeric, 0)::integer AS avg_monthly,
      ROUND(AVG(price_per_sqft)::numeric, 0)::integer AS avg_psf
    FROM rental_listings
    WHERE cluster ILIKE ANY(${buildings.map((b: string) => '%' + b.slice(0, 20) + '%')})
    GROUP BY cluster, bedrooms
    ORDER BY cluster, bedrooms
    LIMIT 40
  `

  return NextResponse.json({ quarterly, serviceCharges, rentals })
}
