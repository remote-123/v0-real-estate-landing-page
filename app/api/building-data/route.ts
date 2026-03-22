import { sql } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const a = req.nextUrl.searchParams.get('a') ?? ''
  const b = req.nextUrl.searchParams.get('b') ?? ''
  if (!a) return NextResponse.json({ quarterly: [], serviceCharges: [] })

  const buildings = [a, b].filter(Boolean)

  const quarterly = await sql`
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
      AND instance_date >= NOW() - INTERVAL '3 years'
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

  return NextResponse.json({ quarterly, serviceCharges })
}
