import postgres from "postgres"

const connectionString = process.env.DATABASE_URL!

// Connection for all app queries (DigitalOcean Managed Postgres)
export const sql = postgres(connectionString, {
  ssl: "require",
  max: 1, // safe for serverless — one connection per function invocation
  idle_timeout: 20,
  connect_timeout: 10,
})
