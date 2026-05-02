"use client"

import { useState, useCallback } from "react"
import { Search, ChevronLeft, ChevronRight, Download, Building2, CheckCircle, XCircle } from "lucide-react"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import { cn } from "@/lib/utils"
import type { UnitRow, UnitRegistryResponse } from "@/app/api/terminal/unit-registry/route"

const ROOMS_OPTIONS = ["Studio", "1 B/R", "2 B/R", "3 B/R", "4 B/R", "5+ B/R"]

function BoolBadge({ value, label }: { value: boolean | null; label: string }) {
  if (value === null) return <span className="text-muted-foreground/40">—</span>
  return value ? (
    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono font-semibold uppercase">
      <CheckCircle className="h-3 w-3" /> {label}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-muted-foreground/50 text-[10px] font-mono">
      <XCircle className="h-3 w-3" /> —
    </span>
  )
}

function downloadCsv(rows: UnitRow[]) {
  const headers = [
    "Property ID", "Unit #", "Building #", "Floor", "Bedrooms", "Type",
    "Sqft", "Sqm", "Parking", "Freehold", "Leasehold", "Project", "Master Project", "Area",
  ]
  const lines = rows.map((r) => [
    r.property_id,
    r.unit_number ?? "",
    r.building_number ?? "",
    r.floor ?? "",
    r.rooms_en ?? "",
    r.property_sub_type_en ?? "",
    r.actual_area_sqft,
    r.actual_area_sqm,
    r.unit_parking_number ?? "",
    r.is_free_hold ? "Yes" : "No",
    r.is_lease_hold ? "Yes" : "No",
    r.project_name_en ?? "",
    r.master_project_en ?? "",
    r.area_name_en ?? "",
  ].map(String).join(","))
  const csv = [headers.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "dubai-unit-registry.csv"
  a.click()
  URL.revokeObjectURL(url)
}

interface Filters {
  project: string
  area: string
  rooms: string
  min_floor: string
  max_floor: string
  min_sqm: string
  max_sqm: string
}

const EMPTY_FILTERS: Filters = {
  project: "",
  area: "",
  rooms: "",
  min_floor: "",
  max_floor: "",
  min_sqm: "",
  max_sqm: "",
}

interface Props {
  areas: string[]
  isAuthenticated: boolean
}

export function UnitRegistryClient({ areas, isAuthenticated }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [results, setResults] = useState<UnitRegistryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }))
    setPage(1)
  }

  const runSearch = useCallback(async (pageNum = 1) => {
    const hasFilter = filters.project || filters.area || filters.rooms
    if (!hasFilter) {
      setError("Enter a project name, select an area, or choose a bedroom type to search.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.project) params.set("project", filters.project)
      if (filters.area) params.set("area", filters.area)
      if (filters.rooms) params.set("rooms", filters.rooms)
      if (filters.min_floor) params.set("min_floor", filters.min_floor)
      if (filters.max_floor) params.set("max_floor", filters.max_floor)
      if (filters.min_sqm) params.set("min_sqm", filters.min_sqm)
      if (filters.max_sqm) params.set("max_sqm", filters.max_sqm)
      params.set("page", String(pageNum))

      const res = await fetch(`/api/terminal/unit-registry?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data: UnitRegistryResponse = await res.json()
      setResults(data)
      setPage(pageNum)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }, [filters])

  const totalPages = results ? Math.ceil(results.total / results.page_size) : 0

  return (
    <div className="space-y-5">
      {/* Filter form */}
      <div className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Project name */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Project / Development Name
            </label>
            <input
              type="text"
              placeholder="e.g. Burj Khalifa, Marina Gate, Downtown Views"
              value={filters.project}
              onChange={set("project")}
              onKeyDown={(e) => e.key === "Enter" && runSearch(1)}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

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

          {/* Floor range */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Min Floor
            </label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 20"
              value={filters.min_floor}
              onChange={set("min_floor")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Max Floor
            </label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 40"
              value={filters.max_floor}
              onChange={set("max_floor")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Size range (sqm) */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Min Size (sqm)
            </label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 60"
              value={filters.min_sqm}
              onChange={set("min_sqm")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
              Max Size (sqm)
            </label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 200"
              value={filters.max_sqm}
              onChange={set("max_sqm")}
              className="w-full bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
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
            {loading ? "Searching…" : "Search Units"}
          </button>

          {results && isAuthenticated && results.rows.length > 0 && (
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
                ? "No units found"
                : results.gated
                  ? `Showing ${results.rows.length} of ${results.total.toLocaleString()} units (unlock to see all)`
                  : `${results.total.toLocaleString()} units · page ${page} of ${totalPages}`
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
                        "Unit #", "Building", "Floor", "Beds", "Type",
                        "Sqft", "Sqm", "Parking", "Freehold", "Project", "Area",
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
                        key={row.property_id}
                        className={cn(
                          "border-b border-border/20 hover:bg-muted/20 transition-colors",
                          i % 2 === 0 ? "bg-card/20" : ""
                        )}
                      >
                        <td className="px-3 py-2 text-foreground font-semibold whitespace-nowrap">
                          {row.unit_number || "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {row.building_number || "—"}
                        </td>
                        <td className="px-3 py-2 text-foreground whitespace-nowrap">
                          {row.floor != null ? `L${row.floor}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-foreground whitespace-nowrap">
                          {row.rooms_en || "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {row.property_sub_type_en || "—"}
                        </td>
                        <td className="px-3 py-2 text-foreground font-semibold whitespace-nowrap">
                          {row.actual_area_sqft > 0 ? row.actual_area_sqft.toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {row.actual_area_sqm > 0 ? `${row.actual_area_sqm}` : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.unit_parking_number ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-500/15 text-blue-400">
                              P{row.unit_parking_number}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <BoolBadge value={row.is_free_hold} label="Freehold" />
                        </td>
                        <td className="px-3 py-2 text-foreground max-w-[180px] truncate">
                          {row.project_name_en || row.master_project_en || "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">
                          {row.area_name_en || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.gated && results.total > results.rows.length && (
                <GatedTableOverlay
                  freeRows={results.rows.length}
                  totalRows={results.total}
                  noun="units"
                  callbackUrl="/terminal/unit-registry"
                />
              )}
            </div>
          ) : (
            <div className="border border-border/40 rounded-xl p-8 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No units matched your filters.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try broadening your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="border border-dashed border-border/40 rounded-xl p-10 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Search by project name, area, or bedroom type to browse registered units.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            1.27M+ DLD registered units · Floor, size, parking, freehold data
          </p>
        </div>
      )}
    </div>
  )
}
