/**
 * Seed the `buildings_enriched` table from existing DLD data.
 *
 * Phase 1 — zero external API calls:
 *   1. Extract unique buildings from dld_transactions (with aggregated stats)
 *   2. Cross-reference dld_buildings_registry for structural data (floors, flats, etc.)
 *   3. Cross-reference dld_projects for developer + completion year
 *
 * Re-run safely: ON CONFLICT updates stats columns only; enrichment columns survive.
 *
 * Run: npx tsx --env-file=.env.local scripts/ingest/buildings_enriched.ts
 */

import fs from "fs"
import path from "path"
import { sql } from "./db-client"

const BATCH_SIZE = 200
const MIN_TXN_COUNT = 3 // skip noise / single-entry buildings

// ── Slug helpers ─────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function buildingKey(name: string, areaId: number): string {
  return `${name}||${areaId}`
}

function buildingSlug(buildingName: string, areaName: string): string {
  return `${toSlug(buildingName)}--${toSlug(areaName)}`
}

// ── Name similarity (word-token Jaccard) ─────────────────────────────────────
// Used as fallback when project_name exact match fails.

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

// ── Types ────────────────────────────────────────────────────────────────────

interface TxnBuilding {
  building_name_en: string
  area_id: number
  area_name_en: string
  txn_count: number
  first_txn_date: string
  last_txn_date: string
  avg_psf: number
  median_psf: number
  avg_unit_size_sqft: number
  primary_sub_type: string | null
  project_name_en_hint: string | null
}

interface RegistryRow {
  property_id: string
  floors: number | null
  flats: number | null
  bld_levels: number | null
  car_parks: number | null
  is_free_hold: boolean | null
  is_lease_hold: boolean | null
  project_id: number | null
  project_name_en: string | null
  master_project_en: string | null
  creation_date: string | null
}

interface ProjectRow {
  developer_name: string | null
  master_developer_name: string | null
  project_status: string | null
  completion_date: string | null
  project_start_date: string | null
}

// ── Step 1: Extract unique buildings from transactions ────────────────────────

async function fetchTransactionBuildings(): Promise<TxnBuilding[]> {
  console.log("Querying dld_transactions for unique buildings...")
  const rows = await sql<TxnBuilding[]>`
    SELECT
      building_name_en,
      area_id,
      MAX(area_name_en)                                                          AS area_name_en,
      COUNT(*)::integer                                                           AS txn_count,
      MIN(instance_date)::text                                                    AS first_txn_date,
      MAX(instance_date)::text                                                    AS last_txn_date,
      ROUND(AVG(meter_sale_price / 10.764)::numeric, 2)                          AS avg_psf,
      ROUND(
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY meter_sale_price / 10.764))::numeric
      , 2)                                                                         AS median_psf,
      ROUND(AVG(procedure_area * 10.764)::numeric, 1)                             AS avg_unit_size_sqft,
      MODE() WITHIN GROUP (ORDER BY property_sub_type_en)                         AS primary_sub_type,
      MAX(project_name_en)                                                        AS project_name_en_hint
    FROM dld_transactions
    WHERE trans_group_en = 'Sales'
      AND building_name_en IS NOT NULL
      AND building_name_en != ''
      AND meter_sale_price BETWEEN 500 AND 150000
    GROUP BY building_name_en, area_id
    HAVING COUNT(*) >= ${MIN_TXN_COUNT}
    ORDER BY area_id, building_name_en
  `
  console.log(`  Found ${rows.length} unique buildings`)
  return rows
}

// ── Step 2: Registry match for a batch of buildings in the same area ──────────

async function fetchRegistryForArea(
  areaId: number,
  buildings: Pick<TxnBuilding, "building_name_en" | "project_name_en_hint">[]
): Promise<Map<string, RegistryRow>> {
  // Pull all registry rows for this area_id in one query
  const registryRows = await sql<(RegistryRow & { project_name_en: string })[]>`
    SELECT
      property_id,
      floors,
      flats,
      bld_levels,
      car_parks,
      is_free_hold,
      is_lease_hold,
      project_id,
      project_name_en,
      master_project_en,
      creation_date::text AS creation_date
    FROM dld_buildings_registry
    WHERE area_id = ${areaId}
      AND project_name_en IS NOT NULL
    ORDER BY flats DESC NULLS LAST
  `

  const result = new Map<string, RegistryRow>()

  for (const b of buildings) {
    const key = b.building_name_en

    // Try exact match on project_name_en_hint first
    if (b.project_name_en_hint) {
      const exact = registryRows.find(
        r => r.project_name_en?.toLowerCase() === b.project_name_en_hint!.toLowerCase()
      )
      if (exact) {
        result.set(key, exact)
        continue
      }
    }

    // Fallback: best Jaccard similarity against building_name_en
    let best: RegistryRow | null = null
    let bestScore = 0
    for (const r of registryRows) {
      const score = jaccard(b.building_name_en, r.project_name_en ?? "")
      if (score > bestScore) { bestScore = score; best = r }
    }

    // Only accept similarity matches above threshold
    if (best && bestScore >= 0.3) {
      result.set(key, best)
    }
  }

  return result
}

// ── Step 3: Project enrichment for a batch of buildings in the same area ──────

async function fetchProjectsForArea(areaId: number): Promise<ProjectRow[]> {
  return sql<ProjectRow[]>`
    SELECT
      developer_name,
      master_developer_name,
      project_status,
      completion_date::text AS completion_date,
      project_start_date::text AS project_start_date
    FROM dld_projects
    WHERE area_id = ${areaId}
    ORDER BY completion_date DESC NULLS LAST
  `
}

// ── Upsert batch ─────────────────────────────────────────────────────────────

async function upsertBatch(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return
  await sql`
    INSERT INTO buildings_enriched ${sql(rows)}
    ON CONFLICT (building_key) DO UPDATE SET
      txn_count            = EXCLUDED.txn_count,
      first_txn_date       = EXCLUDED.first_txn_date,
      last_txn_date        = EXCLUDED.last_txn_date,
      avg_psf              = EXCLUDED.avg_psf,
      median_psf           = EXCLUDED.median_psf,
      avg_unit_size_sqft   = EXCLUDED.avg_unit_size_sqft,
      primary_sub_type     = EXCLUDED.primary_sub_type,
      stats_refreshed_at   = now()
    -- enrichment columns (propsearch_slug, osm_lat/lng, verified_name) are NOT updated
    -- so Phase 2/3 enrichments survive re-runs
  `
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Apply schema
  console.log("Applying schema...")
  const ddl = fs.readFileSync(
    path.join(process.cwd(), "scripts/ingest/buildings_enriched.sql"),
    "utf8"
  )
  await sql.unsafe(ddl)
  console.log("Schema ready.")

  // Step 1: fetch all unique buildings
  const buildings = await fetchTransactionBuildings()

  // Group by area_id for batched lookups
  const byArea = new Map<number, TxnBuilding[]>()
  for (const b of buildings) {
    const list = byArea.get(b.area_id) ?? []
    list.push(b)
    byArea.set(b.area_id, list)
  }

  console.log(`Processing ${byArea.size} areas...`)
  let inserted = 0
  let batch: Record<string, unknown>[] = []

  const flushBatch = async () => {
    await upsertBatch(batch)
    inserted += batch.length
    process.stdout.write(`\r  Upserted: ${inserted}`)
    batch = []
  }

  for (const [areaId, areaBuildings] of byArea) {
    // Step 2: registry match for all buildings in this area
    const registryMap = await fetchRegistryForArea(areaId, areaBuildings)

    // Step 3: project data for this area (pick best match per building)
    const projects = await fetchProjectsForArea(areaId)
    // Use first non-null developer as area-level fallback
    const areaProjectFallback = projects[0] ?? null

    for (const b of areaBuildings) {
      const reg = registryMap.get(b.building_name_en)

      // Match registry to project for developer enrichment
      let proj: ProjectRow | null = null
      if (reg?.project_id) {
        proj = projects.find(p => (p as any).project_id === reg.project_id) ?? null
      }
      if (!proj && reg?.project_name_en) {
        proj = projects.find(
          p => (p as any).project_name_en?.toLowerCase() === reg.project_name_en?.toLowerCase()
        ) ?? null
      }
      // Last resort: use best-matching project by name similarity
      if (!proj && projects.length > 0) {
        let bestScore = 0
        for (const p of projects) {
          const score = jaccard(b.building_name_en, (p as any).project_name_en ?? "")
          if (score > bestScore) { bestScore = score; proj = p }
        }
        if (bestScore < 0.3) proj = null
      }

      const completionDate = proj?.completion_date ?? reg?.creation_date ?? null
      const completionYear = completionDate
        ? parseInt(completionDate.substring(0, 4), 10)
        : null

      // Determine registry match method
      let matchMethod = "none"
      let matchScore = 0
      if (reg) {
        // Determine if it was an exact or similarity match
        if (
          b.project_name_en_hint &&
          reg.project_name_en?.toLowerCase() === b.project_name_en_hint.toLowerCase()
        ) {
          matchMethod = "project_exact"
          matchScore = 1.0
        } else {
          matchMethod = "name_similarity"
          matchScore = jaccard(b.building_name_en, reg.project_name_en ?? "")
        }
      }

      batch.push({
        building_key:           buildingKey(b.building_name_en, b.area_id),
        slug:                   buildingSlug(b.building_name_en, b.area_name_en),
        building_name_en:       b.building_name_en,
        area_id:                b.area_id,
        area_name_en:           b.area_name_en,
        // Registry
        registry_property_id:   reg?.property_id ?? null,
        floors:                 reg?.floors ?? null,
        flats:                  reg?.flats ?? null,
        bld_levels:             reg?.bld_levels ?? null,
        car_parks:              reg?.car_parks ?? null,
        is_free_hold:           reg?.is_free_hold ?? null,
        is_lease_hold:          reg?.is_lease_hold ?? null,
        project_id:             reg?.project_id ?? null,
        project_name_en:        reg?.project_name_en ?? null,
        master_project_en:      reg?.master_project_en ?? null,
        registry_creation_date: reg?.creation_date ?? null,
        registry_match_method:  matchMethod,
        registry_match_score:   matchScore,
        // Project
        developer_name:         proj?.developer_name ?? null,
        master_developer_name:  proj?.master_developer_name ?? null,
        project_status:         proj?.project_status ?? null,
        project_completion_date: proj?.completion_date ?? null,
        project_start_date:     proj?.project_start_date ?? null,
        completion_year:        isNaN(completionYear!) ? null : completionYear,
        // Transaction stats
        txn_count:              b.txn_count,
        first_txn_date:         b.first_txn_date,
        last_txn_date:          b.last_txn_date,
        avg_psf:                b.avg_psf,
        median_psf:             b.median_psf,
        avg_unit_size_sqft:     b.avg_unit_size_sqft,
        primary_sub_type:       b.primary_sub_type,
      })

      if (batch.length >= BATCH_SIZE) await flushBatch()
    }
  }

  await flushBatch()
  console.log(`\nDone. Total buildings seeded: ${inserted}`)
  await sql.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
