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

export const sql = postgres(dbUrl, {
  ssl: "require",
  max: 1,
  idle_timeout: 60,
  connect_timeout: 30,
})
