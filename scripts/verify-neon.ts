import { sql } from "./ingest/neon-client"

async function verify() {
  const [pi, sc, tx, units, statuses] = await Promise.all([
    sql`SELECT count(*) FROM dld_price_index`,
    sql`SELECT count(*) FROM dld_service_charges`,
    sql`SELECT count(*) FROM dld_transactions`,
    sql`SELECT count(*) FROM dld_units`,
    sql`SELECT project_status, count(*) FROM dld_projects GROUP BY project_status ORDER BY count DESC LIMIT 10`,
  ])
  console.log("price_index:     ", pi[0].count)
  console.log("service_charges: ", sc[0].count)
  console.log("transactions:    ", tx[0].count)
  console.log("units:           ", units[0].count)
  console.log("\ndld_projects status breakdown:")
  statuses.forEach((r: any) => console.log(" ", r.project_status, "→", r.count))
  await sql.end()
}

verify().catch(console.error)
