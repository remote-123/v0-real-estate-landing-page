import postgres from "postgres"

// Strip sslmode from URL — same fix as auth.ts.
// pg-connection-string v2 treats sslmode=require as verify-full, which
// fails against DO's internal CA. We handle SSL explicitly instead.
const rawUrl = process.env.DATABASE_URL!
const connectionString = rawUrl.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "")

// Connection for all app queries (DigitalOcean Managed Postgres)
export const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 1, // safe for serverless — one connection per function invocation
  idle_timeout: 20,
  connect_timeout: 10,
})
