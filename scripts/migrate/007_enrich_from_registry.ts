/**
 * 007 — Enrich re_buildings from dld_buildings_registry
 *
 * Strategy:
 *   1. Aggregate dld_buildings_registry by parent_property_id
 *      → total_units, total_floors, property_types (bedroom mix)
 *   2. JOIN dld_projects for developer_name, completion_year
 *   3. UPDATE re_buildings via exact area + name match
 *   4. UPDATE re_buildings via fuzzy name match (pg_trgm, threshold 0.4)
 *   5. INSERT new buildings found in registry but not in re_buildings
 *
 * Run:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/migrate/007_enrich_from_registry.ts
 */

import "dotenv/config"
import { sql } from "../ingest/db-client"

async function run() {
  console.log("007 — Enrich re_buildings from dld_buildings_registry")

  // ──────────────────────────────────────────────────────────────────────────
  // 0. Enable pg_trgm
  // ──────────────────────────────────────────────────────────────────────────
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`
  console.log("  ✓ pg_trgm enabled")

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Create staging table: aggregated registry buildings
  // ──────────────────────────────────────────────────────────────────────────
  await sql`DROP TABLE IF EXISTS _registry_agg`
  await sql`
    CREATE TEMP TABLE _registry_agg AS
    SELECT
      r.parent_property_id,
      r.area_id AS registry_area_id,
      r.area_name_en,
      r.project_id,
      r.project_name_en,
      r.master_project_en,
      MAX(r.floors)            AS total_floors,
      COUNT(*)::int            AS total_units,
      BOOL_OR(r.is_free_hold)  AS is_free_hold,
      BOOL_OR(r.is_lease_hold) AS is_lease_hold,
      ARRAY_TO_STRING(ARRAY_AGG(DISTINCT r.rooms_en), '/') AS property_types,
      MIN(r.creation_date)     AS creation_date
    FROM dld_buildings_registry r
    WHERE r.parent_property_id IS NOT NULL
    GROUP BY r.parent_property_id, r.area_id, r.area_name_en, r.project_id, r.project_name_en, r.master_project_en
  `
  const { count: stagingCount } = await sql`SELECT COUNT(*) AS count FROM _registry_agg`
    .then(rows => ({ count: Number(rows[0].count) }))
  console.log(`  ✓ ${stagingCount} registry buildings staged`)

  // Add trgm index on project_name for fuzzy matching
  await sql`CREATE INDEX IF NOT EXISTS _registry_agg_trgm ON _registry_agg USING gin (LOWER(project_name_en) gin_trgm_ops)`

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Exact match: update re_buildings by area + exact name
  // ──────────────────────────────────────────────────────────────────────────
  const exactResult = await sql`
    UPDATE re_buildings rb
    SET
      registry_property_id = ra_stg.parent_property_id,
      total_floors          = COALESCE(rb.total_floors, ra_stg.total_floors),
      total_units           = COALESCE(rb.total_units, ra_stg.total_units),
      property_types        = COALESCE(rb.property_types, ra_stg.property_types),
      is_free_hold          = COALESCE(rb.is_free_hold, ra_stg.is_free_hold),
      is_lease_hold         = COALESCE(rb.is_lease_hold, ra_stg.is_lease_hold),
      stats_refreshed_at    = NOW()
    FROM _registry_agg ra_stg
    JOIN re_areas area ON area.local_area_id = ra_stg.registry_area_id
    WHERE rb.area_id = area.area_id
      AND LOWER(TRIM(rb.building_name_en)) = LOWER(TRIM(ra_stg.project_name_en))
      AND ra_stg.project_name_en IS NOT NULL
    RETURNING rb.building_id
  `
  console.log(`  ✓ ${exactResult.length} buildings updated via exact name match`)

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Fuzzy match: remaining re_buildings without registry_property_id
  // ──────────────────────────────────────────────────────────────────────────
  const fuzzyResult = await sql`
    UPDATE re_buildings rb
    SET
      registry_property_id = best.parent_property_id,
      total_floors          = COALESCE(rb.total_floors, best.total_floors),
      total_units           = COALESCE(rb.total_units, best.total_units),
      property_types        = COALESCE(rb.property_types, best.property_types),
      is_free_hold          = COALESCE(rb.is_free_hold, best.is_free_hold),
      is_lease_hold         = COALESCE(rb.is_lease_hold, best.is_lease_hold),
      stats_refreshed_at    = NOW()
    FROM (
      SELECT DISTINCT ON (rb2.building_id)
        rb2.building_id,
        ra_stg.parent_property_id,
        ra_stg.total_floors,
        ra_stg.total_units,
        ra_stg.property_types,
        ra_stg.is_free_hold,
        ra_stg.is_lease_hold,
        SIMILARITY(LOWER(rb2.building_name_en), LOWER(ra_stg.project_name_en)) AS score
      FROM re_buildings rb2
      JOIN re_areas area2 ON area2.area_id = rb2.area_id
      JOIN _registry_agg ra_stg ON ra_stg.registry_area_id = area2.local_area_id
        AND SIMILARITY(LOWER(rb2.building_name_en), LOWER(ra_stg.project_name_en)) > 0.4
      WHERE rb2.registry_property_id IS NULL
        AND ra_stg.project_name_en IS NOT NULL
        AND ra_stg.total_units > 1
      ORDER BY rb2.building_id, SIMILARITY(LOWER(rb2.building_name_en), LOWER(ra_stg.project_name_en)) DESC
    ) best
    WHERE rb.building_id = best.building_id
    RETURNING rb.building_id
  `
  console.log(`  ✓ ${fuzzyResult.length} buildings updated via fuzzy name match`)

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Enrich developer/completion from dld_projects where project_id matches
  // ──────────────────────────────────────────────────────────────────────────
  const projResult = await sql`
    UPDATE re_buildings rb
    SET
      project_id              = ra_stg.project_id,
      project_name_en         = COALESCE(rb.project_name_en, dp.project_name_en),
      master_project_en       = COALESCE(rb.master_project_en, ra_stg.master_project_en),
      developer_name          = COALESCE(rb.developer_name, dp.developer_name),
      master_developer_name   = COALESCE(rb.master_developer_name, dp.master_developer_name),
      completion_year         = COALESCE(rb.completion_year,
                                  EXTRACT(YEAR FROM dp.completion_date)::int),
      project_completion_date = COALESCE(rb.project_completion_date, dp.completion_date),
      project_start_date      = COALESCE(rb.project_start_date, dp.project_start_date),
      project_status          = COALESCE(rb.project_status, dp.project_status),
      stats_refreshed_at      = NOW()
    FROM _registry_agg ra_stg
    JOIN dld_projects dp ON dp.project_id = ra_stg.project_id
    WHERE rb.registry_property_id = ra_stg.parent_property_id
      AND ra_stg.project_id IS NOT NULL
    RETURNING rb.building_id
  `
  console.log(`  ✓ ${projResult.length} buildings enriched with dld_projects data`)

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Insert NEW buildings from registry not yet in re_buildings
  //    (only multi-unit buildings, area must exist in re_areas)
  // ──────────────────────────────────────────────────────────────────────────
  const dubaiCityId = await sql<{ city_id: number }[]>`
    SELECT city_id FROM re_cities WHERE city_slug = 'dubai'
  `.then(rows => rows[0].city_id)

  const insertResult = await sql`
    INSERT INTO re_buildings (
      city_id, area_id, city_slug, area_slug, building_slug, global_slug,
      building_name_en, area_name_en,
      registry_property_id, project_id, project_name_en, master_project_en,
      total_floors, total_units, property_types,
      is_free_hold, is_lease_hold,
      developer_name, master_developer_name,
      completion_year, project_completion_date, project_start_date, project_status,
      data_source, seeded_at, stats_refreshed_at
    )
    SELECT DISTINCT ON (computed_slug)
      ${dubaiCityId},
      area_id,
      'dubai',
      area_slug,
      building_slug,
      computed_slug AS global_slug,
      building_name_en,
      area_name_en,
      parent_property_id,
      project_id,
      project_name_en,
      master_project_en,
      total_floors,
      total_units,
      property_types,
      is_free_hold,
      is_lease_hold,
      developer_name,
      master_developer_name,
      completion_yr,
      completion_date,
      project_start_date,
      project_status,
      'dld_registry',
      NOW(),
      NOW()
    FROM (
      SELECT
        area.area_id,
        area.area_slug,
        LOWER(REGEXP_REPLACE(TRIM(ra_stg.project_name_en), '[^a-zA-Z0-9]+', '-', 'g')) AS building_slug,
        'dubai/' || area.area_slug || '/' ||
          LOWER(REGEXP_REPLACE(TRIM(ra_stg.project_name_en), '[^a-zA-Z0-9]+', '-', 'g')) AS computed_slug,
        ra_stg.project_name_en AS building_name_en,
        area.area_name_en,
        ra_stg.parent_property_id,
        ra_stg.project_id,
        ra_stg.project_name_en,
        ra_stg.master_project_en,
        ra_stg.total_floors,
        ra_stg.total_units,
        ra_stg.property_types,
        ra_stg.is_free_hold,
        ra_stg.is_lease_hold,
        dp.developer_name,
        dp.master_developer_name,
        EXTRACT(YEAR FROM dp.completion_date)::int AS completion_yr,
        dp.completion_date,
        dp.project_start_date,
        dp.project_status
      FROM _registry_agg ra_stg
      JOIN re_areas area ON area.local_area_id = ra_stg.registry_area_id
      LEFT JOIN dld_projects dp ON dp.project_id = ra_stg.project_id
      WHERE ra_stg.project_name_en IS NOT NULL
        AND ra_stg.total_units > 4
        AND NOT EXISTS (
          SELECT 1 FROM re_buildings rb2 WHERE rb2.registry_property_id = ra_stg.parent_property_id
        )
    ) sub
    ORDER BY computed_slug, total_units DESC
    ON CONFLICT (global_slug) DO UPDATE SET
      total_units    = EXCLUDED.total_units,
      total_floors   = EXCLUDED.total_floors,
      property_types = EXCLUDED.property_types,
      stats_refreshed_at = NOW()
    RETURNING building_id
  `
  console.log(`  ✓ ${insertResult.length} new buildings inserted from registry`)

  // ──────────────────────────────────────────────────────────────────────────
  // Final stats
  // ──────────────────────────────────────────────────────────────────────────
  const final = await sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE registry_property_id IS NOT NULL) AS with_registry,
      COUNT(*) FILTER (WHERE total_units IS NOT NULL) AS with_units,
      COUNT(*) FILTER (WHERE total_floors IS NOT NULL) AS with_floors,
      COUNT(*) FILTER (WHERE developer_name IS NOT NULL) AS with_developer
    FROM re_buildings
  `
  console.log("\n📊 Final re_buildings stats:")
  console.log(`   Total buildings:         ${final[0].total}`)
  console.log(`   With registry match:     ${final[0].with_registry}`)
  console.log(`   With unit count:         ${final[0].with_units}`)
  console.log(`   With floor count:        ${final[0].with_floors}`)
  console.log(`   With developer name:     ${final[0].with_developer}`)

  console.log("\n✅ Migration 007 complete")
  await sql.end()
}

run().catch(err => {
  console.error("Migration failed:", err)
  process.exit(1)
})
