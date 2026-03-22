import type { Metadata } from "next"
import { Activity, TrendingUp, DollarSign, BarChart2 } from "lucide-react"
import { sql } from "@/lib/db"
import { StatCard } from "@/components/terminal/stat-card"
import { TransactionPulseChart, type MonthlyRow } from "@/components/terminal/transaction-pulse-chart"
import { TransactionHeatmap } from "@/components/terminal/transaction-heatmap"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Transaction Pulse | North Capital DXB",
  description:
    "Monthly sales volume, value, and market velocity across all Dubai transaction types — powered by Dubai Land Department data.",
}

type DayRow = { day: string; daily_txns: number }

async function fetchData(): Promise<{ monthly: MonthlyRow[]; daily: DayRow[] }> {
  try {
    const [monthly, daily] = await Promise.all([
      sql<MonthlyRow[]>`
        SELECT
          txn_month::text AS txn_month,
          trans_group_en,
          SUM(txn_count)::integer AS deals,
          ROUND((SUM(total_value) / 1e9)::numeric, 2) AS value_bn,
          ROUND(AVG(avg_price_sqm)::numeric, 0) AS avg_psm
        FROM mv_txn_monthly
        WHERE txn_month >= NOW() - INTERVAL '24 months'
          AND trans_group_en IN ('Sales', 'Mortgages', 'Gifts')
        GROUP BY txn_month, trans_group_en
        ORDER BY txn_month ASC
      `,
      sql<DayRow[]>`
        SELECT instance_date::text AS day, COUNT(*)::integer AS daily_txns
        FROM dld_transactions
        WHERE instance_date >= DATE_TRUNC('year', NOW())
          AND instance_date < NOW()
        GROUP BY instance_date
        ORDER BY instance_date ASC
      `,
    ])
    return { monthly, daily }
  } catch (error) {
    console.error("transaction-pulse fetch error:", error)
    return { monthly: [], daily: [] }
  }
}

// postgres.js returns numeric columns as strings — coerce to numbers
function coerceRow(r: MonthlyRow): MonthlyRow {
  return { ...r, deals: Number(r.deals), value_bn: Number(r.value_bn), avg_psm: Number(r.avg_psm) }
}

// Derive stat card values from monthly data
function deriveStats(rows: MonthlyRow[]) {
  const sales = rows
    .filter(r => r.trans_group_en === "Sales")
    .sort((a, b) => a.txn_month.localeCompare(b.txn_month))
    .map(coerceRow)
  if (sales.length === 0) return { deals: "—", value: "—", mom: null, yoy: null }

  const latest = sales[sales.length - 1]
  const prevMonth = sales.length >= 2 ? sales[sales.length - 2] : null
  const prevYear = sales.length >= 13 ? sales[sales.length - 13] : null

  const mom = prevMonth && prevMonth.deals > 0
    ? ((latest.deals - prevMonth.deals) / prevMonth.deals) * 100
    : null
  const yoy = prevYear && prevYear.deals > 0
    ? ((latest.deals - prevYear.deals) / prevYear.deals) * 100
    : null

  return {
    deals: latest.deals.toLocaleString(),
    value: `AED ${latest.value_bn.toFixed(2)}bn`,
    mom,
    yoy,
  }
}

function fmtPct(v: number | null): { label: string; dir: "up" | "down" | "neutral" } {
  if (v === null) return { label: "N/A", dir: "neutral" }
  const sign = v >= 0 ? "+" : ""
  return { label: `${sign}${v.toFixed(1)}%`, dir: v > 0 ? "up" : v < 0 ? "down" : "neutral" }
}

export default async function TransactionPulsePage() {
  const { monthly, daily } = await fetchData()
  const stats = deriveStats(monthly)
  const mom = fmtPct(stats.mom)
  const yoy = fmtPct(stats.yoy)
  const currentYear = new Date().getFullYear()

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <div className="space-y-1 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-emerald-500">
            Live DLD Feed
          </p>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Transaction Pulse</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Monthly sales volume, value, and market velocity across all Dubai transaction types.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 sm:px-0">
        <StatCard
          label="Current Month Sales"
          value={stats.deals}
          trendDir="neutral"
          description="Total sales deals in the latest available month"
          icon={Activity}
        />
        <StatCard
          label="Current Month Value"
          value={stats.value}
          trendDir="neutral"
          description="Total sales transaction value (AED billion)"
          icon={DollarSign}
        />
        <StatCard
          label="MoM Volume Change"
          value={mom.label}
          trendDir={mom.dir}
          trend="vs prior month"
          description="Sales deal count — month-over-month change"
          icon={BarChart2}
        />
        <StatCard
          label="YoY Volume Change"
          value={yoy.label}
          trendDir={yoy.dir}
          trend="vs same month last year"
          description="Sales deal count — year-over-year change"
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <div className="px-4 sm:px-0">
        <TransactionPulseChart data={monthly} />
      </div>

      {/* Daily heatmap */}
      <div className="px-4 sm:px-0">
        <TransactionHeatmap rows={daily} year={currentYear} />
      </div>

      {/* Source note */}
      <p className="px-4 sm:px-0 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
        Source: Dubai Land Department — transactions data refreshed daily
      </p>

    </div>
  )
}
