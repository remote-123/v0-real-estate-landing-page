/**
 * 013_nc_buildings_enrich.ts
 *
 * Adds static enrichment columns to nc_buildings and backfills from:
 *   - prop_building_details → status, master_developer (where missing)
 *   - re_buildings          → osm_lat, osm_lng, global_slug
 *
 * After this runs, the buildings list page can query nc_buildings alone
 * without runtime JOINs to prop_building_details or re_buildings.
 *
 * Run: npx tsx --env-file=.env.local scripts/migrate/013_nc_buildings_enrich.ts
 */

import { sql } from "../ingest/db-client"

async function run() {
  console.log("013 — enriching nc_buildings with static fields...\n")

  // ── 1. Add columns ─────────────────────────────────────────────────────────
  console.log("Adding columns...")

  await sql`ALTER TABLE nc_buildings ADD COLUMN IF NOT EXISTS status TEXT`
  await sql`ALTER TABLE nc_buildings ADD COLUMN IF NOT EXISTS osm_lat DOUBLE PRECISION`
  await sql`ALTER TABLE nc_buildings ADD COLUMN IF NOT EXISTS osm_lng DOUBLE PRECISION`
  await sql`ALTER TABLE nc_buildings ADD COLUMN IF NOT EXISTS global_slug TEXT`

  console.log("✓ Columns added (status, osm_lat, osm_lng, global_slug)")

  // ── 2. Backfill status from prop_building_details ──────────────────────────
  console.log("\nBackfilling status from prop_building_details...")

  const statusResult = await sql`
    UPDATE nc_buildings nb
    SET status = pbd.status
    FROM prop_building_details pbd
    WHERE pbd.building_slug = nb.propsearch_slug
      AND nb.propsearch_slug IS NOT NULL
      AND pbd.status IS NOT NULL
  `
  console.log(`✓ status: ${statusResult.count} rows updated`)

  // ── 3. Backfill osm_lat, osm_lng, global_slug from re_buildings ────────────
  console.log("\nBackfilling osm_lat, osm_lng, global_slug from re_buildings...")

  const coordResult = await sql`
    UPDATE nc_buildings nb
    SET
      osm_lat     = rb.osm_lat,
      osm_lng     = rb.osm_lng,
      global_slug = rb.global_slug
    FROM re_buildings rb
    WHERE rb.propsearch_slug = nb.propsearch_slug
      AND nb.propsearch_slug IS NOT NULL
  `
  console.log(`✓ re_buildings enrichment: ${coordResult.count} rows updated`)

  // ── 4. Backfill master_developer where missing ─────────────────────────────
  console.log("\nBackfilling master_developer where NULL...")

  const masterDevResult = await sql`
    UPDATE nc_buildings nb
    SET master_developer = rb.master_developer_name
    FROM re_buildings rb
    WHERE rb.propsearch_slug = nb.propsearch_slug
      AND nb.propsearch_slug IS NOT NULL
      AND nb.master_developer IS NULL
      AND rb.master_developer_name IS NOT NULL
  `
  console.log(`✓ master_developer: ${masterDevResult.count} rows updated`)

  // ── 5. Indexes ─────────────────────────────────────────────────────────────
  console.log("\nCreating indexes...")

  await sql`CREATE INDEX IF NOT EXISTS nc_buildings_status_idx ON nc_buildings (status)`
  await sql`CREATE INDEX IF NOT EXISTS nc_buildings_global_slug_idx ON nc_buildings (global_slug)`

  console.log("✓ Indexes created")

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  console.log("\n── Summary ──────────────────────────────────────────────────")

  const stats = await sql<{ status: string | null; cnt: string }[]>`
    SELECT status, COUNT(*)::text AS cnt FROM nc_buildings GROUP BY status ORDER BY 2 DESC
  `
  console.log("Status distribution:")
  for (const r of stats) console.log(`  ${r.status ?? '(null)'}: ${r.cnt}`)

  const coordStats = await sql<{ has_coords: string; cnt: string }[]>`
    SELECT (osm_lat IS NOT NULL)::text AS has_coords, COUNT(*)::text AS cnt
    FROM nc_buildings GROUP BY has_coords
  `
  console.log("\nWith coordinates:")
  for (const r of coordStats) console.log(`  ${r.has_coords}: ${r.cnt}`)

  const slugStats = await sql<{ has_slug: string; cnt: string }[]>`
    SELECT (global_slug IS NOT NULL)::text AS has_slug, COUNT(*)::text AS cnt
    FROM nc_buildings GROUP BY has_slug
  `
  console.log("\nWith global_slug:")
  for (const r of slugStats) console.log(`  ${r.has_slug}: ${r.cnt}`)

  await sql.end()
  console.log("\nDone.")
}

run().catch(err => { console.error(err); process.exit(1) })
