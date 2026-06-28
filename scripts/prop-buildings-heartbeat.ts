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
import { extractDetail, type BuildingDetail } from "./ingest/propsearch-extract"

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
      const fieldCount = [d.name, d.developer, d.completion_year, d.total_floors, d.total_units, d.property_types, d.amenities, d.description, d.transport, d.nearby_pois, d.nearby_schools].filter(Boolean).length

      await sql`
        INSERT INTO prop_building_details (
          building_slug, area_slug, name, developer, master_developer,
          architect, contractor, building_type, status, completion_year,
          construction_start, total_floors, total_units,
          property_types, amenities, is_freehold, service_charge_psf,
          project_value_aed, launch_price_aed, description,
          transport, milestones, nearby_pois, nearby_schools,
          nearby_hotels, nearby_neighbourhoods, payment_plan,
          scraped_at, updated_at
        ) VALUES (
          ${d.building_slug}, ${d.area_slug}, ${d.name}, ${d.developer}, ${d.master_developer},
          ${d.architect}, ${d.contractor}, ${d.building_type}, ${d.status}, ${d.completion_year},
          ${d.construction_start}, ${d.total_floors}, ${d.total_units},
          ${d.property_types}, ${d.amenities}, ${d.is_freehold}, ${d.service_charge_psf},
          ${d.project_value_aed !== null ? String(d.project_value_aed) : null},
          ${d.launch_price_aed !== null ? String(d.launch_price_aed) : null},
          ${d.description},
          ${d.transport !== null ? sql`${JSON.stringify(d.transport)}::jsonb` : null},
          ${d.milestones !== null ? sql`${JSON.stringify(d.milestones)}::jsonb` : null},
          ${d.nearby_pois !== null ? sql`${JSON.stringify(d.nearby_pois)}::jsonb` : null},
          ${d.nearby_schools !== null ? sql`${JSON.stringify(d.nearby_schools)}::jsonb` : null},
          ${d.nearby_hotels !== null ? sql`${JSON.stringify(d.nearby_hotels)}::jsonb` : null},
          ${d.nearby_neighbourhoods !== null ? sql`${JSON.stringify(d.nearby_neighbourhoods)}::jsonb` : null},
          ${d.payment_plan !== null ? sql`${JSON.stringify(d.payment_plan)}::jsonb` : null},
          NOW(), NOW()
        )
        ON CONFLICT (building_slug) DO UPDATE SET
          area_slug = EXCLUDED.area_slug, name = EXCLUDED.name,
          developer = EXCLUDED.developer, master_developer = EXCLUDED.master_developer,
          architect = EXCLUDED.architect, contractor = EXCLUDED.contractor,
          building_type = EXCLUDED.building_type, status = EXCLUDED.status,
          completion_year = EXCLUDED.completion_year, construction_start = EXCLUDED.construction_start,
          total_floors = EXCLUDED.total_floors, total_units = EXCLUDED.total_units,
          property_types = EXCLUDED.property_types, amenities = EXCLUDED.amenities,
          is_freehold = EXCLUDED.is_freehold, service_charge_psf = EXCLUDED.service_charge_psf,
          project_value_aed = EXCLUDED.project_value_aed, launch_price_aed = EXCLUDED.launch_price_aed,
          description = EXCLUDED.description,
          transport = EXCLUDED.transport, milestones = EXCLUDED.milestones,
          nearby_pois = EXCLUDED.nearby_pois, nearby_schools = EXCLUDED.nearby_schools,
          nearby_hotels = EXCLUDED.nearby_hotels, nearby_neighbourhoods = EXCLUDED.nearby_neighbourhoods,
          payment_plan = EXCLUDED.payment_plan, updated_at = NOW()
      `
      done++
      process.stdout.write(`  [${String(i + 1).padStart(5)}/${total}] ${row.building_slug.padEnd(50)} ${fieldCount}/11 fields       \n`)
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
