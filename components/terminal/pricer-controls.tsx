"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { PricerRow } from "@/app/terminal/floor-plan-pricer/page"
import { formatAreaName } from "@/lib/area-names"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"

const ROOM_PILLS = [
  { label: "All", value: "all" },
  { label: "Studio", value: "STUDIO" },
  { label: "1 B/R", value: "1 B/R" },
  { label: "2 B/R", value: "2 B/R" },
  { label: "3 B/R", value: "3 B/R" },
  { label: "4 B/R+", value: "4+" },
]

const FOUR_PLUS = new Set(["4 B/R", "5 B/R", "6 B/R", "7 B/R", "PENTHOUSE"])

function fmt(n: number): string {
  return n.toLocaleString("en-US")
}

interface DistBarProps {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

function DistBar({ p10, p25, p50, p75, p90 }: DistBarProps) {
  const range = p90 - p10
  if (range <= 0) return <div className="h-4 w-full rounded bg-muted/20" />

  const pct = (v: number) => Math.max(0, Math.min(100, ((v - p10) / range) * 100))
  const p25pct = pct(p25)
  const p50pct = pct(p50)
  const p75pct = pct(p75)

  return (
    <div className="relative h-4 w-full min-w-[120px] rounded overflow-hidden bg-muted/20">
      {/* P25–P75 emerald band */}
      <div
        className="absolute top-0 h-full bg-emerald-500/40"
        style={{ left: `${p25pct}%`, width: `${p75pct - p25pct}%` }}
      />
      {/* P50 tick */}
      <div
        className="absolute top-0 h-full w-0.5 bg-emerald-400"
        style={{ left: `${p50pct}%` }}
      />
      {/* P50 dot */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-background z-10"
        style={{ left: `calc(${p50pct}% - 5px)` }}
      />
    </div>
  )
}

interface Props {
  data: PricerRow[]
  isAuthenticated?: boolean
  totalRows?: number
}

export function PricerControls({ data, isAuthenticated, totalRows }: Props) {
  const [search, setSearch] = useState("")
  const [roomFilter, setRoomFilter] = useState("all")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((row) => {
      const matchesArea = !q || row.area_name_en.toLowerCase().includes(q)
      let matchesRoom = true
      if (roomFilter === "all") {
        matchesRoom = true
      } else if (roomFilter === "4+") {
        matchesRoom = FOUR_PLUS.has(row.rooms_en)
      } else {
        matchesRoom = row.rooms_en === roomFilter
      }
      return matchesArea && matchesRoom
    })
  }, [data, search, roomFilter])

  return (
    <div className="relative space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <input
          type="text"
          placeholder="Search community..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 rounded-md border border-border/40 bg-card/40 px-3 py-2 text-base sm:text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
        <div className="flex flex-wrap gap-1.5">
          {ROOM_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setRoomFilter(pill.value)}
              className={cn(
                "rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors",
                roomFilter === pill.value
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-card/40 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="font-mono text-xs text-muted-foreground/60 uppercase tracking-wider">
        {filtered.length.toLocaleString()} results
      </p>

      {/* Table */}
      <div className="rounded-lg border border-border/40 bg-card/40 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">Community</th>
              <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">Bedrooms</th>
              <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">P10</th>
              <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">P25</th>
              <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-emerald-500 whitespace-nowrap">Median</th>
              <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">P75</th>
              <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">P90</th>
              <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">Fair Value Band</th>
              <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap hidden xl:table-cell">Distribution</th>
              <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">Txns</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No results found
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={`${row.area_name_en}-${row.rooms_en}`}
                  className={cn(
                    "border-b border-border/20 transition-colors hover:bg-secondary/20",
                    i % 2 === 0 ? "" : "bg-card/20"
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap max-w-[180px] truncate">
                    {formatAreaName(row.area_name_en)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {row.rooms_en}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground/60 whitespace-nowrap">
                    {fmt(row.p10)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {fmt(row.p25)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-emerald-400 whitespace-nowrap">
                    {fmt(row.p50)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {fmt(row.p75)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground/60 whitespace-nowrap">
                    {fmt(row.p90)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs text-emerald-400">
                      {fmt(row.p25)} – {fmt(row.p75)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell w-40">
                    <DistBar
                      p10={row.p10}
                      p25={row.p25}
                      p50={row.p50}
                      p75={row.p75}
                      p90={row.p90}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {row.txn_count.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isAuthenticated && totalRows !== undefined && (
        <GatedTableOverlay freeRows={data.length} totalRows={totalRows} />
      )}
    </div>
  )
}
