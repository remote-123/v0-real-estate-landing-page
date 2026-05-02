import { terminalPageMeta } from "@/lib/terminal-metadata"
import { TrendingUp } from "lucide-react"
import { sql } from "@/lib/db"
import { StatCard } from "@/components/terminal/stat-card"
import { YieldMapTable } from "@/components/terminal/yield-map-table"
import type { YieldRow } from "@/components/terminal/yield-map-table"
import { formatAreaName } from "@/lib/area-names"
import { auth } from "@/auth"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Dubai Yield Map",
    description: "Gross rental yield by community and bedroom type. Rolling 12 months of DLD-registered sales and rental contracts.",
    path: "/terminal/yield-map",
  })
}

async function fetchYieldData(): Promise<YieldRow[]> {
  try {
    const rows = await sql<YieldRow[]>`
      WITH sales AS (
        SELECT area_name_en, rooms_en,
          SUM(txn_count * avg_price) / NULLIF(SUM(txn_count), 0) AS avg_sale_price,
          SUM(txn_count) AS sale_txns
        FROM mv_txn_monthly_unified
        WHERE trans_group_en = 'Sales'
          AND property_type_en = 'Unit'
          AND txn_month >= NOW() - INTERVAL '12 months'
          AND area_name_en IS NOT NULL
          AND rooms_en IS NOT NULL
        GROUP BY area_name_en, rooms_en
      ),
      rents AS (
        SELECT area_name_en, rooms_en,
          SUM(txn_count * avg_rent) / NULLIF(SUM(txn_count), 0) AS avg_annual_rent,
          SUM(txn_count) AS rent_txns
        FROM mv_txn_monthly_unified
        WHERE trans_group_en = 'Rent'
          AND property_type_en = 'Unit'
          AND txn_month >= NOW() - INTERVAL '12 months'
          AND area_name_en IS NOT NULL
          AND rooms_en IS NOT NULL
        GROUP BY area_name_en, rooms_en
      )
      SELECT
        s.area_name_en,
        s.rooms_en,
        ROUND(s.avg_sale_price::numeric, 0)::integer AS avg_sale_price,
        ROUND((r.avg_annual_rent * 12)::numeric, 0)::integer AS avg_annual_rent,
        ROUND(((r.avg_annual_rent * 12) / NULLIF(s.avg_sale_price, 0) * 100)::numeric, 2) AS gross_yield_pct,
        s.sale_txns::integer,
        r.rent_txns::integer
      FROM sales s
      JOIN rents r USING (area_name_en, rooms_en)
      WHERE s.sale_txns >= 10 AND r.rent_txns >= 10
        AND s.avg_sale_price > 100000
        AND r.avg_annual_rent > 0
      ORDER BY gross_yield_pct DESC
    `
    return rows
  } catch (error) {
    console.error("yield-map fetch error:", error)
    return []
  }
}

function formatAed(val: number): string {
  if (val >= 1_000_000) return `AED ${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `AED ${(val / 1_000).toFixed(0)}K`
  return `AED ${val.toLocaleString()}`
}

const FREE_ROWS = 5

export default async function YieldMapPage() {
  const [session, allRows] = await Promise.all([auth(), fetchYieldData()])
  const isAuthenticated = !!session
  const rows = isAuthenticated ? allRows : allRows.slice(0, FREE_ROWS)

  const topYield = allRows[0]?.gross_yield_pct ?? null
  const avgYield =
    allRows.length > 0
      ? allRows.reduce((acc, r) => acc + r.gross_yield_pct, 0) / allRows.length
      : null
  const totalCombos = allRows.length

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Page header */}
      <div className="space-y-1 px-4 sm:px-0">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
          Gross Yield Scanner
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Dubai Yield Map</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Gross rental yield by community and bedroom type. Rolling 12 months of DLD-registered sales and rental contracts.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-4 sm:px-0">
        <StatCard
          label="Top Yield"
          value={topYield !== null ? `${topYield.toFixed(2)}%` : "—"}
          trendDir="up"
          trend="highest community/bed type"
          icon={TrendingUp}
          description={topYield !== null ? `${formatAreaName(rows[0]?.area_name_en)} — ${rows[0]?.rooms_en}` : "No data"}
        />
        <StatCard
          label="Avg Yield"
          value={avgYield !== null ? `${avgYield.toFixed(2)}%` : "—"}
          trendDir="neutral"
          trend="across all combinations"
          description="Unweighted mean of all qualifying area/bedroom pairs"
        />
        <StatCard
          label="Combinations Tracked"
          value={totalCombos > 0 ? totalCombos.toLocaleString() : "—"}
          trendDir="neutral"
          description="Area + bedroom pairs with ≥10 sales and ≥10 rental contracts"
        />
      </div>

      {/* Yield legend */}
      <div className="px-4 sm:px-0 flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50">Yield tiers:</span>
        <span className="rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold ring-1 bg-accent/15 text-accent ring-accent/30">≥8% High</span>
        <span className="rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold ring-1 bg-yellow-400/15 text-yellow-400 ring-yellow-400/30">6–8% Mid</span>
        <span className="rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold ring-1 bg-muted/50 text-muted-foreground ring-border/40">&lt;6% Low</span>
      </div>

      {/* Table with filters */}
      <div className="px-4 sm:px-0">
        <YieldMapTable rows={rows} isAuthenticated={isAuthenticated} totalRows={allRows.length} />
      </div>

      {/* Source note */}
      <p className="px-4 sm:px-0 text-[10px] text-muted-foreground/50 uppercase tracking-wider font-mono">
        Source: Dubai Land Department — DLD-registered sales and rental contracts, rolling 12 months
      </p>

    </div>
  )
}
