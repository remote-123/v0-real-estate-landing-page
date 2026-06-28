/**
 * seed-nc-buildings.ts
 *
 * Populates nc_buildings from:
 *   1. prop_building_details (propsearch.ae scrape) — base fields
 *   2. dld_units — bedroom/studio counts by building name (exact match)
 *   3. nc_areas — area slug mapping via propsearch_slug
 *
 * data_quality assigned:
 *   1 = populated from prop_building_details
 *   2 = bedroom counts also matched from dld_units
 *
 * Run: npx tsx --env-file=.env.local scripts/ingest/seed-nc-buildings.ts
 *
 * Options:
 *   --mode=upsert  (default) — insert new, update existing with quality < 3
 *   --mode=insert-only — skip rows already in nc_buildings
 */

import { sql } from "./db-client"

const MODE = process.argv.includes("--mode=insert-only") ? "insert-only" : "upsert"

// ── Types ─────────────────────────────────────────────────────────────────────

type PropBuildingRow = {
  building_slug: string
  area_slug: string | null
  name: string | null
  developer: string | null
  master_developer: string | null
  building_type: string | null
  status: string | null
  completion_year: number | null
  total_floors: number | null
  total_units: number | null
  amenities: string | null
  is_freehold: boolean | null
  service_charge_psf: string | null
  description: string | null
  nearby_schools: unknown
  transport: unknown
}

type BedroomRow = {
  project_name_en: string
  units_studio: number
  units_1br: number
  units_2br: number
  units_3br_plus: number
}

type NcAreaRow = {
  slug: string
  propsearch_slug: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalise(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim()
}

function parseAmenitiesBoolean(amenities: string | null, keyword: string): boolean {
  if (!amenities) return false
  return amenities.toLowerCase().includes(keyword.toLowerCase())
}

function parseHasSchool(nearbySchools: unknown): boolean {
  if (!nearbySchools) return false
  if (Array.isArray(nearbySchools)) return nearbySchools.length > 0
  if (typeof nearbySchools === "string") {
    try {
      const parsed = JSON.parse(nearbySchools)
      return Array.isArray(parsed) && parsed.length > 0
    } catch { return false }
  }
  return false
}

type MetroResult = { station: string | null; walkMins: number | null }

function parseMetro(transport: unknown): MetroResult {
  if (!transport) return { station: null, walkMins: null }

  let arr: unknown[] = []
  if (Array.isArray(transport)) {
    arr = transport
  } else if (typeof transport === "string") {
    try {
      const parsed = JSON.parse(transport)
      arr = Array.isArray(parsed) ? parsed : []
    } catch { return { station: null, walkMins: null } }
  } else if (typeof transport === "object" && transport !== null) {
    // postgres.js may already deserialize JSONB to an object
    const t = transport as Record<string, unknown>
    if (Array.isArray(t)) arr = t
    else return { station: null, walkMins: null }
  } else {
    return { station: null, walkMins: null }
  }

  // transport entries look like: "Dubai Marina Metro Station (5 min walk)"
  // or structured objects: { name: "...", type: "metro", minutes: 5 }
  for (const entry of arr) {
    if (typeof entry === "string") {
      const lower = entry.toLowerCase()
      if (lower.includes("metro") || lower.includes("tram")) {
        // extract station name (everything before the parenthesis)
        const nameMatch = entry.match(/^([^(]+)/)?.[1]?.trim() ?? null
        // extract minutes
        const minsMatch = entry.match(/(\d+)\s*min/i)?.[1]
        return {
          station: nameMatch,
          walkMins: minsMatch ? parseInt(minsMatch) : null,
        }
      }
    } else if (typeof entry === "object" && entry !== null) {
      const obj = entry as Record<string, unknown>
      const type = String(obj.type ?? "").toLowerCase()
      if (type === "metro" || type === "tram") {
        return {
          station: typeof obj.name === "string" ? obj.name : null,
          walkMins: typeof obj.minutes === "number" ? obj.minutes : null,
        }
      }
    }
  }

  return { station: null, walkMins: null }
}

function normaliseBuildingType(raw: string | null): string | null {
  if (!raw) return null
  const r = raw.toLowerCase()
  if (r.includes("villa")) return "villa"
  if (r.includes("hotel") || r.includes("serviced")) return "hotel-apartment"
  if (r.includes("mixed") || r.includes("commercial")) return "mixed"
  if (r.includes("penthouse")) return "penthouse"
  return "apartment"
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`[seed-nc-buildings] mode=${MODE}`)

  // 1. Build propsearch_slug → nc_area_slug map
  console.log("Loading nc_areas propsearch_slug map...")
  const ncAreaRows = await sql<NcAreaRow[]>`
    SELECT slug, propsearch_slug FROM nc_areas WHERE propsearch_slug IS NOT NULL
  `
  const areaMap = new Map<string, string>()
  for (const r of ncAreaRows) {
    if (r.propsearch_slug) areaMap.set(r.propsearch_slug, r.slug)
  }
  console.log(`  ${areaMap.size} propsearch area slugs mapped to nc_areas`)

  // 2. Load bedroom counts from dld_units (normalised name → counts)
  console.log("Loading bedroom counts from dld_units...")
  const bedroomRows = await sql<BedroomRow[]>`
    SELECT
      project_name_en,
      SUM(CASE WHEN rooms_en = 'Studio'  THEN 1 ELSE 0 END)::integer AS units_studio,
      SUM(CASE WHEN rooms_en = '1 B/R'   THEN 1 ELSE 0 END)::integer AS units_1br,
      SUM(CASE WHEN rooms_en = '2 B/R'   THEN 1 ELSE 0 END)::integer AS units_2br,
      SUM(CASE WHEN rooms_en IN ('3 B/R','4 B/R','5 B/R','6 B/R') THEN 1 ELSE 0 END)::integer AS units_3br_plus
    FROM dld_units
    WHERE project_name_en IS NOT NULL AND project_name_en != ''
    GROUP BY project_name_en
    HAVING SUM(CASE WHEN rooms_en IN ('Studio','1 B/R','2 B/R','3 B/R','4 B/R','5 B/R','6 B/R') THEN 1 ELSE 0 END) >= 3
  `
  const bedroomMap = new Map<string, BedroomRow>()
  for (const r of bedroomRows) {
    bedroomMap.set(normalise(r.project_name_en), r)
  }
  console.log(`  ${bedroomMap.size} buildings with bedroom data in dld_units`)

  // 3. Load all prop_building_details
  console.log("Loading prop_building_details...")
  const buildings = await sql<PropBuildingRow[]>`
    SELECT
      building_slug, area_slug, name, developer, master_developer,
      building_type, status, completion_year, total_floors, total_units,
      amenities, is_freehold, service_charge_psf, description,
      nearby_schools, transport
    FROM prop_building_details
    WHERE name IS NOT NULL
    ORDER BY building_slug
  `
  console.log(`  ${buildings.length} buildings to process`)

  // 4. Process + upsert
  let inserted = 0
  let updated = 0
  let skipped = 0
  let bedroomMatches = 0

  const BATCH = 100
  for (let i = 0; i < buildings.length; i += BATCH) {
    const batch = buildings.slice(i, i + BATCH)

    for (const b of batch) {
      const ncAreaSlug = b.area_slug ? (areaMap.get(b.area_slug) ?? null) : null
      const normName = normalise(b.name)
      const bedroomData = bedroomMap.get(normName) ?? null

      const hasPool = parseAmenitiesBoolean(b.amenities, "pool") ||
                      parseAmenitiesBoolean(b.amenities, "swimming")
      const hasGym  = parseAmenitiesBoolean(b.amenities, "gym") ||
                      parseAmenitiesBoolean(b.amenities, "fitness")
      const hasSchool = parseHasSchool(b.nearby_schools)
      const { station: nearestMetro, walkMins: metroWalkMins } = parseMetro(b.transport)

      const dataQuality: number = bedroomData ? 2 : 1

      const slug = b.building_slug

      if (MODE === "insert-only") {
        const existing = await sql<{ slug: string }[]>`
          SELECT slug FROM nc_buildings WHERE slug = ${slug} LIMIT 1
        `
        if (existing.length > 0) { skipped++; continue }
      }

      await sql`
        INSERT INTO nc_buildings (
          slug, name, nc_area_slug, propsearch_slug,
          developer, master_developer,
          completion_year, total_floors, total_units,
          units_studio, units_1br, units_2br, units_3br_plus,
          building_type, is_freehold, service_charge_psf,
          nearest_metro, metro_walk_mins,
          has_pool, has_gym, has_school_nearby,
          data_quality, updated_at
        ) VALUES (
          ${slug}, ${b.name}, ${ncAreaSlug}, ${b.building_slug},
          ${b.developer}, ${b.master_developer},
          ${b.completion_year}, ${b.total_floors}, ${b.total_units},
          ${bedroomData ? bedroomData.units_studio : null},
          ${bedroomData ? bedroomData.units_1br    : null},
          ${bedroomData ? bedroomData.units_2br    : null},
          ${bedroomData ? bedroomData.units_3br_plus : null},
          ${normaliseBuildingType(b.building_type)},
          ${b.is_freehold},
          ${b.service_charge_psf ? Number(b.service_charge_psf) : null},
          ${nearestMetro}, ${metroWalkMins},
          ${hasPool}, ${hasGym}, ${hasSchool},
          ${dataQuality}, NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET
          name              = EXCLUDED.name,
          nc_area_slug      = EXCLUDED.nc_area_slug,
          developer         = EXCLUDED.developer,
          master_developer  = EXCLUDED.master_developer,
          completion_year   = EXCLUDED.completion_year,
          total_floors      = EXCLUDED.total_floors,
          total_units       = EXCLUDED.total_units,
          units_studio      = EXCLUDED.units_studio,
          units_1br         = EXCLUDED.units_1br,
          units_2br         = EXCLUDED.units_2br,
          units_3br_plus    = EXCLUDED.units_3br_plus,
          building_type     = EXCLUDED.building_type,
          is_freehold       = EXCLUDED.is_freehold,
          service_charge_psf = EXCLUDED.service_charge_psf,
          nearest_metro     = EXCLUDED.nearest_metro,
          metro_walk_mins   = EXCLUDED.metro_walk_mins,
          has_pool          = EXCLUDED.has_pool,
          has_gym           = EXCLUDED.has_gym,
          has_school_nearby = EXCLUDED.has_school_nearby,
          data_quality      = GREATEST(nc_buildings.data_quality,
                                CASE WHEN nc_buildings.data_quality < 3 THEN EXCLUDED.data_quality ELSE nc_buildings.data_quality END),
          updated_at        = NOW()
        WHERE nc_buildings.data_quality < 3
      `

      if (bedroomData) bedroomMatches++
      if (MODE === "insert-only") inserted++
      else inserted++
    }

    process.stdout.write(`\r  Processed ${Math.min(i + BATCH, buildings.length)}/${buildings.length}...`)
  }

  console.log(`\n\n── Results ──────────────────────────────────`)
  console.log(`  Upserted:        ${inserted}`)
  console.log(`  Skipped:         ${skipped}`)
  console.log(`  Bedroom matches: ${bedroomMatches} (data_quality=2)`)
  console.log(`  No bedroom data: ${inserted - bedroomMatches} (data_quality=1)`)

  // Summary counts by quality
  const qCounts = await sql<{ data_quality: number; cnt: number }[]>`
    SELECT data_quality, COUNT(*)::integer AS cnt
    FROM nc_buildings
    GROUP BY data_quality
    ORDER BY data_quality
  `
  console.log(`\n── nc_buildings summary ─────────────────────`)
  for (const q of qCounts) {
    const label = ['stub','auto','bedrooms-matched','manual-verified'][q.data_quality] ?? `q${q.data_quality}`
    console.log(`  quality=${q.data_quality} (${label}): ${q.cnt} rows`)
  }

  await sql.end()
  console.log("\nDone.")
}

run().catch(err => { console.error(err); process.exit(1) })
