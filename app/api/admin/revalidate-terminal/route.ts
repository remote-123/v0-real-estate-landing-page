/**
 * POST /api/admin/revalidate-terminal
 *
 * Busts the cached data for every /terminal page so freshly ingested DLD data
 * shows up immediately instead of waiting for unstable_cache TTLs (1h–24h).
 * Called at the end of local ingest scripts (e.g. dld_transactions_csv_v2.ts).
 *
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidatePath('/terminal', 'layout')
  return NextResponse.json({ ok: true, revalidated: '/terminal (layout)' })
}
