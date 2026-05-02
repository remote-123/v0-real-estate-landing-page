/**
 * 006 — Global buildings schema migration
 *
 * Creates:
 *   re_cities    — city registry (starts with Dubai)
 *   re_areas     — area registry with city FK, mirroring dld_areas
 *   re_buildings — canonical building table with global_slug
 *
 * Migrates:
 *   dld_areas → re_areas
 *   buildings_enriched → re_buildings
 *
 * Creates compatibility view:
 *   buildings_enriched (VIEW) over re_buildings + re_areas
 *   (renames old table to buildings_enriched_legacy)
 *
 * Run:
 *   dotenv -e .env.local -- npx tsx scripts/migrate/006_global_buildings_schema.ts
 */

import "dotenv/config"
import { sql } from "../ingest/neon-client"

async function run() {
  console.log("006 — Global buildings schema: re_cities, re_areas, re_buildings")

  // ──────────────────────────────────────────────────────────────────────────
  // 1. re_cities
  // ──────────────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS re_cities (
      city_id       SERIAL PRIMARY KEY,
      city_slug     TEXT NOT NULL UNIQUE,
      city_name_en  TEXT NOT NULL,
      country_code  CHAR(2)  NOT NULL DEFAULT 'AE',
      currency_code CHAR(3)  NOT NULL DEFAULT 'AED',
      timezone      TEXT     NOT NULL DEFAULT 'Asia/Dubai',
      is_active     BOOLEAN  NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  console.log("  ✓ re_cities table ready")

  // Seed Dubai
  await sql`
    INSERT INTO re_cities (city_slug, city_name_en, country_code, currency_code, timezone)
    VALUES ('dubai', 'Dubai', 'AE', 'AED', 'Asia/Dubai')
    ON CONFLICT (city_slug) DO NOTHING
  `
  console.log("  ✓ Dubai seeded")

  // ──────────────────────────────────────────────────────────────────────────
  // 2. re_areas
  // ──────────────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS re_areas (
      area_id       SERIAL PRIMARY KEY,
      city_id       INT NOT NULL REFERENCES re_cities(city_id) ON DELETE RESTRICT,
      area_slug     TEXT NOT NULL,
      area_name_en  TEXT NOT NULL,
      local_area_id INT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (city_id, area_slug),
      UNIQUE (city_id, local_area_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS re_areas_city_id_idx ON re_areas (city_id)`
  console.log("  ✓ re_areas table ready")

  // Migrate dld_areas → re_areas
  const dubaiCityId = await sql<{ city_id: number }[]>`
    SELECT city_id FROM re_cities WHERE city_slug = 'dubai'
  `.then(rows => rows[0].city_id)

  const { count: areaCount } = await sql`
    INSERT INTO re_areas (city_id, area_slug, area_name_en, local_area_id)
    SELECT
      ${dubaiCityId},
      slug,
      name_en,
      area_id
    FROM (
      SELECT DISTINCT ON (LOWER(REGEXP_REPLACE(TRIM(name_en), '[^a-zA-Z0-9]+', '-', 'g')))
        area_id,
        TRIM(name_en) AS name_en,
        LOWER(REGEXP_REPLACE(TRIM(name_en), '[^a-zA-Z0-9]+', '-', 'g')) AS slug
      FROM dld_areas
      WHERE name_en IS NOT NULL AND TRIM(name_en) <> ''
      ORDER BY LOWER(REGEXP_REPLACE(TRIM(name_en), '[^a-zA-Z0-9]+', '-', 'g')), area_id ASC
    ) deduped
    ON CONFLICT (city_id, area_slug) DO UPDATE
      SET area_name_en = EXCLUDED.area_name_en
    RETURNING area_id
  `.then(rows => ({ count: rows.length }))
  console.log(`  ✓ ${areaCount} areas migrated from dld_areas`)

  // ──────────────────────────────────────────────────────────────────────────
  // 3. re_buildings
  // ──────────────────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS re_buildings (
      building_id     BIGSERIAL PRIMARY KEY,

      -- ── Location hierarchy ──────────────────────────────────────────────
      city_id         INT  NOT NULL REFERENCES re_cities(city_id) ON DELETE RESTRICT,
      area_id         INT  REFERENCES re_areas(area_id) ON DELETE SET NULL,
      city_slug       TEXT NOT NULL,
      area_slug       TEXT,
      building_slug   TEXT NOT NULL,
      global_slug     TEXT NOT NULL UNIQUE,  -- 'dubai/downtown-dubai/burj-khalifa'
      slug            TEXT UNIQUE,           -- legacy: 'burj-khalifa--downtown-dubai'

      -- ── Identity ────────────────────────────────────────────────────────
      building_key      TEXT UNIQUE,
      building_name_en  TEXT NOT NULL,
      area_name_en      TEXT,

      -- ── Structural (from dld_buildings_registry / propsearch) ───────────
      registry_property_id    TEXT,
      floors                  INT,
      flats                   INT,
      bld_levels              INT,
      car_parks               INT,
      is_free_hold            BOOLEAN,
      is_lease_hold           BOOLEAN,
      project_id              INT,
      project_name_en         TEXT,
      master_project_en       TEXT,
      registry_creation_date  DATE,
      registry_match_method   TEXT,
      registry_match_score    NUMERIC(4,3),

      -- ── Developer / project ─────────────────────────────────────────────
      developer_name          TEXT,
      master_developer_name   TEXT,
      project_status          TEXT,
      project_completion_date DATE,
      project_start_date      DATE,
      completion_year         INT,

      -- ── Transaction stats ───────────────────────────────────────────────
      txn_count               INT,
      first_txn_date          DATE,
      last_txn_date           DATE,
      avg_psf                 NUMERIC(12,2),
      median_psf              NUMERIC(12,2),
      avg_unit_size_sqft      NUMERIC(10,1),
      primary_sub_type        TEXT,

      -- ── Enrichment ──────────────────────────────────────────────────────
      propsearch_slug         TEXT,
      propsearch_status       TEXT,
      propsearch_scraped_at   TIMESTAMPTZ,
      osm_lat                 DOUBLE PRECISION,
      osm_lng                 DOUBLE PRECISION,
      osm_node_id             BIGINT,
      verified_name           TEXT,

      -- ── Phase 2 (buildings_registry aggregate) ──────────────────────────
      total_floors    INT,
      total_units     INT,
      property_types  TEXT,
      amenities       TEXT,

      -- ── Data provenance ─────────────────────────────────────────────────
      data_source     TEXT NOT NULL DEFAULT 'dld',

      -- ── Audit ───────────────────────────────────────────────────────────
      enriched_at         TIMESTAMPTZ,
      seeded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      stats_refreshed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS re_buildings_city_id_idx     ON re_buildings (city_id)`
  await sql`CREATE INDEX IF NOT EXISTS re_buildings_area_id_idx     ON re_buildings (area_id)`
  await sql`CREATE INDEX IF NOT EXISTS re_buildings_name_idx        ON re_buildings (building_name_en)`
  await sql`CREATE INDEX IF NOT EXISTS re_buildings_area_name_idx   ON re_buildings (area_name_en)`
  await sql`CREATE INDEX IF NOT EXISTS re_buildings_completion_idx  ON re_buildings (completion_year)`
  await sql`CREATE INDEX IF NOT EXISTS re_buildings_status_idx      ON re_buildings (propsearch_status)`
  await sql`CREATE INDEX IF NOT EXISTS re_buildings_coords_idx      ON re_buildings (osm_lat, osm_lng) WHERE osm_lat IS NOT NULL`
  console.log("  ✓ re_buildings table + indexes ready")

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Migrate buildings_enriched → re_buildings
  // ──────────────────────────────────────────────────────────────────────────
  const { count: bldCount } = await sql`
    INSERT INTO re_buildings (
      city_id, area_id, city_slug, area_slug, building_slug, global_slug, slug,
      building_key, building_name_en, area_name_en,
      registry_property_id, floors, flats, bld_levels, car_parks,
      is_free_hold, is_lease_hold,
      project_id, project_name_en, master_project_en,
      registry_creation_date, registry_match_method, registry_match_score,
      developer_name, master_developer_name,
      project_status, project_completion_date, project_start_date, completion_year,
      txn_count, first_txn_date, last_txn_date,
      avg_psf, median_psf, avg_unit_size_sqft, primary_sub_type,
      propsearch_slug, propsearch_status, propsearch_scraped_at,
      osm_lat, osm_lng, osm_node_id, verified_name,
      total_floors, total_units, property_types, amenities,
      data_source, enriched_at, seeded_at, stats_refreshed_at
    )
    SELECT
      ${dubaiCityId} AS city_id,
      ra.area_id,
      'dubai' AS city_slug,

      -- area_slug: derive from slug (format: "building-name--area-slug")
      CASE
        WHEN be.slug LIKE '%---%'
          THEN SUBSTRING(be.slug FROM POSITION('---' IN be.slug) + 3)
        WHEN be.slug LIKE '%--%'
          THEN SUBSTRING(be.slug FROM POSITION('--' IN be.slug) + 2)
        ELSE NULL
      END AS area_slug,

      -- building_slug: part before '--'
      CASE
        WHEN be.slug LIKE '%---%'
          THEN SUBSTRING(be.slug FOR POSITION('---' IN be.slug) - 1)
        WHEN be.slug LIKE '%--%'
          THEN SUBSTRING(be.slug FOR POSITION('--' IN be.slug) - 1)
        ELSE be.slug
      END AS building_slug,

      -- global_slug: 'dubai/{area_slug}/{building_slug}'
      CONCAT(
        'dubai/',
        COALESCE(
          CASE
            WHEN be.slug LIKE '%---%'
              THEN SUBSTRING(be.slug FROM POSITION('---' IN be.slug) + 3)
            WHEN be.slug LIKE '%--%'
              THEN SUBSTRING(be.slug FROM POSITION('--' IN be.slug) + 2)
            ELSE NULL
          END,
          LOWER(REGEXP_REPLACE(TRIM(COALESCE(be.area_name_en, 'unknown')), '[^a-zA-Z0-9]+', '-', 'g'))
        ),
        '/',
        CASE
          WHEN be.slug LIKE '%---%'
            THEN SUBSTRING(be.slug FOR POSITION('---' IN be.slug) - 1)
          WHEN be.slug LIKE '%--%'
            THEN SUBSTRING(be.slug FOR POSITION('--' IN be.slug) - 1)
          ELSE be.slug
        END
      ) AS global_slug,

      be.slug,
      be.building_key,
      be.building_name_en,
      be.area_name_en,
      be.registry_property_id,
      be.floors, be.flats, be.bld_levels, be.car_parks,
      be.is_free_hold, be.is_lease_hold,
      be.project_id, be.project_name_en, be.master_project_en,
      be.registry_creation_date, be.registry_match_method, be.registry_match_score,
      be.developer_name, be.master_developer_name,
      be.project_status, be.project_completion_date, be.project_start_date, be.completion_year,
      be.txn_count, be.first_txn_date, be.last_txn_date,
      be.avg_psf, be.median_psf, be.avg_unit_size_sqft, be.primary_sub_type,
      be.propsearch_slug, be.propsearch_status, be.propsearch_scraped_at,
      be.osm_lat, be.osm_lng, be.osm_node_id, be.verified_name,
      be.total_floors, be.total_units, be.property_types, be.amenities,
      'dld' AS data_source,
      be.enriched_at, be.seeded_at, be.stats_refreshed_at
    FROM buildings_enriched be
    LEFT JOIN re_areas ra
      ON ra.city_id = (SELECT city_id FROM re_cities WHERE city_slug = 'dubai')
      AND ra.local_area_id = be.area_id
    WHERE be.building_name_en IS NOT NULL
    ON CONFLICT (global_slug) DO UPDATE SET
      building_name_en    = EXCLUDED.building_name_en,
      area_name_en        = EXCLUDED.area_name_en,
      txn_count           = EXCLUDED.txn_count,
      avg_psf             = EXCLUDED.avg_psf,
      stats_refreshed_at  = NOW()
    RETURNING building_id
  `.then(rows => ({ count: rows.length }))
  console.log(`  ✓ ${bldCount} buildings migrated to re_buildings`)

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Rename old table, create compatibility VIEW
  // ──────────────────────────────────────────────────────────────────────────
  // Check if buildings_enriched is still a table (not yet renamed)
  const tableCheck = await sql<{ relkind: string }[]>`
    SELECT relkind FROM pg_class
    WHERE relname = 'buildings_enriched'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `
  const isTable = tableCheck.length > 0 && tableCheck[0].relkind === 'r'

  if (isTable) {
    await sql`ALTER TABLE buildings_enriched RENAME TO buildings_enriched_legacy`
    console.log("  ✓ buildings_enriched renamed to buildings_enriched_legacy")
  } else {
    console.log("  ℹ buildings_enriched already renamed (or is a view) — skipping rename")
  }

  // Drop view if it exists (idempotent re-run)
  await sql`DROP VIEW IF EXISTS buildings_enriched`

  await sql`
    CREATE VIEW buildings_enriched AS
    SELECT
      rb.building_key,
      rb.slug,
      rb.building_name_en,
      ra.local_area_id AS area_id,
      rb.area_name_en,
      rb.registry_property_id,
      rb.floors,
      rb.flats,
      rb.bld_levels,
      rb.car_parks,
      rb.is_free_hold,
      rb.is_lease_hold,
      rb.project_id,
      rb.project_name_en,
      rb.master_project_en,
      rb.registry_creation_date,
      rb.registry_match_method,
      rb.registry_match_score,
      rb.developer_name,
      rb.master_developer_name,
      rb.project_status,
      rb.project_completion_date,
      rb.project_start_date,
      rb.completion_year,
      rb.txn_count,
      rb.first_txn_date,
      rb.last_txn_date,
      rb.avg_psf,
      rb.median_psf,
      rb.avg_unit_size_sqft,
      rb.primary_sub_type,
      rb.propsearch_slug,
      rb.propsearch_status,
      rb.propsearch_scraped_at,
      rb.osm_lat,
      rb.osm_lng,
      rb.osm_node_id,
      rb.verified_name,
      rb.total_floors,
      rb.total_units,
      rb.property_types,
      rb.amenities,
      rb.enriched_at,
      rb.seeded_at,
      rb.stats_refreshed_at
    FROM re_buildings rb
    LEFT JOIN re_areas ra ON ra.area_id = rb.area_id
  `
  console.log("  ✓ buildings_enriched compatibility view created")

  console.log("\n✅ Migration 006 complete")
  await sql.end()
}

run().catch(err => {
  console.error("Migration failed:", err)
  process.exit(1)
})
