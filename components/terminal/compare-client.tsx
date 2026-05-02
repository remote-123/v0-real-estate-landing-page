"use client"

import { useState, useCallback } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { TrendingUp, TrendingDown, Award } from "lucide-react"

// Top 40 areas by DLD volume — static list for dropdowns
const AREA_OPTIONS = [
  "Business Bay",
  "Dubai Marina",
  "Jumeirah Village Circle",
  "Downtown Dubai",
  "Dubai Hills Estate",
  "Palm Jumeirah",
  "Jumeirah Lake Towers",
  "Al Barsha 1",
  "Meydan",
  "Jumeirah Beach Residence",
  "Dubai Silicon Oasis",
  "International City",
  "DIFC",
  "Town Square",
  "Dubai Sports City",
  "Motor City",
  "Arabian Ranches",
  "Jumeirah Village Triangle",
  "Al Jadaf",
  "Umm Suqeim 3",
  "Al Sufouh",
  "DAMAC Hills 2",
  "Dubai South",
  "Dubai Investment Park 1",
  "Dubai Investment Park 2",
  "Mirdif",
  "Al Warsan 1",
  "Nad Al Hamar",
  "Ras Al Khor",
  "Za'abeel 1",
  "Za'abeel 2",
  "Al Quoz 4",
  "Jumeirah 1",
  "Jumeirah 2",
  "Jumeirah 3",
  "Al Rashidiya",
  "Palm Jebel Ali",
  "Deira Islands",
  "World Islands",
  "Al Khairan",
]

interface TrendPoint {
  month: string
  avg_psf: number
  txn_count: number
}

interface AreaData {
  matched_area: string | null
  data: TrendPoint[]
}

interface ComputedStats {
  current_psf: number | null
  mom_change: number | null
  high_12m: number | null
  low_12m: number | null
}

function computeStats(data: TrendPoint[]): ComputedStats {
  if (!data || data.length === 0) {
    return { current_psf: null, mom_change: null, high_12m: null, low_12m: null }
  }
  const current = data[data.length - 1]?.avg_psf ?? null
  const prev = data.length >= 2 ? data[data.length - 2]?.avg_psf : null
  const momChange =
    current && prev && prev > 0
      ? Number((((current - prev) / prev) * 100).toFixed(1))
      : null
  const psfs = data.map((d) => d.avg_psf).filter(Boolean)
  return {
    current_psf: current,
    mom_change: momChange,
    high_12m: psfs.length ? Math.max(...psfs) : null,
    low_12m: psfs.length ? Math.min(...psfs) : null,
  }
}

// Merge two area datasets by month for Recharts
function mergeData(
  data1: TrendPoint[],
  data2: TrendPoint[],
  label1: string,
  label2: string
): Record<string, unknown>[] {
  const byMonth: Record<string, Record<string, unknown>> = {}

  for (const d of data1) {
    if (!byMonth[d.month]) byMonth[d.month] = { month: d.month }
    byMonth[d.month][label1] = d.avg_psf
  }
  for (const d of data2) {
    if (!byMonth[d.month]) byMonth[d.month] = { month: d.month }
    byMonth[d.month][label2] = d.avg_psf
  }

  return Object.values(byMonth).sort((a, b) =>
    String(a.month).localeCompare(String(b.month))
  )
}

const COLORS = ["var(--accent, #10b981)", "#f59e0b"] // accent + amber

export function CompareClient() {
  const [area1, setArea1] = useState<string>("")
  const [area2, setArea2] = useState<string>("")
  const [data1, setData1] = useState<AreaData | null>(null)
  const [data2, setData2] = useState<AreaData | null>(null)
  const [loading1, setLoading1] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [error1, setError1] = useState<string | null>(null)
  const [error2, setError2] = useState<string | null>(null)

  const fetchArea = useCallback(
    async (
      area: string,
      setData: (d: AreaData) => void,
      setLoading: (v: boolean) => void,
      setError: (e: string | null) => void
    ) => {
      if (!area) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/area-psf-trend?location=${encodeURIComponent(area)}&type=APARTMENT`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch"
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const handleArea1Change = (val: string) => {
    setArea1(val)
    setData1(null)
    if (val) fetchArea(val, setData1, setLoading1, setError1)
  }

  const handleArea2Change = (val: string) => {
    setArea2(val)
    setData2(null)
    if (val) fetchArea(val, setData2, setLoading2, setError2)
  }

  const stats1 = data1 ? computeStats(data1.data) : null
  const stats2 = data2 ? computeStats(data2.data) : null

  const chartData =
    data1 && data2 && area1 && area2
      ? mergeData(data1.data, data2.data, area1, area2)
      : null

  // "Winner" badges
  const entryWinner =
    stats1?.current_psf && stats2?.current_psf
      ? stats1.current_psf < stats2.current_psf
        ? area1
        : area2
      : null

  const momentumWinner =
    stats1?.mom_change !== null &&
    stats2?.mom_change !== null &&
    stats1?.mom_change !== undefined &&
    stats2?.mom_change !== undefined
      ? (stats1.mom_change ?? -Infinity) > (stats2.mom_change ?? -Infinity)
        ? area1
        : area2
      : null

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            label: "Area A",
            value: area1,
            color: COLORS[0],
            onChange: handleArea1Change,
            loading: loading1,
            error: error1,
          },
          {
            label: "Area B",
            value: area2,
            color: COLORS[1],
            onChange: handleArea2Change,
            loading: loading2,
            error: error2,
          },
        ].map(({ label, value, color, onChange, loading, error }) => (
          <div key={label} className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </label>
            <div className="relative">
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 appearance-none"
              >
                <option value="">Select area...</option>
                {AREA_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ▾
              </div>
            </div>
            {loading && (
              <p className="text-[10px] text-muted-foreground">Loading data...</p>
            )}
            {error && (
              <p className="text-[10px] text-red-400">Error: {error}</p>
            )}
          </div>
        ))}
      </div>

      {/* Stats cards side-by-side */}
      {(stats1 || stats2) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: area1, stats: stats1, color: COLORS[0] },
            { label: area2, stats: stats2, color: COLORS[1] },
          ].map(({ label, stats, color }) =>
            label && stats ? (
              <div
                key={label}
                className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <p className="text-sm font-semibold">{label}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {entryWinner === label && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent uppercase tracking-wide">
                        <Award className="h-2.5 w-2.5" /> Lower Entry
                      </span>
                    )}
                    {momentumWinner === label && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 uppercase tracking-wide">
                        <TrendingUp className="h-2.5 w-2.5" /> Stronger MoM
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Avg PSF
                    </p>
                    <p className="text-xl font-bold font-mono">
                      {stats.current_psf
                        ? `AED ${stats.current_psf.toLocaleString()}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      MoM Change
                    </p>
                    <p
                      className={`text-xl font-bold font-mono ${
                        stats.mom_change === null
                          ? "text-muted-foreground"
                          : stats.mom_change >= 0
                          ? "text-accent"
                          : "text-red-400"
                      }`}
                    >
                      {stats.mom_change !== null
                        ? `${stats.mom_change >= 0 ? "+" : ""}${stats.mom_change}%`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      12M High
                    </p>
                    <p className="text-sm font-mono font-medium">
                      {stats.high_12m
                        ? `AED ${stats.high_12m.toLocaleString()}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      12M Low
                    </p>
                    <p className="text-sm font-mono font-medium">
                      {stats.low_12m
                        ? `AED ${stats.low_12m.toLocaleString()}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Chart */}
      {chartData && chartData.length >= 2 && (
        <div className="rounded-xl border border-border/40 bg-card/40 p-6 space-y-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            PSF Trend — 18 Months
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v.toLocaleString()}`}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(val: unknown) =>
                  typeof val === "number" ? [`AED ${val.toLocaleString()}`, "PSF"] : [val, "PSF"]
                }
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
              <Line
                type="monotone"
                dataKey={area1}
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey={area2}
                stroke={COLORS[1]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {!area1 && !area2 && (
        <div className="rounded-xl border border-dashed border-border/40 p-10 text-center text-muted-foreground text-sm">
          Select two areas above to compare PSF trends and market signals.
        </div>
      )}
    </div>
  )
}
