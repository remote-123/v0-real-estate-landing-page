import type { Metadata } from "next"
import { sql } from "@/lib/db"
import { YieldMapTable } from "@/components/terminal/yield-map-table"
import type { YieldRow } from "@/components/terminal/yield-map-table"
import { formatAreaName } from "@/lib/area-names"
import { auth } from "@/auth"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Dubai Yield Map | North Capital DXB",
  description:
    "Gross rental yield by community and bedroom type. Rolling 12 months of DLD-registered sales and rental contracts.",
  alternates: {
    canonical: "/terminal/yield-map",
  },
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

  // Top 5 for the blueprint panel
  const topFive = allRows.slice(0, 5)

  return (
    // E3 Spatial/Architectural — light override
    <div
      className="min-h-screen -m-6 sm:-m-8 p-6 sm:p-10"
      style={{ background: '#F8FAFF' }}
    >
      {/* ── Blueprint hero ──────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden mb-8 border"
        style={{ borderColor: '#dde6f0', background: '#FFFFFF' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-5">

          {/* Left — page identity + stats */}
          <div className="lg:col-span-2 p-8 space-y-6 border-b lg:border-b-0 lg:border-r" style={{ borderColor: '#dde6f0' }}>
            <div>
              <p
                className="text-[9px] uppercase tracking-[0.2em] font-mono mb-2"
                style={{ color: '#0F2550', opacity: 0.4 }}
              >
                Dubai · Yield Intelligence
              </p>
              <h1
                className="font-serif text-4xl font-bold leading-tight"
                style={{ color: '#0F2550' }}
              >
                Yield Map
              </h1>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: '#64748b' }}>
                Gross rental yield by community and bedroom type. Rolling 12 months of DLD-registered contracts.
              </p>
            </div>

            {/* Stats — border-left accent style */}
            <div className="space-y-4">
              <div className="border-l-2 pl-4" style={{ borderColor: '#0F2550' }}>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Top Yield</p>
                <p className="text-3xl font-bold" style={{ color: '#0F2550' }}>
                  {topYield !== null ? `${topYield.toFixed(2)}%` : '—'}
                </p>
                {allRows[0] && (
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {formatAreaName(allRows[0].area_name_en)} · {allRows[0].rooms_en}
                  </p>
                )}
              </div>
              <div className="border-l-2 pl-4" style={{ borderColor: '#B8860B' }}>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Portfolio Average</p>
                <p className="text-2xl font-bold" style={{ color: '#B8860B' }}>
                  {avgYield !== null ? `${avgYield.toFixed(2)}%` : '—'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Unweighted mean, all areas</p>
              </div>
              <div className="border-l-2 pl-4" style={{ borderColor: '#64748b' }}>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Combinations Tracked</p>
                <p className="text-2xl font-bold" style={{ color: '#475569' }}>
                  {totalCombos > 0 ? totalCombos.toLocaleString() : '—'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Area + bedroom pairs with ≥10 txns</p>
              </div>
            </div>
          </div>

          {/* Right — blueprint grid panel */}
          <div className="lg:col-span-3 relative overflow-hidden" style={{ background: '#F0F4FC', minHeight: 320 }}>
            {/* Blueprint grid */}
            <svg
              width="100%" height="100%"
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              preserveAspectRatio="none"
            >
              {Array.from({ length: 20 }, (_, i) => (
                <line
                  key={`h${i}`}
                  x1="0" y1={`${(i + 1) * 5}%`}
                  x2="100%" y2={`${(i + 1) * 5}%`}
                  stroke="#0F2550" strokeWidth="0.4" opacity="0.18"
                />
              ))}
              {Array.from({ length: 20 }, (_, i) => (
                <line
                  key={`v${i}`}
                  x1={`${(i + 1) * 5}%`} y1="0"
                  x2={`${(i + 1) * 5}%`} y2="100%"
                  stroke="#0F2550" strokeWidth="0.4" opacity="0.18"
                />
              ))}
              {/* Cross-hairs at center */}
              <line x1="50%" y1="40%" x2="50%" y2="60%" stroke="#0F2550" strokeWidth="1" opacity="0.3" />
              <line x1="40%" y1="50%" x2="60%" y2="50%" stroke="#0F2550" strokeWidth="1" opacity="0.3" />
            </svg>

            {/* Yield bars overlay */}
            <div className="relative p-8 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-[0.2em] font-mono" style={{ color: '#0F2550', opacity: 0.5 }}>
                  Top Yielding Communities
                </p>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm" style={{ background: '#0F2550', color: '#F8FAFF' }}>
                  {totalCombos} pairs
                </span>
              </div>

              {topFive.map((r, i) => {
                const w = Math.round((r.gross_yield_pct / (topYield ?? 10)) * 100)
                const isHigh = r.gross_yield_pct >= 8
                const isMid = r.gross_yield_pct >= 6
                const barColor = isHigh ? '#0F2550' : isMid ? '#B8860B' : '#94a3b8'
                return (
                  <div key={`${r.area_name_en}-${r.rooms_en}`} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-medium" style={{ color: '#0F2550' }}>
                        {formatAreaName(r.area_name_en)}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px]" style={{ color: '#94a3b8' }}>{r.rooms_en}</span>
                        <span className="text-sm font-bold font-mono tabular-nums" style={{ color: barColor }}>
                          {r.gross_yield_pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'rgba(15,37,80,0.12)' }}>
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{ width: `${w}%`, background: barColor }}
                      />
                    </div>
                    {i < 4 && (
                      <div style={{ borderBottom: '1px solid rgba(15,37,80,0.08)', paddingBottom: 4 }} />
                    )}
                  </div>
                )
              })}

              {topFive.length === 0 && (
                <p className="text-sm" style={{ color: '#94a3b8' }}>No data available</p>
              )}
            </div>

            {/* Coordinate watermark */}
            <div
              className="absolute bottom-4 right-4 text-[9px] font-mono"
              style={{ color: '#0F2550', opacity: 0.3 }}
            >
              25.2°N · 55.3°E — Dubai, UAE
            </div>
          </div>
        </div>
      </div>

      {/* ── Yield legend ────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap mb-4">
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>Yield tiers:</span>
        <span
          className="rounded-sm px-2.5 py-0.5 text-xs font-mono font-semibold border"
          style={{ background: 'rgba(15,37,80,0.06)', color: '#0F2550', borderColor: 'rgba(15,37,80,0.2)' }}
        >
          ≥8% High
        </span>
        <span
          className="rounded-sm px-2.5 py-0.5 text-xs font-mono font-semibold border"
          style={{ background: 'rgba(184,134,11,0.08)', color: '#B8860B', borderColor: 'rgba(184,134,11,0.25)' }}
        >
          6–8% Mid
        </span>
        <span
          className="rounded-sm px-2.5 py-0.5 text-xs font-mono font-semibold border"
          style={{ background: 'rgba(100,116,139,0.08)', color: '#64748b', borderColor: 'rgba(100,116,139,0.2)' }}
        >
          &lt;6% Low
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <YieldMapTable rows={rows} isAuthenticated={isAuthenticated} totalRows={allRows.length} variant="e3" />

      {/* Source */}
      <p className="mt-6 text-[10px] font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>
        Source: Dubai Land Department — DLD-registered sales and rental contracts, rolling 12 months
      </p>
    </div>
  )
}
