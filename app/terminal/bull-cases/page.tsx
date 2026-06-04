import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { unstable_cache } from 'next/cache'
import { formatAreaName } from "@/lib/area-names"
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import Link from "next/link"
import { TrendingUp, Zap, BarChart3, Flame } from "lucide-react"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Bull Case Screener — Strongest Buy Signals",
    description:
      "Data-driven analysis of Dubai areas showing price appreciation, volume strength, and supply scarcity. Institutional-grade positive signals from live DLD and Bayut data.",
    path: "/terminal/bull-cases",
  })
}

interface BullCaseRow {
  area_name_en: string
  txn_12m: number
  avg_psf: number
  yoy_pct: number | null
  mom_pct: number | null
  pipeline_units: number
  supply_months: number
  bull_score: number
}

const fetchBullCases = unstable_cache(
  async (): Promise<BullCaseRow[]> => {
  try {
    const rows = await sql<{
      area_name_en: string
      txn_12m: string
      avg_psf: string
      yoy_pct: string | null
      mom_pct: string | null
      pipeline_units: string
      supply_months: string
      bull_score: string
    }[]>`
      WITH
        latest AS (
          SELECT MAX(txn_month) AS max_m
          FROM mv_txn_monthly_unified
          WHERE trans_group_en = 'Sales'
        ),
        curr AS (
          SELECT
            area_name_en,
            SUM(txn_count)                                                        AS txn_12m,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0)           AS psm
          FROM mv_txn_monthly_unified
          CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= max_m - INTERVAL '11 months'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
          HAVING SUM(txn_count) >= 20
        ),
        prev_year AS (
          SELECT
            area_name_en,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified
          CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month >= max_m - INTERVAL '23 months'
            AND txn_month <  max_m - INTERVAL '11 months'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        ),
        curr_month AS (
          SELECT
            area_name_en,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified
          CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month = max_m
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        ),
        prev_month AS (
          SELECT
            area_name_en,
            SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified
          CROSS JOIN latest
          WHERE trans_group_en = 'Sales'
            AND txn_month = max_m - INTERVAL '1 month'
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        ),
        pipeline AS (
          SELECT area_name_en, SUM(COALESCE(no_of_units, 0)) AS units
          FROM dld_projects
          WHERE project_status IN ('ACTIVE','NOT_STARTED','PENDING')
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        )
      SELECT
        c.area_name_en,
        c.txn_12m,
        ROUND((c.psm / 10.764)::numeric, 0)                                                  AS avg_psf,
        -- YoY price change
        CASE
          WHEN py.psm IS NOT NULL AND py.psm > 0
          THEN ROUND(((c.psm - py.psm) / py.psm * 100)::numeric, 1)
          ELSE NULL
        END                                                                                    AS yoy_pct,
        -- MoM price change
        CASE
          WHEN pm.psm IS NOT NULL AND pm.psm > 0
          THEN ROUND(((cm.psm - pm.psm) / pm.psm * 100)::numeric, 1)
          ELSE NULL
        END                                                                                    AS mom_pct,
        COALESCE(pip.units, 0)                                                                AS pipeline_units,
        -- Supply months = pipeline units / monthly sales rate
        ROUND(COALESCE(pip.units, 0)::numeric / GREATEST(c.txn_12m / 12.0, 1), 1)           AS supply_months,
        -- Bull Score (0-100)
        ROUND(LEAST(100, GREATEST(0,
          -- Price appreciation component (0-35 pts): +5% YoY → +10 pts, +20% → +35 pts
          GREATEST(0, LEAST(35,
            CASE
              WHEN py.psm IS NOT NULL AND py.psm > 0
              THEN (c.psm - py.psm) / py.psm * 175
              ELSE 0
            END
          ))
          -- Volume strength component (0-35 pts): txn_12m ranked against median
          -- Uses sqrt scaling so outlier areas don't dominate
          + LEAST(35, SQRT(c.txn_12m::float) * 0.7)
          -- Supply scarcity component (0-30 pts): low pipeline = high scarcity
          -- 0 pipeline → full 30 pts; 6m supply → 15 pts; 24m+ → 0 pts
          + GREATEST(0, LEAST(30, 30 - COALESCE(pip.units, 0)::float / GREATEST(c.txn_12m / 12.0, 1) * 1.25))
        ))::numeric, 0)                                                                        AS bull_score
      FROM curr c
      LEFT JOIN prev_year py    ON py.area_name_en = c.area_name_en
      LEFT JOIN curr_month cm   ON cm.area_name_en = c.area_name_en
      LEFT JOIN prev_month pm   ON pm.area_name_en = c.area_name_en
      LEFT JOIN pipeline pip    ON pip.area_name_en = c.area_name_en
      ORDER BY bull_score DESC, c.txn_12m DESC
      LIMIT 25
    `

    return rows.map((r) => ({
      area_name_en: r.area_name_en,
      txn_12m: Number(r.txn_12m),
      avg_psf: Number(r.avg_psf),
      yoy_pct: r.yoy_pct !== null ? Number(r.yoy_pct) : null,
      mom_pct: r.mom_pct !== null ? Number(r.mom_pct) : null,
      pipeline_units: Number(r.pipeline_units),
      supply_months: Number(r.supply_months),
      bull_score: Number(r.bull_score),
    }))
  } catch (err) {
    console.error("[bull-cases] fetchBullCases error:", err)
    return []
  }
  },
  ['bull-cases-data'],
  { revalidate: 3600 }
)

function bullLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 70) return { label: "STRONG",   color: "#10b981", bg: "#05966922" }
  if (score >= 50) return { label: "POSITIVE", color: "#34d399", bg: "#06524422" }
  if (score >= 30) return { label: "MILD",     color: "#6ee7b7", bg: "#04403422" }
  return                  { label: "NEUTRAL",  color: "#6b7280", bg: "#37415122" }
}

const FREE_ROWS = 5

export default async function BullCasesPage() {
  const [session, rows] = await Promise.all([auth(), fetchBullCases()])
  const isAuthenticated = await isTerminalUnlocked(session)
  const display = isAuthenticated ? rows : rows.slice(0, FREE_ROWS)

  const totalAnalyzed = rows.length
  const appreciatingCount = rows.filter((r) => r.yoy_pct !== null && r.yoy_pct > 5).length
  const scarceSupplyCount = rows.filter((r) => r.supply_months < 6).length
  const highVolumeCount = rows.filter((r) => r.txn_12m > 100).length

  const toSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  return (
    <div className="space-y-6 pb-24 lg:pb-10 px-6 sm:px-0">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Intelligence
          </p>
          <Link
            href="/terminal/bear-cases"
            className="text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Bear Case Screener →
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Bull Case Screener</h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Areas ranked by positive signal density — price appreciation, transaction volume strength,
          and supply scarcity. Data from live DLD transactions and off-plan pipeline. Higher score =
          stronger quantitative case for consideration.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Areas Analyzed", value: totalAnalyzed,      icon: BarChart3,  color: "text-foreground" },
          { label: "Price Rising >5%", value: appreciatingCount, icon: TrendingUp, color: "text-accent" },
          { label: "Scarce Supply",   value: scarceSupplyCount,  icon: Flame,      color: "text-orange-400" },
          { label: "High Volume",     value: highVolumeCount,    icon: Zap,        color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border/40 bg-card/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
            </div>
            <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Ranked list */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-card/40 p-12 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No data available — database initializing.</p>
        </div>
      ) : (
        <div className="relative space-y-2">
          {display.map((row, i) => {
            const name = formatAreaName(row.area_name_en)
            const slug = toSlug(row.area_name_en)
            const { label, color, bg } = bullLabel(row.bull_score)
            const appreciating = row.yoy_pct !== null && row.yoy_pct > 5
            const scarceSup = row.supply_months < 6
            const highVol = row.txn_12m > 100
            const momUp = row.mom_pct !== null && row.mom_pct > 0

            return (
              <div
                key={row.area_name_en}
                className="rounded-xl border border-border/40 bg-card/40 p-4 sm:p-5"
              >
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <span className="font-mono text-[11px] text-muted-foreground/50 tabular-nums w-6 shrink-0 pt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                      {/* Area name */}
                      <Link
                        href={`/terminal/areas/${slug}`}
                        className="text-base font-semibold text-foreground hover:text-accent transition-colors truncate"
                      >
                        {name}
                      </Link>

                      {/* Signal badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {appreciating && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider"
                            style={{ background: "#05966922", color: "#34d399" }}>
                            <TrendingUp className="h-2.5 w-2.5" />
                            +{row.yoy_pct!.toFixed(1)}% YoY
                          </span>
                        )}
                        {momUp && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider"
                            style={{ background: "#05966922", color: "#6ee7b7" }}>
                            <Zap className="h-2.5 w-2.5" />
                            +{row.mom_pct!.toFixed(1)}% MoM
                          </span>
                        )}
                        {scarceSup && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider"
                            style={{ background: "#7c2d1222", color: "#fb923c" }}>
                            <Flame className="h-2.5 w-2.5" />
                            {row.supply_months.toFixed(1)}m supply
                          </span>
                        )}
                        {highVol && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider"
                            style={{ background: "#71350122", color: "#fbbf24" }}>
                            <BarChart3 className="h-2.5 w-2.5" />
                            {row.txn_12m.toLocaleString()} deals
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Key metrics */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-mono text-muted-foreground">
                      {row.avg_psf > 0 && (
                        <span>PSF: <span className="text-foreground">AED {row.avg_psf.toLocaleString()}</span></span>
                      )}
                      {row.pipeline_units > 0 && (
                        <span>Pipeline: <span className="text-muted-foreground">+{row.pipeline_units.toLocaleString()} units</span></span>
                      )}
                      {row.pipeline_units === 0 && (
                        <span>Pipeline: <span className="text-accent">None ✓</span></span>
                      )}
                      <span>Vol (12m): <span className="text-foreground">{row.txn_12m.toLocaleString()} txns</span></span>
                      {row.yoy_pct !== null && (
                        <span>YoY: <span className={row.yoy_pct >= 0 ? "text-accent" : "text-red-400"}>
                          {row.yoy_pct >= 0 ? "+" : ""}{row.yoy_pct.toFixed(1)}%
                        </span></span>
                      )}
                      {row.mom_pct !== null && (
                        <span>MoM: <span className={row.mom_pct >= 0 ? "text-accent" : "text-red-400"}>
                          {row.mom_pct >= 0 ? "+" : ""}{row.mom_pct.toFixed(1)}%
                        </span></span>
                      )}
                    </div>
                  </div>

                  {/* Bull score */}
                  <div className="shrink-0 text-right">
                    <div
                      className="rounded-lg px-3 py-2 text-center mb-1"
                      style={{ background: bg, border: `1px solid ${color}33` }}
                    >
                      <p className="font-mono text-lg font-bold leading-none" style={{ color }}>
                        {row.bull_score}
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-widest mt-0.5" style={{ color }}>
                        {label}
                      </p>
                    </div>
                    <Link
                      href={`/terminal/areas/${slug}`}
                      className="text-[10px] font-mono text-muted-foreground/50 hover:text-accent transition-colors"
                    >
                      Full analysis →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Gate */}
          {!isAuthenticated && rows.length > FREE_ROWS && (
            <GatedTableOverlay
              freeRows={FREE_ROWS}
              totalRows={rows.length}
              noun="areas"
              callbackUrl="/terminal/bull-cases"
            />
          )}
        </div>
      )}

      {/* Cross-link to bear cases */}
      <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">See the other side</p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            Areas with oversupply, price decline, or distress signals
          </p>
        </div>
        <Link
          href="/terminal/bear-cases"
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Bear Case Screener →
        </Link>
      </div>

      {/* Methodology */}
      <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Methodology</p>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Bull Score (0–100) = weighted sum of three signals: price appreciation vs prior 12 months
          (0–35 pts), transaction volume strength relative to active market depth (0–35 pts), and
          supply scarcity — low off-plan pipeline relative to current sales rate (0–30 pts).
          Minimum 20 transactions per area to qualify. Data from Dubai Land Department and Bayut.
          Not financial advice.
        </p>
      </div>
    </div>
  )
}
