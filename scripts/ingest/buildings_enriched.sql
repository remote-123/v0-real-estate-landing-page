-- DDL for buildings_enriched table
-- Seeded from dld_transactions (Phase 1), enriched later with propsearch.ae + OSM data
--
-- FUTURE: Once a DLD dataset with dld_building_nk is ingested, add:
--   ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS dld_building_nk text;
-- Then cross-ref via rental_listings.raw->>'legal.dld_building_nk' for exact age matching.
-- See: memory/MEMORY.md "Open Data Problem: Building Age Matching"

CREATE TABLE IF NOT EXISTS buildings_enriched (
  -- ── Primary identity ──────────────────────────────────────────────────────
  building_key          text PRIMARY KEY,     -- "{building_name_en}||{area_id}" dedup key
  slug                  text UNIQUE NOT NULL, -- url-safe: "{name-slug}--{area-slug}"
  building_name_en      text NOT NULL,        -- canonical name from dld_transactions
  area_id               integer,
  area_name_en          text,

  -- ── Structural (matched from dld_buildings_registry) ─────────────────────
  registry_property_id  text,
  floors                integer,
  flats                 integer,
  bld_levels            integer,
  car_parks             integer,
  is_free_hold          boolean,
  is_lease_hold         boolean,
  project_id            integer,
  project_name_en       text,
  master_project_en     text,
  registry_creation_date date,
  registry_match_method text,               -- "project_exact", "name_similarity", "none"
  registry_match_score  numeric(4,3),

  -- ── Developer / project metadata (from dld_projects) ─────────────────────
  developer_name        text,
  master_developer_name text,
  project_status        text,
  project_completion_date date,
  project_start_date    date,
  completion_year       integer,            -- for rental-drops Built column

  -- ── Transaction stats (recomputed on re-run) ──────────────────────────────
  txn_count             integer,
  first_txn_date        date,
  last_txn_date         date,
  avg_psf               numeric(10,2),
  median_psf            numeric(10,2),
  avg_unit_size_sqft    numeric(10,1),
  primary_sub_type      text,

  -- ── Future enrichment placeholders ───────────────────────────────────────
  propsearch_slug       text,               -- Phase 2: propsearch.ae URL slug
  propsearch_status     text,               -- "complete", "under_construction", "planned", "cancelled"
  propsearch_scraped_at timestamptz,
  osm_lat               double precision,   -- Phase 3: Overpass API coordinates
  osm_lng               double precision,
  osm_node_id           bigint,
  verified_name         text,               -- human-corrected canonical name

  -- ── Audit ─────────────────────────────────────────────────────────────────
  enriched_at           timestamptz,
  seeded_at             timestamptz DEFAULT now(),
  stats_refreshed_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buildings_enriched_building_name_idx
  ON buildings_enriched (building_name_en);
CREATE INDEX IF NOT EXISTS buildings_enriched_area_id_idx
  ON buildings_enriched (area_id);
CREATE INDEX IF NOT EXISTS buildings_enriched_area_name_idx
  ON buildings_enriched (area_name_en);
CREATE INDEX IF NOT EXISTS buildings_enriched_completion_year_idx
  ON buildings_enriched (completion_year);
CREATE INDEX IF NOT EXISTS buildings_enriched_project_id_idx
  ON buildings_enriched (project_id);
CREATE INDEX IF NOT EXISTS buildings_enriched_area_subtype_idx
  ON buildings_enriched (area_id, primary_sub_type);
