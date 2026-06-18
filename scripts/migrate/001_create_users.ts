import { sql } from "../ingest/db-client"

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name                 TEXT,
      email                TEXT        NOT NULL,
      image                TEXT,
      provider             TEXT        NOT NULL,
      provider_account_id  TEXT        NOT NULL,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      sign_in_count        INTEGER     NOT NULL DEFAULT 1,
      referrer             TEXT,
      utm_source           TEXT,
      utm_medium           TEXT,
      utm_campaign         TEXT,
      UNIQUE (provider, provider_account_id)
    )
  `
  console.log("✓ users table ready")
  await sql.end()
}

run().catch(e => { console.error(e); process.exit(1) })
