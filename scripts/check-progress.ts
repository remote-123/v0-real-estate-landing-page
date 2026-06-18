import { sql } from "./ingest/db-client"

async function run() {
  const [mv, units, sc] = await Promise.all([
    sql`SELECT count(*) FROM mv_txn_monthly`,
    sql`SELECT count(*) FROM dld_units`,
    sql`SELECT count(*) FROM dld_service_charges`,
  ])
  console.log("mv_txn_monthly:      ", mv[0].count, "rows")
  console.log("dld_units:           ", units[0].count, "/ ~2,380,000")
  console.log("dld_service_charges: ", sc[0].count, "/ ~91,000")
  await sql.end()
}

run().catch(console.error)
