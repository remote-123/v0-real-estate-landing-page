import type { Metadata } from "next"
import { sql } from "@/lib/db"
import { TrendingUp, Zap, BarChart3 } from "lucide-react"
import { StatCard } from "@/components/terminal/stat-card"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Area Momentum | North Capital DXB",
  description:
    "Communities ranked by combined price and volume acceleration. Identifies Dubai real estate markets moving before wider coverage.",
  alternates: {
    canonical: "https://www.northcapitaldxb.com/terminal/area-momentum",
  },
}

interface AreaRow {
  area_name_en: string
  curr_psf: number | string
  price_mom_pct: number | string
  curr_vol: number | string
  vol_mom_pct: number | string
  momentum_score: number | string
}

async function fetchAreas(): Promise<AreaRow[]> {
  try {
    const rows = await sql<AreaRow[]>`
      WITH monthly AS (
        SELECT
          area_name_en,
          txn_month,
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS avg_psm,
          SUM(txn_count) AS vol
        FROM mv_txn_monthly
        WHERE trans_group_en = 'Sales'
          AND property_type_en = 'Unit'
          AND area_name_en IS NOT NULL
          AND txn_month >= NOW() - INTERVAL '3 months'
        GROUP BY area_name_en, txn_month
      ),
      latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly),
      curr AS (
        SELECT area_name_en, avg_psm AS curr_psm, vol AS curr_vol
        FROM monthly CROSS JOIN latest
        WHERE txn_month = latest.m
      ),
      prev AS (
        SELECT area_name_en, avg_psm AS prev_psm, vol AS prev_vol
        FROM monthly CROSS JOIN latest
        WHERE txn_month = latest.m - INTERVAL '1 month'
      )
      SELECT
        c.area_name_en,
        ROUND((c.curr_psm / 10.764)::numeric, 0)::integer AS curr_psf,
        ROUND(((c.curr_psm - p.prev_psm) / NULLIF(p.prev_psm, 0) * 100)::numeric, 2) AS price_mom_pct,
        c.curr_vol::integer AS curr_vol,
        ROUND(((c.curr_vol::numeric - p.prev_vol) / NULLIF(p.prev_vol, 0) * 100)::numeric, 1) AS vol_mom_pct,
        ROUND((((c.curr_psm - p.prev_psm) / NULLIF(p.prev_psm, 0)) + ((c.curr_vol::numeric - p.prev_vol) / NULLIF(p.prev_vol, 0))) * 50, 1) AS momentum_score
      FROM curr c
      JOIN prev p USING (area_name_en)
      WHERE c.curr_vol >= 5 AND p.prev_vol >= 5
        AND c.curr_psm > 0 AND p.prev_psm > 0
      ORDER BY momentum_score DESC
      LIMIT 80
    `
    return rows
  } catch (error) {
    console.error("area-momentum fetch error:", error)
    return []
  }
}

function pct(val: number | string) {
  const n = Number(val)
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}

function volPct(val: number | string) {
  const n = Number(val)
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(1)}%`
}

export default async function AreaMomentumPage() {
  const areas = await fetchAreas()
  const display = areas.slice(0, 60).map((a) => ({
    ...a,
    curr_psf: Number(a.curr_psf),
    price_mom_pct: Number(a.price_mom_pct),
    curr_vol: Number(a.curr_vol),
    vol_mom_pct: Number(a.vol_mom_pct),
    momentum_score: Number(a.momentum_score),
  }))

  const breakouts = display.filter(
    (a) => a.price_mom_pct > 2 && a.vol_mom_pct > 5
  ).length

  const avgPriceMom =
    display.length > 0
      ? display.reduce((s, a) => s + a.price_mom_pct, 0) / display.length
      : 0

  const topScore = display[0]?.momentum_score ?? 0

  const maxScore = Math.max(...display.map((a) => a.momentum_score), 1)

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 xl:px-12 py-0 sm:py-6 max-w-[1400px] mx-auto pb-24 lg:pb-12">
      {/* Header */}
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
          Price &amp; Volume Screener
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Area Momentum
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Communities ranked by combined price and volume acceleration.
          Identifies markets moving before wider coverage.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Breakouts"
          value={breakouts.toString()}
          icon={Zap}
          description="Areas: price >+2% AND vol >+5% MoM"
        />
        <StatCard
          label="Avg Price MoM"
          value={`${avgPriceMom > 0 ? "+" : ""}${avgPriceMom.toFixed(2)}%`}
          icon={TrendingUp}
          description={`Across ${display.length} active areas`}
        />
        <StatCard
          label="Top Momentum Score"
          value={topScore.toFixed(1)}
          icon={BarChart3}
          description={display[0]?.area_name_en ?? "—"}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Community
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  AED/sqft
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Price MoM
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Vol MoM
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Txns
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 min-w-[140px]">
                  Momentum
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  Signal
                </th>
              </tr>
            </thead>
            <tbody>
              {display.map((area, i) => {
                const isBreakout =
                  area.price_mom_pct > 2 && area.vol_mom_pct > 5
                const barWidth = Math.min(
                  (area.momentum_score / maxScore) * 100,
                  100
                )
                return (
                  <tr
                    key={area.area_name_en}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground/50">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {area.area_name_en}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-foreground">
                      {area.curr_psf.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs font-semibold ${
                        area.price_mom_pct >= 0
                          ? "text-emerald-500"
                          : "text-red-400"
                      }`}
                    >
                      {pct(area.price_mom_pct)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs font-semibold ${
                        area.vol_mom_pct >= 0
                          ? "text-emerald-500"
                          : "text-red-400"
                      }`}
                    >
                      {volPct(area.vol_mom_pct)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {area.curr_vol.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="relative w-20 h-5 flex items-center">
                          <div className="absolute inset-0 rounded-sm bg-muted/20" />
                          <div
                            className="absolute left-0 top-0 h-full rounded-sm bg-emerald-500/20"
                            style={{ width: `${barWidth}%` }}
                          />
                          <span className="relative w-full text-right pr-1 font-mono text-xs text-foreground">
                            {area.momentum_score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isBreakout && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                          Breakout
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {display.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/50 pb-2">
        Source: Dubai Land Department — DLD transactions via mv_txn_monthly.
        Momentum = ((price MoM) + (vol MoM)) &times; 50.
      </p>
    </div>
  )
}
