"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface SearchResult {
  building_name_en: string
  area_name_en: string
}

interface QuarterlyRow {
  building_name_en: string
  qtr: string
  avg_psm: number
  deals: number
  nearest_metro: string | null
}

interface ServiceChargeRow {
  project_name: string
  budget_year: number
  total_cost: number
}

interface BuildingData {
  quarterly: QuarterlyRow[]
  serviceCharges: ServiceChargeRow[]
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function BuildingSearch({
  label,
  selected,
  onSelect,
  onClear,
  color,
}: {
  label: string
  selected: string
  onSelect: (name: string) => void
  onClear: () => void
  color: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); return }
    fetch(`/api/building-search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(data => { setResults(data); setOpen(true) })
      .catch(() => {})
  }, [debouncedQuery])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const accentBorder = color === "emerald" ? "border-emerald-500" : "border-blue-500"
  const accentBg = color === "emerald" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-blue-500/10 text-blue-400 border-blue-500/30"

  return (
    <div className="flex-1 min-w-0" ref={containerRef}>
      <p className={`font-mono text-xs uppercase tracking-widest mb-2 ${color === "emerald" ? "text-emerald-500" : "text-blue-400"}`}>
        {label}
      </p>
      {selected ? (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium ${accentBg}`}>
          <span className="truncate">{selected}</span>
          <button onClick={onClear} className="ml-auto shrink-0 opacity-70 hover:opacity-100 transition-opacity">×</button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search building name…"
            className={`w-full rounded-md border bg-card/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 ${accentBorder} border-border/40`}
          />
          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border border-border/40 bg-card shadow-lg overflow-hidden">
              {results.map(r => (
                <li key={r.building_name_en}>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                    onClick={() => {
                      onSelect(r.building_name_en)
                      setQuery("")
                      setOpen(false)
                    }}
                  >
                    <span className="text-foreground">{r.building_name_en}</span>
                    {r.area_name_en && (
                      <span className="ml-2 text-xs text-muted-foreground">{r.area_name_en}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-card/40 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}

export default function BuildingComparatorPage() {
  const [buildingA, setBuildingA] = useState("")
  const [buildingB, setBuildingB] = useState("")
  const [data, setData] = useState<BuildingData | null>(null)
  const [loading, setLoading] = useState(false)

  const compare = useCallback(async () => {
    if (!buildingA) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ a: buildingA })
      if (buildingB) params.set("b", buildingB)
      const res = await fetch(`/api/building-data?${params}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [buildingA, buildingB])

  // Merge quarterly rows into chart-friendly format
  const chartData = (() => {
    if (!data?.quarterly?.length) return []
    const qtrs = [...new Set(data.quarterly.map(r => r.qtr))].sort()
    return qtrs.map(qtr => {
      const rowA = data.quarterly.find(r => r.qtr === qtr && r.building_name_en === buildingA)
      const rowB = buildingB ? data.quarterly.find(r => r.qtr === qtr && r.building_name_en === buildingB) : undefined
      return {
        qtr: qtr.slice(0, 7), // "2024-01"
        [buildingA]: rowA?.avg_psm ?? null,
        [`${buildingA}_deals`]: rowA?.deals ?? null,
        ...(buildingB ? {
          [buildingB]: rowB?.avg_psm ?? null,
          [`${buildingB}_deals`]: rowB?.deals ?? null,
        } : {}),
      }
    })
  })()

  const statsFor = (name: string) => {
    if (!data?.quarterly?.length || !name) return null
    const rows = data.quarterly.filter(r => r.building_name_en === name)
    if (!rows.length) return null
    const latest = rows[rows.length - 1]
    const totalDeals = rows.reduce((s, r) => s + r.deals, 0)
    const avgQtrDeals = Math.round(totalDeals / rows.length)
    return {
      metro: latest.nearest_metro ?? "—",
      latestPsm: `AED ${latest.avg_psm.toLocaleString()}`,
      totalDeals: totalDeals.toLocaleString(),
      avgQtrDeals: avgQtrDeals.toString(),
    }
  }

  const statsA = statsFor(buildingA)
  const statsB = buildingB ? statsFor(buildingB) : null

  // Service charge years union
  const scYears = [...new Set(data?.serviceCharges?.map(r => r.budget_year) ?? [])].sort((a, b) => b - a)

  const scFor = (name: string) => {
    if (!data?.serviceCharges || !name) return {}
    const rows = data.serviceCharges.filter(r =>
      r.project_name.toLowerCase().includes(name.toLowerCase().slice(0, 15))
    )
    const map: Record<number, number> = {}
    for (const r of rows) map[r.budget_year] = (map[r.budget_year] ?? 0) + Number(r.total_cost)
    return map
  }

  const scA = scFor(buildingA)
  const scB = buildingB ? scFor(buildingB) : {}

  const fmt = (n: number | undefined) =>
    n != null ? `AED ${Math.round(n).toLocaleString()}` : "—"

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          Building Intelligence
        </p>
        <h1 className="font-serif text-3xl font-bold text-foreground">Building Comparator</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Compare price trajectory, transaction velocity, and service charges between any two DLD-registered buildings.
        </p>
      </div>

      {/* Search UI */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <BuildingSearch
            label="Building A"
            selected={buildingA}
            onSelect={setBuildingA}
            onClear={() => { setBuildingA(""); setData(null) }}
            color="emerald"
          />
          <BuildingSearch
            label="Building B (optional)"
            selected={buildingB}
            onSelect={setBuildingB}
            onClear={() => setBuildingB("")}
            color="blue"
          />
          <button
            onClick={compare}
            disabled={!buildingA || loading}
            className="shrink-0 rounded-md bg-emerald-500 px-6 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Loading…" : "Compare"}
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
            Price / sqm — Quarterly Avg (AED)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="qtr" tick={{ fontSize: 10, fill: "#888" }} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} tickFormatter={v => `${v.toLocaleString()}`} />
              <Tooltip
                contentStyle={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}
                labelStyle={{ color: "#fff", fontSize: 11 }}
                formatter={(value: number, name: string) => {
                  if (name.endsWith("_deals")) return null
                  return [`AED ${value?.toLocaleString() ?? "—"}`, name]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey={buildingA}
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {buildingB && (
                <Line
                  type="monotone"
                  dataKey={buildingB}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats grid */}
      {(statsA || statsB) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[{ name: buildingA, stats: statsA, color: "emerald" }, { name: buildingB, stats: statsB, color: "blue" }]
            .filter(b => b.stats)
            .map(({ name, stats, color }) => (
              <div key={name} className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-3">
                <p className={`font-mono text-xs uppercase tracking-widest ${color === "emerald" ? "text-emerald-500" : "text-blue-400"}`}>
                  {name}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Nearest Metro" value={stats!.metro} />
                  <StatCard label="Latest Qtr PSM" value={stats!.latestPsm} />
                  <StatCard label="Total Deals (3yr)" value={stats!.totalDeals} />
                  <StatCard label="Avg Qtr Deals" value={stats!.avgQtrDeals} />
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Service charges */}
      {scYears.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
            Annual Service Charges (Residential)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="py-2 pr-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Year</th>
                  <th className="py-2 pr-4 text-right font-mono text-[10px] uppercase tracking-widest text-emerald-500">{buildingA}</th>
                  {buildingB && (
                    <th className="py-2 text-right font-mono text-[10px] uppercase tracking-widest text-blue-400">{buildingB}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {scYears.map(yr => (
                  <tr key={yr} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                    <td className="py-2 pr-4 text-muted-foreground font-mono text-xs">{yr}</td>
                    <td className="py-2 pr-4 text-right text-foreground">{fmt(scA[yr])}</td>
                    {buildingB && <td className="py-2 text-right text-foreground">{fmt(scB[yr])}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <div className="rounded-xl border border-border/40 bg-card/40 p-12 text-center">
          <p className="text-muted-foreground text-sm">Search for a building above and click Compare to load data.</p>
        </div>
      )}
    </div>
  )
}
