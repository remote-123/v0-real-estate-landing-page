/**
 * prop-buildings heartbeat — local CLI runner for all 3 scraping stages.
 *
 * Run all stages:
 *   npx tsx --env-file=.env.local scripts/prop-buildings-heartbeat.ts
 *
 * Single stage:
 *   npx tsx --env-file=.env.local scripts/prop-buildings-heartbeat.ts --stage=1
 *   npx tsx --env-file=.env.local scripts/prop-buildings-heartbeat.ts --stage=2
 *   npx tsx --env-file=.env.local scripts/prop-buildings-heartbeat.ts --stage=3
 *
 * Filter by area (stage 2 + 3):
 *   npx tsx --env-file=.env.local scripts/prop-buildings-heartbeat.ts --stage=3 --area=dubai-silicon-oasis
 *
 * Limit requests (useful for testing):
 *   npx tsx --env-file=.env.local scripts/prop-buildings-heartbeat.ts --stage=3 --limit=20
 *
 * Re-scrape already-detailed buildings:
 *   npx tsx --env-file=.env.local scripts/prop-buildings-heartbeat.ts --stage=3 --rescrape
 */

import { sql } from "./ingest/db-client"

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (prefix: string) => args.find(a => a.startsWith(prefix))?.slice(prefix.length) ?? null

const STAGE    = getArg('--stage=')   // '1' | '2' | '3' | null (all)
const AREA     = getArg('--area=')    // e.g. 'dubai-silicon-oasis'
const LIMIT    = parseInt(getArg('--limit=') ?? 'Infinity', 10)
const RESCRAPE = args.includes('--rescrape')

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE     = 'https://propsearch.ae'
const DELAY_MS = 1500

const NAV_SLUGS = new Set([
  'buildings', 'dubai', 'map', 'similar', 'properties', 'area-guides',
  'properties-for-sale', 'properties-to-rent', 'off-plan', 'new-projects',
  'agents', 'developers', 'blog', 'contact', 'search', 'projects',
  'branded-residences', 'luxury', 'villas', 'apartments', 'townhouses',
])

// ── Shared helpers ────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchHtml(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)', Accept: 'text/html' },
        signal: AbortSignal.timeout(20_000),
      })
      if (res.status === 404) return null
      if (res.status === 429) {
        const wait = Math.pow(2, attempt + 1) * 1000
        console.warn(`  [429] backing off ${wait}ms — ${url}`)
        await sleep(wait)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    } catch (err: any) {
      if (attempt === 2) { console.warn(`  [skip] ${url} — ${err.message}`); return null }
      await sleep(2000)
    }
  }
  return null
}

function toTitleCase(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Stage 1: area list ────────────────────────────────────────────────────────

interface Area { slug: string; name: string }

function extractAreas(html: string): Area[] {
  const areas: Area[] = []
  const seen = new Set<string>()
  const re = /href="(?:https:\/\/propsearch\.ae)?\/dubai\/([a-z0-9][a-z0-9-]*)\/buildings"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const slug = m[1]
    if (seen.has(slug) || NAV_SLUGS.has(slug)) continue
    seen.add(slug)
    const window = html.slice(Math.max(0, m.index - 200), m.index + 300)
    const nameMatch =
      window.match(/<h[23][^>]*>\s*([^<]{3,80})\s*<\/h[23]>/i) ||
      window.match(/<strong[^>]*>\s*([^<]{3,80})\s*<\/strong>/i)
    const name = nameMatch ? nameMatch[1].trim().replace(/\s+/g, ' ') : toTitleCase(slug)
    areas.push({ slug, name })
  }
  return areas
}

async function stage1() {
  console.log('\n═══ Stage 1: area list ═══')
  const allAreas: Area[] = []

  for (const page of [1, 2]) {
    const url = `${BASE}/dubai/buildings?page=${page}`
    process.stdout.write(`  Fetching ${url} ... `)
    const html = await fetchHtml(url)
    if (!html) { console.log('FAILED'); continue }
    const areas = extractAreas(html)
    console.log(`${areas.length} areas`)
    allAreas.push(...areas)
    if (page === 1) await sleep(DELAY_MS)
  }

  // Dedupe
  const seen = new Set<string>()
  const unique = allAreas.filter(a => seen.has(a.slug) ? false : (seen.add(a.slug), true))

  let upserted = 0
  for (const area of unique) {
    await sql`
      INSERT INTO prop_areas (slug, name, last_scraped_at)
      VALUES (${area.slug}, ${area.name}, NOW())
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, last_scraped_at = NOW()
    `
    upserted++
    process.stdout.write(`  ✓ ${area.slug}\n`)
  }

  console.log(`\nStage 1 done — ${upserted} areas upserted`)
  return unique
}

// ── Stage 2: buildings per area ───────────────────────────────────────────────

type BuildingStatus = 'complete' | 'under_construction' | 'planned' | 'cancelled' | 'unknown'

function parseStatus(text: string): BuildingStatus {
  const t = text.toLowerCase()
  if (t.includes('(cancelled)') || t.includes('(canceled)')) return 'cancelled'
  if (t.includes('complete')) return 'complete'
  if (t.includes('under development') || t.includes('under construction')) return 'under_construction'
  if (t.includes('planned') || t.includes('envisioned')) return 'planned'
  return 'unknown'
}

interface ScrapedBuilding { building_slug: string; building_name: string; status: BuildingStatus }

function extractBuildings(html: string, blocked: Set<string>): ScrapedBuilding[] {
  const buildings: ScrapedBuilding[] = []
  const seen = new Set<string>()
  const re = /href="https:\/\/propsearch\.ae\/dubai\/([a-z0-9][a-z0-9-]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const slug = m[1]
    if (seen.has(slug) || blocked.has(slug)) continue
    seen.add(slug)
    const window = html.slice(m.index, m.index + 600)
    const spanRe = /<span[^>]*>([^<]{4,80})<\/span>/g
    let statusText = ''
    let sm: RegExpExecArray | null
    while ((sm = spanRe.exec(window)) !== null) {
      const c = sm[1].trim()
      if (/complete|under dev|under con|planned|envisioned|cancelled|canceled/i.test(c)) {
        statusText = c; break
      }
    }
    buildings.push({ building_slug: slug, building_name: toTitleCase(slug), status: parseStatus(statusText) })
  }
  return buildings
}

async function stage2(areas?: Area[]) {
  console.log('\n═══ Stage 2: buildings per area ═══')

  if (!areas) {
    const rows = await sql<{ slug: string; name: string }[]>`SELECT slug, name FROM prop_areas ORDER BY slug`
    areas = rows
  }

  if (AREA) areas = areas.filter(a => a.slug === AREA)
  if (areas.length === 0) { console.log('No matching areas.'); return }

  const blocked = new Set([...NAV_SLUGS, ...areas.map(a => a.slug)])
  let totalUpserted = 0
  let requestCount = 0

  for (let i = 0; i < areas.length; i++) {
    if (requestCount >= LIMIT) { console.log(`Limit ${LIMIT} reached`); break }
    const area = areas[i]
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${areas.length}] ${area.slug.padEnd(40)}`)

    const html = await fetchHtml(`${BASE}/dubai/${area.slug}/buildings`)
    requestCount++
    if (!html) { console.log('FAILED'); await sleep(DELAY_MS); continue }

    const buildings = extractBuildings(html, blocked)
    let areaUpserted = 0

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
        areaUpserted++
      } catch { /* skip bad rows */ }
    }

    await sql`
      UPDATE prop_areas SET total_buildings = ${buildings.length}, last_scraped_at = NOW()
      WHERE slug = ${area.slug}
    `

    totalUpserted += areaUpserted
    console.log(`${buildings.length} buildings (${areaUpserted} upserted)`)
    await sleep(DELAY_MS)
  }

  console.log(`\nStage 2 done — ${totalUpserted} buildings upserted`)
}

// ── Stage 3: building detail pages ───────────────────────────────────────────

interface BuildingDetail {
  building_slug: string; area_slug: string; name: string | null
  developer: string | null; master_developer: string | null
  building_type: string | null; status: string | null
  completion_year: number | null; total_floors: number | null
  total_units: number | null; property_types: string | null
  amenities: string | null; is_freehold: boolean | null
  service_charge_psf: number | null; project_value_aed: bigint | null
  description: string | null
}

function extractDetail(html: string, slug: string, areaSlug: string): BuildingDetail {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ').trim()

  const nameMatch = html.match(/<h1[^>]*>\s*([^<]{3,120})\s*<\/h1>/i)
  const name = nameMatch ? nameMatch[1].trim() : null

  const typeMatch = text.match(/(?:Residential|Commercial|Mixed[- ]use|Hotel|Serviced)\s+(?:building|tower|complex|development|apartment)[^.]{0,60}/i)
  const building_type = typeMatch ? typeMatch[0].trim().slice(0, 120) : null

  let developer: string | null = null
  for (const re of [
    /Developer[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{2,60})/,
    /Developed\s+by[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{2,60})/i,
  ]) {
    const m = text.match(re)
    if (m) { developer = m[1].trim().replace(/\s+/g, ' '); break }
  }

  const masterMatch = text.match(/Master\s+[Dd]eveloper[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{2,60})/)
  const master_developer = masterMatch ? masterMatch[1].trim() : null

  const statusMatch = text.match(/\b(Complete|Under\s+(?:Construction|Development)|Planned|Cancelled)\b/i)
  const status = statusMatch ? statusMatch[1].toLowerCase().replace(/\s+/g, '_') : null

  let completion_year: number | null = null
  for (const re of [
    /(?:Completion|Handover|Completed|Expected|Ready)\s*(?:Date|Year)?[:\s]+(?:[A-Za-z]+\s+)?(20[12][0-9])/i,
    /\d{4}\s*[-–]\s*(?:[A-Za-z]+\s+)?(20[12][0-9])/,
  ]) {
    const m = text.match(re)
    if (m) { completion_year = parseInt(m[1], 10); break }
  }

  let total_floors: number | null = null
  for (const re of [
    /Storeys?[:\s]*(\d+)/i,
    /(\d+)\s*(?:floors?|storey|storeys|levels?)/i,
    /G\+(\d+)/i,
  ]) {
    const m = text.match(re)
    if (m) { total_floors = parseInt(m[1], 10); break }
  }

  let total_units: number | null = null
  for (const re of [
    /Units?\s*:?\s*(\d[\d,]+)\s*total/i,
    /(\d[\d,]+)\s*(?:total\s+)?(?:units?|apartments?|residences?)/i,
    /(?:Units?|Apartments?)[:\s]+(\d[\d,]+)/i,
  ]) {
    const m = text.match(re)
    if (m) { total_units = parseInt(m[1].replace(/,/g, ''), 10); break }
  }

  const typeKeywords: [RegExp, string][] = [
    [/\bstudio\b/i, 'Studio'], [/\b1\s*(?:br|bed)\b/i, '1BR'],
    [/\b2\s*(?:br|bed)\b/i, '2BR'], [/\b3\s*(?:br|bed)\b/i, '3BR'],
    [/\b4\s*(?:br|bed)\b/i, '4BR'], [/\b5\+?\s*(?:br|bed)\b/i, '5BR+'],
    [/\bpenthouse\b/i, 'Penthouse'], [/\btownhouse\b/i, 'Townhouse'],
    [/\bvilla\b/i, 'Villa'], [/\bduplex\b/i, 'Duplex'],
    [/\boffice\b/i, 'Office'], [/\bshop\b|\bretail\b/i, 'Retail'],
  ]
  const foundTypes = typeKeywords.filter(([re]) => re.test(text)).map(([, l]) => l)
  const property_types = foundTypes.length ? foundTypes.join(', ') : null

  const amenityKw: [RegExp, string][] = [
    [/\bswimming\s*pool\b|\bpool\b/i, 'Pool'],
    [/\bgym\b|\bfitness\s*cen(?:ter|tre)\b/i, 'Gym'],
    [/\bparking\b/i, 'Parking'], [/\bconcierge\b/i, 'Concierge'],
    [/\bspa\b/i, 'Spa'], [/\bjacuzzi\b|\bwhirlpool\b/i, 'Jacuzzi'],
    [/\bkids?\s*(?:play|club)\b/i, 'Kids Play'],
    [/\bbbq\b|\bbarbecue\b/i, 'BBQ'], [/\btennis\s*court\b/i, 'Tennis'],
    [/\bsauna\b/i, 'Sauna'], [/\bsecurity\b/i, 'Security'],
    [/\bjogging\s*track\b/i, 'Jogging Track'],
    [/\bbeach\s*access\b|\bprivate\s*beach\b/i, 'Beach Access'],
    [/\brooftop\b/i, 'Rooftop'],
    [/\bbusiness\s*cen(?:ter|tre)\b/i, 'Business Center'],
    [/\bcommunity\s*(?:hall|room)\b/i, 'Community Room'],
    [/\bhealth\s*club\b/i, 'Health Club'],
    [/\bco-?working\b/i, 'Co-Working'],
    [/\bpet[- ]friendly\b/i, 'Pet Friendly'],
    [/\bcycle\s*track\b|\bbicycle\b/i, 'Cycling'],
  ]
  const foundAmenities = amenityKw.filter(([re]) => re.test(text)).map(([, l]) => l)
  const amenities = foundAmenities.length ? foundAmenities.join(', ') : null

  const is_freehold = /\bfreehold\b/i.test(text) ? true : /\bleasehold\b/i.test(text) ? false : null

  let service_charge_psf: number | null = null
  const scMatch = text.match(/service\s*charge[s]?\s*[:\s]+(?:AED\s*)?([\d.,]+)\s*(?:\/\s*sqft|per\s*sqft|psf)/i)
  if (scMatch) {
    const v = parseFloat(scMatch[1].replace(/,/g, ''))
    if (v > 0 && v < 100) service_charge_psf = v
  }

  let project_value_aed: bigint | null = null
  const pvMatch = text.match(/(?:Project\s*[Vv]alue|[Vv]alued?\s*at)[:\s]+AED\s*([\d,]+(?:\.\d+)?)\s*(million|billion|M|B)?/i)
    || text.match(/AED\s*([\d,]+(?:\.\d+)?)\s*(million|billion|M\b|B\b)/i)
  if (pvMatch) {
    const num = parseFloat(pvMatch[1].replace(/,/g, ''))
    const mult = /billion|B\b/i.test(pvMatch[2] ?? '') ? 1_000_000_000n : /million|M\b/i.test(pvMatch[2] ?? '') ? 1_000_000n : 1n
    try { project_value_aed = BigInt(Math.round(num)) * mult } catch { /* ignore */ }
  }

  let description: string | null = null
  const paraRe = /<p[^>]*>\s*([^<]{80,600})\s*<\/p>/g
  let pm: RegExpExecArray | null
  while ((pm = paraRe.exec(html)) !== null) {
    const c = pm[1].replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (/cookie|privacy|copyright|subscribe|newsletter|terms/i.test(c)) continue
    if (c.length >= 80) { description = c.slice(0, 400); break }
  }

  return {
    building_slug: slug, area_slug: areaSlug, name, developer, master_developer,
    building_type, status, completion_year, total_floors, total_units,
    property_types, amenities, is_freehold, service_charge_psf,
    project_value_aed, description,
  }
}

async function stage3() {
  console.log('\n═══ Stage 3: building details ═══')

  type PendingRow = { building_slug: string; area_slug: string }
  let query: PendingRow[]

  if (RESCRAPE) {
    query = AREA
      ? await sql<PendingRow[]>`SELECT building_slug, area_slug FROM prop_buildings WHERE area_slug = ${AREA} ORDER BY building_slug LIMIT ${isFinite(LIMIT) ? LIMIT : 99999}`
      : await sql<PendingRow[]>`SELECT building_slug, area_slug FROM prop_buildings ORDER BY building_slug LIMIT ${isFinite(LIMIT) ? LIMIT : 99999}`
  } else {
    query = AREA
      ? await sql<PendingRow[]>`
          SELECT pb.building_slug, pb.area_slug FROM prop_buildings pb
          LEFT JOIN prop_building_details pbd ON pb.building_slug = pbd.building_slug
          WHERE pb.area_slug = ${AREA} AND pbd.building_slug IS NULL
          ORDER BY pb.building_slug LIMIT ${isFinite(LIMIT) ? LIMIT : 99999}
        `
      : await sql<PendingRow[]>`
          SELECT pb.building_slug, pb.area_slug FROM prop_buildings pb
          LEFT JOIN prop_building_details pbd ON pb.building_slug = pbd.building_slug
          WHERE pbd.building_slug IS NULL
          ORDER BY pb.building_slug LIMIT ${isFinite(LIMIT) ? LIMIT : 99999}
        `
  }

  if (query.length === 0) { console.log('  Nothing to scrape.'); return }

  const total = query.length
  console.log(`  ${total} buildings to process\n`)

  let done = 0; let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < query.length; i++) {
    const row = query[i]
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const eta = done > 0 ? Math.round(((Date.now() - startTime) / done) * (total - i) / 1000) : '?'
    process.stdout.write(`  [${String(i + 1).padStart(5)}/${total}] ${row.building_slug.padEnd(50)} ${elapsed}s elapsed  ETA ~${eta}s\r`)

    const html = await fetchHtml(`${BASE}/dubai/${row.building_slug}`)
    if (!html) { failed++; await sleep(DELAY_MS); continue }

    try {
      const d = extractDetail(html, row.building_slug, row.area_slug)
      const fieldCount = [d.name, d.developer, d.completion_year, d.total_floors, d.total_units, d.property_types, d.amenities, d.description].filter(Boolean).length

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
          area_slug = EXCLUDED.area_slug, name = EXCLUDED.name,
          developer = EXCLUDED.developer, master_developer = EXCLUDED.master_developer,
          building_type = EXCLUDED.building_type, status = EXCLUDED.status,
          completion_year = EXCLUDED.completion_year, total_floors = EXCLUDED.total_floors,
          total_units = EXCLUDED.total_units, property_types = EXCLUDED.property_types,
          amenities = EXCLUDED.amenities, is_freehold = EXCLUDED.is_freehold,
          service_charge_psf = EXCLUDED.service_charge_psf,
          project_value_aed = EXCLUDED.project_value_aed,
          description = EXCLUDED.description, updated_at = NOW()
      `
      done++
      process.stdout.write(`  [${String(i + 1).padStart(5)}/${total}] ${row.building_slug.padEnd(50)} ${fieldCount}/8 fields        \n`)
    } catch (err: any) {
      failed++
      console.warn(`\n  [warn] ${row.building_slug}: ${err.message?.slice(0, 80)}`)
    }

    await sleep(DELAY_MS)
  }

  console.log(`\nStage 3 done — ${done} scraped, ${failed} failed`)
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  console.log('prop-buildings heartbeat')
  console.log(`stage=${STAGE ?? 'all'}  area=${AREA ?? 'all'}  limit=${LIMIT}  rescrape=${RESCRAPE}`)

  try {
    if (STAGE === 'count') {
      const [a, b, d] = await Promise.all([
        sql`SELECT COUNT(*) as c FROM prop_areas`,
        sql`SELECT COUNT(*) as c FROM prop_buildings`,
        sql`SELECT COUNT(*) as c FROM prop_building_details`,
      ])
      console.log(`  prop_areas:           ${a[0].c}`)
      console.log(`  prop_buildings:       ${b[0].c}`)
      console.log(`  prop_building_details:${d[0].c}`)
      const remaining = Number(b[0].c) - Number(d[0].c)
      console.log(`  remaining (stage 3):  ${remaining}`)
    } else if (!STAGE || STAGE === '1') { const areas = await stage1(); if (!STAGE) await stage2(areas) }
    if (STAGE === '2') await stage2()
    if (!STAGE) await stage3()
    if (STAGE === '3') await stage3()
  } finally {
    await sql.end()
  }

  console.log('\nDone.')
}

main().catch(err => { console.error(err); process.exit(1) })
