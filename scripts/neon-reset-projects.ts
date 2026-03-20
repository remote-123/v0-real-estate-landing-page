import { sql } from "./ingest/neon-client"

async function run() {
  await sql`DROP TABLE IF EXISTS dld_projects`
  console.log("Dropped dld_projects")
  await sql.end()
}

run().catch(console.error)
