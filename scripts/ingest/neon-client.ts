/**
 * Shared Neon/postgres.js client for ingest scripts.
 * Derives the direct (non-pooled) connection URL from DATABASE_URL.
 */
import postgres from "postgres"

const pooledUrl = process.env.DATABASE_URL
if (!pooledUrl) {
  console.error("Missing DATABASE_URL in environment")
  process.exit(1)
}

// Neon direct URL = remove -pooler from the hostname
const directUrl = pooledUrl.replace("-pooler.", ".")

export const sql = postgres(directUrl, {
  ssl: "require",
  max: 1,
  idle_timeout: 60,
  connect_timeout: 30,
})
