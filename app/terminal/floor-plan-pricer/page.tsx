import type { Metadata } from "next"
import { sql } from "@/lib/db"
import { PricerControls } from "@/components/terminal/pricer-controls"
import { auth } from "@/auth"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Floor Plan Pricer | North Capital DXB",
  description:
    "Price-per-sqft distribution by community and bedroom type. Based on 24 months of DLD registered sales.",
  alternates: {
    canonical: "/terminal/floor-plan-pricer",
  },
}

export interface PricerRow {
  area_name_en: string
  rooms_en: string
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  txn_count: number
}

async function fetchPricerData(): Promise<PricerRow[]> {
  try {
    const rows = await sql<PricerRow[]>`
      SELECT
        area_name_en,
        rooms_en,
        ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY meter_sale_price)::numeric, 0)::integer AS p10,
        ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY meter_sale_price)::numeric, 0)::integer AS p25,
        ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY meter_sale_price)::numeric, 0)::integer AS p50,
        ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY meter_sale_price)::numeric, 0)::integer AS p75,
        ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY meter_sale_price)::numeric, 0)::integer AS p90,
        COUNT(*)::integer AS txn_count
      FROM dld_transactions
      WHERE trans_group_en = 'Sales'
        AND meter_sale_price > 200
        AND meter_sale_price < 15000
        AND instance_date >= NOW() - INTERVAL '24 months'
        AND area_name_en IS NOT NULL
        AND rooms_en IS NOT NULL
      GROUP BY area_name_en, rooms_en
      HAVING COUNT(*) >= 20
      ORDER BY area_name_en, rooms_en
    `
    return rows
  } catch (error) {
    console.error("floor-plan-pricer fetch error:", error)
    return []
  }
}

const FREE_ROWS = 3

export default async function FloorPlanPricerPage() {
  const [session, allRows] = await Promise.all([auth(), fetchPricerData()])
  const isAuthenticated = !!session
  const rows = isAuthenticated ? allRows : allRows.slice(0, FREE_ROWS)

  const totalTxns = allRows.reduce((sum, r) => sum + r.txn_count, 0)
  const uniqueAreas = new Set(allRows.map((r) => r.area_name_en)).size
  const uniqueRoomTypes = new Set(allRows.map((r) => r.rooms_en)).size

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Page header */}
      <div className="space-y-1 px-4 sm:px-0">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
          Price Distribution
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Floor Plan Pricer</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Price-per-sqft distribution by community and bedroom type. Based on 24 months of DLD
          registered sales — P25–P75 defines the fair value band.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 sm:px-0">
        <div className="rounded-lg border border-border/40 bg-card/40 p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Communities</p>
          <p className="mt-1 text-2xl font-bold">{uniqueAreas.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/40 p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Room Types</p>
          <p className="mt-1 text-2xl font-bold">{uniqueRoomTypes}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/40 p-4">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Transactions</p>
          <p className="mt-1 text-2xl font-bold">{totalTxns.toLocaleString()}</p>
        </div>
      </div>

      {/* Controls + table */}
      <div className="px-4 sm:px-0">
        <PricerControls data={rows} isAuthenticated={isAuthenticated} totalRows={allRows.length} />
      </div>

      {/* Source note */}
      <p className="px-4 sm:px-0 text-[10px] text-muted-foreground/50 uppercase tracking-wider font-mono">
        Source: Dubai Land Department — 24-month rolling window, sales transactions only, min 20 txns per cell
      </p>
    </div>
  )
}
