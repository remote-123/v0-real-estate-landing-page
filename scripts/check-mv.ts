import { sql } from "./ingest/db-client"

async function run() {
  const [months, sample] = await Promise.all([
    sql`SELECT DISTINCT txn_month FROM mv_txn_monthly ORDER BY txn_month DESC LIMIT 6`,
    sql`
      SELECT area_name_en, txn_month, txn_count, avg_psf, median_psf, avg_value, trans_group_en, property_type_en
      FROM mv_txn_monthly
      WHERE trans_group_en = 'Sales'
        AND property_type_en = 'Unit'
      ORDER BY txn_month DESC, txn_count DESC
      LIMIT 10
    `,
  ])
  console.log("Latest months:", months.map((r: any) => r.txn_month))
  console.log("\nTop rows (Sales, Unit):")
  sample.forEach((r: any) => console.log(
    `  ${r.txn_month} | ${r.area_name_en} | txns=${r.txn_count} | avg_psf=${r.avg_psf} | med_psf=${r.median_psf} | avg_val=${r.avg_value}`
  ))
  await sql.end()
}

run().catch(console.error)
