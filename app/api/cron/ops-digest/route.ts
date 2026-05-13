import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendTelegram } from '@/lib/telegram'

export const maxDuration = 60

// ─── Checks ────────────────────────────────────────────────────────────────

async function getLeadsStats() {
  const [email, wa] = await Promise.all([
    sql<{ total: string; last_24h: string }[]>`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE subscribed_at >= NOW() - INTERVAL '24 hours')::integer AS last_24h
      FROM email_leads WHERE unsubscribed_at IS NULL
    `,
    sql<{ total: string; last_24h: string }[]>`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::integer AS last_24h
      FROM whatsapp_intents
    `,
  ])
  return { email: email[0], wa: wa[0] }
}

async function getRentalListingsStats() {
  const [row] = await sql<{ total: string; last_24h: string; oldest: string }[]>`
    SELECT
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::integer AS last_24h,
      MIN(created_at)::text AS oldest
    FROM rental_listings
  `
  return row
}

async function getBayutStats() {
  const [txn] = await sql<{ total: string; last_ingest: string | null }[]>`
    SELECT
      COUNT(*)::integer AS total,
      MAX(created_at)::text AS last_ingest
    FROM bayut_transactions
  `
  const [log] = await sql<{ last_run: string | null; last_count: string | null }[]>`
    SELECT
      MAX(run_at)::text AS last_run,
      MAX(listings_fetched)::integer AS last_count
    FROM bayut_ingest_log
  `.catch(() => [{ last_run: null, last_count: null }])
  return { txn: txn, log }
}

async function getDldStats() {
  const [row] = await sql<{ total: string; latest_date: string | null }[]>`
    SELECT
      COUNT(*)::integer AS total,
      MAX(transaction_date_en)::text AS latest_date
    FROM dld_transactions
  `
  return row
}

async function getDistressStats() {
  const [row] = await sql<{ active: string; confirmed: string; last_24h: string }[]>`
    SELECT
      COUNT(*) FILTER (WHERE disappeared_at IS NULL)::integer AS active,
      COUNT(*) FILTER (WHERE disappeared_at IS NULL AND price_drop_confirmed = true)::integer AS confirmed,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::integer AS last_24h
    FROM distress_listings
  `
  return row
}

async function getBlogStats() {
  const [reddit] = await sql<{ pending: string; used_7d: string }[]>`
    SELECT
      COUNT(*) FILTER (WHERE blog_generated_at IS NULL AND LENGTH(COALESCE(post_body,'')) >= 100)::integer AS pending,
      COUNT(*) FILTER (WHERE blog_generated_at >= NOW() - INTERVAL '7 days')::integer AS used_7d
    FROM reddit_seen_posts
    WHERE created_at >= NOW() - INTERVAL '14 days'
  `.catch(() => [{ pending: '?', used_7d: '?' }])
  return reddit
}

// ─── GET handler ────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [leads, rental, bayut, dld, distress, blog] = await Promise.allSettled([
    getLeadsStats(),
    getRentalListingsStats(),
    getBayutStats(),
    getDldStats(),
    getDistressStats(),
    getBlogStats(),
  ])

  const ok = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null
  const err = (r: PromiseSettledResult<any>) => r.status === 'rejected' ? `❌ ${(r.reason as any)?.message?.slice(0, 80)}` : null

  const L = ok(leads)
  const R = ok(rental)
  const B = ok(bayut)
  const D = ok(dld)
  const Ds = ok(distress)
  const Bl = ok(blog)

  // Build DLD staleness warning
  const dldDate = D?.latest_date ? new Date(D.latest_date) : null
  const dldDaysStale = dldDate ? Math.floor((Date.now() - dldDate.getTime()) / 86_400_000) : null
  const dldStatus = dldDaysStale != null
    ? (dldDaysStale > 30 ? `⚠️ ${dldDaysStale}d stale` : `✅ ${dldDaysStale}d ago`)
    : '❓ unknown'

  // Bayut cron health
  const bayutLastRun = B?.log?.last_run ? new Date(B.log.last_run) : null
  const bayutDaysSince = bayutLastRun ? Math.floor((Date.now() - bayutLastRun.getTime()) / 86_400_000) : null
  const bayutStatus = B?.txn?.total === '0' || B?.txn?.total === 0
    ? '🔴 NEVER FIRED — add to cron-job.org'
    : bayutDaysSince != null && bayutDaysSince > 2
      ? `⚠️ Last run ${bayutDaysSince}d ago`
      : `✅ ${B?.txn?.total?.toLocaleString()} rows`

  const now = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai',
  }) + ' GST'

  const lines = [
    `📊 <b>Daily Ops Digest</b>`,
    `<i>${now}</i>`,
    ``,
    `<b>Leads</b>`,
    L
      ? `  📧 Email: ${Number(L.email?.total ?? 0).toLocaleString()} active (+${L.email?.last_24h ?? 0} today)`
      : `  ${err(leads)}`,
    L
      ? `  💬 WhatsApp: ${Number(L.wa?.total ?? 0).toLocaleString()} (+${L.wa?.last_24h ?? 0} today)`
      : '',
    ``,
    `<b>Data Freshness</b>`,
    `  DLD: ${dldStatus} (${D?.total ? Number(D.total).toLocaleString() : '?'} rows)`,
    `  Bayut: ${bayutStatus}`,
    R
      ? `  PF Rentals: ${Number(R.total ?? 0).toLocaleString()} (+${R.last_24h ?? 0} today)`
      : `  PF Rentals: ${err(rental)}`,
    ``,
    `<b>Distress</b>`,
    Ds
      ? `  Active: ${Ds.active} | Confirmed: ${Ds.confirmed} | New 24h: ${Ds.last_24h}`
      : `  ${err(distress)}`,
    ``,
    `<b>Blog Pipeline</b>`,
    Bl
      ? `  Reddit queue: ${Bl.pending} pending | ${Bl.used_7d} used (7d)`
      : `  ${err(blog)}`,
  ].filter(l => l !== '')

  const msg = lines.join('\n')
  await sendTelegram(msg, process.env.TELEGRAM_THREAD_ID_ERRORS)

  return NextResponse.json({ ok: true, sent: true })
}
