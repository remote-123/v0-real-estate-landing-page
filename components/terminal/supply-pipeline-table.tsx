"use client"

import { useState, useMemo } from "react"
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Project } from "@/app/terminal/supply-pipeline/page"

const PAGE_SIZE = 50

type SortKey =
  | "project_name_en"
  | "area_name_en"
  | "developer_name"
  | "no_of_units"
  | "percent_completed"
  | "completion_date"
  | "project_status"

type SortDir = "asc" | "desc"

function formatDate(d: string | null): string {
  if (!d) return "TBD"
  const date = new Date(d)
  if (isNaN(date.getTime())) return "TBD"
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? ""
  const cls =
    s === "Under Construction"
      ? "bg-amber-400/10 text-amber-400 ring-amber-400/20"
      : s === "Completed"
      ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20"
      : "bg-slate-400/10 text-slate-400 ring-slate-400/20"
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 whitespace-nowrap", cls)}>
      {s || "Unknown"}
    </span>
  )
}

function ProgressBar({ pct }: { pct: number | null }) {
  const value = Math.min(100, Math.max(0, pct ?? 0))
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
        <div className="h-full bg-accent rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{value}%</span>
    </div>
  )
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
  return sortDir === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3 text-accent" />
    : <ArrowDown className="ml-1 h-3 w-3 text-accent" />
}

function horizonFilter(project: Project, horizon: string): boolean {
  if (horizon === "All") return true
  const months = parseInt(horizon.replace("Due ", "").replace("M", ""), 10)
  if (!project.completion_date) return false
  const d = new Date(project.completion_date)
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() + months)
  return d >= now && d <= cutoff
}

interface Props {
  projects: Project[]
}

export function SupplyPipelineTable({ projects }: Props) {
  const [search, setSearch] = useState("")
  const [horizon, setHorizon] = useState("All")
  const [sortKey, setSortKey] = useState<SortKey>("completion_date")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [page, setPage] = useState(0)

  const horizons = ["All", "Due 12M", "Due 24M", "Due 36M"]

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(0)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return projects.filter((p) => {
      const matchesSearch =
        !q ||
        (p.project_name_en ?? "").toLowerCase().includes(q) ||
        (p.area_name_en ?? "").toLowerCase().includes(q) ||
        (p.developer_name ?? "").toLowerCase().includes(q)
      const matchesHorizon = horizonFilter(p, horizon)
      return matchesSearch && matchesHorizon
    })
  }, [projects, search, horizon])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number | null = a[sortKey] ?? null
      let bv: string | number | null = b[sortKey] ?? null

      // Nulls last always
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av
      }
      const as = String(av)
      const bs = String(bv)
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function thClass(key: SortKey) {
    return cn(
      "px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground/70 cursor-pointer select-none whitespace-nowrap hover:text-muted-foreground transition-colors",
      sortKey === key && "text-accent"
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search project, area, developer..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {horizons.map((h) => (
            <button
              key={h}
              onClick={() => { setHorizon(h); setPage(0) }}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                horizon === h
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border/40 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className={cn(thClass("project_name_en"), "sticky left-0 z-10 bg-card")} onClick={() => handleSort("project_name_en")}>
                  <span className="flex items-center">Project Name <SortIcon col="project_name_en" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass("area_name_en")} onClick={() => handleSort("area_name_en")}>
                  <span className="flex items-center">Area <SortIcon col="area_name_en" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass("developer_name")} onClick={() => handleSort("developer_name")}>
                  <span className="flex items-center">Developer <SortIcon col="developer_name" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={cn(thClass("no_of_units"), "text-right")} onClick={() => handleSort("no_of_units")}>
                  <span className="flex items-center justify-end">Units <SortIcon col="no_of_units" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass("percent_completed")} onClick={() => handleSort("percent_completed")}>
                  <span className="flex items-center">% Complete <SortIcon col="percent_completed" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass("completion_date")} onClick={() => handleSort("completion_date")}>
                  <span className="flex items-center">Delivery <SortIcon col="completion_date" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass("project_status")} onClick={() => handleSort("project_status")}>
                  <span className="flex items-center">Status <SortIcon col="project_status" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No projects match the current filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((p, i) => (
                  <tr
                    key={p.project_id}
                    className={cn(
                      "border-t border-border/30 text-sm hover:bg-secondary/30 transition-colors",
                      i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                    )}
                  >
                    <td className="px-3 py-2.5 max-w-[220px] sticky left-0 z-10 bg-card">
                      <p className="font-medium text-foreground truncate leading-tight">
                        {p.project_name_en ?? "—"}
                      </p>
                      {p.master_project_en && (
                        <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                          {p.master_project_en}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {p.area_name_en ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[180px] truncate">
                      {p.developer_name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {p.no_of_units != null ? p.no_of_units.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <ProgressBar pct={p.percent_completed} />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(p.completion_date)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={p.project_status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 bg-card/20">
            <p className="text-[11px] text-muted-foreground font-mono">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length.toLocaleString()} projects
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="text-[11px] font-mono text-muted-foreground px-1">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
