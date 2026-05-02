import type { Metadata } from "next"
import { TrendingUp } from "lucide-react"
import { sql } from "@/lib/db"
import { StatCard } from "@/components/terminal/stat-card"
import { PriceIndexView } from "@/components/terminal/price-index-view"
import type { PriceIndexRow } from "@/components/terminal/price-index-chart"

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Dubai Residential Price Index | North Capital DXB",
  description:
    "Monthly DLD price index for Dubai residential real estate — all types, flats, and villas from 2011 to present.",
  alternates: {
    canonical: "/terminal/price-index",
  },
}

async function fetchPriceIndex(): Promise<PriceIndexRow[]> {
  try {
    const rows = await sql<PriceIndexRow[]>`
      SELECT period, all_monthly_index, flat_monthly_index, villa_monthly_index,
             all_monthly_price_index, flat_monthly_price_index, villa_monthly_price_index
      FROM dld_price_index
      ORDER BY period ASC
    `
    return rows
  } catch (error) {
    console.error("dld_price_index fetch error:", error)
    return []
  }
}

function yoyChange(rows: PriceIndexRow[], key: keyof PriceIndexRow): number | null {
  if (rows.length < 13) return null
  const latest = Number(rows[rows.length - 1][key])
  const yearAgo = Number(rows[rows.length - 13][key])
  if (!yearAgo) return null
  return ((latest - yearAgo) / yearAgo) * 100
}

function formatYoy(pct: number | null): { value: string; trendDir: "up" | "down" | "neutral" } {
  if (pct === null) return { value: "N/A", trendDir: "neutral" }
  const sign = pct >= 0 ? "+" : ""
  return {
    value: `${sign}${pct.toFixed(1)}%`,
    trendDir: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
  }
}

function formatAed(value: number): string {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toFixed(0)}`
}

export default async function PriceIndexPage() {
  const rows = await fetchPriceIndex()

  const allYoy = yoyChange(rows, "all_monthly_index")
  const flatYoy = yoyChange(rows, "flat_monthly_index")
  const villaYoy = yoyChange(rows, "villa_monthly_index")

  const latestRow = rows[rows.length - 1]
  const latestAvgPrice = latestRow ? Number(latestRow.all_monthly_price_index) : 0

  const allFmt = formatYoy(allYoy)
  const flatFmt = formatYoy(flatYoy)
  const villaFmt = formatYoy(villaYoy)

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Page header */}
      <div className="space-y-1 px-4 sm:px-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Market Data
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Dubai Residential Price Index</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Monthly index of Dubai residential transaction prices published by the Dubai Land Department, normalised to a base period. Covers all property types, flats, and villas.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 sm:px-0">
        <StatCard
          label="All Types YoY"
          value={allFmt.value}
          trendDir={allFmt.trendDir}
          trend="vs 12 months ago"
          icon={TrendingUp}
          description="Composite index — all residential property types"
        />
        <StatCard
          label="Flats YoY"
          value={flatFmt.value}
          trendDir={flatFmt.trendDir}
          trend="vs 12 months ago"
          description="Apartment price index (DLD)"
        />
        <StatCard
          label="Villas YoY"
          value={villaFmt.value}
          trendDir={villaFmt.trendDir}
          trend="vs 12 months ago"
          description="Villa / townhouse price index (DLD)"
        />
        <StatCard
          label="Avg Transaction"
          value={latestAvgPrice ? formatAed(latestAvgPrice) : "—"}
          trendDir="neutral"
          description="Latest monthly avg AED transaction value — all types"
        />
      </div>

      {/* Chart */}
      <div className="px-4 sm:px-0">
        <PriceIndexView data={rows} />
      </div>

      {/* Source note */}
      <p className="px-4 sm:px-0 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
        Source: Dubai Land Department — monthly observations from 2011
      </p>

    </div>
  )
}
