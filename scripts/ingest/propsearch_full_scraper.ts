/**
 * Full propsearch.ae scraper — writes to local CSV files.
 *
 * Phase 1: Scrape https://propsearch.ae/dubai/area-guides → propsearch_data/areas.csv
 * Phase 2: Scrape /dubai/{area-slug}/buildings for each area → propsearch_data/buildings.csv
 * Phase 3: Scrape /dubai/{building-slug} for each building → propsearch_data/building_details.csv
 *
 * Run (all phases):   npx tsx --env-file=.env.local scripts/ingest/propsearch_full_scraper.ts
 * Phase 1 only:       npx tsx --env-file=.env.local scripts/ingest/propsearch_full_scraper.ts --phase=1
 * Phase 2 only:       npx tsx --env-file=.env.local scripts/ingest/propsearch_full_scraper.ts --phase=2
 * Phase 3 only:       npx tsx --env-file=.env.local scripts/ingest/propsearch_full_scraper.ts --phase=3
 * Resume phase 2/3:   npx tsx --env-file=.env.local scripts/ingest/propsearch_full_scraper.ts --phase=2 --resume-from=dubai-marina
 * Test limit:         npx tsx --env-file=.env.local scripts/ingest/propsearch_full_scraper.ts --phase=3 --limit=20
 *
 * robots.txt: empty Disallow — all paths permitted.
 * Rate limit: 1.5s between requests.
 */

import * as fs from "fs"
import * as path from "path"
import * as readline from "readline"

// ── Constants ─────────────────────────────────────────────────────────────────

const DELAY_MS = 1500
const BASE_URL = "https://propsearch.ae"
const DATA_DIR = path.join(process.cwd(), "propsearch_data")

const AREAS_CSV       = path.join(DATA_DIR, "areas.csv")
const BUILDINGS_CSV   = path.join(DATA_DIR, "buildings.csv")
const DETAILS_CSV     = path.join(DATA_DIR, "building_details.csv")

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

function getArg(prefix: string): string | null {
  const found = args.find(a => a.startsWith(prefix))
  return found ? found.slice(prefix.length) : null
}

const phaseArg  = getArg("--phase=")
const resumeArg = getArg("--resume-from=")
const limitArg  = getArg("--limit=")

const PHASE       = phaseArg ? parseInt(phaseArg, 10) : null   // null = all
const RESUME_FROM = resumeArg ?? null
const LIMIT       = limitArg ? parseInt(limitArg, 10) : Infinity

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function slugToName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Escapes a single CSV field. Wraps in double-quotes if the field contains
 * commas, double-quotes, or newlines. Inner double-quotes are doubled.
 */
function escapeCsvField(field: string): string {
  const s = String(field ?? "")
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Appends one row to a CSV file. Creates the file with a header row if it
 * doesn't yet exist.
 */
function appendCsvRow(filePath: string, fields: string[], header?: string[]): void {
  const row = fields.map(escapeCsvField).join(",") + "\n"

  if (!fs.existsSync(filePath) && header) {
    fs.writeFileSync(filePath, header.map(escapeCsvField).join(",") + "\n", "utf8")
  }

  fs.appendFileSync(filePath, row, "utf8")
}

// ── Network ───────────────────────────────────────────────────────────────────

async function fetchHtml(url: string, attempt = 0): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(20_000),
    })

    if (res.status === 404) return null

    if (res.status === 429) {
      // Exponential backoff: 2s, 4s, 8s
      if (attempt >= 3) {
        console.warn(`  [skip] ${url} — too many 429s`)
        return null
      }
      const wait = Math.pow(2, attempt + 1) * 1000
      console.warn(`  [429] ${url} — backing off ${wait}ms`)
      await sleep(wait)
      return fetchHtml(url, attempt + 1)
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err: any) {
    if (attempt < 2) {
      await sleep(2000)
      return fetchHtml(url, attempt + 1)
    }
    console.warn(`  [skip] ${url} — ${err.message}`)
    return null
  }
}

// ── CSV readers ───────────────────────────────────────────────────────────────

/** Read all non-header lines from a CSV, returning each line split by comma.
 *  Simple split — adequate for our slug-only columns. */
async function readCsvRows(filePath: string): Promise<string[][]> {
  if (!fs.existsSync(filePath)) return []
  const rows: string[][] = []
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })
  let firstLine = true
  for await (const line of rl) {
    if (firstLine) { firstLine = false; continue } // skip header
    if (line.trim() === "") continue
    // Minimal CSV split — fields we produce never have embedded commas
    rows.push(line.split(",").map(f => f.replace(/^"|"$/g, "").replace(/""/g, '"')))
  }
  return rows
}

// ── Phase 1: area scraper ─────────────────────────────────────────────────────

// Slugs that are site navigation, not real area pages
const AREA_NAV_SLUGS = new Set([
  "area-guides", "buildings", "dubai", "map", "similar", "properties",
  "properties-for-sale", "properties-to-rent", "off-plan", "new-projects",
  "agents", "developers", "blog", "contact", "search", "projects",
  "branded-residences", "luxury", "villas", "apartments", "townhouses",
])

interface AreaRow {
  slug: string
  name: string
}

function extractAreas(html: string): AreaRow[] {
  const areas: AreaRow[] = []
  const seen = new Set<string>()

  // Area guide links: href="https://propsearch.ae/dubai/{slug}"
  // or href="/dubai/{slug}" — followed by visible anchor text
  const linkRe = /href="(?:https:\/\/propsearch\.ae)?\/dubai\/([a-z0-9][a-z0-9-]*)(?:\/[^"]*)?"\s[^>]*>([^<]{2,80})/g
  let m: RegExpExecArray | null

  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1]
    // Exclude building-style sub-paths (area-guides/xxx) and nav slugs
    if (seen.has(slug) || AREA_NAV_SLUGS.has(slug)) continue
    // Skip slugs that look like building detail pages (contain no area-guide signal)
    // We'll validate by checking the href doesn't have a sub-path beyond the slug
    seen.add(slug)

    const rawName = m[2].trim().replace(/\s+/g, " ")
    // Skip obvious navigation text
    if (/^(Home|Menu|Search|See all|View|Back|Next|Prev)/i.test(rawName)) continue

    areas.push({ slug, name: rawName || slugToName(slug) })
  }

  return areas
}

async function runPhase1(): Promise<AreaRow[]> {
  console.log("\n=== Phase 1: Scraping area list ===")

  const html = await fetchHtml(`${BASE_URL}/dubai/area-guides`)
  if (!html) {
    console.error("[Phase 1] Failed to fetch area-guides page")
    process.exit(1)
  }

  const areas = extractAreas(html)
  if (areas.length === 0) {
    console.error("[Phase 1] No areas extracted — check HTML structure")
    process.exit(1)
  }

  const header = ["slug", "name"]
  // Always write fresh for phase 1
  if (fs.existsSync(AREAS_CSV)) fs.unlinkSync(AREAS_CSV)
  fs.writeFileSync(AREAS_CSV, header.join(",") + "\n", "utf8")

  for (const area of areas) {
    fs.appendFileSync(AREAS_CSV, [area.slug, area.name].map(escapeCsvField).join(",") + "\n", "utf8")
  }

  console.log(`[Phase 1] Done — ${areas.length} areas written to ${AREAS_CSV}`)
  return areas
}

// ── Phase 2: buildings per area ───────────────────────────────────────────────

// Reuse NAV_SLUGS blocklist from propsearch_scraper.ts, extended
const BUILDING_NAV_SLUGS = new Set([
  "area-guides", "buildings", "dubai", "map", "similar", "properties",
  "properties-for-sale", "properties-to-rent", "off-plan", "new-projects",
  "agents", "developers", "blog", "contact", "search", "projects",
  "branded-residences", "luxury", "villas", "apartments", "townhouses",
])

type BuildingStatus = "complete" | "under_construction" | "planned" | "cancelled" | "unknown"

function parseStatus(rawText: string): BuildingStatus {
  const t = rawText.toLowerCase()
  if (t.includes("(cancelled)") || t.includes("(canceled)")) return "cancelled"
  if (t.includes("complete"))                                  return "complete"
  if (t.includes("under development") || t.includes("under construction")) return "under_construction"
  if (t.includes("planned") || t.includes("envisioned"))      return "planned"
  return "unknown"
}

interface ScrapedBuilding {
  building_slug: string
  building_name: string
  status: BuildingStatus
  area_slug: string
}

function extractBuildings(html: string, areaSlug: string, knownAreaSlugs: Set<string>): ScrapedBuilding[] {
  const buildings: ScrapedBuilding[] = []
  const seen = new Set<string>()

  // Building links are ABSOLUTE: href="https://propsearch.ae/dubai/{slug}"
  const cardRe = /href="https:\/\/propsearch\.ae\/dubai\/([a-z0-9][a-z0-9-]*)"/g
  let m: RegExpExecArray | null

  const allNavSlugs = new Set([...BUILDING_NAV_SLUGS, ...knownAreaSlugs])

  while ((m = cardRe.exec(html)) !== null) {
    const slug = m[1]
    if (seen.has(slug) || allNavSlugs.has(slug)) continue
    seen.add(slug)

    // Grab window after this href to locate status span
    const window = html.slice(m.index, m.index + 600)

    const spanRe = /<span[^>]*>([^<]{4,80})<\/span>/g
    let statusText = ""
    let sm: RegExpExecArray | null
    while ((sm = spanRe.exec(window)) !== null) {
      const candidate = sm[1].trim()
      if (/complete|under dev|under con|planned|envisioned|cancelled|canceled/i.test(candidate)) {
        statusText = candidate
        break
      }
    }

    buildings.push({
      building_slug: slug,
      building_name: slugToName(slug),
      status: parseStatus(statusText),
      area_slug: areaSlug,
    })
  }

  return buildings
}

async function runPhase2(areaRows?: AreaRow[]): Promise<ScrapedBuilding[]> {
  console.log("\n=== Phase 2: Scraping buildings per area ===")

  // Load areas from CSV if not passed in
  if (!areaRows) {
    const rows = await readCsvRows(AREAS_CSV)
    if (rows.length === 0) {
      console.error("[Phase 2] areas.csv not found or empty — run Phase 1 first")
      process.exit(1)
    }
    areaRows = rows.map(r => ({ slug: r[0], name: r[1] ?? slugToName(r[0]) }))
  }

  const knownAreaSlugs = new Set(areaRows.map(a => a.slug))

  // Write CSV header only if file doesn't exist yet
  const header = ["area_slug", "building_slug", "building_name", "status"]
  if (!fs.existsSync(BUILDINGS_CSV)) {
    fs.writeFileSync(BUILDINGS_CSV, header.join(",") + "\n", "utf8")
  }

  let resuming = RESUME_FROM !== null
  let total = 0
  let requestCount = 0

  for (let i = 0; i < areaRows.length; i++) {
    const area = areaRows[i]

    if (resuming) {
      if (area.slug === RESUME_FROM) resuming = false
      else continue
    }

    if (requestCount >= LIMIT) {
      console.log(`[Phase 2] Limit of ${LIMIT} requests reached`)
      break
    }

    process.stdout.write(`[${String(i + 1).padStart(3)}/${areaRows.length}] ${area.slug.padEnd(40)} buildings found: ${total}\r`)

    const html = await fetchHtml(`${BASE_URL}/dubai/${area.slug}/buildings`)
    requestCount++

    if (!html) {
      await sleep(DELAY_MS)
      continue
    }

    const buildings = extractBuildings(html, area.slug, knownAreaSlugs)

    for (const b of buildings) {
      try {
        appendCsvRow(BUILDINGS_CSV, [b.area_slug, b.building_slug, b.building_name, b.status])
        total++
      } catch (err: any) {
        console.warn(`  [warn] row write failed for ${b.building_slug}: ${err.message}`)
      }
    }

    console.log(`[${String(i + 1).padStart(3)}/${areaRows.length}] ${area.slug.padEnd(40)} +${buildings.length} buildings`)

    await sleep(DELAY_MS)
  }

  console.log(`[Phase 2] Done — ${total} building rows written to ${BUILDINGS_CSV}`)

  // Return all buildings from CSV for phase 3 chaining
  const allRows = await readCsvRows(BUILDINGS_CSV)
  return allRows.map(r => ({
    area_slug:     r[0],
    building_slug: r[1],
    building_name: r[2],
    status:        r[3] as BuildingStatus,
  }))
}

// ── Phase 3: building detail extraction ──────────────────────────────────────

interface BuildingDetail {
  building_slug:    string
  name:             string
  developer:        string
  completion_year:  string
  total_floors:     string
  total_units:      string
  property_types:   string
  amenities:        string
  service_charge:   string
  description:      string
}

function extractBuildingDetail(html: string, slug: string): BuildingDetail {
  // Strip HTML tags for text-level scanning
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim()

  // ── name (h1) ──────────────────────────────────────────────────────────────
  let name = ""
  const h1Match = html.match(/<h1[^>]*>\s*([^<]{3,120})\s*<\/h1>/i)
  if (h1Match) name = h1Match[1].trim()

  // ── developer ─────────────────────────────────────────────────────────────
  let developer = ""
  const devPatterns = [
    /Developer[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{2,60})/,
    /Developed\s+by[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{2,60})/i,
    /By\s+([A-Z][A-Za-z][A-Za-z0-9\s&.,'-]{2,50})(?:\s*[|\n])/,
  ]
  for (const re of devPatterns) {
    const m = text.match(re)
    if (m) { developer = m[1].trim().replace(/\s+/g, " "); break }
  }

  // ── completion year ────────────────────────────────────────────────────────
  let completion_year = ""
  const yearPatterns = [
    /(?:Completion|Handover|Completed|Ready|Expected)\s*(?:Date|Year)?[:\s]+(?:[A-Za-z]+\s+)?(20[12][0-9])/i,
    /(?:Completion|Handover|Completed|Ready)\s*[:\s]*(20[12][0-9])/i,
    /\b(20(?:1[6-9]|2[0-9]|30))\b/,
  ]
  for (const re of yearPatterns) {
    const m = text.match(re)
    if (m) { completion_year = m[1]; break }
  }

  // ── total floors ───────────────────────────────────────────────────────────
  let total_floors = ""
  const floorPatterns = [
    /(\d+)\s*(?:floors?|storey|stories|levels?)/i,
    /(?:floors?|storeys?|levels?)[:\s]+(\d+)/i,
    /G\+(\d+)/i,
    /(\d+)[-\s]*(?:floor|story|storey)\s+(?:tower|building)/i,
  ]
  for (const re of floorPatterns) {
    const m = text.match(re)
    if (m) { total_floors = m[1]; break }
  }

  // ── total units ────────────────────────────────────────────────────────────
  let total_units = ""
  const unitPatterns = [
    /(\d[\d,]+)\s*(?:units?|apartments?|residences?|homes?)/i,
    /(?:total\s+)?(?:units?|apartments?|residences?)\s*[:\s]+(\d[\d,]+)/i,
  ]
  for (const re of unitPatterns) {
    const m = text.match(re)
    if (m) { total_units = m[1].replace(/,/g, ""); break }
  }

  // ── property types (bedroom mix) ──────────────────────────────────────────
  const typeKeywords: [RegExp, string][] = [
    [/\bstudio\b/i,      "Studio"],
    [/\b1\s*(?:br|bed)\b/i, "1BR"],
    [/\b2\s*(?:br|bed)\b/i, "2BR"],
    [/\b3\s*(?:br|bed)\b/i, "3BR"],
    [/\b4\s*(?:br|bed)\b/i, "4BR"],
    [/\b5\s*(?:br|bed)\b/i, "5BR"],
    [/\bvilla\b/i,       "Villa"],
    [/\bpenthouse\b/i,   "Penthouse"],
    [/\btownhouse\b/i,   "Townhouse"],
    [/\bduplex\b/i,      "Duplex"],
  ]
  const foundTypes: string[] = []
  for (const [re, label] of typeKeywords) {
    if (re.test(text)) foundTypes.push(label)
  }
  const property_types = foundTypes.join(", ")

  // ── amenities ─────────────────────────────────────────────────────────────
  const amenityKeywords: [RegExp, string][] = [
    [/\bswimming\s*pool\b|\bpool\b/i,          "Pool"],
    [/\bgym\b|\bfitness\s*cen(?:ter|tre)\b/i,  "Gym"],
    [/\bparking\b/i,                            "Parking"],
    [/\bconcierge\b/i,                          "Concierge"],
    [/\bspa\b/i,                                "Spa"],
    [/\bkids?\s*(?:play|club)\b|\bchildren.*play/i, "Kids Play Area"],
    [/\bbbq\b|\bbarbecue\b/i,                   "BBQ"],
    [/\btennis\s*court\b/i,                     "Tennis Court"],
    [/\bsauna\b/i,                              "Sauna"],
    [/\bsecurity\b/i,                           "Security"],
    [/\blobby\b/i,                              "Lobby"],
    [/\belevator\b|\blift\b/i,                  "Elevator"],
    [/\bjogging\s*track\b|\brunning\s*track\b/i, "Jogging Track"],
    [/\bbeach\b/i,                              "Beach Access"],
    [/\brooftop\b/i,                            "Rooftop"],
    [/\bbusiness\s*cen(?:ter|tre)\b/i,          "Business Center"],
  ]
  const foundAmenities: string[] = []
  for (const [re, label] of amenityKeywords) {
    if (re.test(text)) foundAmenities.push(label)
  }
  const amenities = foundAmenities.join(", ")

  // ── service charge ────────────────────────────────────────────────────────
  let service_charge = ""
  const scPatterns = [
    /service\s*charge[s]?\s*[:\s]+(?:AED\s*)?([\d.,]+)\s*(?:\/\s*sqft|per\s*sqft|psf)?/i,
    /([\d.,]+)\s*(?:AED\s*)?(?:\/\s*sqft|per\s*sqft)\s*(?:service\s*charge)?/i,
  ]
  for (const re of scPatterns) {
    const m = text.match(re)
    if (m) { service_charge = m[1]; break }
  }

  // ── description (first substantial paragraph) ─────────────────────────────
  let description = ""
  // Look for paragraph tags in raw HTML with meaningful content
  const paraRe = /<p[^>]*>\s*([^<]{80,600})\s*<\/p>/g
  let pm: RegExpExecArray | null
  while ((pm = paraRe.exec(html)) !== null) {
    const candidate = pm[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
    // Skip boilerplate fragments
    if (/cookie|privacy|copyright|rights\s+reserved|subscribe|newsletter/i.test(candidate)) continue
    if (candidate.length >= 80) {
      description = candidate.slice(0, 300)
      break
    }
  }

  return {
    building_slug: slug,
    name,
    developer,
    completion_year,
    total_floors,
    total_units,
    property_types,
    amenities,
    service_charge,
    description,
  }
}

async function runPhase3(buildingRows?: ScrapedBuilding[]) {
  console.log("\n=== Phase 3: Scraping building detail pages ===")

  if (!buildingRows) {
    const rows = await readCsvRows(BUILDINGS_CSV)
    if (rows.length === 0) {
      console.error("[Phase 3] buildings.csv not found or empty — run Phase 2 first")
      process.exit(1)
    }
    buildingRows = rows.map(r => ({
      area_slug:     r[0],
      building_slug: r[1],
      building_name: r[2],
      status:        r[3] as BuildingStatus,
    }))
  }

  // Deduplicate by building_slug (same building can appear under multiple areas)
  const uniqueBuildings = new Map<string, ScrapedBuilding>()
  for (const b of buildingRows) {
    if (b.building_slug && !uniqueBuildings.has(b.building_slug)) {
      uniqueBuildings.set(b.building_slug, b)
    }
  }

  const slugList = [...uniqueBuildings.keys()]

  // Determine already-scraped slugs so we can resume
  const alreadyScraped = new Set<string>()
  if (fs.existsSync(DETAILS_CSV)) {
    const existingRows = await readCsvRows(DETAILS_CSV)
    for (const r of existingRows) {
      if (r[0]) alreadyScraped.add(r[0])
    }
    console.log(`[Phase 3] Resuming — ${alreadyScraped.size} already scraped`)
  }

  const header = [
    "building_slug", "name", "developer", "completion_year",
    "total_floors", "total_units", "property_types", "amenities",
    "service_charge", "description",
  ]
  if (!fs.existsSync(DETAILS_CSV)) {
    fs.writeFileSync(DETAILS_CSV, header.join(",") + "\n", "utf8")
  }

  let resuming = RESUME_FROM !== null
  let done = 0
  let requestCount = 0
  const total = slugList.length

  for (let i = 0; i < slugList.length; i++) {
    const slug = slugList[i]

    if (resuming) {
      if (slug === RESUME_FROM) resuming = false
      else continue
    }

    if (requestCount >= LIMIT) {
      console.log(`[Phase 3] Limit of ${LIMIT} requests reached`)
      break
    }

    if (alreadyScraped.has(slug)) {
      process.stdout.write(`[${String(i + 1).padStart(5)}/${total}] ${slug.padEnd(50)} [already done]\r`)
      continue
    }

    const html = await fetchHtml(`${BASE_URL}/dubai/${slug}`)
    requestCount++

    if (!html) {
      await sleep(DELAY_MS)
      continue
    }

    try {
      const detail = extractBuildingDetail(html, slug)
      const fieldCount = [
        detail.name, detail.developer, detail.completion_year,
        detail.total_floors, detail.total_units, detail.property_types,
        detail.amenities, detail.service_charge, detail.description,
      ].filter(v => v !== "").length

      appendCsvRow(DETAILS_CSV, [
        detail.building_slug,
        detail.name,
        detail.developer,
        detail.completion_year,
        detail.total_floors,
        detail.total_units,
        detail.property_types,
        detail.amenities,
        detail.service_charge,
        detail.description,
      ])

      done++
      console.log(`[${String(i + 1).padStart(5)}/${total}] ${slug.padEnd(50)} ${fieldCount}/9 fields`)
    } catch (err: any) {
      console.warn(`  [warn] ${slug}: ${err.message}`)
    }

    await sleep(DELAY_MS)
  }

  console.log(`[Phase 3] Done — ${done} building detail rows written to ${DETAILS_CSV}`)
}

// ── Setup: ensure data dir exists ─────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    console.log(`Created directory: ${DATA_DIR}`)
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  ensureDataDir()

  if (PHASE === null || PHASE === 1) {
    const areas = await runPhase1()
    if (PHASE === null) {
      const buildings = await runPhase2(areas)
      await runPhase3(buildings)
    }
  } else if (PHASE === 2) {
    await runPhase2()
  } else if (PHASE === 3) {
    await runPhase3()
  } else {
    console.error(`Unknown --phase=${PHASE}. Valid values: 1, 2, 3`)
    process.exit(1)
  }

  console.log("\nAll requested phases complete.")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
