import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { unstable_cache } from 'next/cache'
import { formatAreaName } from "@/lib/area-names"
import { auth } from "@/auth"
import { isTerminalUnlocked } from "@/lib/terminal-gate"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import Link from "next/link"
import { AlertTriangle, TrendingDown, Building2, BarChart3 } from "lucide-react"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Bear Case Screener — Areas to Avoid",
    description:
      "Data-driven analysis of Dubai areas showing supply pressure, price decline, or distress concentration. Institutional-grade risk signals from live DLD and Bayut data.",
    path: "/terminal/bear-cases",
  })
}

interface BearCaseRow {
  area_name_en: string
  nc_display_name: string | null
  nc_slug: string | null
  txn_12m: number
  avg_psf: number
  yoy_pct: number | null
  pipeline_units: number
  distress_count: number
  bear_score: number
}

const fetchBearCases = unstable_cache(
  async (): Promise<BearCaseRow[]> => {
  try {
    const rows = await sql<{
      area_name_en: string
      nc_display_name: string | null
      nc_slug: string | null
      txn_12m: string
      avg_psf: string
      yoy_pct: string | null
      pipeline_units: string
      distress_count: string
      bear_score: string
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
          HAVING SUM(txn_count) >= 15
        ),
        prev AS (
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
        pipeline AS (
          SELECT area_name_en, SUM(COALESCE(no_of_units, 0)) AS units
          FROM dld_projects
          WHERE project_status IN ('ACTIVE','NOT_STARTED','PENDING')
            AND area_name_en IS NOT NULL
          GROUP BY area_name_en
        ),
        distress_agg AS (
          SELECT LOWER(area_name) AS area_key, COUNT(*) AS cnt
          FROM distress_listings
          WHERE disappeared_at IS NULL
            AND price_drop_confirmed = true
          GROUP BY LOWER(area_name)
        )
      SELECT
        c.area_name_en,
        nc.nc_display_name,
        nc.nc_slug,
        c.txn_12m,
        ROUND((c.psm / 10.764)::numeric, 0)                                        AS avg_psf,
        CASE
          WHEN p.psm IS NOT NULL AND p.psm > 0
          THEN ROUND(((c.psm - p.psm) / p.psm * 100)::numeric, 1)
          ELSE NULL
        END                                                                          AS yoy_pct,
        COALESCE(pip.units, 0)                                                       AS pipeline_units,
        COALESCE(d.cnt, 0)                                                           AS distress_count,
        ROUND(LEAST(100, GREATEST(0,
          -- Price decline component (0-40 pts): -5% YoY → +10 pts, -20% → +40 pts (cap)
          GREATEST(0, LEAST(40,
            CASE
              WHEN p.psm IS NOT NULL AND p.psm > 0
              THEN -(c.psm - p.psm) / p.psm * 200
              ELSE 0
            END
          ))
          -- Oversupply pressure (0-35 pts): pipeline units vs monthly sales rate
          + LEAST(35, COALESCE(pip.units, 0)::float / GREATEST(c.txn_12m / 12.0, 1) * 2.5)
          -- Distress density (0-25 pts): confirmed price drops vs transaction volume
          + LEAST(25, COALESCE(d.cnt, 0)::float / GREATEST(c.txn_12m, 1) * 200)
        ))::numeric, 0)                                                              AS bear_score
      FROM curr c
      LEFT JOIN prev p             ON p.area_name_en = c.area_name_en
      LEFT JOIN pipeline pip       ON pip.area_name_en = c.area_name_en
      LEFT JOIN distress_agg d     ON d.area_key = LOWER(c.area_name_en)
      LEFT JOIN (
        SELECT area_name_en, MAX(nc_display_name) AS nc_display_name, MAX(nc_slug) AS nc_slug
        FROM mv_txn_monthly_unified WHERE nc_display_name IS NOT NULL GROUP BY area_name_en
      ) nc ON nc.area_name_en = c.area_name_en
      ORDER BY bear_score DESC, c.txn_12m DESC
      LIMIT 25
    `

    return rows.map((r) => ({
      area_name_en: r.area_name_en,
      nc_display_name: r.nc_display_name ?? null,
      nc_slug: r.nc_slug ?? null,
      txn_12m: Number(r.txn_12m),
      avg_psf: Number(r.avg_psf),
      yoy_pct: r.yoy_pct !== null ? Number(r.yoy_pct) : null,
      pipeline_units: Number(r.pipeline_units),
      distress_count: Number(r.distress_count),
      bear_score: Number(r.bear_score),
    }))
  } catch (err) {
    console.error("[bear-cases] fetchBearCases error:", err)
    return []
  }
  },
  ['bear-cases-data'],
  { revalidate: 3600 }
)

function bearLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 65) return { label: "EXTREME", color: "#ef4444", bg: "#7f1d1d22" }
  if (score >= 40) return { label: "HIGH",    color: "#f97316", bg: "#7c2d1222" }
  if (score >= 20) return { label: "MODERATE",color: "#eab308", bg: "#71350122" }
  return                  { label: "CAUTION", color: "#6b7280", bg: "#37415122" }
}

function pipelineMonths(units: number, txn12m: number): number {
  const monthly = Math.max(txn12m / 12, 1)
  return Math.round(units / monthly)
}

const FREE_ROWS = 5

export default async function BearCasesPage() {
  const [session, rows] = await Promise.all([auth(), fetchBearCases()])
  const isAuthenticated = await isTerminalUnlocked(session)
  const display = isAuthenticated ? rows : rows.slice(0, FREE_ROWS)

  const totalAnalyzed = rows.length
  const decliningCount = rows.filter((r) => r.yoy_pct !== null && r.yoy_pct < -2).length
  const oversupplyCount = rows.filter((r) => r.pipeline_units > r.txn_12m).length
  const totalDistress = rows.reduce((s, r) => s + r.distress_count, 0)

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
            href="/terminal/bull-cases"
            className="text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Bull Case Screener →
          </Link>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Bear Case Screener</h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Areas ranked by negative signal density — oversupply pressure, price decline, and distress
          concentration. Data from live DLD transactions, off-plan pipeline, and confirmed price-drop
          listings. Higher score = stronger case for caution.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Areas Analyzed", value: totalAnalyzed, icon: BarChart3, color: "text-foreground" },
          { label: "Price Declining", value: decliningCount, icon: TrendingDown, color: "text-red-400" },
          { label: "Oversupply Risk", value: oversupplyCount, icon: Building2, color: "text-orange-400" },
          { label: "Distress Signals", value: totalDistress, icon: AlertTriangle, color: "text-yellow-400" },
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
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No data available — database initializing.</p>
        </div>
      ) : (
        <div className="relative space-y-2">
          {display.map((row, i) => {
            const name = row.nc_display_name ?? formatAreaName(row.area_name_en)
            const slug = row.nc_slug ?? toSlug(row.area_name_en)
            const { label, color, bg } = bearLabel(row.bear_score)
            const pipelineMo = pipelineMonths(row.pipeline_units, row.txn_12m)
            const declining = row.yoy_pct !== null && row.yoy_pct < -2
            const oversupply = pipelineMo > 18
            const hasDistress = row.distress_count > 0

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
                        {declining && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider"
                            style={{ background: "#7f1d1d22", color: "#f87171" }}>
                            <TrendingDown className="h-2.5 w-2.5" />
                            {row.yoy_pct!.toFixed(1)}% YoY
                          </span>
                        )}
                        {oversupply && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider"
                            style={{ background: "#7c2d1222", color: "#fb923c" }}>
                            <Building2 className="h-2.5 w-2.5" />
                            {pipelineMo}m supply
                          </span>
                        )}
                        {hasDistress && (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider"
                            style={{ background: "#71350122", color: "#fbbf24" }}>
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {row.distress_count} distress
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
                        <span>Pipeline: <span className="text-orange-400">+{row.pipeline_units.toLocaleString()} units</span></span>
                      )}
                      <span>Vol (12m): <span className="text-foreground">{row.txn_12m.toLocaleString()} txns</span></span>
                      {row.yoy_pct !== null && (
                        <span>YoY: <span className={row.yoy_pct < 0 ? "text-red-400" : "text-accent"}>
                          {row.yoy_pct >= 0 ? "+" : ""}{row.yoy_pct.toFixed(1)}%
                        </span></span>
                      )}
                    </div>
                  </div>

                  {/* Bear score */}
                  <div className="shrink-0 text-right">
                    <div
                      className="rounded-lg px-3 py-2 text-center mb-1"
                      style={{ background: bg, border: `1px solid ${color}33` }}
                    >
                      <p className="font-mono text-lg font-bold leading-none" style={{ color }}>
                        {row.bear_score}
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
              callbackUrl="/terminal/bear-cases"
            />
          )}
        </div>
      )}

      {/* Cross-link to bull cases */}
      <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">See the other side</p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            Areas with price appreciation, high volume, and supply scarcity
          </p>
        </div>
        <Link
          href="/terminal/bull-cases"
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Bull Case Screener →
        </Link>
      </div>

      {/* Methodology */}
      <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Methodology</p>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Bear Score (0–100) = weighted sum of three signals: price decline vs prior 12 months (0–40 pts),
          off-plan pipeline supply months vs current sales rate (0–35 pts), and confirmed distress listing
          density per transaction volume (0–25 pts). Minimum 15 transactions per area to qualify. Data from
          Dubai Land Department, Bayut, and PropertyFinder. Not financial advice.
        </p>
      </div>
    </div>
  )
}
