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
      CASE WHEN bedrooms ~ '^\d+$' THEN bedrooms::integer ELSE NULL END AS bedrooms,
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
      CASE WHEN bedrooms ~ '^\d+$' THEN bedrooms::integer ELSE NULL END AS bedrooms,
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

// Minimal HTML escape for email content
function esc(s: string | null | undefined): string {
  if (!s) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildDealCardsHtml(deals: DigestDeal[]): string {
  return deals.slice(0, 5).map((d) => {
    const price = Math.round(Number(d.current_price)).toLocaleString('en-US')
    const psf = d.psf ? Math.round(Number(d.psf)) : null
    const areaAvg = d.dld_area_avg_psf ? Math.round(Number(d.dld_area_avg_psf)) : null
    const discountPct =
      psf && areaAvg && areaAvg > 0
        ? (((areaAvg - psf) / areaAvg) * 100).toFixed(1)
        : null
    const tierLabel =
      d.confidence_tier === 1 ? 'CONFIRMED DROP' : d.confidence_tier === 2 ? 'BELOW DLD AVG' : 'DOM SIGNAL'
    const tierBg =
      d.confidence_tier === 1 ? '#dcfce7' : d.confidence_tier === 2 ? '#fef9c3' : '#f3f4f6'
    const tierColor =
      d.confidence_tier === 1 ? '#15803d' : d.confidence_tier === 2 ? '#a16207' : '#6b7280'
    const meta = [
      d.bedrooms ? `${d.bedrooms} BR` : null,
      d.size_sqft ? `${Math.round(Number(d.size_sqft)).toLocaleString()} sqft` : null,
    ].filter(Boolean).join(' · ')

    const psfRow = psf
      ? `<tr>
          <td colspan="2" style="padding-top:10px;border-top:1px solid #e5e7eb">
            <span style="font-family:monospace;font-size:11px;color:#6b7280">
              PSF: <b style="color:#111827">AED ${psf}/sqft</b>
              ${areaAvg ? ` &nbsp;·&nbsp; Area avg: <b style="color:#111827">AED ${areaAvg}/sqft</b>` : ''}
              ${discountPct ? ` &nbsp;·&nbsp; <b style="color:#15803d">${discountPct}% below market</b>` : ''}
            </span>
          </td>
        </tr>`
      : ''

    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:6px;background:#ffffff">
  <tr>
    <td style="padding:16px 20px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top">
            <span style="display:inline-block;font-family:monospace;font-size:10px;letter-spacing:0.06em;padding:2px 7px;border-radius:3px;background:${tierBg};color:${tierColor};margin-bottom:8px">${tierLabel}</span><br/>
            <span style="font-size:14px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,sans-serif">${esc(d.title)}</span><br/>
            <span style="font-size:12px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,sans-serif">${esc(d.location)}</span>
          </td>
          <td style="text-align:right;vertical-align:top;white-space:nowrap;padding-left:16px">
            <span style="font-family:monospace;font-size:15px;font-weight:700;color:#111827">AED ${price}</span><br/>
            ${meta ? `<span style="font-family:monospace;font-size:11px;color:#9ca3af">${meta}</span>` : ''}
            <br/><span style="font-family:monospace;font-size:11px;color:#9ca3af">Score ${d.distress_score}/100 · ${d.days_on_market}d</span>
          </td>
        </tr>
        ${psfRow}
      </table>
    </td>
  </tr>
</table>`
  }).join('')
}

// Build full institutional HTML email
function textToHtml(text: string, subject: string, unsubToken: string, deals: DigestDeal[]): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.northcapitaldxb.com'
  const unsubUrl = `${baseUrl}/api/leads/unsubscribe?token=${unsubToken}`
  const terminalUrl = `${baseUrl}/terminal/distress-deals`
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  // Split Gemini body at natural paragraph breaks
  const bodyHtml = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.75;color:#374151;font-family:-apple-system,BlinkMacSystemFont,Georgia,serif">${p}</p>`)
    .join('')

  const dealCardsHtml = buildDealCardsHtml(deals)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;border-radius:8px 8px 0 0;padding:28px 32px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px 0;font-family:monospace;font-size:10px;letter-spacing:0.12em;color:#64748b;text-transform:uppercase">North Capital DXB · Intelligence</p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#f8fafc;letter-spacing:-0.01em">Weekly Distress Digest</p>
                  </td>
                  <td style="text-align:right;vertical-align:top">
                    <p style="margin:0;font-family:monospace;font-size:11px;color:#64748b">${dateStr}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px">

              <!-- Analysis -->
              <div style="margin-bottom:28px">
                ${bodyHtml}
              </div>

              <!-- Deal cards section header -->
              <p style="margin:0 0 12px 0;font-family:monospace;font-size:10px;letter-spacing:0.1em;color:#9ca3af;text-transform:uppercase;border-top:1px solid #f3f4f6;padding-top:24px">
                Top Distress Signals This Week
              </p>

              <!-- Deal cards -->
              ${dealCardsHtml}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
                <tr>
                  <td align="center">
                    <a href="${terminalUrl}" style="display:inline-block;background:#0f172a;color:#f8fafc;font-family:monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;padding:12px 28px;border-radius:5px;text-decoration:none">
                      View All Deals →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 32px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-family:monospace;font-size:10px;color:#9ca3af;line-height:1.6">
                      North Capital DXB — RERA Broker #95133<br/>
                      AI-generated from live DLD + Bayut data. Not financial advice.<br/>
                      Weekly digest only. <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>
                    </p>
                  </td>
                  <td style="text-align:right;vertical-align:top">
                    <p style="margin:0;font-family:monospace;font-size:10px;color:#d1d5db">NCX</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendEmailToLead(
  email: string,
  subject: string,
  body: string,
  unsubToken: string,
  deals: DigestDeal[]
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
      html: textToHtml(body, subject, unsubToken, deals),
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
      const result = await sendEmailToLead(lead.email as string, emailSubject, emailBody, unsubToken, deals)
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
