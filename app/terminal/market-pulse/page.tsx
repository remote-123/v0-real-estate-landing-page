import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { unstable_cache } from 'next/cache'
import { formatAreaName } from "@/lib/area-names"
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Building2,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
} from "lucide-react"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Market Pulse — Dubai Real Estate Overview",
    description:
      "Weekly at-a-glance view of Dubai property market signals: top bull and bear areas, volume leaders, pipeline risk, and distress hotspots. Institutional-grade data from DLD and Bayut.",
    path: "/terminal/market-pulse",
  })
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface MarketSummary {
  total_txn_12m: number
  avg_dubai_psf: number
  yoy_psf_pct: number | null
  active_distress: number
  data_month: string
}

interface BullSignal {
  area_name_en: string
  nc_display_name: string | null
  nc_slug: string | null
  avg_psf: number
  yoy_pct: number | null
  bull_score: number
}

interface BearSignal {
  area_name_en: string
  nc_display_name: string | null
  nc_slug: string | null
  avg_psf: number
  yoy_pct: number | null
  bear_score: number
  pipeline_units: number
  distress_count: number
}

interface VolumeLeader {
  area_name_en: string
  nc_display_name: string | null
  nc_slug: string | null
  txn_12m: number
  avg_psf: number
  mom_pct: number | null
}

interface PipelineRisk {
  area_name_en: string
  nc_display_name: string | null
  nc_slug: string | null
  pipeline_units: number
  txn_12m: number
  supply_months: number
}

interface PulseData {
  summary: MarketSummary
  bullSignals: BullSignal[]
  bearSignals: BearSignal[]
  volumeLeaders: VolumeLeader[]
  pipelineRisks: PipelineRisk[]
}

// ── Data fetch ─────────────────────────────────────────────────────────────────

const fetchPulseData = unstable_cache(
  async (): Promise<PulseData | null> => {
  try {
    const [summaryRows, bullRows, bearRows, volRows, pipeRows] = await Promise.all([

      // Market summary
      sql<{
        total_txn_12m: string
        avg_dubai_psf: string
        prev_avg_dubai_psf: string | null
        data_month: string
      }[]>`
        WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified WHERE trans_group_en = 'Sales'),
        curr AS (
          SELECT
            SUM(txn_count) AS total,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= latest.m - INTERVAL '11 months'
        ),
        prev AS (
          SELECT SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= latest.m - INTERVAL '23 months'
            AND txn_month <  latest.m - INTERVAL '11 months'
        )
        SELECT
          curr.total AS total_txn_12m,
          ROUND((curr.psm / 10.764)::numeric, 0) AS avg_dubai_psf,
          ROUND((prev.psm / 10.764)::numeric, 0) AS prev_avg_dubai_psf,
          TO_CHAR(latest.m, 'Mon YYYY') AS data_month
        FROM curr, prev, latest
      `,

      // Top 5 bull signals (simplified bear-cases formula)
      sql<{
        area_name_en: string
        nc_display_name: string | null
        nc_slug: string | null
        avg_psf: string
        yoy_pct: string | null
        bull_score: string
      }[]>`
        WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified WHERE trans_group_en = 'Sales'),
        curr AS (
          SELECT area_name_en,
            SUM(txn_count) AS txn_12m,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= latest.m - INTERVAL '11 months'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en HAVING SUM(txn_count) >= 20
        ),
        prev AS (
          SELECT area_name_en,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= latest.m - INTERVAL '23 months'
            AND txn_month <  latest.m - INTERVAL '11 months'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        ),
        pipeline AS (
          SELECT area_name_en, SUM(COALESCE(no_of_units, 0)) AS units
          FROM dld_projects WHERE project_status IN ('ACTIVE','NOT_STARTED','PENDING')
          GROUP BY area_name_en
        )
        SELECT
          c.area_name_en,
          nc.nc_display_name,
          nc.nc_slug,
          ROUND((c.psm / 10.764)::numeric, 0) AS avg_psf,
          CASE WHEN p.psm > 0
            THEN ROUND(((c.psm - p.psm) / p.psm * 100)::numeric, 1) ELSE NULL
          END AS yoy_pct,
          ROUND(LEAST(100, GREATEST(0,
            GREATEST(0, LEAST(35, CASE WHEN p.psm > 0 THEN (c.psm - p.psm) / p.psm * 175 ELSE 0 END))
            + LEAST(35, SQRT(c.txn_12m::float) * 0.7)
            + GREATEST(0, LEAST(30, 30 - COALESCE(pip.units, 0)::float / GREATEST(c.txn_12m / 12.0, 1) * 1.25))
          ))::numeric, 0) AS bull_score
        FROM curr c
        LEFT JOIN prev p ON p.area_name_en = c.area_name_en
        LEFT JOIN pipeline pip ON pip.area_name_en = c.area_name_en
        LEFT JOIN (
          SELECT area_name_en, MAX(nc_display_name) AS nc_display_name, MAX(nc_slug) AS nc_slug
          FROM mv_txn_monthly_unified WHERE nc_display_name IS NOT NULL GROUP BY area_name_en
        ) nc ON nc.area_name_en = c.area_name_en
        ORDER BY bull_score DESC, c.txn_12m DESC
        LIMIT 5
      `,

      // Top 5 bear signals
      sql<{
        area_name_en: string
        nc_display_name: string | null
        nc_slug: string | null
        avg_psf: string
        yoy_pct: string | null
        pipeline_units: string
        distress_count: string
        bear_score: string
      }[]>`
        WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified WHERE trans_group_en = 'Sales'),
        curr AS (
          SELECT area_name_en,
            SUM(txn_count) AS txn_12m,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= latest.m - INTERVAL '11 months'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en HAVING SUM(txn_count) >= 15
        ),
        prev AS (
          SELECT area_name_en,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= latest.m - INTERVAL '23 months'
            AND txn_month <  latest.m - INTERVAL '11 months'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        ),
        pipeline AS (
          SELECT area_name_en, SUM(COALESCE(no_of_units, 0)) AS units
          FROM dld_projects WHERE project_status IN ('ACTIVE','NOT_STARTED','PENDING')
          GROUP BY area_name_en
        ),
        distress_agg AS (
          SELECT LOWER(area_name) AS area_key, COUNT(*) AS cnt
          FROM distress_listings WHERE disappeared_at IS NULL AND price_drop_confirmed = true
          GROUP BY LOWER(area_name)
        )
        SELECT
          c.area_name_en,
          nc.nc_display_name,
          nc.nc_slug,
          ROUND((c.psm / 10.764)::numeric, 0) AS avg_psf,
          CASE WHEN p.psm IS NOT NULL AND p.psm > 0
            THEN ROUND(((c.psm - p.psm) / p.psm * 100)::numeric, 1) ELSE NULL
          END AS yoy_pct,
          COALESCE(pip.units, 0) AS pipeline_units,
          COALESCE(d.cnt, 0) AS distress_count,
          ROUND(LEAST(100, GREATEST(0,
            GREATEST(0, LEAST(40, CASE WHEN p.psm IS NOT NULL AND p.psm > 0 THEN -(c.psm - p.psm) / p.psm * 200 ELSE 0 END))
            + LEAST(35, COALESCE(pip.units, 0)::float / GREATEST(c.txn_12m / 12.0, 1) * 2.5)
            + LEAST(25, COALESCE(d.cnt, 0)::float / GREATEST(c.txn_12m, 1) * 200)
          ))::numeric, 0) AS bear_score
        FROM curr c
        LEFT JOIN prev p ON p.area_name_en = c.area_name_en
        LEFT JOIN pipeline pip ON pip.area_name_en = c.area_name_en
        LEFT JOIN distress_agg d ON d.area_key = LOWER(c.area_name_en)
        LEFT JOIN (
          SELECT area_name_en, MAX(nc_display_name) AS nc_display_name, MAX(nc_slug) AS nc_slug
          FROM mv_txn_monthly_unified WHERE nc_display_name IS NOT NULL GROUP BY area_name_en
        ) nc ON nc.area_name_en = c.area_name_en
        ORDER BY bear_score DESC, c.txn_12m DESC
        LIMIT 5
      `,

      // Top 5 by 12m transaction volume
      sql<{
        area_name_en: string
        nc_display_name: string | null
        nc_slug: string | null
        txn_12m: string
        avg_psf: string
        mom_pct: string | null
      }[]>`
        WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified WHERE trans_group_en = 'Sales'),
        twelve AS (
          SELECT area_name_en,
            SUM(txn_count) AS vol,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= latest.m - INTERVAL '11 months'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en HAVING SUM(txn_count) >= 20
        ),
        curr_m AS (
          SELECT area_name_en, SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales' AND txn_month = latest.m AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        ),
        prev_m AS (
          SELECT area_name_en, SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales' AND txn_month = latest.m - INTERVAL '1 month' AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        )
        SELECT
          t.area_name_en,
          nc.nc_display_name,
          nc.nc_slug,
          t.vol AS txn_12m,
          ROUND((t.psm / 10.764)::numeric, 0) AS avg_psf,
          CASE WHEN pm.psm > 0 THEN ROUND(((cm.psm - pm.psm) / pm.psm * 100)::numeric, 1) ELSE NULL END AS mom_pct
        FROM twelve t
        LEFT JOIN curr_m cm ON cm.area_name_en = t.area_name_en
        LEFT JOIN prev_m pm ON pm.area_name_en = t.area_name_en
        LEFT JOIN (
          SELECT area_name_en, MAX(nc_display_name) AS nc_display_name, MAX(nc_slug) AS nc_slug
          FROM mv_txn_monthly_unified WHERE nc_display_name IS NOT NULL GROUP BY area_name_en
        ) nc ON nc.area_name_en = t.area_name_en
        ORDER BY t.vol DESC
        LIMIT 5
      `,

      // Top 5 pipeline risk (highest supply months)
      sql<{
        area_name_en: string
        nc_display_name: string | null
        nc_slug: string | null
        pipeline_units: string
        txn_12m: string
        supply_months: string
      }[]>`
        WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified WHERE trans_group_en = 'Sales'),
        sales AS (
          SELECT area_name_en, SUM(txn_count) AS txn_12m
          FROM mv_txn_monthly_unified CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= latest.m - INTERVAL '11 months'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en HAVING SUM(txn_count) >= 10
        ),
        pipeline AS (
          SELECT area_name_en, SUM(COALESCE(no_of_units, 0)) AS units
          FROM dld_projects WHERE project_status IN ('ACTIVE','NOT_STARTED','PENDING')
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en HAVING SUM(COALESCE(no_of_units, 0)) >= 500
        )
        SELECT
          s.area_name_en,
          nc.nc_display_name,
          nc.nc_slug,
          COALESCE(p.units, 0) AS pipeline_units,
          s.txn_12m,
          ROUND(COALESCE(p.units, 0)::numeric / GREATEST(s.txn_12m / 12.0, 1), 1) AS supply_months
        FROM sales s
        JOIN pipeline p ON p.area_name_en = s.area_name_en
        LEFT JOIN (
          SELECT area_name_en, MAX(nc_display_name) AS nc_display_name, MAX(nc_slug) AS nc_slug
          FROM mv_txn_monthly_unified WHERE nc_display_name IS NOT NULL GROUP BY area_name_en
        ) nc ON nc.area_name_en = s.area_name_en
        ORDER BY supply_months DESC
        LIMIT 5
      `,
    ])

    const sr = summaryRows[0]
    if (!sr) return null

    const currPsf = Number(sr.avg_dubai_psf)
    const prevPsf = sr.prev_avg_dubai_psf ? Number(sr.prev_avg_dubai_psf) : null
    const yoyPct = prevPsf && prevPsf > 0 ? ((currPsf - prevPsf) / prevPsf) * 100 : null

    // Get active distress count
    const distressCount = await sql<{ cnt: string }[]>`
      SELECT COUNT(*)::integer AS cnt FROM distress_listings
      WHERE disappeared_at IS NULL AND price_drop_confirmed = true
    `.catch(() => [{ cnt: "0" }])

    return {
      summary: {
        total_txn_12m: Number(sr.total_txn_12m),
        avg_dubai_psf: currPsf,
        yoy_psf_pct: yoyPct !== null ? Math.round(yoyPct * 10) / 10 : null,
        active_distress: Number(distressCount[0]?.cnt ?? 0),
        data_month: sr.data_month,
      },
      bullSignals: bullRows.map((r) => ({
        area_name_en: r.area_name_en,
        nc_display_name: r.nc_display_name ?? null,
        nc_slug: r.nc_slug ?? null,
        avg_psf: Number(r.avg_psf),
        yoy_pct: r.yoy_pct !== null ? Number(r.yoy_pct) : null,
        bull_score: Number(r.bull_score),
      })),
      bearSignals: bearRows.map((r) => ({
        area_name_en: r.area_name_en,
        nc_display_name: r.nc_display_name ?? null,
        nc_slug: r.nc_slug ?? null,
        avg_psf: Number(r.avg_psf),
        yoy_pct: r.yoy_pct !== null ? Number(r.yoy_pct) : null,
        bear_score: Number(r.bear_score),
        pipeline_units: Number(r.pipeline_units),
        distress_count: Number(r.distress_count),
      })),
      volumeLeaders: volRows.map((r) => ({
        area_name_en: r.area_name_en,
        nc_display_name: r.nc_display_name ?? null,
        nc_slug: r.nc_slug ?? null,
        txn_12m: Number(r.txn_12m),
        avg_psf: Number(r.avg_psf),
        mom_pct: r.mom_pct !== null ? Number(r.mom_pct) : null,
      })),
      pipelineRisks: pipeRows.map((r) => ({
        area_name_en: r.area_name_en,
        nc_display_name: r.nc_display_name ?? null,
        nc_slug: r.nc_slug ?? null,
        pipeline_units: Number(r.pipeline_units),
        txn_12m: Number(r.txn_12m),
        supply_months: Number(r.supply_months),
      })),
    }
  } catch (err) {
    console.error("[market-pulse] fetchPulseData error:", err)
    return null
  }
  },
  ['market-pulse-data'],
  { revalidate: 3600 }
)

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function scoreBar(score: number, max: number, color: string) {
  const pct = Math.round((score / max) * 100)
  return (
    <div className="w-full h-1 rounded-full bg-border/30 mt-1">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function MarketPulsePage() {
  const [session, data] = await Promise.all([auth(), fetchPulseData()])
  const isAuthenticated = await isTerminalUnlocked(session)

  if (!data) {
    return (
      <div className="space-y-6 pb-24 lg:pb-10 px-6 sm:px-0">
        <div className="rounded-xl border border-border/40 bg-card/40 p-12 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No data available — database initializing.</p>
        </div>
      </div>
    )
  }

  const { summary, bullSignals, bearSignals, volumeLeaders, pipelineRisks } = data
  const yoyColor = summary.yoy_psf_pct === null ? "" : summary.yoy_psf_pct >= 0 ? "text-accent" : "text-red-400"

  return (
    <div className="space-y-8 pb-24 lg:pb-10 px-6 sm:px-0">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Intelligence · {summary.data_month}
          </p>
          <Link
            href="/terminal/market-briefing"
            className="text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            AI Market Briefing →
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Market Pulse</h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Consolidated view of Dubai property market signals — top bull and bear areas, volume leaders,
          pipeline risk, and distress hotspots. All data from live DLD transactions and off-plan registry.
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Dubai Avg PSF",
            value: `AED ${summary.avg_dubai_psf.toLocaleString()}`,
            sub: summary.yoy_psf_pct !== null
              ? `${summary.yoy_psf_pct >= 0 ? "+" : ""}${summary.yoy_psf_pct.toFixed(1)}% YoY`
              : undefined,
            subColor: yoyColor,
            icon: BarChart3,
            color: "text-foreground",
          },
          {
            label: "Deals (12m)",
            value: summary.total_txn_12m.toLocaleString(),
            sub: "registered sales",
            subColor: "text-muted-foreground",
            icon: Activity,
            color: "text-accent",
          },
          {
            label: "Active Distress",
            value: summary.active_distress.toLocaleString(),
            sub: "confirmed drops",
            subColor: "text-muted-foreground",
            icon: AlertTriangle,
            color: "text-yellow-400",
          },
          {
            label: "Data As Of",
            value: summary.data_month,
            sub: "latest month",
            subColor: "text-muted-foreground",
            icon: Zap,
            color: "text-muted-foreground",
          },
        ].map(({ label, value, sub, subColor, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border/40 bg-card/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
            </div>
            <p className={`font-mono text-xl font-bold ${color}`}>{value}</p>
            {sub && <p className={`font-mono text-[10px] mt-0.5 ${subColor}`}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Two-column: Bull + Bear signals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Bull signals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Top Bull Signals
              </h2>
            </div>
            <Link href="/terminal/bull-cases" className="text-[10px] font-mono text-accent hover:underline">
              Full screener →
            </Link>
          </div>
          <div className="space-y-2">
            {bullSignals.map((row, i) => {
              const name = row.nc_display_name ?? formatAreaName(row.area_name_en)
              const slug = row.nc_slug ?? toSlug(row.area_name_en)
              return (
                <div key={row.area_name_en} className="rounded-xl border border-border/40 bg-card/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground/40 tabular-nums w-4 shrink-0">
                        {i + 1}
                      </span>
                      <Link
                        href={`/terminal/areas/${slug}`}
                        className="text-sm font-medium text-foreground hover:text-accent transition-colors truncate"
                      >
                        {name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {row.yoy_pct !== null && (
                        <span className={`font-mono text-[11px] ${row.yoy_pct >= 0 ? "text-accent" : "text-red-400"}`}>
                          {row.yoy_pct >= 0 ? "+" : ""}{row.yoy_pct.toFixed(1)}%
                        </span>
                      )}
                      <span
                        className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ background: "#05966922", color: "#10b981" }}
                      >
                        {row.bull_score}
                      </span>
                    </div>
                  </div>
                  {scoreBar(row.bull_score, 100, "#10b981")}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bear signals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Top Bear Signals
              </h2>
            </div>
            <Link href="/terminal/bear-cases" className="text-[10px] font-mono text-red-400/70 hover:text-red-400 transition-colors">
              Full screener →
            </Link>
          </div>
          <div className="space-y-2">
            {bearSignals.map((row, i) => {
              const name = row.nc_display_name ?? formatAreaName(row.area_name_en)
              const slug = row.nc_slug ?? toSlug(row.area_name_en)
              return (
                <div key={row.area_name_en} className="rounded-xl border border-border/40 bg-card/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground/40 tabular-nums w-4 shrink-0">
                        {i + 1}
                      </span>
                      <Link
                        href={`/terminal/areas/${slug}`}
                        className="text-sm font-medium text-foreground hover:text-accent transition-colors truncate"
                      >
                        {name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {row.yoy_pct !== null && (
                        <span className={`font-mono text-[11px] ${row.yoy_pct < 0 ? "text-red-400" : "text-accent"}`}>
                          {row.yoy_pct >= 0 ? "+" : ""}{row.yoy_pct.toFixed(1)}%
                        </span>
                      )}
                      <span
                        className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
                        style={{ background: "#7f1d1d22", color: "#ef4444" }}
                      >
                        {row.bear_score}
                      </span>
                    </div>
                  </div>
                  {scoreBar(row.bear_score, 100, "#ef4444")}
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Volume leaders + Pipeline risk — gated */}
      <div className="relative">
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${!isAuthenticated ? "opacity-40 pointer-events-none select-none" : ""}`}>

          {/* Volume leaders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-yellow-400" />
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Volume Leaders
                </h2>
              </div>
              <Link href="/terminal/area-momentum" className="text-[10px] font-mono text-yellow-400/70 hover:text-yellow-400 transition-colors">
                Momentum →
              </Link>
            </div>
            <div className="space-y-2">
              {volumeLeaders.map((row, i) => {
                const name = row.nc_display_name ?? formatAreaName(row.area_name_en)
                const slug = row.nc_slug ?? toSlug(row.area_name_en)
                return (
                  <div key={row.area_name_en} className="rounded-xl border border-border/40 bg-card/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-muted-foreground/40 tabular-nums w-4 shrink-0">
                          {i + 1}
                        </span>
                        <Link
                          href={`/terminal/areas/${slug}`}
                          className="text-sm font-medium text-foreground hover:text-accent transition-colors truncate"
                        >
                          {name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {row.mom_pct !== null && (
                          <span className={`font-mono text-[11px] ${row.mom_pct >= 0 ? "text-accent" : "text-red-400"}`}>
                            {row.mom_pct >= 0 ? "+" : ""}{row.mom_pct.toFixed(1)}%
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-foreground/80">
                          {row.txn_12m.toLocaleString()} txns
                        </span>
                      </div>
                    </div>
                    {scoreBar(row.txn_12m, volumeLeaders[0]?.txn_12m || 1, "#eab308")}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pipeline risk */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-orange-400" />
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Pipeline Risk
                </h2>
              </div>
              <Link href="/terminal/off-plan-pipeline" className="text-[10px] font-mono text-orange-400/70 hover:text-orange-400 transition-colors">
                Full pipeline →
              </Link>
            </div>
            <div className="space-y-2">
              {pipelineRisks.map((row, i) => {
                const name = row.nc_display_name ?? formatAreaName(row.area_name_en)
                const slug = row.nc_slug ?? toSlug(row.area_name_en)
                return (
                  <div key={row.area_name_en} className="rounded-xl border border-border/40 bg-card/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-muted-foreground/40 tabular-nums w-4 shrink-0">
                          {i + 1}
                        </span>
                        <Link
                          href={`/terminal/areas/${slug}`}
                          className="text-sm font-medium text-foreground hover:text-accent transition-colors truncate"
                        >
                          {name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-orange-400">
                          {row.supply_months.toFixed(0)}m supply
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          +{row.pipeline_units.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {scoreBar(row.supply_months, pipelineRisks[0]?.supply_months || 1, "#f97316")}
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Gate overlay for unauthenticated */}
        {!isAuthenticated && (
          <GatedTableOverlay
            freeRows={0}
            totalRows={2}
            noun="sections"
            callbackUrl="/terminal/market-pulse"
          />
        )}
      </div>

      {/* Cross-links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Market Briefing", href: "/terminal/market-briefing", icon: Activity },
          { label: "Area Momentum", href: "/terminal/area-momentum", icon: TrendingUp },
          { label: "Distress Deals", href: "/terminal/distress-deals", icon: AlertTriangle },
          { label: "Building Comparator", href: "/terminal/building-comparator", icon: Building2 },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-border/40 bg-card/40 p-3 flex items-center gap-2 hover:border-border/80 hover:bg-card/60 transition-colors"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] font-mono text-muted-foreground">{label}</span>
          </Link>
        ))}
      </div>

      <p className="text-[11px] font-mono text-muted-foreground/40 px-1">
        Source: Dubai Land Department · Bayut · Data as of {summary.data_month}. Not financial advice.
      </p>
    </div>
  )
}
