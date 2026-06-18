/**
 * Phase 2: Scrape propsearch.ae building data and enrich buildings_enriched table.
 *
 * For each Dubai area:
 *   1. Fetch https://propsearch.ae/dubai/{area-slug}/buildings
 *   2. Extract building name, slug, and status from per-card inline span text
 *   3. Pass A — UPDATE existing Phase 1 rows matched by name similarity
 *   4. Pass B — INSERT off-plan / new buildings not yet in dld_transactions
 *
 * Run:   npx tsx --env-file=.env.local scripts/ingest/propsearch_scraper.ts
 * Resume: npx tsx --env-file=.env.local scripts/ingest/propsearch_scraper.ts --resume-from=dubai-marina
 *
 * robots.txt: empty Disallow — all paths permitted.
 * Rate limit: 1.5s delay between requests.
 *
 * HTML notes (confirmed via live page inspection):
 *   - Building links are ABSOLUTE: href="https://propsearch.ae/dubai/{slug}"
 *   - Status is per-card inline: <span ...>Complete</span> / "Under development" / "Planned"
 *   - Cancelled buildings are identified by "(Cancelled)" in the visible span text
 */

import { sql } from "./db-client"

const DELAY_MS = 1500
const BASE_URL = "https://propsearch.ae"
const SIM_THRESHOLD = 0.4

// ── Area list (from propsearch.ae/dubai/area-guides, 2026-03-26) ──────────────
const AREA_SLUGS: string[] = [
  "palm-jumeirah", "dubai-marina", "downtown-dubai", "business-bay",
  "jumeirah-beach-residence", "jumeirah-village-circle", "jumeirah-lakes-towers",
  "dubai-hills-estate", "arabian-ranches", "arabian-ranches-2", "arabian-ranches-3",
  "damac-hills", "damac-hills-2", "sobha-hartland", "city-walk", "la-mer",
  "emaar-beachfront", "bluewaters-island", "dubai-harbour", "creek-island",
  "al-jaddaf", "meydan-avenue", "dubai-festival-city", "al-furjan",
  "jumeirah-village-triangle", "motor-city", "sports-city", "town-square",
  "the-greens", "the-views", "the-lakes", "emirates-living", "jumeirah-islands",
  "jumeirah-park", "discovery-gardens", "silicon-oasis", "dubai-international-city",
  "mirdif", "al-barsha-1", "barsha-heights", "dubai-production-city",
  "dubai-investments-park", "dubai-south", "emaar-south", "dubai-media-city",
  "port-de-la-mer", "madinat-jumeirah-living", "al-wasl", "deira", "bur-dubai",
  "jumeirah-golf-estates", "damac-lagoons", "tilal-al-ghaf", "the-valley",
  "villanova", "mudon", "arjan", "liwan", "dubailand", "reem", "al-safa",
  "al-nakheel", "jebel-ali-first", "creek-harbour", "sobha-reserve",
  "the-oasis-by-emaar", "peninsula", "azizi-riviera", "zaabeel",
  "dubai-islands", "uptown-dubai", "living-legends", "maritime-city",
  "expo-city-dubai", "dubai-science-park", "al-ghaf", "mag-city",
  "the-gardens", "the-estates-by-mag",
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function areaSlugToName(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function tokenise(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean))
}

function jaccard(a: string, b: string): number {
  const ta = tokenise(a)
  const tb = tokenise(b)
  if (ta.size === 0 && tb.size === 0) return 1
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}

// ── Area → DLD name mapping ───────────────────────────────────────────────────

const SLUG_TO_DLD: Record<string, string> = {
  "dubai-marina":              "Marsa Dubai",
  "jumeirah-village-circle":   "Al Barsha South Fourth",
  "jumeirah-lakes-towers":     "Al Thanyah Fifth",
  "downtown-dubai":            "Burj Khalifa",
  "dubai-hills-estate":        "Hadaeq Sheikh Mohammed Bin Rashid",
  "jumeirah-beach-residence":  "Al Safouh Second",
  "arabian-ranches":           "Al Hebiah Third",
  "motor-city":                "Al Hebiah Fourth",
  "sports-city":               "Al Hebiah First",
  "discovery-gardens":         "Jabal Ali First",
  "al-furjan":                 "Jabal Ali First",
  "silicon-oasis":             "Nadd Hessa",
  "town-square":               "Al Hebiah Sixth",
  "jumeirah-village-triangle": "Al Barsha South Fifth",
  "dubai-investments-park":    "Dubai Investment Park Second",
  "meydan-avenue":             "Nad Al Shiba First",
  "al-jaddaf":                 "Al Jadaf",
  "city-walk":                 "Al Wasl",
  "la-mer":                    "Jumeirah First",
  "port-de-la-mer":            "Jumeirah First",
  "bluewaters-island":         "Bluewaters Island",
  "creek-island":              "Ras Al Khor",
  "creek-harbour":             "Ras Al Khor",
  "emaar-beachfront":          "Al Safouh Second",
  "dubai-harbour":             "Al Safouh Second",
  "the-greens":                "Al Thanyah Second",
  "the-views":                 "Al Thanyah Second",
  "the-lakes":                 "Al Thanyah Fourth",
  "jumeirah-islands":          "Al Thanyah Fourth",
  "emirates-living":           "Al Thanyah Third",
  "damac-hills":               "Al Hebiah Fifth",
  "damac-hills-2":             "Al Hebiah Fifth",
  "sobha-hartland":            "Mohammed Bin Rashid City",
  "arjan":                     "Al Barsha South Third",
  "mudon":                     "Al Hebiah Second",
  "business-bay":              "Business Bay",
  "palm-jumeirah":             "Palm Jumeirah",
  "mirdif":                    "Mirdif",
  "al-barsha-1":               "Al Barsha First",
  "deira":                     "Al Ras",
  "bur-dubai":                 "Bur Dubai",
  "al-wasl":                   "Al Wasl",
  "al-safa":                   "Al Safa",
  "dubai-international-city":  "Warsan Fourth",
}

// ── Types ─────────────────────────────────────────────────────────────────────

type BuildingStatus = "complete" | "under_construction" | "planned" | "cancelled" | "unknown"

interface ScrapedBuilding {
  name: string
  propsearch_slug: string
  status: BuildingStatus
}

interface ExistingBuilding {
  building_key: string
  building_name_en: string
}

// ── HTML extraction ───────────────────────────────────────────────────────────
// Building links are ABSOLUTE: href="https://propsearch.ae/dubai/{slug}"
// Status is per-card inline span: "Complete", "Under development", "Planned"
// Cancelled = any status span text containing "(Cancelled)"

function parseStatus(rawText: string): BuildingStatus {
  const t = rawText.toLowerCase()
  if (t.includes("(cancelled)") || t.includes("(canceled)")) return "cancelled"
  if (t.includes("complete"))                                  return "complete"
  if (t.includes("under development") || t.includes("under construction")) return "under_construction"
  if (t.includes("planned") || t.includes("envisioned"))      return "planned"
  return "unknown"
}

function extractBuildings(html: string): ScrapedBuilding[] {
  // Each building card: href="https://propsearch.ae/dubai/{slug}" appears twice per card.
  // We parse card blocks bounded by the absolute building URL.
  const buildings: ScrapedBuilding[] = []
  const seen = new Set<string>()

  // Extract slug + following ~300 chars (contains the status span)
  const cardRe = /href="https:\/\/propsearch\.ae\/dubai\/([a-z0-9][a-z0-9-]*)"/g
  let m: RegExpExecArray | null

  // Navigation / site slugs to never treat as buildings
  const NAV_SLUGS = new Set([
    "area-guides", "buildings", "dubai", "map", "similar", "properties",
    "properties-for-sale", "properties-to-rent", "off-plan", "new-projects",
    "agents", "developers", "blog", "contact", "search", "projects",
    "branded-residences", "luxury", "villas", "apartments", "townhouses",
    ...AREA_SLUGS,
  ])

  while ((m = cardRe.exec(html)) !== null) {
    const slug = m[1]
    if (seen.has(slug) || NAV_SLUGS.has(slug)) continue
    seen.add(slug)

    // Grab the text window after this href to find status span
    const window = html.slice(m.index, m.index + 600)

    // Extract status from span text — look for the first span after this href
    // that contains a known status keyword
    const spanRe = /<span[^>]*>([^<]{4,60})<\/span>/g
    let statusText = ""
    let sm: RegExpExecArray | null
    while ((sm = spanRe.exec(window)) !== null) {
      const candidate = sm[1].trim()
      if (/complete|under dev|under con|planned|envisioned|cancelled|canceled/i.test(candidate)) {
        statusText = candidate
        break
      }
    }

    const status = parseStatus(statusText)

    // Derive display name from slug (title case), e.g. "marina-gate-1" → "Marina Gate 1"
    const name = areaSlugToName(slug)

    buildings.push({ name, propsearch_slug: slug, status })
  }

  return buildings
}

// ── Fetch with retry ──────────────────────────────────────────────────────────

async function fetchHtml(url: string, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15_000),
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err: any) {
      if (attempt === retries) {
        console.warn(`  [skip] ${url} — ${err.message}`)
        return null
      }
      await sleep(2000)
    }
  }
  return null
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function loadExistingForArea(areaDldName: string): Promise<ExistingBuilding[]> {
  return sql<ExistingBuilding[]>`
    SELECT building_key, building_name_en
    FROM buildings_enriched
    WHERE area_name_en ILIKE ${`%${areaDldName}%`}
  `
}

// Pass A: update an existing Phase 1 row
async function updateExisting(key: string, slug: string, status: BuildingStatus) {
  await sql`
    UPDATE buildings_enriched SET
      propsearch_slug       = ${slug},
      propsearch_status     = ${status},
      propsearch_scraped_at = now(),
      enriched_at           = now()
    WHERE building_key = ${key}
  `
}

// Pass B: insert a new off-plan building (no DLD transactions yet)
// Uses slug as conflict target (UNIQUE in DDL)
async function insertOffPlan(
  b: ScrapedBuilding,
  areaId: number | null,
  areaDldName: string
) {
  const bKey  = `propsearch||${b.propsearch_slug}`
  const slug  = `${b.propsearch_slug}--${toSlug(areaDldName)}`
  await sql`
    INSERT INTO buildings_enriched (
      building_key, slug, building_name_en,
      area_id, area_name_en,
      propsearch_slug, propsearch_status, propsearch_scraped_at, enriched_at
    ) VALUES (
      ${bKey}, ${slug}, ${b.name},
      ${areaId}, ${areaDldName},
      ${b.propsearch_slug}, ${b.status}, now(), now()
    )
    ON CONFLICT (slug) DO UPDATE SET
      propsearch_slug       = EXCLUDED.propsearch_slug,
      propsearch_status     = EXCLUDED.propsearch_status,
      propsearch_scraped_at = now(),
      enriched_at           = now()
  `
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse --resume-from=<slug> arg
  const resumeArg = process.argv.find(a => a.startsWith("--resume-from="))
  const resumeFrom = resumeArg?.split("=")[1] ?? null
  let resuming = resumeFrom !== null

  // Check table exists
  const check = await sql`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'buildings_enriched'
  `
  if (check.length === 0) {
    console.error("buildings_enriched table not found — run Phase 1 first.")
    process.exit(1)
  }

  // Load area_id lookup from dld_areas
  const areaRows = await sql<{ area_id: number; name_en: string }[]>`
    SELECT area_id, name_en FROM dld_areas
  `
  const areaNameToId = new Map(areaRows.map(r => [r.name_en.toLowerCase(), r.area_id]))

  let updated = 0, inserted = 0, skipped = 0

  if (resumeFrom) console.log(`Resuming from: ${resumeFrom}`)
  console.log(`Scraping ${AREA_SLUGS.length} areas...\n`)

  for (let i = 0; i < AREA_SLUGS.length; i++) {
    const areaSlug = AREA_SLUGS[i]

    // Skip until resume point
    if (resuming) {
      if (areaSlug === resumeFrom) resuming = false
      else continue
    }

    const areaDldName = SLUG_TO_DLD[areaSlug] ?? areaSlugToName(areaSlug)
    const areaId      = areaNameToId.get(areaDldName.toLowerCase()) ?? null
    const label       = `[${String(i + 1).padStart(3)}/${AREA_SLUGS.length}] ${areaSlug}`

    process.stdout.write(`\r${label.padEnd(55)} U:${updated} I:${inserted} S:${skipped}`)

    const html = await fetchHtml(`${BASE_URL}/dubai/${areaSlug}/buildings`)
    if (!html) { skipped++; await sleep(DELAY_MS); continue }

    const scraped = extractBuildings(html)
    if (scraped.length === 0) { skipped++; await sleep(DELAY_MS); continue }

    // Load existing buildings for this area
    const existing = await loadExistingForArea(areaDldName)
    const byNameLower = new Map(existing.map(e => [e.building_name_en.toLowerCase(), e]))

    for (const b of scraped) {
      // Pass A: try exact match
      const exact = byNameLower.get(b.name.toLowerCase())
      if (exact) {
        await updateExisting(exact.building_key, b.propsearch_slug, b.status)
        updated++
        continue
      }

      // Pass A: try Jaccard similarity
      let bestMatch: ExistingBuilding | null = null
      let bestScore = 0
      for (const e of existing) {
        const s = jaccard(b.name, e.building_name_en)
        if (s > bestScore) { bestScore = s; bestMatch = e }
      }

      try {
        if (bestMatch && bestScore >= SIM_THRESHOLD) {
          await updateExisting(bestMatch.building_key, b.propsearch_slug, b.status)
          updated++
        } else {
          // Pass B: new off-plan building
          await insertOffPlan(b, areaId, areaDldName)
          inserted++
        }
      } catch (err: any) {
        // Skip individual bad rows (nav slugs, duplicates) without crashing
        process.stdout.write(`\n  [warn] skipped ${b.propsearch_slug}: ${err.message}\n`)
      }
    }

    // Log completed area (parseable for manual resume tracking)
    console.log(`\n  ✓ ${areaSlug} — ${scraped.length} buildings (${areaDldName})`)

    await sleep(DELAY_MS)
  }

  console.log(`\nDone.`)
  console.log(`  Updated (matched to Phase 1): ${updated}`)
  console.log(`  Inserted (new off-plan):      ${inserted}`)
  console.log(`  Areas skipped (404/error):    ${skipped}`)
  await sql.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
