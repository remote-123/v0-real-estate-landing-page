import type { Metadata } from "next"
import { TrendingDown, Activity, AlertTriangle } from "lucide-react"
import { sql } from "@/lib/db"
import { StatCard } from "@/components/terminal/stat-card"
import { YieldDecayControls } from "@/components/terminal/yield-decay-controls"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Rental Yield Decay | North Capital DXB",
  description:
    "Track gross rental yield compression across Dubai communities over 12 quarters. Areas flagged where yields fall below the 5% risk-free threshold.",
  alternates: {
    canonical: "/terminal/rental-yield-decay",
  },
}

export type YieldRow = {
  qtr: string
  area_name_en: string
  rooms_en: string
  gross_yield_pct: number
  sale_txns: number
  rent_txns: number
}

async function fetchYieldData(): Promise<YieldRow[]> {
  try {
    const rows = await sql<YieldRow[]>`
      WITH quarterly AS (
        SELECT
          DATE_TRUNC('quarter', txn_month)::date AS qtr,
          area_name_en,
          rooms_en,
          SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count * avg_price ELSE 0 END) /
            NULLIF(SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count ELSE 0 END), 0) AS q_price,
          SUM(CASE WHEN trans_group_en = 'Rent' THEN txn_count * avg_rent ELSE 0 END) /
            NULLIF(SUM(CASE WHEN trans_group_en = 'Rent' THEN txn_count ELSE 0 END), 0) AS q_monthly_rent,
          SUM(CASE WHEN trans_group_en = 'Sales' THEN txn_count ELSE 0 END) AS sale_txns,
          SUM(CASE WHEN trans_group_en = 'Rent' THEN txn_count ELSE 0 END) AS rent_txns
        FROM mv_txn_monthly_unified
        WHERE area_name_en IS NOT NULL
          AND rooms_en IS NOT NULL
          AND property_type_en = 'Unit'
          AND txn_month >= NOW() - INTERVAL '3 years'
        GROUP BY 1, 2, 3
      )
      SELECT
        qtr::text,
        area_name_en,
        rooms_en,
        ROUND((q_monthly_rent * 12 / NULLIF(q_price, 0) * 100)::numeric, 2) AS gross_yield_pct,
        sale_txns::integer,
        rent_txns::integer
      FROM quarterly
      WHERE q_price > 100000
        AND q_monthly_rent > 0
        AND sale_txns >= 5
        AND rent_txns >= 5
      ORDER BY area_name_en, rooms_en, qtr
    `
    return rows
  } catch (error) {
    console.error("yield_decay fetch error:", error)
    return []
  }
}

type AreaRoomKey = { area: string; room: string }
type LatestEntry = { area: string; room: string; latestYield: number; firstYield: number; qtrs: number }

function computeStats(rows: YieldRow[]) {
  // Group by area+room, find first/last quarter yield
  const map = new Map<string, YieldRow[]>()
  for (const r of rows) {
    const key = `${r.area_name_en}|||${r.rooms_en}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }

  const entries: LatestEntry[] = []
  for (const [key, group] of map.entries()) {
    const sorted = [...group].sort((a, b) => a.qtr.localeCompare(b.qtr))
    const [area, room] = key.split("|||")
    entries.push({
      area,
      room,
      latestYield: Number(sorted[sorted.length - 1].gross_yield_pct),
      firstYield: Number(sorted[0].gross_yield_pct),
      qtrs: sorted.length,
    })
  }

  const belowFive = entries.filter(e => e.latestYield < 5).length
  const avgYield = entries.length
    ? entries.reduce((s, e) => s + e.latestYield, 0) / entries.length
    : 0

  // Most compressed = largest absolute drop (first - last)
  let mostCompressed: LatestEntry | null = null
  let maxDrop = -Infinity
  for (const e of entries) {
    const drop = e.firstYield - e.latestYield
    if (drop > maxDrop) { maxDrop = drop; mostCompressed = e }
  }

  return { belowFive, avgYield, mostCompressed, maxDrop }
}

export default async function RentalYieldDecayPage() {
  const rows = await fetchYieldData()
  const { belowFive, avgYield, mostCompressed, maxDrop } = computeStats(rows)

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <div className="space-y-1 px-4 sm:px-0">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
          Yield Compression Tracker
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Rental Yield Decay</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          How gross yields have compressed over 12 quarters. Areas where yield has fallen below the 5% risk-free rate are flagged.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-4 sm:px-0">
        <StatCard
          label="Areas Below 5%"
          value={String(belowFive)}
          trendDir="down"
          trend="latest quarter"
          icon={AlertTriangle}
          description="Community+bedroom combinations where gross yield < 5% risk-free threshold"
        />
        <StatCard
          label="Avg Current Yield"
          value={rows.length ? `${avgYield.toFixed(2)}%` : "—"}
          trendDir={avgYield >= 5 ? "up" : "down"}
          trend="gross, annualised"
          icon={Activity}
          description="Mean gross yield across all tracked area / bedroom combinations"
        />
        <StatCard
          label="Most Compressed"
          value={mostCompressed ? `${mostCompressed.area.slice(0, 16)}` : "—"}
          trendDir="down"
          trend={mostCompressed ? `${mostCompressed.room} — -${maxDrop.toFixed(2)}pp` : undefined}
          icon={TrendingDown}
          description="Area + bedroom type with the largest yield drop across available quarters"
        />
      </div>

      {/* Controls + chart + table */}
      <div className="px-4 sm:px-0">
        <YieldDecayControls data={rows} />
      </div>

      <p className="px-4 sm:px-0 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
        Source: Dubai Land Department — DLD transactions &amp; rental registrations via mv_txn_monthly_unified
      </p>

    </div>
  )
}
