"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X, ChevronRight, TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { formatAreaName } from "@/lib/area-names"

interface AreaSummary {
  name: string
  slug: string
  stats: {
    txn_count: number
    avg_psf: number
    avg_value: number
    mom_change: number | null
    total_12m: number
  }
  trend: { month: string; avg_psf: number }[]
  breakdown: { sub_type: string; count: number }[]
}

interface AreaDrawerProps {
  slug: string | null
  onClose: () => void
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n}`
}

function MomBadge({ v }: { v: number | null }) {
  if (v == null) return <span className="text-muted-foreground text-[10px]">—</span>
  const up = v > 0
  const flat = v === 0
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  return (
    <span className={`flex items-center gap-1 text-[11px] font-mono font-semibold ${up ? "text-emerald-400" : flat ? "text-muted-foreground" : "text-red-400"}`}>
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}{v.toFixed(1)}% MoM
    </span>
  )
}

export function AreaDrawer({ slug, onClose }: AreaDrawerProps) {
  const [data, setData] = useState<AreaSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!slug) { setData(null); return }
    setLoading(true)
    setData(null)
    fetch(`/api/area-summary?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  if (!slug) return null

  const totalBreakdown = data?.breakdown.reduce((s, b) => s + b.count, 0) ?? 0

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 rounded-b-xl overflow-hidden"
      style={{
        animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="bg-[#0a1628]/96 border-t border-[#00BFA533] backdrop-blur-md p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#00BFA5] mb-0.5">Community</p>
            <h3 className="text-base font-bold text-foreground leading-tight">
              {data ? formatAreaName(data.name) : <span className="text-muted-foreground animate-pulse">Loading…</span>}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <Link
                href={`/terminal/communities/${slug}`}
                className="flex items-center gap-1 rounded-md border border-[#00BFA533] bg-[#00BFA5]/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#00BFA5] hover:bg-[#00BFA5]/20 transition-colors"
              >
                Full Analysis <ChevronRight className="h-3 w-3" />
              </Link>
            )}
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#ffffff15] text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border border-[#ffffff08] bg-[#ffffff05] h-16 animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_180px] gap-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:col-span-3 sm:grid-cols-3">
              {[
                { label: "Avg PSF", value: `AED ${data.stats.avg_psf.toLocaleString()}`, sub: <MomBadge v={data.stats.mom_change} /> },
                { label: "Avg Deal Value", value: fmt(data.stats.avg_value), sub: null },
                { label: "Transactions (12m)", value: data.stats.total_12m.toLocaleString(), sub: <span className="text-[10px] text-muted-foreground">{data.stats.txn_count} this month</span> },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-[#ffffff10] bg-[#ffffff04] p-3">
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1">{s.label}</p>
                  <p className="text-base font-bold font-mono text-foreground leading-tight">{s.value}</p>
                  {s.sub && <div className="mt-1">{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Sparkline */}
            {data.trend.length > 2 && (
              <div className="rounded-lg border border-[#ffffff10] bg-[#ffffff04] p-3 flex flex-col gap-1">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60">PSF Trend (12m)</p>
                <div className="flex-1 min-h-[50px]">
                  <ResponsiveContainer width="100%" height={54}>
                    <AreaChart data={data.trend} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00BFA5" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00BFA5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" hide />
                      <Tooltip
                        contentStyle={{ background: "#0d1f2d", border: "1px solid #00BFA533", borderRadius: 6, fontSize: 10 }}
                        formatter={(v: number) => [`AED ${v.toLocaleString()}`, "PSF"]}
                        labelStyle={{ color: "#94a3b8", fontSize: 9 }}
                      />
                      <Area dataKey="avg_psf" stroke="#00BFA5" strokeWidth={1.5} fill="url(#spark-grad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Property type breakdown */}
        {data && data.breakdown.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.breakdown.map(b => {
              const pct = totalBreakdown > 0 ? Math.round((b.count / totalBreakdown) * 100) : 0
              return (
                <div key={b.sub_type} className="flex items-center gap-1.5 rounded-full border border-[#ffffff10] bg-[#ffffff04] px-2.5 py-1 text-[9px] font-mono">
                  <span className="text-muted-foreground uppercase tracking-wider">{b.sub_type}</span>
                  <span className="text-[#00BFA5] font-semibold">{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
