/**
 * POST /api/leads/whatsapp-intent
 *
 * Called (fire-and-forget) when a user taps "Secure a Deal" on a distress card.
 * Logs the intent to whatsapp_intents and notifies via Telegram.
 *
 * Body: {
 *   listing_id: string
 *   title: string
 *   location: string
 *   price: number
 *   psf: number
 *   distress_score: number
 *   area_benchmark_psf: number | null
 * }
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendTelegram } from '@/lib/telegram'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // Rate limit: 10 intent signals per IP per 5 minutes
  const ip = getClientIp(req)
  const { ok: withinLimit } = checkRateLimit(`whatsapp-intent:${ip}`, { limit: 10, windowMs: 5 * 60_000 })
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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

  const {
    listing_id,
    title,
    location,
    price,
    psf,
    distress_score,
    area_benchmark_psf,
  } = body as Record<string, unknown>

  const safeListingId = typeof listing_id === 'string' ? listing_id.slice(0, 100) : null
  const safeTitle = typeof title === 'string' ? title.slice(0, 500) : null
  const safeLocation = typeof location === 'string' ? location.slice(0, 300) : null
  const safePrice = typeof price === 'number' && isFinite(price) ? price : null
  const safePsf = typeof psf === 'number' && isFinite(psf) ? psf : null
  const safeScore =
    typeof distress_score === 'number' && isFinite(distress_score)
      ? Math.round(distress_score)
      : null
  const safeBenchmark =
    typeof area_benchmark_psf === 'number' && isFinite(area_benchmark_psf)
      ? area_benchmark_psf
      : null

  // Log to DB (best-effort — don't block the WhatsApp navigation)
  try {
    await sql`
      INSERT INTO whatsapp_intents
        (listing_id, title, location, price, psf, distress_score, area_benchmark_psf)
      VALUES
        (${safeListingId}, ${safeTitle}, ${safeLocation},
         ${safePrice}, ${safePsf}, ${safeScore}, ${safeBenchmark})
    `
  } catch (err) {
    console.error('[whatsapp-intent] DB insert failed:', err)
    // Continue — still send Telegram
  }

  // Telegram notification
  const priceLabel = safePrice
    ? `AED ${Math.round(safePrice).toLocaleString('en-US')}`
    : 'n/a'
  const psfLabel = safePsf ? `${Math.round(safePsf).toLocaleString('en-US')} AED/sqft` : 'n/a'
  const benchmarkLabel = safeBenchmark
    ? `${Math.round(safeBenchmark).toLocaleString('en-US')} AED/sqft`
    : 'n/a'
  const scoreLabel = safeScore !== null ? `${safeScore}/100` : 'n/a'

  const tgText = [
    `<b>WhatsApp Intent Signal</b>`,
    ``,
    `<b>Property:</b> ${safeTitle ?? 'Unknown'}`,
    `<b>Location:</b> ${safeLocation ?? 'Unknown'}`,
    `<b>Price:</b> ${priceLabel}`,
    `<b>PSF:</b> ${psfLabel} vs area avg ${benchmarkLabel}`,
    `<b>Distress Score:</b> ${scoreLabel}`,
    ``,
    `Someone just tapped <i>Secure a Deal</i> — follow up now`,
  ].join('\n')

  await sendTelegram(tgText, process.env.TELEGRAM_THREAD_ID_LEADS)

  return NextResponse.json({ ok: true })
}
