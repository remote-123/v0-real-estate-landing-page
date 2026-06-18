/**
 * Phase 3: Geocode buildings_enriched using OpenStreetMap Overpass API.
 *
 * For each building in buildings_enriched where osm_lat IS NULL:
 *   1. Query Overpass for nodes/ways/relations matching the building name within Dubai bbox
 *   2. Take the first result's coordinates (center for ways/relations, lat/lon for nodes)
 *   3. UPDATE buildings_enriched SET osm_lat, osm_lng WHERE building_key = ...
 *
 * Run:     npx tsx --env-file=.env.local scripts/ingest/osm_geocoder.ts
 * Resume:  npx tsx --env-file=.env.local scripts/ingest/osm_geocoder.ts --resume-from=<building_key>
 * Limit:   npx tsx --env-file=.env.local scripts/ingest/osm_geocoder.ts --limit=50
 *
 * Rate limit: 1.5s delay between requests (Overpass fair use).
 */

import { sql } from "./db-client"

const DELAY_MS      = 1500
const OVERPASS_URL  = "https://overpass-api.de/api/interpreter"
const BATCH_SIZE    = 200

// Dubai bounding box: south, west, north, east
const BBOX = "24.7,54.9,25.4,55.6"

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function isGenericName(name: string): boolean {
  const trimmed = name.trim()
  if (trimmed.length < 3) return true
  if (/^\d+$/.test(trimmed)) return true
  return false
}

function buildOverpassQuery(name: string): string {
  // Escape special regex chars that could break Overpass QL
  const escaped = name.replace(/[\\/"]/g, "\\$&")
  return `[out:json][timeout:15];
(
  node["name"~"${escaped}",i](${BBOX});
  way["name"~"${escaped}",i](${BBOX});
  relation["name"~"${escaped}",i](${BBOX});
);
out center;`
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverpassElement {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

interface BuildingRow {
  building_key: string
  building_name_en: string
  area_name_en: string | null
}

// ── Overpass fetch with exponential backoff ───────────────────────────────────

async function queryOverpass(
  name: string,
  retries = 3
): Promise<{ lat: number; lon: number } | null> {
  const body = buildOverpassQuery(name)

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(body)}`,
        signal: AbortSignal.timeout(20_000),
      })

      if (res.status === 429) {
        // Rate limited — back off exponentially
        const wait = Math.pow(2, attempt + 1) * 1000
        process.stdout.write(`\n  [rate-limit] backing off ${wait}ms...\n`)
        await sleep(wait)
        continue
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = (await res.json()) as OverpassResponse

      if (!data.elements || data.elements.length === 0) return null

      // Prefer elements that have a "building" tag or "building:part" tag
      const withBuildingTag = data.elements.filter(
        el => el.tags?.building || el.tags?.["building:part"]
      )
      const candidates = withBuildingTag.length > 0 ? withBuildingTag : data.elements

      const first = candidates[0]

      if (first.type === "node" && first.lat != null && first.lon != null) {
        return { lat: first.lat, lon: first.lon }
      }

      if (
        (first.type === "way" || first.type === "relation") &&
        first.center
      ) {
        return { lat: first.center.lat, lon: first.center.lon }
      }

      return null
    } catch (err: any) {
      if (attempt === retries) {
        process.stdout.write(`\n  [error] Overpass query failed for "${name}": ${err.message}\n`)
        return null
      }
      await sleep(1500 * (attempt + 1))
    }
  }

  return null
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function loadBatch(offset: number): Promise<BuildingRow[]> {
  return sql<BuildingRow[]>`
    SELECT building_key, building_name_en, area_name_en
    FROM buildings_enriched
    WHERE osm_lat IS NULL
    ORDER BY building_key
    LIMIT ${BATCH_SIZE} OFFSET ${offset}
  `
}

async function updateCoords(key: string, lat: number, lon: number) {
  await sql`
    UPDATE buildings_enriched
    SET osm_lat = ${lat}, osm_lng = ${lon}
    WHERE building_key = ${key}
  `
}

async function countPending(): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM buildings_enriched WHERE osm_lat IS NULL
  `
  return Number(rows[0].count)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse args
  const resumeArg = process.argv.find(a => a.startsWith("--resume-from="))
  const resumeFrom = resumeArg?.split("=")[1] ?? null

  const limitArg = process.argv.find(a => a.startsWith("--limit="))
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null

  // Verify table exists
  const check = await sql`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'buildings_enriched'
  `
  if (check.length === 0) {
    console.error("buildings_enriched table not found.")
    process.exit(1)
  }

  // Verify osm columns exist
  const colCheck = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'buildings_enriched'
      AND column_name IN ('osm_lat', 'osm_lng')
  `
  if (colCheck.length < 2) {
    console.error("osm_lat/osm_lng columns missing — run: npm run migrate:osm-columns")
    process.exit(1)
  }

  const total = await countPending()
  console.log(`Buildings needing coordinates: ${total}`)

  if (total === 0) {
    console.log("Nothing to do.")
    await sql.end()
    return
  }

  let processed = 0
  let hits = 0
  let skipped = 0
  let misses = 0
  let resuming = resumeFrom !== null
  let offset = 0

  if (resumeFrom) console.log(`Resuming from key: ${resumeFrom}`)
  if (limit) console.log(`Processing up to ${limit} buildings`)
  console.log()

  outer: while (true) {
    const batch = await loadBatch(offset)
    if (batch.length === 0) break

    for (const row of batch) {
      // Resume support: skip until we see the resume key
      if (resuming) {
        if (row.building_key === resumeFrom) {
          resuming = false
        } else {
          offset++ // not a real offset but we need to account for it in next batch
          continue
        }
      }

      // Enforce --limit
      if (limit !== null && processed >= limit) break outer

      const n = processed + 1

      if (isGenericName(row.building_name_en)) {
        process.stdout.write(`[${String(n).padStart(5)}/${total}] ${row.building_name_en.padEnd(40)} [skip — generic]\n`)
        skipped++
        processed++
        continue
      }

      const coords = await queryOverpass(row.building_name_en)

      if (coords) {
        await updateCoords(row.building_key, coords.lat, coords.lon)
        process.stdout.write(
          `[${String(n).padStart(5)}/${total}] ${row.building_name_en.padEnd(40)} ${coords.lat.toFixed(6)},${coords.lon.toFixed(6)}\n`
        )
        hits++
      } else {
        process.stdout.write(
          `[${String(n).padStart(5)}/${total}] ${row.building_name_en.padEnd(40)} [no result]\n`
        )
        misses++
      }

      processed++
      await sleep(DELAY_MS)
    }

    // If we got a partial batch, we're done
    if (batch.length < BATCH_SIZE) break

    // Advance offset: next batch should skip already-geocoded rows.
    // Since we UPDATE rows (setting osm_lat), they drop out of the WHERE clause.
    // We only need to advance by the number of rows we skipped (generic/no-result).
    offset += skipped + misses
    skipped = 0
    misses = 0
  }

  console.log(`\nDone.`)
  console.log(`  Geocoded (hits):      ${hits}`)
  console.log(`  No result (misses):   ${misses}`)
  console.log(`  Skipped (generic):    ${skipped}`)
  console.log(`  Total processed:      ${processed}`)
  await sql.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
