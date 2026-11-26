/**
 * Shared postgres.js client for ingest scripts.
 * Uses DATABASE_URL (DigitalOcean Managed Postgres connection string).
 */
import postgres from "postgres"

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error("Missing DATABASE_URL in environment")
  process.exit(1)
}

// Production lives in the dedicated `northcapital_dxb` database on the DO cluster.
// Refuse to run against anything else (e.g. the old shared `defaultdb`), which
// silently swallowed an ingest in Oct 2026.
const EXPECTED_DB = "northcapital_dxb"
const dbName = new URL(dbUrl).pathname.replace(/^\//, "")
if (dbName !== EXPECTED_DB) {
  console.error(`DATABASE_URL points at database "${dbName}", expected "${EXPECTED_DB}". Fix .env.local.`)
  process.exit(1)
}

export const sql = postgres(dbUrl, {
  ssl: "require",
  max: 1,
  idle_timeout: 60,
  connect_timeout: 30,
})
