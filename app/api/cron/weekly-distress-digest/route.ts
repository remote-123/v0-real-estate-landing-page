/**
 * GET /api/cron/weekly-distress-digest
 *
 * Weekly digest cron — runs Monday 7:00 AM UTC.
 * - Pulls top 5 confirmed distress deals (tier 1 → tier 2 → score)
 * - Falls back to highest-scoring listings from last 7 days if < 3 confirmed
 * - Uses Gemini Flash to draft a 200-300 word data-driven digest email body
 * - Stubs actual email delivery (TODO: wire up SendGrid / Resend)
 * - Sends digest preview to Telegram for review
 * - Records last_sent_at and increments send_count for every active lead
 *
 * Auth: Bearer CRON_SECRET
 */

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Resend } from 'resend'
import { sql } from '@/lib/db'
import { sendTelegram } from '@/lib/telegram'

export const maxDuration = 60

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

// ── Deal fetch ────────────────────────────────────────────────────────────────

interface DigestDeal {
  title: string
  location: string
  current_price: number
  psf: number | null
  dld_area_avg_psf: number | null
  distress_score: number
  confidence_tier: number
  days_on_market: number
  bedrooms: number | null
  size_sqft: number | null
  type: string | null
}

async function fetchTopDeals(): Promise<DigestDeal[]> {
  // Distress score is computed inline from available columns:
  //   - ABS(dld_psf_delta_pct): how far below market PSF
  //   - price_drop_pct: confirmed price drop magnitude
  //   - DOM: days on market penalty

  // Try confirmed deals (tier 1+2) first
  const confirmed = await sql<DigestDeal[]>`
    SELECT
      title,
      COALESCE(address_full, area_name, building_name, '') AS location,
      price AS current_price,
      price_per_sqft AS psf,
      dld_area_avg_psf,
      LEAST(100,
        COALESCE(ABS(dld_psf_delta_pct) * 0.7, 0)::int
        + COALESCE(price_drop_pct * 0.5, 0)::int
        + LEAST(EXTRACT(DAY FROM now() - first_seen_at)::int / 3, 40)
      ) AS distress_score,
      confidence_tier,
      EXTRACT(DAY FROM now() - first_seen_at)::integer AS days_on_market,
      bedrooms::integer,
      size_sqft,
      property_type AS type
    FROM distress_listings
    WHERE
      disappeared_at IS NULL
      AND price_drop_confirmed = true
    ORDER BY confidence_tier ASC,
      (COALESCE(ABS(dld_psf_delta_pct) * 0.7, 0) + COALESCE(price_drop_pct * 0.5, 0)) DESC
    LIMIT 5
  `

  if (confirmed.length >= 3) return confirmed

  // Fall back: top computed score from last 7 days
  const fallback = await sql<DigestDeal[]>`
    SELECT
      title,
      COALESCE(address_full, area_name, building_name, '') AS location,
      price AS current_price,
      price_per_sqft AS psf,
      dld_area_avg_psf,
      LEAST(100,
        COALESCE(ABS(dld_psf_delta_pct) * 0.7, 0)::int
        + COALESCE(price_drop_pct * 0.5, 0)::int
        + LEAST(EXTRACT(DAY FROM now() - first_seen_at)::int / 3, 40)
      ) AS distress_score,
      confidence_tier,
      EXTRACT(DAY FROM now() - first_seen_at)::integer AS days_on_market,
      bedrooms::integer,
      size_sqft,
      property_type AS type
    FROM distress_listings
    WHERE
      disappeared_at IS NULL
      AND first_seen_at >= now() - INTERVAL '7 days'
    ORDER BY
      (COALESCE(ABS(dld_psf_delta_pct) * 0.7, 0) + COALESCE(price_drop_pct * 0.5, 0)) DESC
    LIMIT 5
  `

  // Merge, deduplicate by title
  const seen = new Set(confirmed.map((d) => d.title))
  const merged = [...confirmed]
  for (const d of fallback) {
    if (!seen.has(d.title)) merged.push(d)
    if (merged.length >= 5) break
  }
  return merged
}

// ── Active lead count ─────────────────────────────────────────────────────────

async function getActiveLeadCount(): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM email_leads
    WHERE unsubscribed_at IS NULL
  `
  return Number(rows[0]?.cnt ?? 0)
}

// ── Gemini digest generation ──────────────────────────────────────────────────

async function generateDigestEmail(deals: DigestDeal[], weekLabel: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_DISTRESS_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.7 },
  })

  const dealsBlock = deals
    .map((d, i) => {
      const price = Math.round(Number(d.current_price)).toLocaleString('en-US')
      const psf = d.psf ? Math.round(Number(d.psf)) : null
      const areaAvg = d.dld_area_avg_psf ? Math.round(Number(d.dld_area_avg_psf)) : null
      const discount =
        psf && areaAvg && areaAvg > 0
          ? `${(((areaAvg - psf) / areaAvg) * 100).toFixed(1)}% below area avg PSF`
          : null
      const tierLabel =
        d.confidence_tier === 1
          ? 'Confirmed price drop'
          : d.confidence_tier === 2
          ? 'Below DLD avg'
          : 'DOM signal'

      return [
        `Deal ${i + 1}: ${d.title}`,
        `Location: ${d.location}`,
        `Price: AED ${price}${d.bedrooms ? ` | ${d.bedrooms} BR` : ''}${d.size_sqft ? ` | ${Math.round(Number(d.size_sqft)).toLocaleString()} sqft` : ''}`,
        psf ? `PSF: AED ${psf}/sqft${discount ? ` (${discount})` : ''}` : null,
        `Signal: ${tierLabel} | Score: ${d.distress_score}/100 | ${d.days_on_market}d on market`,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  const prompt = `You are writing a weekly distress deals digest email for North Capital DXB — an institutional-grade Dubai property intelligence platform. Subscribers are HNW investors, expats, and finance professionals.

Week: ${weekLabel}

TOP DISTRESS DEALS THIS WEEK:
${dealsBlock}

Write a 200-300 word email body that:
1. Opens with a punchy 1-line market observation (not generic, use the data)
2. Briefly covers 2-3 of the deals above — highlight the standout signal (PSF discount, confirmed drop, stale DOM)
3. Includes a short data-led insight: what these deals say about current market conditions
4. Ends with a clear CTA: "View all deals → northcapitaldxb.com/terminal/distress-deals"
5. Tone: analytical, direct, slightly contrarian. Not salesy. No fluff. Feels like a Bloomberg brief, not a marketing email.

DO NOT include: a subject line, greeting, or sign-off. Return ONLY the email body text.`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

// ── Email send via Resend ─────────────────────────────────────────────────────
// Requires RESEND_API_KEY env var. If not set, logs and skips (graceful fallback).
// Sender domain must be verified in Resend: digest@northcapitaldxb.com

let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// Convert plain text body to simple HTML (preserves line breaks)
function textToHtml(text: string, subject: string, unsubToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.northcapitaldxb.com'
  const unsubUrl = `${baseUrl}/api/leads/unsubscribe?token=${unsubToken}`
  const bodyHtml = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br/>' : `<p style="margin:0 0 12px 0;line-height:1.6">${line}</p>`))
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a;background:#ffffff">
  <p style="font-family:monospace;font-size:11px;color:#888;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:24px">
    NORTH CAPITAL DXB — WEEKLY DISTRESS DIGEST
  </p>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0"/>
  <p style="font-size:11px;color:#aaa;font-family:monospace">
    Weekly only. No spam.
    <a href="${unsubUrl}" style="color:#aaa">Unsubscribe</a>
  </p>
</body>
</html>`
}

async function sendEmailToLead(
  email: string,
  subject: string,
  body: string,
  unsubToken: string
): Promise<{ sent: boolean; skipped?: boolean }> {
  const resend = getResend()
  if (!resend) {
    console.log(`[weekly-digest] RESEND_API_KEY not set — skipping email to ${email}`)
    return { sent: false, skipped: true }
  }

  try {
    await resend.emails.send({
      from: 'North Capital DXB <digest@northcapitaldxb.com>',
      to: email,
      subject,
      html: textToHtml(body, subject, unsubToken),
    })
    return { sent: true }
  } catch (err) {
    console.error(`[weekly-digest] Resend error for ${email}:`, err)
    return { sent: false }
  }
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
    const [deals, leadCount] = await Promise.all([
      fetchTopDeals(),
      getActiveLeadCount(),
    ])

    if (deals.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No deals available — digest skipped',
        leads: leadCount,
      })
    }

    // Generate email body with Gemini
    const emailBody = await generateDigestEmail(deals, weekLabel)
    const emailSubject = `Dubai Distress Deals — Week of ${weekLabel}`

    // Pull active leads
    const leads = await sql`
      SELECT id, email FROM email_leads
      WHERE unsubscribed_at IS NULL
    `

    let sentCount = 0
    let skippedCount = 0
    for (const lead of leads) {
      // Unsubscribe token = base64 of email (simple, no secret needed for low-stakes opt-out)
      const unsubToken = Buffer.from(lead.email as string).toString('base64url')
      const result = await sendEmailToLead(lead.email as string, emailSubject, emailBody, unsubToken)
      if (result.sent) sentCount++
      if (result.skipped) skippedCount++
    }

    // Update send stats for all active leads in one query
    if (leads.length > 0) {
      await sql`
        UPDATE email_leads
        SET last_sent_at = now(),
            send_count   = send_count + 1
        WHERE unsubscribed_at IS NULL
      `
    }

    // Telegram preview (first 800 chars so it fits)
    const preview = emailBody.length > 800 ? emailBody.slice(0, 800) + '...' : emailBody
    const resendActive = !!process.env.RESEND_API_KEY
    const tgText = [
      `<b>Weekly Distress Digest — sent</b>`,
      `Week: ${weekLabel}`,
      `Deals surfaced: <b>${deals.length}</b>`,
      `Active leads: <b>${leadCount}</b>`,
      resendActive
        ? `Emails sent: <b>${sentCount}</b>`
        : `<i>Email delivery inactive — add RESEND_API_KEY to enable</i>`,
      ``,
      `<b>Email body preview:</b>`,
      preview,
    ].join('\n')

    await sendTelegram(tgText, process.env.TELEGRAM_THREAD_ID_LEADS)

    return NextResponse.json({
      ok: true,
      week: weekLabel,
      deals: deals.length,
      leads: leadCount,
      sent: sentCount,
      skipped: skippedCount,
      resendActive,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[weekly-distress-digest] Error:', msg)
    await sendTelegram(
      `<b>CRON ERROR — weekly-distress-digest</b>\n${msg}`,
      process.env.TELEGRAM_THREAD_ID_LEADS
    ).catch(() => {})
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
