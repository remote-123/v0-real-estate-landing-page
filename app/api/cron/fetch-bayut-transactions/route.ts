import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { fetchBayutPage, transformBayutHit, type BayutPurpose } from "@/lib/bayut14"

// Daily: 12 pages for-sale + 13 pages for-rent = 25 requests
// 25 req/day × 30 days = 750/month → leaves 150 in reserve
const PAGES_PER_PURPOSE = 12
const PAGES_FOR_RENT = 13

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Budget circuit-breaker: count requests this calendar month
  const monthlyUsed = await sql<{ cnt: string }[]>`
    SELECT COUNT(*) AS cnt
    FROM bayut_ingest_log
    WHERE run_at >= DATE_TRUNC('month', NOW())
      AND error IS NULL
  `
  const usedThisMonth = Number(monthlyUsed[0]?.cnt ?? 0)
  if (usedThisMonth >= 800) {
    console.warn("[Bayut] Budget guard: monthly limit approaching, skipping")
    return NextResponse.json({ skipped: true, reason: "budget_limit", used: usedThisMonth })
  }

  const logRow = { pagesForSale: 0, pagesForRent: 0, rows: 0, error: null as string | null }

  try {
    const allRows = []

    // Fetch for-sale pages
    for (let page = 0; page < PAGES_PER_PURPOSE; page++) {
      const result = await fetchBayutPage("for-sale", page)
      allRows.push(...result.hits)
      logRow.pagesForSale++
      if (page >= result.nbPages - 1) break
    }

    // Fetch for-rent pages
    for (let page = 0; page < PAGES_FOR_RENT; page++) {
      const result = await fetchBayutPage("for-rent", page)
      allRows.push(...result.hits)
      logRow.pagesForRent++
      if (page >= result.nbPages - 1) break
    }

    console.log(`[Bayut] Fetched ${allRows.length} raw hits`)

    // Transform + filter out invalid rows
    const rows = allRows
      .map(transformBayutHit)
      .filter((r): r is NonNullable<typeof r> => r !== null && (r.actual_worth ?? 0) > 0)

    console.log(`[Bayut] Valid rows: ${rows.length}`)

    // Upsert in batches to avoid parameter limits
    let upserted = 0
    for (const row of rows) {
      await sql`
        INSERT INTO bayut_transactions (
          transaction_hash_id, instance_date, actual_worth, meter_sale_price,
          procedure_area, rooms_en, bayut_location_l3_name_en, bayut_location_l4_name_en,
          trans_group_en, rent_value, property_completion_status, sale_market_name,
          latitude, longitude
        ) VALUES (
          ${row.transaction_hash_id}, ${row.instance_date}, ${row.actual_worth},
          ${row.meter_sale_price}, ${row.procedure_area}, ${row.rooms_en},
          ${row.bayut_location_l3_name_en}, ${row.bayut_location_l4_name_en},
          ${row.trans_group_en}, ${row.rent_value}, ${row.property_completion_status},
          ${row.sale_market_name}, ${row.latitude}, ${row.longitude}
        )
        ON CONFLICT (transaction_hash_id) DO NOTHING
      `
      upserted++
    }

    logRow.rows = upserted

    // Refresh unified materialized view
    await sql`SELECT refresh_mv_txn_monthly_unified()`
    console.log("[Bayut] Refreshed mv_txn_monthly_unified")

    // Log success
    await sql`
      INSERT INTO bayut_ingest_log (purpose, pages_fetched, rows_upserted)
      VALUES ('daily', ${logRow.pagesForSale + logRow.pagesForRent}, ${upserted})
    `

    return NextResponse.json({
      ok: true,
      pages: { for_sale: logRow.pagesForSale, for_rent: logRow.pagesForRent },
      rows_upserted: upserted,
    })
  } catch (e: any) {
    console.error("[Bayut] Cron error:", e.message)
    await sql`
      INSERT INTO bayut_ingest_log (purpose, pages_fetched, rows_upserted, error)
      VALUES ('daily', ${logRow.pagesForSale + logRow.pagesForRent}, ${logRow.rows}, ${e.message})
    `.catch(() => {})
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
