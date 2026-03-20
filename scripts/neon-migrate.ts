/**
 * Apply all schema migrations to Neon.
 * Run: npx tsx --env-file=.env.local scripts/neon-migrate.ts
 */
import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

// Derive direct URL from pooled URL (remove -pooler from hostname)
const pooledUrl = process.env.DATABASE_URL!
const directUrl = pooledUrl.replace('-pooler.', '.')

const sql = postgres(directUrl, { ssl: 'require', max: 1 })

const migrations = [
  'dld_areas.sql',
  'dld_market_types.sql',
  'dld_transaction_procedures.sql',
  'dld_price_index.sql',
  'dld_service_charges.sql',
  'dld_buildings_registry.sql',
  'dld_transactions.sql',
  'dld_units.sql',
]

// Extra tables not in the ingest SQL files
const extraSQL = `
CREATE TABLE IF NOT EXISTS buildings (
  property_id         text primary key,
  building_name       text,
  area_name           text,
  floors              integer,
  completion_year     integer,
  developer           text,
  ingested_at         timestamptz default now()
);

CREATE TABLE IF NOT EXISTS dld_projects (
  project_id          integer primary key,
  project_name        text,
  master_project      text,
  area_name           text,
  developer           text,
  expected_completion date,
  units_count         integer,
  status              text,
  ingested_at         timestamptz default now()
);
CREATE INDEX IF NOT EXISTS dld_projects_area_idx ON dld_projects(area_name);
CREATE INDEX IF NOT EXISTS dld_projects_status_idx ON dld_projects(status);

CREATE TABLE IF NOT EXISTS rental_listings (
  id                  bigint generated always as identity primary key,
  property_id         text,
  title               text,
  area_name           text,
  beds                integer,
  price               numeric,
  size_sqft           numeric,
  raw                 jsonb,
  fetched_at          timestamptz default now()
);

CREATE TABLE IF NOT EXISTS reddit_voice_samples (
  id      bigint generated always as identity primary key,
  body    text,
  score   integer,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS market_indicators (
  id          bigint generated always as identity primary key,
  key         text unique,
  value       text,
  updated_at  timestamptz default now()
);

CREATE TABLE IF NOT EXISTS dld_transactions_staging (
  transaction_id text, procedure_id text, trans_group_id text, trans_group_ar text, trans_group_en text,
  procedure_name_ar text, procedure_name_en text, instance_date text,
  property_type_id text, property_type_ar text, property_type_en text,
  property_sub_type_id text, property_sub_type_ar text, property_sub_type_en text,
  property_usage_ar text, property_usage_en text,
  reg_type_id text, reg_type_ar text, reg_type_en text,
  area_id text, area_name_ar text, area_name_en text,
  building_name_ar text, building_name_en text,
  project_number text, project_name_ar text, project_name_en text,
  master_project_ar text, master_project_en text,
  nearest_landmark_ar text, nearest_landmark_en text,
  nearest_metro_ar text, nearest_metro_en text,
  nearest_mall_ar text, nearest_mall_en text,
  rooms_ar text, rooms_en text, has_parking text,
  procedure_area text, actual_worth text, meter_sale_price text,
  rent_value text, meter_rent_price text,
  no_of_parties_role_1 text, no_of_parties_role_2 text, no_of_parties_role_3 text
);

CREATE TABLE IF NOT EXISTS dld_units_staging (
  property_id text, area_id text, zone_id text,
  area_name_ar text, area_name_en text,
  land_number text, land_sub_number text, building_number text, unit_number text,
  unit_balcony_area text, unit_parking_number text,
  parking_allocation_type text, parking_allocation_type_ar text, parking_allocation_type_en text,
  common_area text, actual_common_area text, floor text,
  rooms text, rooms_ar text, rooms_en text, actual_area text,
  property_type_id text, property_type_ar text, property_type_en text,
  property_sub_type_id text, property_sub_type_ar text, property_sub_type_en text,
  parent_property_id text, grandparent_property_id text, creation_date text,
  munc_zip_code text, munc_number text, parcel_id text,
  is_free_hold text, is_lease_hold text, is_registered text,
  pre_registration_number text,
  master_project_id text, master_project_en text, master_project_ar text,
  project_id text, project_name_ar text, project_name_en text,
  land_type_id text, land_type_ar text, land_type_en text
);
`

async function run() {
  const ingestDir = path.join(process.cwd(), 'scripts/ingest')

  for (const file of migrations) {
    const sqlText = fs.readFileSync(path.join(ingestDir, file), 'utf-8')
    try {
      await sql.unsafe(sqlText)
      console.log(`✓ ${file}`)
    } catch (e: any) {
      console.log(`✗ ${file}: ${e.message}`)
    }
  }

  try {
    await sql.unsafe(extraSQL)
    console.log('✓ extra tables (buildings, rental_listings, dld_projects, staging tables, etc.)')
  } catch (e: any) {
    console.log(`✗ extra tables: ${e.message}`)
  }

  console.log('\nAll migrations applied to Neon.')
  await sql.end()
}

run().catch(console.error)
