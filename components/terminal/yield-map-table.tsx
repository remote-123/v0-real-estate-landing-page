"use client"

import { useState, useMemo } from "react"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAreaName } from "@/lib/area-names"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"

export interface YieldRow {
  area_name_en: string
  rooms_en: string
  avg_sale_price: number
  avg_annual_rent: number
  gross_yield_pct: number
  sale_txns: number
  rent_txns: number
}

type SortKey = keyof YieldRow
type SortDir = "asc" | "desc"

const ROOM_OPTIONS = ["All", "Studio", "1 B/R", "2 B/R", "3 B/R", "4 B/R+"]
const MIN_TXN_OPTIONS = [
  { label: "10+", value: 10 },
  { label: "20+", value: 20 },
  { label: "50+", value: 50 },
]

const FOUR_BR_VALUES = ["4 B/R", "5 B/R", "6 B/R", "7 B/R", "8 B/R", "Penthouse", "Villa"]

function matchesRoomFilter(rooms: string, filter: string): boolean {
  if (filter === "All") return true
  if (filter === "4 B/R+") return FOUR_BR_VALUES.some((v) => rooms.startsWith(v)) || (parseInt(rooms) >= 4)
  return rooms === filter
}

function YieldBadge({ pct, e3 }: { pct: number; e3?: boolean }) {
  if (e3) {
    const color = pct >= 8 ? '#0F2550' : pct >= 6 ? '#B8860B' : '#64748b'
    const bg = pct >= 8 ? 'rgba(15,37,80,0.07)' : pct >= 6 ? 'rgba(184,134,11,0.08)' : 'rgba(100,116,139,0.06)'
    const border = pct >= 8 ? 'rgba(15,37,80,0.2)' : pct >= 6 ? 'rgba(184,134,11,0.25)' : 'rgba(100,116,139,0.2)'
    return (
      <span
        className="rounded-sm px-2 py-0.5 text-xs font-mono font-semibold tabular-nums border"
        style={{ color, background: bg, borderColor: border }}
      >
        {pct.toFixed(2)}%
      </span>
    )
  }
  const cls =
    pct >= 8
      ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
      : pct >= 6
      ? "bg-yellow-400/15 text-yellow-400 ring-yellow-400/30"
      : "bg-muted/50 text-muted-foreground ring-border/40"
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold ring-1 tabular-nums", cls)}>
      {pct.toFixed(2)}%
    </span>
  )
}

function SortIcon({ col, sortKey, sortDir, e3 }: { col: SortKey; sortKey: SortKey; sortDir: SortDir; e3?: boolean }) {
  if (col !== sortKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
  const cls = e3 ? "ml-1 h-3 w-3" : "ml-1 h-3 w-3 text-emerald-500"
  const style = e3 ? { color: '#0F2550' } : undefined
  return sortDir === "asc"
    ? <ArrowUp className={cls} style={style} />
    : <ArrowDown className={cls} style={style} />
}

function formatAed(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`
  return val.toLocaleString()
}

interface Props {
  rows: YieldRow[]
  isAuthenticated?: boolean
  totalRows?: number
  variant?: 'default' | 'e3'
}

export function YieldMapTable({ rows, isAuthenticated, totalRows, variant = 'default' }: Props) {
  const e3 = variant === 'e3'
  const [roomFilter, setRoomFilter] = useState("All")
  const [minTxns, setMinTxns] = useState(10)
  const [sortKey, setSortKey] = useState<SortKey>("gross_yield_pct")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesRoom = matchesRoomFilter(r.rooms_en, roomFilter)
      const minLiquidity = Math.min(r.sale_txns, r.rent_txns) >= minTxns
      return matchesRoom && minLiquidity
    })
  }, [rows, roomFilter, minTxns])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as number | string
      const bv = b[sortKey] as number | string
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortKey, sortDir])

  const display = sorted.slice(0, 100)

  function thCls(key: SortKey) {
    if (e3) {
      return cn(
        "px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors",
        sortKey === key ? "text-[#0F2550] font-bold" : "text-[#94a3b8] hover:text-[#0F2550]"
      )
    }
    return cn(
      "px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 cursor-pointer select-none whitespace-nowrap hover:text-muted-foreground transition-colors",
      sortKey === key && "text-emerald-500"
    )
  }

  if (e3) {
    return (
      <div className="relative flex flex-col gap-4">
        {/* E3 Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ROOM_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRoomFilter(r)}
                className="rounded-sm px-3 py-1 text-xs font-medium transition-colors border"
                style={
                  roomFilter === r
                    ? { background: '#0F2550', color: '#FFFFFF', borderColor: '#0F2550' }
                    : { background: '#FFFFFF', color: '#64748b', borderColor: '#dde6f0' }
                }
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-[10px] font-mono uppercase tracking-wider whitespace-nowrap" style={{ color: '#94a3b8' }}>
              Min txns
            </span>
            <select
              value={minTxns}
              onChange={(e) => setMinTxns(Number(e.target.value))}
              className="rounded-sm border px-2 py-1 text-base sm:text-xs focus:outline-none"
              style={{ background: '#FFFFFF', borderColor: '#dde6f0', color: '#0F2550' }}
            >
              {MIN_TXN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#94a3b8' }}>
          {display.length} of {filtered.length} combinations shown
        </p>

        {/* E3 Table */}
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#dde6f0', background: '#FFFFFF' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid #dde6f0', background: '#F8FAFF' }}>
                  <th className={cn(thCls("area_name_en"), "sticky left-0 z-10")} style={{ background: '#F8FAFF' }} onClick={() => handleSort("area_name_en")}>
                    <span className="flex items-center">Community <SortIcon col="area_name_en" sortKey={sortKey} sortDir={sortDir} e3 /></span>
                  </th>
                  <th className={thCls("rooms_en")} onClick={() => handleSort("rooms_en")}>
                    <span className="flex items-center">Bedrooms <SortIcon col="rooms_en" sortKey={sortKey} sortDir={sortDir} e3 /></span>
                  </th>
                  <th className={thCls("gross_yield_pct")} onClick={() => handleSort("gross_yield_pct")}>
                    <span className="flex items-center">Gross Yield <SortIcon col="gross_yield_pct" sortKey={sortKey} sortDir={sortDir} e3 /></span>
                  </th>
                  <th className={cn(thCls("avg_sale_price"), "text-right")} onClick={() => handleSort("avg_sale_price")}>
                    <span className="flex items-center justify-end">Avg Sale Price <SortIcon col="avg_sale_price" sortKey={sortKey} sortDir={sortDir} e3 /></span>
                  </th>
                  <th className={cn(thCls("avg_annual_rent"), "text-right")} onClick={() => handleSort("avg_annual_rent")}>
                    <span className="flex items-center justify-end">Avg Annual Rent <SortIcon col="avg_annual_rent" sortKey={sortKey} sortDir={sortDir} e3 /></span>
                  </th>
                  <th className={cn(thCls("sale_txns"), "text-right")} onClick={() => handleSort("sale_txns")}>
                    <span className="flex items-center justify-end">Sale Txns <SortIcon col="sale_txns" sortKey={sortKey} sortDir={sortDir} e3 /></span>
                  </th>
                  <th className={cn(thCls("rent_txns"), "text-right")} onClick={() => handleSort("rent_txns")}>
                    <span className="flex items-center justify-end">Rent Txns <SortIcon col="rent_txns" sortKey={sortKey} sortDir={sortDir} e3 /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {display.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>
                      No data matches the current filters.
                    </td>
                  </tr>
                ) : (
                  display.map((r, i) => (
                    <tr
                      key={`${r.area_name_en}-${r.rooms_en}`}
                      style={{
                        borderTop: '1px solid #f1f5f9',
                        background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFF',
                      }}
                    >
                      <td className="px-3 py-2.5 sticky left-0 z-10 font-medium whitespace-nowrap" style={{ color: '#0F2550', background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFF' }}>
                        {formatAreaName(r.area_name_en)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: '#94a3b8' }}>
                        {r.rooms_en}
                      </td>
                      <td className="px-3 py-2.5">
                        <YieldBadge pct={r.gross_yield_pct} e3 />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums" style={{ color: '#475569' }}>
                        AED {formatAed(r.avg_sale_price)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums" style={{ color: '#475569' }}>
                        AED {formatAed(r.avg_annual_rent)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums" style={{ color: '#94a3b8' }}>
                        {r.sale_txns.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums" style={{ color: '#94a3b8' }}>
                        {r.rent_txns.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isAuthenticated && totalRows !== undefined && (
          <GatedTableOverlay freeRows={rows.length} totalRows={totalRows} />
        )}
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ROOM_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRoomFilter(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                roomFilter === r
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
            Min txns
          </span>
          <select
            value={minTxns}
            onChange={(e) => setMinTxns(Number(e.target.value))}
            className="rounded-md bg-card border border-border/50 px-2 py-1 text-base sm:text-xs text-foreground focus:outline-none focus:border-emerald-500/50"
          >
            {MIN_TXN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result count */}
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50">
        {display.length} of {filtered.length} combinations shown
      </p>

      {/* Table */}
      <div className="rounded-md border border-border/40 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className={cn(thCls("area_name_en"), "sticky left-0 z-10 bg-card/90")} onClick={() => handleSort("area_name_en")}>
                  <span className="flex items-center">Community <SortIcon col="area_name_en" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thCls("rooms_en")} onClick={() => handleSort("rooms_en")}>
                  <span className="flex items-center">Bedrooms <SortIcon col="rooms_en" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thCls("gross_yield_pct")} onClick={() => handleSort("gross_yield_pct")}>
                  <span className="flex items-center">Gross Yield <SortIcon col="gross_yield_pct" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={cn(thCls("avg_sale_price"), "text-right")} onClick={() => handleSort("avg_sale_price")}>
                  <span className="flex items-center justify-end">Avg Sale Price <SortIcon col="avg_sale_price" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={cn(thCls("avg_annual_rent"), "text-right")} onClick={() => handleSort("avg_annual_rent")}>
                  <span className="flex items-center justify-end">Avg Annual Rent <SortIcon col="avg_annual_rent" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={cn(thCls("sale_txns"), "text-right")} onClick={() => handleSort("sale_txns")}>
                  <span className="flex items-center justify-end">Sale Txns <SortIcon col="sale_txns" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={cn(thCls("rent_txns"), "text-right")} onClick={() => handleSort("rent_txns")}>
                  <span className="flex items-center justify-end">Rent Txns <SortIcon col="rent_txns" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {display.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No data matches the current filters.
                  </td>
                </tr>
              ) : (
                display.map((r, i) => (
                  <tr
                    key={`${r.area_name_en}-${r.rooms_en}`}
                    className={cn(
                      "border-t border-border/30 hover:bg-secondary/30 transition-colors",
                      i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                    )}
                  >
                    <td className="px-3 py-2.5 sticky left-0 z-10 bg-card/90 font-medium text-foreground whitespace-nowrap">
                      {formatAreaName(r.area_name_en)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                      {r.rooms_en}
                    </td>
                    <td className="px-3 py-2.5">
                      <YieldBadge pct={r.gross_yield_pct} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      AED {formatAed(r.avg_sale_price)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      AED {formatAed(r.avg_annual_rent)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {r.sale_txns.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {r.rent_txns.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isAuthenticated && totalRows !== undefined && (
        <GatedTableOverlay freeRows={rows.length} totalRows={totalRows} />
      )}
    </div>
  )
}
