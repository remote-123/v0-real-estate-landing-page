"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ServiceChargeRow } from "@/app/terminal/service-charges/page"

const PAGE_SIZE = 50

type SortKey = "project_name" | "master_community_name_en" | "budget_year" | "total_service_cost"
type SortDir = "asc" | "desc"

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline-block" />
  if (dir === "asc") return <ArrowUp className="ml-1 h-3 w-3 text-accent inline-block" />
  return <ArrowDown className="ml-1 h-3 w-3 text-accent inline-block" />
}

function formatAED(value: number): string {
  return `AED ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

interface Props {
  rows: ServiceChargeRow[]
}

export function ServiceChargesTable({ rows }: Props) {
  const [search, setSearch] = useState("")
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [communityFilter, setCommunityFilter] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("total_service_cost")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)

  const uniqueYears = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.budget_year)))
        .filter(Boolean)
        .sort((a, b) => b - a),
    [rows]
  )

  const uniqueCommunities = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.master_community_name_en).filter(Boolean))).sort(),
    [rows]
  )

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const matchSearch =
        !q ||
        r.project_name.toLowerCase().includes(q) ||
        r.master_community_name_en.toLowerCase().includes(q)
      const matchYear = yearFilter === null || r.budget_year === yearFilter
      const matchCommunity =
        !communityFilter || r.master_community_name_en === communityFilter
      return matchSearch && matchYear && matchCommunity
    })
  }, [rows, search, yearFilter, communityFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av
      }
      const as = String(av).toLowerCase()
      const bs = String(bv).toLowerCase()
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetFilters = () => {
    setSearch("")
    setYearFilter(null)
    setCommunityFilter("")
    setPage(1)
  }

  const headerCell = (label: string, key: SortKey, align: "left" | "right" = "right") => (
    <th
      className={cn(
        "text-[10px] uppercase tracking-wider text-muted-foreground/70 px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-muted-foreground transition-colors",
        align === "right" ? "text-right" : "text-left"
      )}
      onClick={() => handleSort(key)}
    >
      {label}
      <SortIcon active={sortKey === key} dir={sortDir} />
    </th>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search project or community..."
            className="pl-9 pr-4 py-1.5 text-sm bg-card border border-border/50 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 w-64"
          />
        </div>

        {/* Community dropdown */}
        <select
          value={communityFilter}
          onChange={(e) => { setCommunityFilter(e.target.value); setPage(1) }}
          className="py-1.5 px-3 text-sm bg-card border border-border/50 rounded-md text-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 max-w-[220px]"
        >
          <option value="">All Communities</option>
          {uniqueCommunities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Year pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setYearFilter(null); setPage(1) }}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors",
              yearFilter === null
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border/50 text-muted-foreground hover:border-accent/50 hover:text-foreground"
            )}
          >
            All Years
          </button>
          {uniqueYears.map((y) => (
            <button
              key={y}
              onClick={() => { setYearFilter(y); setPage(1) }}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors",
                yearFilter === y
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border/50 text-muted-foreground hover:border-accent/50 hover:text-foreground"
              )}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Result count + reset */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            {sorted.length.toLocaleString()} records
          </span>
          {(search || yearFilter !== null || communityFilter) && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border/40 bg-card/40 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              {headerCell("Project", "project_name", "left")}
              {headerCell("Community", "master_community_name_en", "left")}
              <th className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-4 py-3 text-left whitespace-nowrap">
                Mgmt Company
              </th>
              {headerCell("Year", "budget_year")}
              {headerCell("Total AED/yr", "total_service_cost")}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr
                  key={`${row.project_name}||${row.master_community_name_en}||${row.budget_year}||${i}`}
                  className={cn(
                    "border-t border-border/30 text-sm hover:bg-secondary/30 transition-colors",
                    i % 2 === 0 ? "bg-card/20" : "bg-muted/10"
                  )}
                >
                  <td className="px-4 py-3 text-left font-medium text-foreground max-w-[200px]">
                    <span className="block truncate" title={row.project_name}>
                      {row.project_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left text-muted-foreground max-w-[180px]">
                    <span className="block truncate" title={row.master_community_name_en}>
                      {row.master_community_name_en || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left text-muted-foreground/70 text-xs max-w-[160px]">
                    <span className="block truncate" title={row.management_company_name_en}>
                      {row.management_company_name_en || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {row.budget_year}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-foreground tabular-nums">
                    {formatAED(row.total_service_cost)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages} &middot; {sorted.length.toLocaleString()} total
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded border border-border/50 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
              const pageNum =
                totalPages <= 7
                  ? idx + 1
                  : page <= 4
                  ? idx + 1
                  : page >= totalPages - 3
                  ? totalPages - 6 + idx
                  : page - 3 + idx
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "px-2.5 py-1 rounded border transition-colors text-xs",
                    page === pageNum
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-border/50 hover:bg-secondary"
                  )}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded border border-border/50 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
