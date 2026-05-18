/**
 * Stage 2 — Scrape building list for each area.
 *
 * For each area in prop_areas, fetches:
 *   https://propsearch.ae/dubai/{area-slug}/buildings
 * Extracts building slugs, names, and status.
 * Upserts into prop_buildings. Updates prop_areas.total_buildings.
 *
 * Trigger: GET /api/cron/prop-buildings
 * Auth:    Bearer CRON_SECRET
 * Cadence: daily (new buildings added regularly)
 * Optional: ?area=dubai-silicon-oasis to run for one area only
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const maxDuration = 300

const BASE = 'https://propsearch.ae'
const DELAY_MS = 1500

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

type BuildingStatus = 'complete' | 'under_construction' | 'planned' | 'cancelled' | 'unknown'

// Slugs that look like buildings but are navigation links
const NAV_SLUGS = new Set([
  'area-guides', 'buildings', 'dubai', 'map', 'similar', 'properties',
  'properties-for-sale', 'properties-to-rent', 'off-plan', 'new-projects',
  'agents', 'developers', 'blog', 'contact', 'search', 'projects',
  'branded-residences', 'luxury', 'villas', 'apartments', 'townhouses',
])

function parseStatus(text: string): BuildingStatus {
  const t = text.toLowerCase()
  if (t.includes('(cancelled)') || t.includes('(canceled)')) return 'cancelled'
  if (t.includes('complete')) return 'complete'
  if (t.includes('under development') || t.includes('under construction')) return 'under_construction'
  if (t.includes('planned') || t.includes('envisioned')) return 'planned'
  return 'unknown'
}

interface ScrapedBuilding {
  building_slug: string
  building_name: string
  status: BuildingStatus
}

function extractBuildings(html: string, knownAreaSlugs: Set<string>): ScrapedBuilding[] {
  const buildings: ScrapedBuilding[] = []
  const seen = new Set<string>()
  const blocked = new Set([...NAV_SLUGS, ...knownAreaSlugs])

  // Building links are absolute: href="https://propsearch.ae/dubai/{slug}"
  const re = /href="https:\/\/propsearch\.ae\/dubai\/([a-z0-9][a-z0-9-]*)"/g
  let m: RegExpExecArray | null

  while ((m = re.exec(html)) !== null) {
    const slug = m[1]
    if (seen.has(slug) || blocked.has(slug)) continue
    seen.add(slug)

    // Look for status span in the 600 chars after this match
    const window = html.slice(m.index, m.index + 600)
    const spanRe = /<span[^>]*>([^<]{4,80})<\/span>/g
    let statusText = ''
    let sm: RegExpExecArray | null
    while ((sm = spanRe.exec(window)) !== null) {
      const c = sm[1].trim()
      if (/complete|under dev|under con|planned|envisioned|cancelled|canceled/i.test(c)) {
        statusText = c
        break
      }
    }

    const building_name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    buildings.push({ building_slug: slug, building_name, status: parseStatus(statusText) })
  }

  return buildings
}

async function fetchHtml(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)', Accept: 'text/html' },
        signal: AbortSignal.timeout(20_000),
      })
      if (res.status === 404) return null
      if (res.status === 429) { await sleep(Math.pow(2, attempt + 1) * 1000); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    } catch {
      if (attempt === 2) return null
      await sleep(2000)
    }
  }
  return null
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const targetArea = searchParams.get('area')

  // Load areas
  const areaRows = targetArea
    ? await sql<{ slug: string; name: string }[]>`SELECT slug, name FROM prop_areas WHERE slug = ${targetArea}`
    : await sql<{ slug: string; name: string }[]>`SELECT slug, name FROM prop_areas ORDER BY slug`

  if (areaRows.length === 0) {
    return NextResponse.json({ error: 'No areas found. Run /api/cron/prop-areas first.' }, { status: 400 })
  }

  const knownAreaSlugs = new Set(areaRows.map(r => r.slug))
  let totalUpserted = 0
  let areasProcessed = 0
  const errors: string[] = []

  for (const area of areaRows) {
    const html = await fetchHtml(`${BASE}/dubai/${area.slug}/buildings`)
    if (!html) {
      errors.push(`${area.slug}: fetch failed`)
      await sleep(DELAY_MS)
      continue
    }

    const buildings = extractBuildings(html, knownAreaSlugs)

    for (const b of buildings) {
      try {
        await sql`
          INSERT INTO prop_buildings (area_slug, building_slug, building_name, status, last_seen_at)
          VALUES (${area.slug}, ${b.building_slug}, ${b.building_name}, ${b.status}, NOW())
          ON CONFLICT (area_slug, building_slug) DO UPDATE SET
            building_name = EXCLUDED.building_name,
            status        = EXCLUDED.status,
            last_seen_at  = NOW()
        `
        totalUpserted++
      } catch {
        // Skip individual bad rows
      }
    }

    // Update total_buildings count on the area
    await sql`
      UPDATE prop_areas
      SET total_buildings = ${buildings.length}, last_scraped_at = NOW()
      WHERE slug = ${area.slug}
    `

    areasProcessed++
    await sleep(DELAY_MS)
  }

  return NextResponse.json({
    ok: true,
    areas_processed: areasProcessed,
    buildings_upserted: totalUpserted,
    errors: errors.length > 0 ? errors : undefined,
  })
}
