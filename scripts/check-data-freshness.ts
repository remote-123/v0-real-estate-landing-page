import { sql } from "./ingest/db-client"

async function run() {
  const [latest, feb, jan] = await Promise.all([
    sql`SELECT MAX(instance_date) as max_date, MIN(instance_date) as min_date, COUNT(*) as total FROM dld_transactions`,
    sql`SELECT COUNT(*) as txns, MAX(instance_date) as latest FROM dld_transactions WHERE instance_date >= '2026-02-01'`,
    sql`SELECT COUNT(*) as txns FROM dld_transactions WHERE instance_date >= '2026-01-01' AND instance_date < '2026-02-01'`,
  ])
  console.log("Date range:", latest[0].min_date, "→", latest[0].max_date)
  console.log("Total rows:", latest[0].total)
  console.log("Feb 2026 txns:", feb[0].txns, "(latest:", feb[0].latest + ")")
  console.log("Jan 2026 txns:", jan[0].txns)
  await sql.end()
}

run().catch(console.error)
