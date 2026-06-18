/**
 * POST /api/leads/email-capture
 *
 * Captures an email lead from any page in the terminal.
 * Body: { email: string; source: string; area_interest?: string }
 *
 * Returns: { ok: true; already_subscribed: boolean }
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendTelegram } from '@/lib/telegram'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Simple email regex — avoids a dependency
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  // Rate limit: 5 submissions per IP per 10 minutes
  const ip = getClientIp(req)
  const { ok: withinLimit } = checkRateLimit(`email-capture:${ip}`, { limit: 5, windowMs: 10 * 60_000 })
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests — try again later' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { email, source, area_interest } = body as Record<string, unknown>

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanSource = typeof source === 'string' ? source.slice(0, 100) : 'terminal'
  const cleanArea =
    typeof area_interest === 'string' ? area_interest.slice(0, 200) : null

  try {
    // Insert — ON CONFLICT DO NOTHING to detect existing subscribers
    const result = await sql`
      INSERT INTO email_leads (email, source, area_interest)
      VALUES (${cleanEmail}, ${cleanSource}, ${cleanArea})
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `

    const alreadySubscribed = result.length === 0

    // Only notify Telegram for new leads
    if (!alreadySubscribed) {
      const areaLabel = cleanArea ? ` (${cleanArea})` : ''
      await sendTelegram(
        `<b>New lead</b>\n<code>${cleanEmail}</code>\nSource: <b>${cleanSource}</b>${areaLabel}`,
        process.env.TELEGRAM_THREAD_ID_LEADS
      )
    }

    return NextResponse.json({ ok: true, already_subscribed: alreadySubscribed })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[email-capture] DB error:', msg)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
