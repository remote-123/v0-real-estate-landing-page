import { sql } from "./db-client"
async function run() {
  await sql`ALTER TABLE buildings_enriched ADD COLUMN IF NOT EXISTS propsearch_status text`
  console.log("Column propsearch_status added.")
  await sql.end()
}
run().catch(e => { console.error(e); process.exit(1) })
