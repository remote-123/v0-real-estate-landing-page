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
}

interface DistressSummary {
  total_active: number
  confirmed_drops: number
  new_this_week: number
  tier1_count: number
}

async function fetchTopAreasByVolume(): Promise<AreaVolume[]> {
  const rows = await sql`
    WITH current_month AS (
      SELECT
        area_name_en AS area,
        COUNT(*)::int AS txn_count,
        ROUND(AVG(meter_sale_price / 10.764)::numeric, 0) AS avg_psf
      FROM dld_transactions
      WHERE
        instance_date >= NOW() - INTERVAL '30 days'
        AND trans_group_en = 'Sales'
        AND meter_sale_price BETWEEN 500 AND 150000
      GROUP BY area_name_en
    ),
    prev_month AS (
      SELECT
        area_name_en AS area,
        ROUND(AVG(meter_sale_price / 10.764)::numeric, 0) AS avg_psf
      FROM dld_transactions
      WHERE
        instance_date >= NOW() - INTERVAL '60 days'
        AND instance_date < NOW() - INTERVAL '30 days'
        AND trans_group_en = 'Sales'
        AND meter_sale_price BETWEEN 500 AND 150000
      GROUP BY area_name_en
    )
    SELECT
      c.area,
      c.txn_count,
      c.avg_psf,
      p.avg_psf AS prev_avg_psf
    FROM current_month c
    LEFT JOIN prev_month p ON p.area = c.area
    WHERE c.txn_count >= 5
    ORDER BY c.txn_count DESC
    LIMIT 5
  `
  return rows.map((r) => ({
    area: String(r.area),
    txn_count: Number(r.txn_count),
    avg_psf: Number(r.avg_psf),
    prev_avg_psf: r.prev_avg_psf !== null ? Number(r.prev_avg_psf) : null,
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
      const trend =
        a.prev_avg_psf && a.prev_avg_psf > 0
          ? `${(((a.avg_psf - a.prev_avg_psf) / a.prev_avg_psf) * 100).toFixed(1)}% MoM`
          : 'no prior period'
      return `${a.area}: ${a.txn_count} sales | AED ${a.avg_psf.toLocaleString('en-US')}/sqft | ${trend}`
    })
    .join('\n')

  const distressBlock = [
    `Active distress listings: ${distress.total_active}`,
    `Confirmed price drops: ${distress.confirmed_drops}`,
    `New signals this week: ${distress.new_this_week}`,
    `Tier 1 (verified) deals: ${distress.tier1_count}`,
  ].join('\n')

  const prompt = `You are an institutional real estate analyst writing a weekly market briefing for HNW investors interested in Dubai property. Today is ${weekLabel}.

Use ONLY the data provided below. Be direct, data-led, and slightly contrarian. No fluff. No generic statements.

=== RAW DATA ===

TOP 5 AREAS BY SALES VOLUME (last 30 days):
${areasBlock}

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
