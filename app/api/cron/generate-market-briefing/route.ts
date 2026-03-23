/**
 * GET /api/cron/generate-market-briefing
 *
 * Cron wrapper — scheduled Monday 6:00 AM UTC via cron-job.org.
 * Proxies to /api/market-briefing/generate with Bearer CRON_SECRET.
 * Sends Telegram error alert on failure.
 *
 * Auth: Bearer CRON_SECRET
 */

import { sendTelegram } from '@/lib/telegram'

export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.northcapitaldxb.com'

  try {
    const res = await fetch(`${base}/api/market-briefing/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      await sendTelegram(
        `<b>CRON ERROR — generate-market-briefing</b>\nHTTP ${res.status}\n${data.error ?? JSON.stringify(data).slice(0, 200)}`,
        process.env.TELEGRAM_THREAD_ID_CONTENT
      )
    }

    return Response.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(
      `<b>CRON ERROR — generate-market-briefing</b>\nException: ${msg}`,
      process.env.TELEGRAM_THREAD_ID_CONTENT
    ).catch(() => {})
    return Response.json({ error: msg }, { status: 500 })
  }
}
