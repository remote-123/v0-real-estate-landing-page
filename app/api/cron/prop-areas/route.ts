/**
 * Stage 1 — Scrape the propsearch.ae area list.
 *
 * Fetches https://propsearch.ae/dubai/buildings?page=1 and page=2,
 * extracts area slugs and names, upserts into prop_areas.
 *
 * Trigger: GET /api/cron/prop-areas
 * Auth:    Bearer CRON_SECRET
 * Cadence: weekly (area list rarely changes)
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const maxDuration = 60

const BASE = 'https://propsearch.ae'
const PAGES = [1, 2]
const DELAY_MS = 1500

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Nav slugs that appear in links but aren't real areas
const NAV_SLUGS = new Set([
  'buildings', 'dubai', 'map', 'similar', 'properties', 'area-guides',
  'properties-for-sale', 'properties-to-rent', 'off-plan', 'new-projects',
  'agents', 'developers', 'blog', 'contact', 'search', 'projects',
])

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)', Accept: 'text/html' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

interface Area { slug: string; name: string }

function extractAreas(html: string): Area[] {
  const areas: Area[] = []
  const seen = new Set<string>()

  // Links of the form /dubai/{slug}/buildings or absolute version
  const re = /href="(?:https:\/\/propsearch\.ae)?\/dubai\/([a-z0-9][a-z0-9-]*)\/buildings"/g
  let m: RegExpExecArray | null

  while ((m = re.exec(html)) !== null) {
    const slug = m[1]
    if (seen.has(slug) || NAV_SLUGS.has(slug)) continue
    seen.add(slug)

    // Grab surrounding text (~300 chars) to extract display name
    const window = html.slice(Math.max(0, m.index - 200), m.index + 300)
    // Try to find h2/h3/strong/p near the link
    const nameMatch =
      window.match(/<h[23][^>]*>\s*([^<]{3,80})\s*<\/h[23]>/i) ||
      window.match(/<strong[^>]*>\s*([^<]{3,80})\s*<\/strong>/i) ||
      window.match(/<p[^>]*class="[^"]*(?:title|name|heading)[^"]*"[^>]*>\s*([^<]{3,80})\s*<\/p>/i)

    const name = nameMatch
      ? nameMatch[1].trim().replace(/\s+/g, ' ')
      : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    areas.push({ slug, name })
  }

  return areas
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allAreas: Area[] = []

  for (const page of PAGES) {
    const html = await fetchHtml(`${BASE}/dubai/buildings?page=${page}`)
    if (!html) continue
    const areas = extractAreas(html)
    allAreas.push(...areas)
    if (page < PAGES[PAGES.length - 1]) await sleep(DELAY_MS)
  }

  if (allAreas.length === 0) {
    return NextResponse.json({ error: 'No areas extracted' }, { status: 500 })
  }

  // Dedupe across pages
  const seen = new Set<string>()
  const unique = allAreas.filter(a => seen.has(a.slug) ? false : (seen.add(a.slug), true))

  let upserted = 0
  for (const area of unique) {
    await sql`
      INSERT INTO prop_areas (slug, name, last_scraped_at)
      VALUES (${area.slug}, ${area.name}, NOW())
      ON CONFLICT (slug) DO UPDATE SET
        name            = EXCLUDED.name,
        last_scraped_at = NOW()
    `
    upserted++
  }

  return NextResponse.json({ ok: true, areas_upserted: upserted, areas: unique.map(a => a.slug) })
}
