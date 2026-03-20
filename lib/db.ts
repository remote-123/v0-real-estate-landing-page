import postgres from "postgres"

const connectionString = process.env.DATABASE_URL!

// Pooled connection for all app queries (Neon pgBouncer)
export const sql = postgres(connectionString, {
  ssl: "require",
  max: 1, // safe for serverless — one connection per function invocation
  idle_timeout: 20,
  connect_timeout: 10,
})
