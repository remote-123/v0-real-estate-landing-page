import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { unstable_cache } from 'next/cache'
import { BarChart3, TrendingUp, DollarSign, AlertTriangle } from "lucide-react"
import { StatCard } from "@/components/terminal/stat-card"
import { LiquidityChart, type LiquidityPoint } from "@/components/terminal/liquidity-chart"
import { formatAreaName } from "@/lib/area-names"
import { cn } from "@/lib/utils"
import { auth } from "@/auth"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import { isTerminalUnlocked } from "@/lib/terminal-gate"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Mortgage & Liquidity Scanner",
    description: "Track mortgage deal flow, leverage ratios, and liquidity risk by Dubai community. Powered by DLD transaction data.",
    path: "/terminal/liquidity",
  })
}

type MonthRow = {
  txn_month: string
  trans_group_en: string
  deals: string
  value_bn: string
}

type AreaRow = {
  area_name_en: string
  mortgage_deals: string
  sales_deals: string
  mortgage_value_bn: string
}

const fetchData = unstable_cache(
  async (): Promise<{ monthly: MonthRow[]; areas: AreaRow[] }> => {
    try {
      const [monthly, areas] = await Promise.all([
        sql<MonthRow[]>`
          SELECT
            txn_month::text,
            trans_group_en,
            SUM(txn_count)::integer AS deals,
            ROUND((SUM(total_value) / 1e9)::numeric, 3) AS value_bn
          FROM mv_txn_monthly_unified
          CROSS JOIN (SELECT MAX(txn_month) AS max_m FROM mv_txn_monthly_unified) l
          WHERE txn_month >= l.max_m - INTERVAL '23 months'
            AND trans_group_en IN ('Sales', 'Mortgages')
            AND area_name_en IS NOT NULL
          GROUP BY txn_month, trans_group_en
          ORDER BY txn_month ASC
        `,
        sql<AreaRow[]>`
          WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified)
          SELECT
            area_name_en,
            SUM(CASE WHEN trans_group_en = 'Mortgages' THEN txn_count ELSE 0 END)::integer AS mortgage_deals,
            SUM(CASE WHEN trans_group_en = 'Sales'     THEN txn_count ELSE 0 END)::integer AS sales_deals,
            ROUND((SUM(CASE WHEN trans_group_en = 'Mortgages' THEN total_value ELSE 0 END) / 1e9)::numeric, 3) AS mortgage_value_bn
          FROM mv_txn_monthly_unified
          CROSS JOIN latest
          WHERE txn_month = latest.m
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
          HAVING SUM(CASE WHEN trans_group_en = 'Mortgages' THEN txn_count ELSE 0 END) > 0
          ORDER BY mortgage_deals DESC
          LIMIT 40
        `,
      ])
      return { monthly, areas }
    } catch (e) {
      console.error("liquidity fetch error:", e)
      return { monthly: [], areas: [] }
    }
  },
  ['liquidity-data'],
  { revalidate: 3600 }
)

function pivotMonthly(rows: MonthRow[]): LiquidityPoint[] {
  const map = new Map<string, { label: string; mortgages: number; sales: number }>()
  for (const r of rows) {
    const d = new Date(r.txn_month + "T00:00:00Z")
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
    if (!map.has(r.txn_month)) map.set(r.txn_month, { label, mortgages: 0, sales: 0 })
    const entry = map.get(r.txn_month)!
    if (r.trans_group_en === "Mortgages") entry.mortgages = Number(r.deals)
    if (r.trans_group_en === "Sales") entry.sales = Number(r.deals)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({
      ...v,
      ratio: v.sales > 0 ? Math.round((v.mortgages / v.sales) * 100) : 0,
    }))
}

function deriveKpis(pivoted: LiquidityPoint[]) {
  if (pivoted.length === 0) return { mortgages: "—", ratio: "—", mom: null, valueBn: "—" }
  const latest = pivoted[pivoted.length - 1]
  const prev = pivoted.length >= 2 ? pivoted[pivoted.length - 2] : null
  const mom = prev && prev.mortgages > 0
    ? ((latest.mortgages - prev.mortgages) / prev.mortgages) * 100
    : null
  return {
    mortgages: latest.mortgages.toLocaleString(),
    ratio: `${latest.ratio}%`,
    mom,
    valueBn: "—",
  }
}

function riskLabel(ratio: number): { label: string; color: string } {
  if (ratio >= 80) return { label: "High", color: "text-red-400" }
  if (ratio >= 50) return { label: "Moderate", color: "text-yellow-400" }
  return { label: "Low", color: "text-accent" }
}

const FREE_ROWS = 5

export default async function LiquidityPage() {
  const [session, { monthly, areas }] = await Promise.all([auth(), fetchData()])
  const isAuthenticated = await isTerminalUnlocked(session)
  const displayAreas = isAuthenticated ? areas : areas.slice(0, FREE_ROWS)
  const pivoted = pivotMonthly(monthly)
  const kpis = deriveKpis(pivoted)
  const momSign = kpis.mom !== null ? (kpis.mom >= 0 ? "+" : "") : ""
  const momDir = kpis.mom !== null ? (kpis.mom > 0 ? "up" : "down") : "neutral"

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <div className="space-y-1 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-amber-400">
            DLD Mortgage Data
          </p>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Mortgage & Liquidity</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Leverage ratios, mortgage deal flow, and liquidity risk signals by Dubai community.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 sm:px-0">
        <StatCard
          label="Mortgage Deals (Latest Month)"
          value={kpis.mortgages}
          trendDir="neutral"
          description="Total registered mortgage transactions"
          icon={BarChart3}
        />
        <StatCard
          label="Mortgage/Sales Ratio"
          value={kpis.ratio}
          trendDir="neutral"
          description="Share of sales financed by mortgage — latest month"
          icon={TrendingUp}
        />
        <StatCard
          label="MoM Volume Change"
          value={kpis.mom !== null ? `${momSign}${kpis.mom.toFixed(1)}%` : "—"}
          trendDir={momDir}
          trend="vs prior month"
          description="Mortgage deal count month-over-month"
          icon={DollarSign}
        />
        <StatCard
          label="Leverage Signal"
          value={pivoted.length > 0 ? riskLabel(pivoted[pivoted.length - 1].ratio).label : "—"}
          trendDir={
            pivoted.length > 0
              ? pivoted[pivoted.length - 1].ratio >= 80 ? "down"
              : pivoted[pivoted.length - 1].ratio >= 50 ? "neutral"
              : "up"
              : "neutral"
          }
          description="Based on mortgage/sales ratio — ≥80% = high leverage"
          icon={AlertTriangle}
        />
      </div>

      {/* Chart — blurred for unauthenticated */}
      <div className="relative px-4 sm:px-0">
        <div className={!isAuthenticated ? "blur-sm pointer-events-none select-none" : ""}>
          <LiquidityChart data={pivoted} />
        </div>
        {!isAuthenticated && (
          <GatedTableOverlay
            freeRows={0}
            totalRows={pivoted.length}
            noun="months of mortgage data"
            callbackUrl="/terminal/liquidity"
          />
        )}
      </div>

      {/* Area table */}
      <div className="relative px-4 sm:px-0 rounded-md border border-border/40 bg-card/40 overflow-hidden">
        <div className="p-4 border-b border-border/40">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Top Mortgage Markets — Latest Month
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground/70">
                <th className="text-left px-4 py-2 font-mono text-[10px] uppercase tracking-widest">Area</th>
                <th className="text-right px-4 py-2 font-mono text-[10px] uppercase tracking-widest">Mortgages</th>
                <th className="text-right px-4 py-2 font-mono text-[10px] uppercase tracking-widest">Sales</th>
                <th className="text-right px-4 py-2 font-mono text-[10px] uppercase tracking-widest">Ratio</th>
                <th className="text-right px-4 py-2 font-mono text-[10px] uppercase tracking-widest">Value (AED bn)</th>
                <th className="text-right px-4 py-2 font-mono text-[10px] uppercase tracking-widest">Risk</th>
              </tr>
            </thead>
            <tbody>
              {displayAreas.map((row) => {
                const mort = Number(row.mortgage_deals)
                const sales = Number(row.sales_deals)
                const ratio = sales > 0 ? Math.round((mort / sales) * 100) : 0
                const risk = riskLabel(ratio)
                const val = Number(row.mortgage_value_bn)
                return (
                  <tr
                    key={row.area_name_en}
                    className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {formatAreaName(row.area_name_en)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-400 font-semibold">
                      {mort.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                      {sales.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1 rounded-full bg-border/50 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              ratio >= 80 ? "bg-red-400" : ratio >= 50 ? "bg-yellow-400" : "bg-accent"
                            )}
                            style={{ width: `${Math.min(ratio, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right">{ratio}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                      {val > 0 ? `${val.toFixed(2)}` : "—"}
                    </td>
                    <td className={cn("px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-widest", risk.color)}>
                      {risk.label}
                    </td>
                  </tr>
                )
              })}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    No mortgage data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!isAuthenticated && areas.length > FREE_ROWS && (
          <GatedTableOverlay
            freeRows={displayAreas.length}
            totalRows={areas.length}
            noun="mortgage markets"
            callbackUrl="/terminal/liquidity"
          />
        )}
      </div>

      <p className="px-4 sm:px-0 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
        Source: Dubai Land Department · Mortgage transactions from DLD registry
      </p>

    </div>
  )
}
