"use client"

import { useState, useMemo } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RentalListing {
  id: string
  title: string
  cluster: string  // building / sub-community (most specific)
  area: string     // community / district (broader)
  type: string
  bedrooms: string
  sizeSqft: number
  annualPrice: number
  monthlyPrice: number
  pricePerSqft: number
  listedAt: number
  source: "pf" | "bayut"
  externalUrl: string
}

type SortKey = keyof Pick<
  RentalListing,
  "cluster" | "area" | "type" | "bedrooms" | "sizeSqft" | "monthlyPrice" | "annualPrice" | "pricePerSqft" | "listedAt"
>
type SortDir = "asc" | "desc"

function fmtAED(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return n.toLocaleString()
}

function fmtAge(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "1d ago"
  return `${days}d ago`
}

// Columns that need external data — shown as placeholders
const PLACEHOLDER_COLS = [
  { key: "vsRera",   label: "vs RERA" },
  { key: "drop",     label: "↓ Drop" },
  { key: "cheques",  label: "Cheques" },
]

interface ThProps {
  children: React.ReactNode
  col?: SortKey
  right?: boolean
  sortKey: SortKey | null
  sortDir: SortDir
  onSort: (k: SortKey) => void
}

function Th({ children, col, right, sortKey, sortDir, onSort }: ThProps) {
  const active = col && sortKey === col
  return (
    <th
      onClick={col ? () => onSort(col) : undefined}
      className={cn(
        "px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap border-b border-border/50 select-none",
        col && "cursor-pointer hover:text-foreground transition-colors",
        right && "text-right"
      )}
    >
      <div className={cn("flex items-center gap-1", right && "justify-end")}>
        {children}
        {col && (
          active
            ? sortDir === "asc"
              ? <ArrowUp className="h-3 w-3 text-accent" />
              : <ArrowDown className="h-3 w-3 text-accent" />
            : <ArrowUpDown className="h-3 w-3 opacity-20" />
        )}
      </div>
    </th>
  )
}

export function RentalTable({ listings }: { listings: RentalListing[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("listedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const sorted = useMemo(() => {
    return [...listings].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [listings, sortKey, sortDir])

  const thProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr>
              {/* Static # column */}
              <th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 border-b border-border/50 w-8 text-left">#</th>

              {/* Sortable live columns */}
              <Th {...thProps}>Property</Th>
              <Th col="cluster" {...thProps}>Cluster</Th>
              <Th col="area" {...thProps}>Area</Th>
              <Th col="type" {...thProps}>Type</Th>
              <Th col="bedrooms" {...thProps}>Beds</Th>
              <Th col="sizeSqft" right {...thProps}>sqft</Th>
              <Th col="monthlyPrice" right {...thProps}>Monthly</Th>
              <Th col="annualPrice" right {...thProps}>Annual</Th>
              <Th col="pricePerSqft" right {...thProps}>/sqft yr</Th>
              <Th col="listedAt" right {...thProps}>Listed</Th>
              <Th {...thProps}>Src</Th>

              {/* Placeholder columns */}
              {PLACEHOLDER_COLS.map(c => (
                <th key={c.key} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/25 border-b border-border/50 text-right whitespace-nowrap">
                  {c.label}
                </th>
              ))}

              <th className="px-3 py-2.5 border-b border-border/50 w-8" />
            </tr>
          </thead>

          <tbody>
            {sorted.map((l, idx) => (
              <tr
                key={l.id}
                className="border-b border-border/20 hover:bg-muted/30 transition-colors"
              >
                {/* # */}
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground/30">{idx + 1}</td>

                {/* Property title */}
                <td className="px-3 py-2 max-w-[180px]">
                  <span className="text-xs font-medium text-foreground line-clamp-1" title={l.title}>
                    {l.title}
                  </span>
                </td>

                {/* Cluster */}
                <td className="px-3 py-2 max-w-[140px]">
                  <span className="text-xs text-foreground line-clamp-1" title={l.cluster}>
                    {l.cluster || "—"}
                  </span>
                </td>

                {/* Area */}
                <td className="px-3 py-2 max-w-[120px]">
                  <span className="text-xs text-muted-foreground line-clamp-1" title={l.area}>
                    {l.area || "—"}
                  </span>
                </td>

                {/* Type */}
                <td className="px-3 py-2">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">
                    {l.type.substring(0, 5)}
                  </span>
                </td>

                {/* Beds */}
                <td className="px-3 py-2 text-center">
                  <span className="font-mono text-xs text-foreground">{l.bedrooms}</span>
                </td>

                {/* sqft */}
                <td className="px-3 py-2 text-right">
                  <span className="font-mono text-xs text-muted-foreground">
                    {l.sizeSqft > 0 ? l.sizeSqft.toLocaleString() : "—"}
                  </span>
                </td>

                {/* Monthly — primary number */}
                <td className="px-3 py-2 text-right">
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {fmtAED(l.monthlyPrice)}
                  </span>
                </td>

                {/* Annual */}
                <td className="px-3 py-2 text-right">
                  <span className="font-mono text-xs text-muted-foreground">
                    {fmtAED(l.annualPrice)}
                  </span>
                </td>

                {/* /sqft yr */}
                <td className="px-3 py-2 text-right">
                  <span className="font-mono text-xs text-muted-foreground">
                    {l.sizeSqft > 0 ? Math.round(l.pricePerSqft).toLocaleString() : "—"}
                  </span>
                </td>

                {/* Listed */}
                <td className="px-3 py-2 text-right">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {fmtAge(l.listedAt)}
                  </span>
                </td>

                {/* Source badge */}
                <td className="px-3 py-2">
                  <span className={cn(
                    "font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold",
                    l.source === "bayut"
                      ? "bg-orange-500/10 text-orange-400"
                      : "bg-blue-500/10 text-blue-400"
                  )}>
                    {l.source === "bayut" ? "BYT" : "PF"}
                  </span>
                </td>

                {/* Placeholder cells */}
                {PLACEHOLDER_COLS.map(c => (
                  <td key={c.key} className="px-3 py-2 text-right">
                    <span className="font-mono text-xs text-muted-foreground/20">—</span>
                  </td>
                ))}

                {/* External link */}
                <td className="px-3 py-2 text-right">
                  {l.externalUrl ? (
                    <a
                      href={l.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-muted-foreground/30 hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground/20 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Placeholder legend */}
      <div className="px-4 py-2 border-t border-border/30">
        <span className="font-mono text-[10px] text-muted-foreground/30">
          vs RERA · ↓ Drop · Cheques — pending RERA index + DLD transaction database integration
        </span>
      </div>
    </div>
  )
}
