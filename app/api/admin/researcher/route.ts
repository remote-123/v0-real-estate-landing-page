/**
 * POST /api/admin/researcher
 *
 * AI-powered market research tool for the admin.
 * Classifies the question, runs the relevant SQL query against Neon,
 * feeds the data to Gemini Flash, and returns an analytical response.
 *
 * Auth: admin_auth cookie (ADMIN_PASSCODE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('admin_auth')?.value
  return cookie === process.env.ADMIN_PASSCODE
}

function classifyQuestion(q: string): string {
  const lower = q.toLowerCase()
  if (/yield|gross|rental income|roi|return/.test(lower)) return 'yield'
  if (/momentum|trending|hot|rising|breakout|growing/.test(lower)) return 'momentum'
  if (/distress|discount|below market|deal|drop|price cut/.test(lower)) return 'distress'
  if (/transaction|volume|sales|pulse|monthly|turnover/.test(lower)) return 'transactions'
  if (/supply|pipeline|off.?plan|developer|completion/.test(lower)) return 'pipeline'
  if (/service charge|rera|maintenance|fee/.test(lower)) return 'service_charges'
  if (/mortgage|leverage|finance|ltv|loan/.test(lower)) return 'mortgage'
  return 'communities'
}

async function runQuery(queryType: string): Promise<unknown[]> {
  switch (queryType) {
    case 'yield': {
      const rows = await sql`
        WITH sales AS (
          SELECT area_name_en, rooms_en,
            SUM(txn_count * avg_price) / NULLIF(SUM(txn_count), 0) AS avg_sale_price,
            SUM(txn_count) AS sale_txns
          FROM mv_txn_monthly_unified
          WHERE trans_group_en = 'Sales' AND property_type_en = 'Unit'
            AND txn_month >= NOW() - INTERVAL '12 months'
            AND area_name_en IS NOT NULL AND rooms_en IS NOT NULL
          GROUP BY area_name_en, rooms_en
        ),
        rents AS (
          SELECT area_name_en, rooms_en,
            SUM(txn_count * avg_rent) / NULLIF(SUM(txn_count), 0) AS avg_annual_rent,
            SUM(txn_count) AS rent_txns
          FROM mv_txn_monthly_unified
          WHERE trans_group_en = 'Rent' AND property_type_en = 'Unit'
            AND txn_month >= NOW() - INTERVAL '12 months'
            AND area_name_en IS NOT NULL AND rooms_en IS NOT NULL
          GROUP BY area_name_en, rooms_en
        )
        SELECT s.area_name_en, s.rooms_en,
          ROUND(((r.avg_annual_rent * 12) / NULLIF(s.avg_sale_price, 0) * 100)::numeric, 2) AS gross_yield_pct,
          ROUND(s.avg_sale_price::numeric, 0)::integer AS avg_sale_price,
          ROUND((r.avg_annual_rent * 12)::numeric, 0)::integer AS avg_annual_rent,
          s.sale_txns::integer
        FROM sales s JOIN rents r USING (area_name_en, rooms_en)
        WHERE s.sale_txns >= 5 AND r.rent_txns >= 5
          AND s.avg_sale_price > 100000
        ORDER BY gross_yield_pct DESC
        LIMIT 20
      `
      return rows
    }

    case 'momentum': {
      const rows = await sql`
        WITH base AS (
          SELECT area_name_en,
            SUM(CASE WHEN txn_month = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN txn_count ELSE 0 END) AS cur_vol,
            SUM(CASE WHEN txn_month = DATE_TRUNC('month', NOW() - INTERVAL '13 months') THEN txn_count ELSE 0 END) AS prev_vol,
            AVG(CASE WHEN txn_month >= NOW() - INTERVAL '3 months' THEN avg_price ELSE NULL END) AS cur_psf,
            AVG(CASE WHEN txn_month BETWEEN NOW() - INTERVAL '15 months' AND NOW() - INTERVAL '12 months' THEN avg_price ELSE NULL END) AS prev_psf
          FROM mv_txn_monthly_unified
          WHERE trans_group_en = 'Sales' AND property_type_en = 'Unit' AND area_name_en IS NOT NULL
          GROUP BY area_name_en
          HAVING SUM(txn_count) > 10
        )
        SELECT area_name_en,
          ROUND(cur_vol::numeric, 0)::integer AS recent_deals,
          ROUND(((cur_psf - prev_psf) / NULLIF(prev_psf, 0) * 100)::numeric, 1) AS price_delta_pct,
          ROUND(((cur_vol - prev_vol) / NULLIF(prev_vol, 0) * 100)::numeric, 1) AS vol_delta_pct,
          ROUND((COALESCE((cur_psf - prev_psf) / NULLIF(prev_psf, 0) * 50, 0) + COALESCE((cur_vol - prev_vol) / NULLIF(prev_vol, 0) * 50, 0))::numeric, 1) AS momentum_score
        FROM base
        WHERE cur_psf IS NOT NULL AND prev_psf IS NOT NULL AND cur_psf > 0
        ORDER BY momentum_score DESC
        LIMIT 20
      `
      return rows
    }

    case 'distress': {
      try {
        const rows = await sql`
          SELECT title, area_name, property_type, bedrooms,
            price, price_at_first_seen,
            ROUND(((price_at_first_seen - price) / NULLIF(price_at_first_seen, 0) * 100)::numeric, 1) AS drop_pct,
            price_per_sqft, dld_area_avg_psf,
            ROUND(dld_psf_delta_pct::numeric, 1) AS psf_vs_dld_pct,
            confidence_tier,
            EXTRACT(DAY FROM NOW() - first_seen_at)::integer AS days_on_market
          FROM distress_listings
          WHERE disappeared_at IS NULL
          ORDER BY confidence_tier ASC,
            (COALESCE(ABS(dld_psf_delta_pct) * 0.7, 0) + COALESCE(((price_at_first_seen - price) / NULLIF(price_at_first_seen, 0) * 100) * 0.5, 0)) DESC
          LIMIT 20
        `
        return rows
      } catch {
        // Table doesn't exist yet — fall back to communities with a note marker
        const rows = await sql`
          SELECT area_name_en,
            SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count ELSE 0 END)::integer AS sales_txns,
            ROUND(AVG(CASE WHEN trans_group_en = 'Sales' THEN avg_price ELSE NULL END)::numeric, 0)::integer AS avg_psf
          FROM mv_txn_monthly_unified
          WHERE txn_month >= NOW() - INTERVAL '3 months' AND area_name_en IS NOT NULL
          GROUP BY area_name_en
          HAVING SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count ELSE 0 END) > 0
          ORDER BY sales_txns DESC
          LIMIT 20
        `
        return [{ _note: 'distress_listings table not yet available — showing recent sales by community instead' }, ...rows]
      }
    }

    case 'transactions': {
      const rows = await sql`
        SELECT txn_month::text, trans_group_en,
          SUM(txn_count)::integer AS deals,
          ROUND((SUM(total_value) / 1e9)::numeric, 2) AS value_bn
        FROM mv_txn_monthly_unified
        WHERE txn_month >= NOW() - INTERVAL '12 months'
          AND trans_group_en IN ('Sales', 'Mortgages', 'Rent')
          AND area_name_en IS NOT NULL
        GROUP BY txn_month, trans_group_en
        ORDER BY txn_month DESC, trans_group_en
        LIMIT 40
      `
      return rows
    }

    case 'pipeline': {
      const rows = await sql`
        SELECT area_name_en,
          COUNT(*)::integer AS projects,
          COALESCE(SUM(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN no_of_units ELSE 0 END), 0)::integer AS active_units,
          COALESCE(SUM(no_of_units), 0)::integer AS total_units
        FROM dld_projects
        WHERE area_name_en IS NOT NULL AND no_of_units > 0
        GROUP BY area_name_en
        HAVING COALESCE(SUM(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN no_of_units ELSE 0 END), 0) > 0
        ORDER BY active_units DESC
        LIMIT 20
      `
      return rows
    }

    case 'service_charges': {
      const rows = await sql`
        SELECT project_name, budget_year, total_cost, area
        FROM dld_service_charges
        WHERE budget_year >= 2022
        ORDER BY total_cost DESC
        LIMIT 20
      `
      return rows
    }

    case 'mortgage': {
      const rows = await sql`
        SELECT area_name_en,
          SUM(CASE WHEN trans_group_en = 'Mortgages' THEN txn_count ELSE 0 END)::integer AS mortgages,
          SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count ELSE 0 END)::integer AS sales,
          ROUND((SUM(CASE WHEN trans_group_en = 'Mortgages' THEN txn_count ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count ELSE 0 END), 0) * 100)::numeric, 1) AS leverage_ratio_pct
        FROM mv_txn_monthly_unified
        WHERE txn_month >= NOW() - INTERVAL '6 months' AND area_name_en IS NOT NULL
        GROUP BY area_name_en
        HAVING SUM(CASE WHEN trans_group_en = 'Mortgages' THEN txn_count ELSE 0 END) > 0
        ORDER BY mortgages DESC
        LIMIT 20
      `
      return rows
    }

    default: {
      // communities
      const rows = await sql`
        SELECT area_name_en,
          SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count ELSE 0 END)::integer AS sales_txns,
          ROUND(AVG(CASE WHEN trans_group_en = 'Sales' THEN avg_price ELSE NULL END)::numeric, 0)::integer AS avg_psf
        FROM mv_txn_monthly_unified
        WHERE txn_month >= NOW() - INTERVAL '3 months' AND area_name_en IS NOT NULL
        GROUP BY area_name_en
        HAVING SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count ELSE 0 END) > 0
        ORDER BY sales_txns DESC
        LIMIT 20
      `
      return rows
    }
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse + validate body
  let question: string
  try {
    const body = await req.json()
    question = body?.question
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof question !== 'string' || question.trim().length === 0) {
    return NextResponse.json({ error: 'question must be a non-empty string' }, { status: 400 })
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: 'question must be 1000 characters or fewer' }, { status: 400 })
  }
  question = question.trim()

  const queryType = classifyQuestion(question)

  // Run DB query — on failure, proceed with empty data
  let rows: unknown[] = []
  let dbError = false
  try {
    rows = await runQuery(queryType)
  } catch (err) {
    console.error('[researcher] DB query failed', err)
    dbError = true
  }

  // Build Gemini prompt
  const dataBlock = dbError
    ? 'DB query failed — answering from general knowledge about Dubai real estate.'
    : JSON.stringify(rows.slice(0, 15), null, 2)

  const prompt = `You are an institutional Dubai real estate analyst with access to DLD transaction data.

User question: "${question}"

Relevant data (${queryType} query, ${rows.length} rows from Neon DB):
${dataBlock}

Write a concise, data-driven analysis (200-350 words) that directly answers the question.
- Lead with the key finding from the data
- Reference specific numbers, area names, and percentages from the data
- Identify 2-3 actionable insights for an institutional investor
- Note any data limitations (stale data, small sample sizes)
- Tone: Bloomberg brief style — analytical, direct, no fluff

Return ONLY the analysis text. No headers, no markdown formatting.`

  // Call Gemini Flash
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.3 },
  })

  let answer: string
  try {
    const result = await model.generateContent(prompt)
    answer = result.response.text()
  } catch (err) {
    console.error('[researcher] Gemini call failed', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }

  return NextResponse.json({
    answer,
    query_type: queryType,
    rows_fetched: rows.length,
  })
}
