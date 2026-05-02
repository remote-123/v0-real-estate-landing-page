"use client"

import { useState, useCallback } from "react"
import { Search, ChevronLeft, ChevronRight, Download, ArrowUpDown } from "lucide-react"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import { cn } from "@/lib/utils"
import type { TransactionRow, TransactionSearchResponse } from "@/app/api/terminal/transaction-search/route"

const ROOMS_OPTIONS = ["Studio", "1 B/R", "2 B/R", "3 B/R", "4 B/R", "5+ B/R"]
const REG_TYPES = ["Ready", "Off-Plan Land", "Off-Plan"]

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

function formatPSF(psm: number): string {
  const psf = psm / 10.764
  return `${psf.toFixed(0)}`
}

function downloadCsv(rows: TransactionRow[]) {
  const headers = [
    "Date", "Area", "Building", "Project", "Bedrooms", "Type", "Reg Type",
    "Price (AED)", "AED/sqft", "Size (sqft)", "Metro", "Parking",
  ]
  const lines = rows.map((r) => [
    r.instance_date,
    r.area_name_en,
    r.building_name_en ?? "",
    r.project_name_en ?? "",
    r.rooms_en ?? "",
    r.property_sub_type_en ?? "",
    r.reg_type_en ?? "",
    r.actual_worth,
    formatPSF(r.meter_sale_price),
    r.area_sqft,
    r.nearest_metro_en ?? "",
    r.has_parking ? "Yes" : "No",
  ].map(String).join(","))
  const csv = [headers.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "dubai-transactions.csv"
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  areas: string[]
  isAuthenticated: boolean
}

interface Filters {
  area: string
  building: string
  rooms: string
  reg_type: string
  min_price: string
  max_price: string
  date_from: string
  date_to: string
}

const EMPTY_FILTERS: Filters = {
  area: "",
  building: "",
  rooms: "",
  reg_type: "",
  min_price: "",
  max_price: "",
  date_from: "",
  date_to: "",
}

export function TransactionSearchClient({ areas, isAuthenticated }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [results, setResults] = useState<TransactionSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }))
    setPage(1)
  }

  const runSearch = useCallback(async (pageNum = 1) => {
    const hasFilter = filters.area || filters.building || filters.rooms
    if (!hasFilter) {
      setError("Select an area, enter a building name, or choose a bedroom type to search.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.area) params.set("area", filters.area)
      if (filters.building) params.set("building", filters.building)
      if (filters.rooms) params.set("rooms", filters.rooms)
      if (filters.reg_type) params.set("reg_type", filters.reg_type)
      if (filters.min_price) params.set("min_price", filters.min_price)
      if (filters.max_price) params.set("max_price", filters.max_price)
      if (filters.date_from) params.set("date_from", filters.date_from)
      if (filters.date_to) params.set("date_to", filters.date_to)
      params.set("page", String(pageNum))

      const res = await fetch(`/api/terminal/transaction-search?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data: TransactionSearchResponse = await res.json()
      setResults(data)
      setPage(pageNum)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }, [filters])

  const totalPages = results
    ? Math.ceil(results.total / results.page_size)
    : 0

  return (
    <div className="space-y-5">
      {/* Filter form */}
      <div className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Area */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Area
            </label>
            <select
              value={filters.area}
              onChange={set("area")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All areas</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Bedrooms
            </label>
            <select
              value={filters.rooms}
              onChange={set("rooms")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Any</option>
              {ROOMS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Registration type */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Reg Type
            </label>
            <select
              value={filters.reg_type}
              onChange={set("reg_type")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Any</option>
              {REG_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Building name */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Building Name
            </label>
            <input
              type="text"
              placeholder="e.g. Burj Khalifa"
              value={filters.building}
              onChange={set("building")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Price range */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Min Price (AED)
            </label>
            <input
              type="number"
              placeholder="e.g. 500000"
              value={filters.min_price}
              onChange={set("min_price")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Max Price (AED)
            </label>
            <input
              type="number"
              placeholder="e.g. 5000000"
              value={filters.max_price}
              onChange={set("max_price")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Date range */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={set("date_from")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={set("date_to")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => runSearch(1)}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono font-semibold transition-colors",
              "bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            {loading ? "Searching…" : "Search Transactions"}
          </button>

          {results && isAuthenticated && (
            <button
              onClick={() => downloadCsv(results.rows)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono text-muted-foreground border border-border/50 hover:text-foreground hover:border-border transition-colors"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg px-4 py-3 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-muted-foreground">
              {results.total === 0
                ? "No transactions found"
                : results.gated
                  ? `Showing ${results.rows.length} of ${results.total.toLocaleString()} transactions (unlock to see all)`
                  : `${results.total.toLocaleString()} transactions · page ${page} of ${totalPages}`
              }
            </p>
            {!results.gated && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => runSearch(page - 1)}
                  disabled={page <= 1 || loading}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-mono text-muted-foreground px-1">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => runSearch(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {results.rows.length > 0 ? (
            <div className="relative">
              <div className="overflow-x-auto rounded-xl border border-border/40">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      {[
                        "Date", "Area", "Building", "Beds", "Type",
                        "Reg", "Price", "AED/sqft", "sqft", "Metro",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-semibold whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.map((row, i) => (
                      <tr
                        key={row.transaction_id}
                        className={cn(
                          "border-b border-border/20 hover:bg-muted/20 transition-colors",
                          i % 2 === 0 ? "bg-card/20" : ""
                        )}
                      >
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {row.instance_date}
                        </td>
                        <td className="px-3 py-2 text-foreground max-w-[140px] truncate">
                          {row.area_name_en}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[160px] truncate">
                          {row.building_name_en || row.project_name_en || "—"}
                        </td>
                        <td className="px-3 py-2 text-foreground whitespace-nowrap">
                          {row.rooms_en || "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {row.property_sub_type_en || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase",
                            row.reg_type_en?.startsWith("Off")
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-emerald-500/15 text-emerald-400"
                          )}>
                            {row.reg_type_en?.startsWith("Off") ? "OFF-PLAN" : "READY"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-foreground font-semibold whitespace-nowrap">
                          {formatAED(row.actual_worth)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {row.meter_sale_price > 0 ? formatPSF(row.meter_sale_price) : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {row.area_sqft > 0 ? row.area_sqft.toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">
                          {row.nearest_metro_en || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Gate overlay for unauthenticated */}
              {results.gated && results.total > results.rows.length && (
                <GatedTableOverlay
                  freeRows={results.rows.length}
                  totalRows={results.total}
                  noun="transactions"
                  callbackUrl="/terminal/transaction-search"
                />
              )}
            </div>
          ) : (
            <div className="border border-border/40 rounded-xl p-8 text-center">
              <ArrowUpDown className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No matching transactions found.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try broadening your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="border border-dashed border-border/40 rounded-xl p-10 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Filter by area, building, or bedroom type to search comparable sales.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            1.66M+ DLD transactions · Sales only · Sorted newest first
          </p>
        </div>
      )}
    </div>
  )
}
