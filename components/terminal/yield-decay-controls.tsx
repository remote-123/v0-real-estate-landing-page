"use client"

import { useState, useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from "recharts"
import type { YieldRow } from "@/app/terminal/rental-yield-decay/page"

const ROOM_OPTIONS = ["Studio", "1 B/R", "2 B/R", "3 B/R"] as const
type RoomOption = typeof ROOM_OPTIONS[number]

const ROOM_COLORS: Record<RoomOption, string> = {
  "Studio": "#6366f1",
  "1 B/R": "#10b981",
  "2 B/R": "#eab308",
  "3 B/R": "#f97316",
}

const ROOM_KEYS: Record<RoomOption, string> = {
  "Studio": "Studio",
  "1 B/R": "1 B/R",
  "2 B/R": "2 B/R",
  "3 B/R": "3 B/R",
}

function formatQtr(qtr: string) {
  const d = new Date(qtr)
  const q = Math.floor(d.getUTCMonth() / 3) + 1
  return `Q${q} ${d.getUTCFullYear()}`
}

interface Props {
  data: YieldRow[]
}

export function YieldDecayControls({ data }: Props) {
  // Derive unique areas sorted by total transaction volume
  const areas = useMemo(() => {
    const vol = new Map<string, number>()
    for (const r of data) {
      vol.set(r.area_name_en, (vol.get(r.area_name_en) ?? 0) + r.sale_txns + r.rent_txns)
    }
    return [...vol.entries()].sort((a, b) => b[1] - a[1]).map(([area]) => area)
  }, [data])

  const defaultArea = areas[0] ?? ""
  const [selectedArea, setSelectedArea] = useState(defaultArea)
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | "All">("2 B/R")

  // Build chart series: quarters on X, one series per room type
  const chartData = useMemo(() => {
    const areaRows = data.filter(r => r.area_name_en === selectedArea)
    const qtrs = [...new Set(areaRows.map(r => r.qtr))].sort()
    return qtrs.map(qtr => {
      const point: Record<string, string | number> = { qtr: formatQtr(qtr) }
      for (const room of ROOM_OPTIONS) {
        const match = areaRows.find(r => r.qtr === qtr && r.rooms_en === room)
        if (match) point[room] = Number(match.gross_yield_pct)
      }
      return point
    })
  }, [data, selectedArea])

  const activeRooms: RoomOption[] = selectedRoom === "All"
    ? ROOM_OPTIONS.filter(r => chartData.some(d => d[r] != null))
    : [selectedRoom as RoomOption].filter(r => chartData.some(d => d[r] != null))

  // Table: latest quarter yield per area+room, with 1yr change
  const tableRows = useMemo(() => {
    const map = new Map<string, YieldRow[]>()
    for (const r of data) {
      const key = `${r.area_name_en}|||${r.rooms_en}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return [...map.entries()].map(([key, group]) => {
      const sorted = [...group].sort((a, b) => a.qtr.localeCompare(b.qtr))
      const latest = sorted[sorted.length - 1]
      const yearAgoIdx = sorted.length >= 5 ? sorted.length - 5 : 0
      const yearAgo = sorted[yearAgoIdx]
      const change = Number(latest.gross_yield_pct) - Number(yearAgo.gross_yield_pct)
      const [area, room] = key.split("|||")
      return {
        area,
        room,
        latestYield: Number(latest.gross_yield_pct),
        change,
        qtrs: sorted.length,
      }
    }).sort((a, b) => b.latestYield - a.latestYield)
  }, [data])

  if (areas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No yield data available.</p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedArea}
          onChange={e => setSelectedArea(e.target.value)}
          className="rounded-md border border-border/40 bg-card/40 px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 max-w-[220px]"
        >
          {areas.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <div className="flex gap-1.5">
          {(["All", ...ROOM_OPTIONS] as const).map(r => (
            <button
              key={r}
              onClick={() => setSelectedRoom(r)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest transition-colors ${
                selectedRoom === r
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-card/40 text-muted-foreground border border-border/40 hover:border-border"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Gross Yield % — {selectedArea}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="qtr"
              tick={{ fontSize: 10, fill: "#6b7280", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b7280", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}%`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
              labelStyle={{ color: "#9ca3af", marginBottom: 4 }}
              formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
            />
            <ReferenceLine
              y={5}
              stroke="#ef4444"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: "Risk-Free 5%", fill: "#ef4444", fontSize: 10, fontFamily: "monospace", position: "insideTopRight" }}
            />
            {activeRooms.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", paddingTop: "8px" }}
                formatter={(value) => <span style={{ color: "#9ca3af" }}>{value}</span>}
              />
            )}
            {activeRooms.map(room => (
              <Line
                key={room}
                type="monotone"
                dataKey={room}
                stroke={ROOM_COLORS[room]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: ROOM_COLORS[room], strokeWidth: 0 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            All Areas — Latest Quarter Yield Ranking
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground/70">
                <th className="text-left px-5 py-2 uppercase tracking-widest font-medium">Community</th>
                <th className="text-left px-3 py-2 uppercase tracking-widest font-medium">Bedrooms</th>
                <th className="text-right px-3 py-2 uppercase tracking-widest font-medium">Latest Yield</th>
                <th className="text-right px-3 py-2 uppercase tracking-widest font-medium">vs 1yr</th>
                <th className="text-right px-5 py-2 uppercase tracking-widest font-medium">Quarters</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => {
                const belowThreshold = row.latestYield < 5
                return (
                  <tr
                    key={i}
                    className="border-b border-border/20 hover:bg-card/60 transition-colors"
                  >
                    <td className="px-5 py-2 text-foreground flex items-center gap-2">
                      {belowThreshold && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                      {row.area}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.room}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${belowThreshold ? "text-red-400" : "text-emerald-400"}`}>
                      {row.latestYield.toFixed(2)}%
                    </td>
                    <td className={`px-3 py-2 text-right ${row.change < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {row.change >= 0 ? "+" : ""}{row.change.toFixed(2)}pp
                    </td>
                    <td className="px-5 py-2 text-right text-muted-foreground">{row.qtrs}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
