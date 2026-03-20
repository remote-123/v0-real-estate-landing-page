import { sql } from "./ingest/neon-client"
import { readFileSync } from "fs"
import path from "path"

async function run() {
  const mvSql = readFileSync(
    path.join(process.cwd(), "scripts/ingest/mv_txn_monthly.sql"),
    "utf8"
  )
  console.log("Applying mv_txn_monthly...")
  await sql.unsafe(mvSql)
  console.log("✅ mv_txn_monthly created and refreshed")
  await sql.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
