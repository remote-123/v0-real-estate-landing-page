import { sql } from "../ingest/db-client"

async function run() {
  console.log("005 — Bayut integration tables + unified materialized view")

  // -------------------------------------------------------------------------
  // 1. bayut_transactions — stores Bayut14 API hits (deduped by hash)
  // -------------------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS bayut_transactions (
      transaction_hash_id         TEXT PRIMARY KEY,
      instance_date               DATE NOT NULL,
      actual_worth                NUMERIC,
      meter_sale_price            NUMERIC,
      procedure_area              NUMERIC,
      rooms_en                    TEXT,
      bayut_location_l3_name_en   TEXT,
      bayut_location_l4_name_en   TEXT,
      trans_group_en              TEXT,
      rent_value                  NUMERIC,
      property_completion_status  TEXT,
      sale_market_name            TEXT,
      latitude                    NUMERIC,
      longitude                   NUMERIC,
      fetched_at                  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS bayut_txn_date_idx      ON bayut_transactions (instance_date DESC)`
  await sql`CREATE INDEX IF NOT EXISTS bayut_txn_area_idx      ON bayut_transactions (bayut_location_l3_name_en)`
  await sql`CREATE INDEX IF NOT EXISTS bayut_txn_group_idx     ON bayut_transactions (trans_group_en)`
  await sql`CREATE INDEX IF NOT EXISTS bayut_txn_rooms_idx     ON bayut_transactions (rooms_en)`
  console.log("✓ bayut_transactions")

  // -------------------------------------------------------------------------
  // 2. area_name_mapping — bridges Bayut L3 community names → DLD area_name_en
  // -------------------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS area_name_mapping (
      bayut_name  TEXT PRIMARY KEY,
      dld_name    TEXT NOT NULL
    )
  `
  // Seed with known mappings
  const mappings = [
    ["Jumeirah Village Circle (JVC)",         "Jumeirah Village Circle"],
    ["Jumeirah Village Triangle (JVT)",        "Jumeirah Village Triangle"],
    ["Dubai Silicon Oasis (DSO)",              "Dubai Silicon Oasis"],
    ["Dubai Sports City",                      "Dubai Sports City"],
    ["Downtown Dubai",                         "Burj Khalifa"],
    ["Dubai Marina",                           "Dubai Marina"],
    ["Business Bay",                           "Business Bay"],
    ["Palm Jumeirah",                          "Palm Jumeirah"],
    ["Arabian Ranches",                        "Arabian Ranches"],
    ["Arabian Ranches 2",                      "Arabian Ranches 2"],
    ["Arabian Ranches 3",                      "Arabian Ranches 3"],
    ["Dubai Hills Estate",                     "Dubai Hills Estate"],
    ["Meydan City",                            "Meydan"],
    ["DAMAC Hills",                            "DAMAC Hills (Akoya by DAMAC)"],
    ["DAMAC Hills 2",                          "DAMAC Hills 2 (Akoya Oxygen)"],
    ["Jumeirah Lake Towers (JLT)",             "Jumeirah Lakes Towers"],
    ["Al Furjan",                              "Al Furjan"],
    ["Arjan",                                  "Arjan"],
    ["Motor City",                             "Motor City"],
    ["Al Barsha",                              "Al Barsha"],
    ["Mirdif",                                 "Mirdif"],
    ["International City",                     "International City"],
    ["Town Square",                            "Wadi Al Safa 3"],
    ["The Springs",                            "The Springs"],
    ["The Meadows",                            "The Meadows"],
    ["The Lakes",                              "The Lakes"],
    ["Remraam",                                "Remraam"],
    ["Mudon",                                  "Al Hebiah Fifth"],
    ["Tilal Al Ghaf",                          "Al Hebiah Sixth"],
    ["Sobha Hartland",                         "Mohammad Bin Rashid City"],
  ]
  for (const [bayut, dld] of mappings) {
    await sql`
      INSERT INTO area_name_mapping (bayut_name, dld_name)
      VALUES (${bayut}, ${dld})
      ON CONFLICT (bayut_name) DO UPDATE SET dld_name = EXCLUDED.dld_name
    `
  }
  console.log(`✓ area_name_mapping (${mappings.length} rows seeded)`)

  // -------------------------------------------------------------------------
  // 3. bayut_ingest_log — budget tracking per cron run
  // -------------------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS bayut_ingest_log (
      id             SERIAL PRIMARY KEY,
      run_at         TIMESTAMPTZ DEFAULT NOW(),
      purpose        TEXT NOT NULL,
      pages_fetched  INTEGER NOT NULL DEFAULT 0,
      rows_upserted  INTEGER NOT NULL DEFAULT 0,
      error          TEXT
    )
  `
  console.log("✓ bayut_ingest_log")

  // -------------------------------------------------------------------------
  // 4. mv_txn_monthly_unified — DLD historical + Bayut fresh window
  //    Identical column contract to mv_txn_monthly so pages swap with no change.
  //    DLD cutoff: all months (mv_txn_monthly has data up to Feb 2026)
  //    Bayut window: months >= 2026-03-01 (avoids double-counting partial Feb)
  // -------------------------------------------------------------------------
  // Actual live mv_txn_monthly columns (confirmed via pg_attribute):
  // txn_month, area_name_en, trans_group_en, property_type_en, property_sub_type_en,
  // rooms_en, txn_count (bigint), total_value, avg_price, avg_price_sqm,
  // avg_rent, avg_rent_sqm, avg_area_sqm
  await sql`DROP MATERIALIZED VIEW IF EXISTS mv_txn_monthly_unified`
  await sql`
    CREATE MATERIALIZED VIEW mv_txn_monthly_unified AS

    -- Historical: re-use already-aggregated DLD mat view (identical column set)
    SELECT
      txn_month,
      area_name_en,
      trans_group_en,
      property_type_en,
      property_sub_type_en,
      rooms_en,
      txn_count,
      total_value,
      avg_price,
      avg_price_sqm,
      avg_rent,
      avg_rent_sqm,
      avg_area_sqm
    FROM mv_txn_monthly

    UNION ALL

    -- Fresh window: Bayut14 data for months >= 2026-03-01 (avoids partial-Feb double-count)
    SELECT
      DATE_TRUNC('month', bt.instance_date)::date                                         AS txn_month,
      COALESCE(anm.dld_name, bt.bayut_location_l3_name_en)                               AS area_name_en,
      bt.trans_group_en,
      'Unit'                                                                               AS property_type_en,
      'Flat'                                                                               AS property_sub_type_en,
      bt.rooms_en,
      COUNT(*)                                                                             AS txn_count,
      ROUND(SUM(bt.actual_worth)::numeric, 0)                                             AS total_value,
      ROUND(AVG(bt.actual_worth)::numeric, 0)                                             AS avg_price,
      ROUND(AVG(bt.meter_sale_price)::numeric, 2)                                         AS avg_price_sqm,
      ROUND(AVG(CASE WHEN bt.trans_group_en = 'Rent' THEN bt.rent_value ELSE NULL END)::numeric, 0) AS avg_rent,
      NULL::numeric                                                                        AS avg_rent_sqm,
      ROUND(AVG(bt.procedure_area)::numeric, 1)                                           AS avg_area_sqm
    FROM bayut_transactions bt
    LEFT JOIN area_name_mapping anm ON anm.bayut_name = bt.bayut_location_l3_name_en
    WHERE DATE_TRUNC('month', bt.instance_date)::date >= '2026-03-01'
      AND bt.instance_date IS NOT NULL
      AND bt.actual_worth > 0
    GROUP BY 1, 2, 3, 4, 5, 6

    WITH DATA
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS mv_txn_monthly_unified_pk
      ON mv_txn_monthly_unified (txn_month, area_name_en, trans_group_en, rooms_en,
                                  COALESCE(property_type_en,''), COALESCE(property_sub_type_en,''))
  `
  await sql`CREATE INDEX IF NOT EXISTS mv_txn_unified_month_idx ON mv_txn_monthly_unified (txn_month DESC)`
  await sql`CREATE INDEX IF NOT EXISTS mv_txn_unified_area_idx  ON mv_txn_monthly_unified (area_name_en)`
  await sql`CREATE INDEX IF NOT EXISTS mv_txn_unified_group_idx ON mv_txn_monthly_unified (trans_group_en)`

  await sql`
    CREATE OR REPLACE FUNCTION refresh_mv_txn_monthly_unified()
    RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_txn_monthly_unified;
    $$
  `
  console.log("✓ mv_txn_monthly_unified (+ indexes + refresh function)")

  await sql.end()
  console.log("\n✅ 005_bayut_integration complete — run the cron to start populating bayut_transactions")
}

run().catch(e => { console.error(e); process.exit(1) })
