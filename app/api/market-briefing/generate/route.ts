/**
 * POST /api/market-briefing/generate
 *
 * Generates a weekly AI market briefing for HNW investors.
 * - Pulls fresh Neon data: top 5 areas by volume, PSF trends, distress counts
 * - Feeds structured data to Gemini with an institutional analyst prompt
 * - Stores result in market_briefings table
 * - Sends a preview to Telegram
 *
 * Auth: Bearer CRON_SECRET
 */

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sql } from '@/lib/db'
import { sendTelegram } from '@/lib/telegram'

export const maxDuration = 60

// ── Auth ─────────────────────────────────────────────────────────────────────

function checkAuth(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

// ── Data collection ───────────────────────────────────────────────────────────

interface AreaVolume {
  area: string
  txn_count: number
  avg_psf: number
  prev_avg_psf: number | null
  avg_psf_yoy: number | null
  txn_count_yoy: number | null
  total_market_txns: number
  data_month: string
}

interface DistressSummary {
  total_active: number
  confirmed_drops: number
  new_this_week: number
  tier1_count: number
}

async function fetchTopAreasByVolume(): Promise<AreaVolume[]> {
  const rows = await sql`
    WITH latest AS (
      SELECT MAX(txn_month) AS max_month
      FROM mv_txn_monthly_unified
      WHERE trans_group_en = 'Sales' AND property_type_en = 'Unit'
    ),
    current_month AS (
      SELECT
        area_name_en                                                              AS area,
        SUM(txn_count)::int                                                       AS txn_count,
        ROUND(
          (SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764)::numeric,
          0
        )                                                                         AS avg_psf
      FROM mv_txn_monthly_unified
      CROSS JOIN latest
      WHERE txn_month = latest.max_month
        AND trans_group_en = 'Sales'
        AND property_type_en = 'Unit'
        AND area_name_en IS NOT NULL
      GROUP BY area_name_en
      HAVING SUM(txn_count) >= 5
    ),
    prev_month AS (
      SELECT
        area_name_en                                                              AS area,
        ROUND(
          (SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764)::numeric,
          0
        )                                                                         AS avg_psf
      FROM mv_txn_monthly_unified
      CROSS JOIN latest
      WHERE txn_month = latest.max_month - INTERVAL '1 month'
        AND trans_group_en = 'Sales'
        AND property_type_en = 'Unit'
        AND area_name_en IS NOT NULL
      GROUP BY area_name_en
    ),
    yoy_month AS (
      SELECT
        area_name_en                                                              AS area,
        SUM(txn_count)::int                                                       AS txn_count_yoy,
        ROUND(
          (SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764)::numeric,
          0
        )                                                                         AS avg_psf_yoy
      FROM mv_txn_monthly_unified
      CROSS JOIN latest
      WHERE txn_month = latest.max_month - INTERVAL '1 year'
        AND trans_group_en = 'Sales'
        AND property_type_en = 'Unit'
        AND area_name_en IS NOT NULL
      GROUP BY area_name_en
    ),
    market_total AS (
      SELECT SUM(txn_count)::int AS total_market_txns
      FROM mv_txn_monthly_unified
      CROSS JOIN latest
      WHERE txn_month = latest.max_month
        AND trans_group_en = 'Sales'
        AND property_type_en = 'Unit'
    )
    SELECT
      c.area,
      c.txn_count,
      c.avg_psf,
      p.avg_psf                   AS prev_avg_psf,
      y.txn_count_yoy,
      y.avg_psf_yoy,
      mt.total_market_txns,
      latest.max_month::text      AS data_month
    FROM current_month c
    CROSS JOIN latest
    CROSS JOIN market_total mt
    LEFT JOIN prev_month p  ON p.area = c.area
    LEFT JOIN yoy_month  y  ON y.area = c.area
    ORDER BY c.txn_count DESC
    LIMIT 5
  `
  return rows.map((r) => ({
    area: String(r.area),
    txn_count: Number(r.txn_count),
    avg_psf: Number(r.avg_psf),
    prev_avg_psf: r.prev_avg_psf != null ? Number(r.prev_avg_psf) : null,
    avg_psf_yoy: r.avg_psf_yoy != null ? Number(r.avg_psf_yoy) : null,
    txn_count_yoy: r.txn_count_yoy != null ? Number(r.txn_count_yoy) : null,
    total_market_txns: Number(r.total_market_txns ?? 0),
    data_month: String(r.data_month ?? ''),
  }))
}

async function fetchDistressSummary(): Promise<DistressSummary> {
  // Guard: table may not exist yet if the cron has never run
  try {
    const rows = await sql`
      SELECT
        COUNT(*)::int AS total_active,
        COUNT(*) FILTER (WHERE price_drop_confirmed = true)::int AS confirmed_drops,
        COUNT(*) FILTER (WHERE first_seen_at >= now() - INTERVAL '7 days')::int AS new_this_week,
        COUNT(*) FILTER (WHERE confidence_tier = 1)::int AS tier1_count
      FROM distress_listings
      WHERE disappeared_at IS NULL
    `
    const r = rows[0]
    return {
      total_active: Number(r?.total_active ?? 0),
      confirmed_drops: Number(r?.confirmed_drops ?? 0),
      new_this_week: Number(r?.new_this_week ?? 0),
      tier1_count: Number(r?.tier1_count ?? 0),
    }
  } catch {
    return { total_active: 0, confirmed_drops: 0, new_this_week: 0, tier1_count: 0 }
  }
}

// ── Gemini briefing ───────────────────────────────────────────────────────────

async function generateBriefing(
  areas: AreaVolume[],
  distress: DistressSummary,
  weekLabel: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_DISTRESS_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.65 },
  })

  const areasBlock = areas
    .map((a) => {
      const mom =
        a.prev_avg_psf && a.prev_avg_psf > 0
          ? `${(((a.avg_psf - a.prev_avg_psf) / a.prev_avg_psf) * 100).toFixed(1)}% MoM`
          : 'no prior month'
      const yoy =
        a.avg_psf_yoy && a.avg_psf_yoy > 0
          ? `${(((a.avg_psf - a.avg_psf_yoy) / a.avg_psf_yoy) * 100).toFixed(1)}% YoY`
          : 'no prior year'
      const volYoy =
        a.txn_count_yoy && a.txn_count_yoy > 0
          ? ` | vol ${(((a.txn_count - a.txn_count_yoy) / a.txn_count_yoy) * 100).toFixed(1)}% YoY`
          : ''
      return `${a.area}: ${a.txn_count} sales | AED ${a.avg_psf.toLocaleString('en-US')}/sqft | ${mom} | ${yoy}${volYoy}`
    })
    .join('\n')

  const marketLine = areas[0]?.total_market_txns
    ? `Total Dubai market (${areas[0].data_month}): ${areas[0].total_market_txns.toLocaleString('en-US')} sales\n\n`
    : ''

  const distressBlock = [
    `Active distress listings: ${distress.total_active}`,
    `Confirmed price drops: ${distress.confirmed_drops}`,
    `New signals this week: ${distress.new_this_week}`,
    `Tier 1 (verified) deals: ${distress.tier1_count}`,
  ].join('\n')

  const prompt = `You are an institutional real estate analyst writing a weekly market briefing for HNW investors interested in Dubai property. Today is ${weekLabel}.

Use ONLY the data provided below. Be direct, data-led, and slightly contrarian. No fluff. No generic statements.

=== RAW DATA ===

TOP 5 AREAS BY SALES VOLUME (latest available month):
${marketLine}${areasBlock}

DISTRESS MARKET SIGNALS:
${distressBlock}

=== BRIEFING STRUCTURE (500 words max) ===

MARKET SNAPSHOT
[2-3 sentences. Lead with the most surprising or significant data point from the areas above. What does the volume distribution tell us?]

KEY SIGNALS
[3 bullet points. Each is a specific, data-backed observation. Reference exact numbers. No vague assertions.]

BEAR CASE NOTE
[1 short paragraph. What's the one thing an optimistic investor might be missing in this data? Be honest.]

OPPORTUNITY
[1 short paragraph. Based on the distress signal data, where is the asymmetric opportunity right now? Be specific.]

Return the briefing text only. Use the section headers above. No preamble, no sign-off.`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run(): Promise<NextResponse> {
  const now = new Date()
  const weekLabel = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

  try {
    const [areas, distress] = await Promise.all([
      fetchTopAreasByVolume(),
      fetchDistressSummary(),
    ])

    if (areas.length === 0) {
      return NextResponse.json({
        ok: false,
        message: 'No transaction data available — briefing skipped',
      })
    }

    const content = await generateBriefing(areas, distress, weekLabel)

    const dataSnapshot = {
      week: weekLabel,
      data_month: areas[0]?.data_month ?? null,
      total_market_txns: areas[0]?.total_market_txns ?? null,
      top_areas: areas,
      distress,
    }

    // Store in DB
    const inserted = await sql`
      INSERT INTO market_briefings (content, data_snapshot, week_label)
      VALUES (${content}, ${JSON.stringify(dataSnapshot)}, ${weekLabel})
      RETURNING id
    `
    const briefingId = inserted[0]?.id

    // Telegram preview
    const preview = content.length > 600 ? content.slice(0, 600) + '...' : content
    const tgText = [
      `<b>Weekly Market Briefing ready</b>`,
      `Week: ${weekLabel} | DB id: ${briefingId}`,
      ``,
      preview,
      ``,
      `<i>Full briefing at /api/market-briefing/generate | Distress active: ${distress.total_active}, confirmed: ${distress.confirmed_drops}</i>`,
    ].join('\n')

    await sendTelegram(tgText, process.env.TELEGRAM_THREAD_ID_CONTENT)

    return NextResponse.json({
      ok: true,
      id: briefingId,
      week: weekLabel,
      content,
      data: dataSnapshot,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[market-briefing/generate] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
