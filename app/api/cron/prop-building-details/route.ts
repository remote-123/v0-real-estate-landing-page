/**
 * Stage 3 — Scrape individual building detail pages.
 *
 * For each building in prop_buildings not yet in prop_building_details,
 * fetches https://propsearch.ae/dubai/{building-slug} and extracts:
 * name, developer, floors, units, type, amenities, completion, description, etc.
 *
 * Trigger: GET /api/cron/prop-building-details
 * Auth:    Bearer CRON_SECRET
 * Cadence: run repeatedly (every few hours) until all buildings are scraped,
 *          then daily to catch new buildings from Stage 2.
 * Options:
 *   ?batch=80       how many buildings to process per run (default 80)
 *   ?area=dubai-silicon-oasis  only process buildings from this area
 *   ?rescrape=true  re-scrape already-detailed buildings (update mode)
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const maxDuration = 300

const BASE = 'https://propsearch.ae'
const DELAY_MS = 1500

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchHtml(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)', Accept: 'text/html' },
        signal: AbortSignal.timeout(20_000),
      })
      if (res.status === 404) return null
      if (res.status === 429) { await sleep(Math.pow(2, attempt + 1) * 1000); continue }
      if (!res.ok) return null
      return res.text()
    } catch {
      if (attempt === 2) return null
      await sleep(2000)
    }
  }
  return null
}

// ── Detail extraction ──────────────────────────────────────────────────────────

interface BuildingDetail {
  building_slug:      string
  area_slug:          string
  name:               string | null
  developer:          string | null
  master_developer:   string | null
  building_type:      string | null
  status:             string | null
  completion_year:    number | null
  total_floors:       number | null
  total_units:        number | null
  property_types:     string | null
  amenities:          string | null
  is_freehold:        boolean | null
  service_charge_psf: number | null
  project_value_aed:  bigint | null
  description:        string | null
}

function extractDetail(html: string, slug: string, areaSlug: string): BuildingDetail {
  // Strip scripts/styles/tags for text-level matching
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ').trim()

  // Name — h1
  const nameMatch = html.match(/<h1[^>]*>\s*([^<]{3,120})\s*<\/h1>/i)
  const name = nameMatch ? nameMatch[1].trim() : null

  // Building type — "Residential building (Mid-rise building)" etc.
  let building_type: string | null = null
  const typeMatch = text.match(/(?:Residential|Commercial|Mixed[- ]use|Hotel|Serviced)\s+(?:building|tower|complex|development|apartment)[^.]{0,60}/i)
  if (typeMatch) building_type = typeMatch[0].trim().slice(0, 120)

  // Developer
  let developer: string | null = null
  const devPatterns = [
    /Developer[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{2,60})/,
    /Developed\s+by[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{2,60})/i,
    /By\s+([A-Z][A-Za-z][A-Za-z0-9\s&.,'-]{2,50})(?:\s*[|\n])/,
  ]
  for (const re of devPatterns) {
    const m = text.match(re)
    if (m) { developer = m[1].trim().replace(/\s+/g, ' '); break }
  }

  // Master developer
  let master_developer: string | null = null
  const masterMatch = text.match(/Master\s+[Dd]eveloper[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{2,60})/)
  if (masterMatch) master_developer = masterMatch[1].trim()

  // Status
  let status: string | null = null
  const statusMatch = text.match(/\b(Complete|Under\s+(?:Construction|Development)|Planned|Cancelled|Envisioned)\b/i)
  if (statusMatch) status = statusMatch[1].toLowerCase().replace(/\s+/g, '_')

  // Completion year
  let completion_year: number | null = null
  const yearPatterns = [
    /(?:Completion|Handover|Completed|Expected|Ready)\s*(?:Date|Year)?[:\s]+(?:[A-Za-z]+\s+)?(20[12][0-9])/i,
    /(?:Completion|Handover)\s*[:\s]*(20[12][0-9])/i,
  ]
  for (const re of yearPatterns) {
    const m = text.match(re)
    if (m) { completion_year = parseInt(m[1], 10); break }
  }
  // Fallback: construction timeline end year e.g. "May 2023 - July 2024"
  if (!completion_year) {
    const timelineMatch = text.match(/\d{4}\s*[-–]\s*(?:[A-Za-z]+\s+)?(20[12][0-9])/)
    if (timelineMatch) completion_year = parseInt(timelineMatch[1], 10)
  }

  // Total floors
  let total_floors: number | null = null
  const floorPatterns = [
    /(\d+)\s*(?:floors?|storey|storeys|levels?)/i,
    /(?:floors?|storeys?|levels?)[:\s]+(\d+)/i,
    /G\+(\d+)/i,
    /Storeys?[:\s]*(\d+)/i,
  ]
  for (const re of floorPatterns) {
    const m = text.match(re)
    if (m) { total_floors = parseInt(m[1], 10); break }
  }

  // Total units
  let total_units: number | null = null
  const unitPatterns = [
    /(\d[\d,]+)\s*(?:total\s+)?(?:units?|apartments?|residences?|homes?)/i,
    /(?:Units?|Apartments?)[:\s]+(\d[\d,]+)/i,
    /Units?\s*:?\s*(\d[\d,]+)\s*total/i,
  ]
  for (const re of unitPatterns) {
    const m = text.match(re)
    if (m) { total_units = parseInt(m[1].replace(/,/g, ''), 10); break }
  }

  // Property types (bedroom mix)
  const typeKeywords: [RegExp, string][] = [
    [/\bstudio\b/i, 'Studio'],
    [/\b1\s*(?:br|bed)\b/i, '1BR'],
    [/\b2\s*(?:br|bed)\b/i, '2BR'],
    [/\b3\s*(?:br|bed)\b/i, '3BR'],
    [/\b4\s*(?:br|bed)\b/i, '4BR'],
    [/\b5\+?\s*(?:br|bed)\b/i, '5BR+'],
    [/\bpenthouse\b/i, 'Penthouse'],
    [/\btownhouse\b/i, 'Townhouse'],
    [/\bvilla\b/i, 'Villa'],
    [/\bduplex\b/i, 'Duplex'],
    [/\boffice\b/i, 'Office'],
    [/\bshop\b|\bretail\b/i, 'Retail'],
  ]
  const foundTypes = typeKeywords.filter(([re]) => re.test(text)).map(([, l]) => l)
  const property_types = foundTypes.length > 0 ? foundTypes.join(', ') : null

  // Amenities
  const amenityKeywords: [RegExp, string][] = [
    [/\bswimming\s*pool\b|\bpool\b/i, 'Pool'],
    [/\bgym\b|\bfitness\s*cen(?:ter|tre)\b/i, 'Gym'],
    [/\bparking\b/i, 'Parking'],
    [/\bconcierge\b/i, 'Concierge'],
    [/\bspa\b/i, 'Spa'],
    [/\bjacuzzi\b|\bwhirlpool\b/i, 'Jacuzzi'],
    [/\bkids?\s*(?:play|club)\b|\bchildren.*play/i, 'Kids Play Area'],
    [/\bbbq\b|\bbarbecue\b/i, 'BBQ'],
    [/\btennis\s*court\b/i, 'Tennis Court'],
    [/\bsauna\b/i, 'Sauna'],
    [/\bsecurity\b/i, 'Security'],
    [/\bjogging\s*track\b|\brunning\s*track\b/i, 'Jogging Track'],
    [/\bbeach\s*access\b|\bprivate\s*beach\b/i, 'Beach Access'],
    [/\brooftop\b/i, 'Rooftop'],
    [/\bbusiness\s*cen(?:ter|tre)\b/i, 'Business Center'],
    [/\bcommunity\s*(?:hall|room|center)\b/i, 'Community Room'],
    [/\bhealth\s*club\b/i, 'Health Club'],
    [/\bco-?working\b|\bwork\s*(?:lounge|space)\b/i, 'Co-Working'],
    [/\bpet[- ]friendly\b|\bpet\s*park\b/i, 'Pet Friendly'],
    [/\bcycle\s*track\b|\bbicycle\b/i, 'Cycling Track'],
  ]
  const foundAmenities = amenityKeywords.filter(([re]) => re.test(text)).map(([, l]) => l)
  const amenities = foundAmenities.length > 0 ? foundAmenities.join(', ') : null

  // Freehold
  const is_freehold = /\bfreehold\b/i.test(text) ? true : /\bleasehold\b/i.test(text) ? false : null

  // Service charge (AED/sqft)
  let service_charge_psf: number | null = null
  const scMatch = text.match(/service\s*charge[s]?\s*[:\s]+(?:AED\s*)?([\d.,]+)\s*(?:\/\s*sqft|per\s*sqft|psf)/i)
    || text.match(/([\d.,]+)\s*(?:AED\s*)?(?:\/\s*sqft|per\s*sqft)\s*(?:service\s*charge)?/i)
  if (scMatch) {
    const v = parseFloat(scMatch[1].replace(/,/g, ''))
    if (v > 0 && v < 100) service_charge_psf = v  // sanity check — AED/sqft range
  }

  // Project value (AED)
  let project_value_aed: bigint | null = null
  const pvMatch = text.match(/(?:Project\s*[Vv]alue|[Vv]alued?\s*at|Total\s*[Vv]alue)[:\s]+AED\s*([\d,]+(?:\.\d+)?)\s*(million|billion|M|B|mn|bn)?/i)
    || text.match(/AED\s*([\d,]+(?:\.\d+)?)\s*(million|billion|M|B|mn|bn)/i)
  if (pvMatch) {
    const num = parseFloat(pvMatch[1].replace(/,/g, ''))
    const mult = /billion|B\b|bn/i.test(pvMatch[2] ?? '') ? 1_000_000_000n
      : /million|M\b|mn/i.test(pvMatch[2] ?? '') ? 1_000_000n : 1n
    try { project_value_aed = BigInt(Math.round(num)) * mult } catch { /* ignore */ }
  }

  // Description — first substantial paragraph (80–400 chars, not boilerplate)
  let description: string | null = null
  const paraRe = /<p[^>]*>\s*([^<]{80,600})\s*<\/p>/g
  let pm: RegExpExecArray | null
  while ((pm = paraRe.exec(html)) !== null) {
    const candidate = pm[1].replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (/cookie|privacy|copyright|subscribe|newsletter|terms/i.test(candidate)) continue
    if (candidate.length >= 80) {
      description = candidate.slice(0, 400)
      break
    }
  }

  return {
    building_slug: slug,
    area_slug: areaSlug,
    name,
    developer,
    master_developer,
    building_type,
    status,
    completion_year,
    total_floors,
    total_units,
    property_types,
    amenities,
    is_freehold,
    service_charge_psf,
    project_value_aed,
    description,
  }
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const batchSize  = Math.min(parseInt(searchParams.get('batch') ?? '80', 10), 150)
  const targetArea = searchParams.get('area')
  const rescrape   = searchParams.get('rescrape') === 'true'

  // Fetch next batch of unscraped buildings
  type PendingRow = { building_slug: string; area_slug: string }
  let pending: PendingRow[]

  if (rescrape) {
    pending = targetArea
      ? await sql<PendingRow[]>`
          SELECT building_slug, area_slug FROM prop_buildings
          WHERE area_slug = ${targetArea}
          ORDER BY building_slug
          LIMIT ${batchSize}
        `
      : await sql<PendingRow[]>`
          SELECT building_slug, area_slug FROM prop_buildings
          ORDER BY building_slug
          LIMIT ${batchSize}
        `
  } else {
    pending = targetArea
      ? await sql<PendingRow[]>`
          SELECT pb.building_slug, pb.area_slug
          FROM prop_buildings pb
          LEFT JOIN prop_building_details pbd ON pb.building_slug = pbd.building_slug
          WHERE pb.area_slug = ${targetArea}
            AND pbd.building_slug IS NULL
          ORDER BY pb.building_slug
          LIMIT ${batchSize}
        `
      : await sql<PendingRow[]>`
          SELECT pb.building_slug, pb.area_slug
          FROM prop_buildings pb
          LEFT JOIN prop_building_details pbd ON pb.building_slug = pbd.building_slug
          WHERE pbd.building_slug IS NULL
          ORDER BY pb.building_slug
          LIMIT ${batchSize}
        `
  }

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, message: 'All buildings already scraped', scraped: 0 })
  }

  let scraped = 0
  let failed = 0
  const errors: string[] = []

  for (const row of pending) {
    const html = await fetchHtml(`${BASE}/dubai/${row.building_slug}`)
    if (!html) {
      failed++
      errors.push(row.building_slug)
      await sleep(DELAY_MS)
      continue
    }

    try {
      const d = extractDetail(html, row.building_slug, row.area_slug)
      await sql`
        INSERT INTO prop_building_details (
          building_slug, area_slug, name, developer, master_developer,
          building_type, status, completion_year, total_floors, total_units,
          property_types, amenities, is_freehold, service_charge_psf,
          project_value_aed, description, scraped_at, updated_at
        ) VALUES (
          ${d.building_slug}, ${d.area_slug}, ${d.name}, ${d.developer}, ${d.master_developer},
          ${d.building_type}, ${d.status}, ${d.completion_year}, ${d.total_floors}, ${d.total_units},
          ${d.property_types}, ${d.amenities}, ${d.is_freehold}, ${d.service_charge_psf},
          ${d.project_value_aed !== null ? String(d.project_value_aed) : null},
          ${d.description}, NOW(), NOW()
        )
        ON CONFLICT (building_slug) DO UPDATE SET
          area_slug          = EXCLUDED.area_slug,
          name               = EXCLUDED.name,
          developer          = EXCLUDED.developer,
          master_developer   = EXCLUDED.master_developer,
          building_type      = EXCLUDED.building_type,
          status             = EXCLUDED.status,
          completion_year    = EXCLUDED.completion_year,
          total_floors       = EXCLUDED.total_floors,
          total_units        = EXCLUDED.total_units,
          property_types     = EXCLUDED.property_types,
          amenities          = EXCLUDED.amenities,
          is_freehold        = EXCLUDED.is_freehold,
          service_charge_psf = EXCLUDED.service_charge_psf,
          project_value_aed  = EXCLUDED.project_value_aed,
          description        = EXCLUDED.description,
          updated_at         = NOW()
      `
      scraped++
    } catch (err: any) {
      failed++
      errors.push(`${row.building_slug}: ${err.message?.slice(0, 80)}`)
    }

    await sleep(DELAY_MS)
  }

  // Count remaining
  const remaining = await sql<{ count: string }[]>`
    SELECT COUNT(*) AS count
    FROM prop_buildings pb
    LEFT JOIN prop_building_details pbd ON pb.building_slug = pbd.building_slug
    WHERE pbd.building_slug IS NULL
  `

  return NextResponse.json({
    ok: true,
    scraped,
    failed,
    remaining: parseInt(remaining[0]?.count ?? '0', 10),
    errors: errors.length > 0 ? errors : undefined,
  })
}
