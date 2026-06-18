import { sql } from "../ingest/db-client"

async function run() {
  console.log("009 — Create missing tables: email_leads + distress_listings")

  // -------------------------------------------------------------------------
  // 1. email_leads — captures terminal lead emails for weekly distress digest
  // -------------------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS email_leads (
      id               SERIAL PRIMARY KEY,
      email            TEXT NOT NULL UNIQUE,
      source           TEXT NOT NULL DEFAULT 'terminal',
      area_interest    TEXT,
      unsubscribed_at  TIMESTAMPTZ,
      last_sent_at     TIMESTAMPTZ,
      send_count       INTEGER NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS email_leads_email_idx  ON email_leads(email)`
  await sql`CREATE INDEX IF NOT EXISTS email_leads_active_idx ON email_leads(unsubscribed_at) WHERE unsubscribed_at IS NULL`
  console.log("✓ email_leads")

  // -------------------------------------------------------------------------
  // 2. distress_listings — PropertyFinder distress property snapshots
  //    Primary key is the source listing ID; upserted by snapshot cron.
  // -------------------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS distress_listings (
      listing_id               TEXT PRIMARY KEY,
      source                   TEXT NOT NULL DEFAULT 'pf',
      external_url             TEXT,
      title                    TEXT,
      address_full             TEXT,
      area_name                TEXT,
      building_name            TEXT,
      property_type            TEXT,
      bedrooms                 TEXT,
      size_sqft                NUMERIC,
      price                    NUMERIC NOT NULL,
      price_per_sqft           NUMERIC,
      listed_date              DATE,
      price_at_first_seen      NUMERIC,
      price_min_seen           NUMERIC,
      price_max_seen           NUMERIC,
      price_drop_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
      price_drop_pct           NUMERIC,
      price_change_count       INTEGER NOT NULL DEFAULT 0,
      snapshots                JSONB NOT NULL DEFAULT '[]',
      canonical_key            TEXT,
      relisting_of             TEXT,
      relisting_confidence     NUMERIC,
      dld_area_avg_psf         NUMERIC,
      dld_sample_count         INTEGER,
      dld_psf_delta_pct        NUMERIC,
      confidence_tier          INTEGER NOT NULL DEFAULT 3,
      first_seen_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_checked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      disappeared_at           TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS distress_listings_area_idx       ON distress_listings(area_name)`
  await sql`CREATE INDEX IF NOT EXISTS distress_listings_confidence_idx ON distress_listings(confidence_tier)`
  await sql`CREATE INDEX IF NOT EXISTS distress_listings_active_idx     ON distress_listings(disappeared_at) WHERE disappeared_at IS NULL`
  await sql`CREATE INDEX IF NOT EXISTS distress_listings_canonical_idx  ON distress_listings(canonical_key) WHERE canonical_key IS NOT NULL`
  console.log("✓ distress_listings")

  await sql.end()
  console.log("\n✅ 009_create_missing_tables complete")
}

run().catch(e => { console.error(e); process.exit(1) })
