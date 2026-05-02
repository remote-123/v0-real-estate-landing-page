"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"

export interface ProjectData {
  project_name: string
  master_community_name_en: string | null
  budget_year: number
  total_cost: number
  no_of_units: number | null
  category_breakdown: { category: string; cost: number }[]
}

interface Props {
  projectData: ProjectData[]
}

function formatAed(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

const COMMON_PSF = [
  { label: "Budget (JVC, IC, IMPZ)", psf: 14 },
  { label: "Mid-market (JLT, Meydan)", psf: 20 },
  { label: "Premium (Marina, Downtown)", psf: 30 },
  { label: "Luxury (DIFC, Palm)", psf: 45 },
]

export function ServiceChargeEstimator({ projectData }: Props) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [unitSizeSqft, setUnitSizeSqft] = useState<string>("800")
  const [annualRent, setAnnualRent] = useState<string>("")
  const [showCategories, setShowCategories] = useState(false)

  // Group by project name → sorted years
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectData[]>()
    for (const row of projectData) {
      const existing = map.get(row.project_name) ?? []
      existing.push(row)
      map.set(row.project_name, existing)
    }
    return map
  }, [projectData])

  const projectNames = useMemo(() => Array.from(projectMap.keys()).sort(), [projectMap])

  // Fuzzy search
  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return []
    const q = query.trim().toLowerCase()
    return projectNames
      .filter(n => n.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, projectNames])

  const selectedYears = useMemo(() => {
    if (!selected) return []
    return (projectMap.get(selected) ?? []).sort((a, b) => b.budget_year - a.budget_year)
  }, [selected, projectMap])

  const latestYear = selectedYears[0]

  const unitSizeSqftNum = parseFloat(unitSizeSqft) || 0
  const annualRentNum = parseFloat(annualRent.replace(/,/g, "")) || 0

  // Per-unit estimate: total_cost / no_of_units
  const perUnitEstimate = latestYear?.no_of_units
    ? latestYear.total_cost / latestYear.no_of_units
    : null

  // PSF estimate: if we have per-unit cost and unit size, compute AED/sqft
  const psfEstimate = perUnitEstimate && unitSizeSqftNum > 0
    ? perUnitEstimate / unitSizeSqftNum
    : null

  // Net yield impact: service charge / (annual_rent / yield%) — or just show as % of rent
  const serviceChargeAsRentPct = perUnitEstimate && annualRentNum > 0
    ? (perUnitEstimate / annualRentNum) * 100
    : null

  const noResults = query.trim().length >= 2 && suggestions.length === 0

  return (
    <div className="space-y-6">

      {/* Search */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground font-mono">
          Step 1 — Search Your Building
        </h2>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Search className="h-4 w-4" />
          </div>
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            placeholder="e.g. Marina Gate, Burj Vista, Park Heights..."
            className="pl-9 bg-background/60"
          />
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && !selected && (
          <div className="rounded-lg border border-border/40 bg-card divide-y divide-border/20 overflow-hidden">
            {suggestions.map(name => {
              const rows = projectMap.get(name)!
              const latest = rows.sort((a, b) => b.budget_year - a.budget_year)[0]
              return (
                <button
                  key={name}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-muted/10 transition-colors"
                  onClick={() => { setSelected(name); setQuery(name) }}
                >
                  <div>
                    <span className="font-medium">{name}</span>
                    {latest.master_community_name_en && (
                      <span className="ml-2 text-xs text-muted-foreground">{latest.master_community_name_en}</span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground/70">{formatAed(latest.total_cost)}/yr</span>
                </button>
              )
            })}
          </div>
        )}

        {noResults && (
          <p className="text-sm text-muted-foreground">No buildings found for &ldquo;{query}&rdquo; — try a partial name.</p>
        )}
      </div>

      {/* Results */}
      {selected && latestYear && (
        <div className="space-y-4">

          {/* Headline */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg leading-tight">{selected}</h2>
                {latestYear.master_community_name_en && (
                  <p className="text-sm text-muted-foreground mt-0.5">{latestYear.master_community_name_en}</p>
                )}
              </div>
              <span className="shrink-0 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-xs font-mono">
                {latestYear.budget_year} data
              </span>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-background/50 border border-border/30 p-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Annual Budget</p>
                <p className="text-xl font-bold mt-1">{formatAed(latestYear.total_cost)}</p>
              </div>
              {latestYear.no_of_units && (
                <div className="rounded-lg bg-background/50 border border-border/30 p-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Units</p>
                  <p className="text-xl font-bold mt-1">{latestYear.no_of_units.toLocaleString()}</p>
                </div>
              )}
              {perUnitEstimate !== null && (
                <div className="rounded-lg bg-background/50 border border-border/30 p-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Est. Per Unit/yr</p>
                  <p className="text-xl font-bold mt-1">{formatAed(perUnitEstimate)}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">budget ÷ units — avg unit size varies</p>
                </div>
              )}
            </div>
          </div>

          {/* Year-on-year trend */}
          {selectedYears.length > 1 && (
            <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Year-on-Year Budget</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="pb-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">Year</th>
                      <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">Total Budget</th>
                      <th className="pb-2 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">vs Prior Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedYears.map((row, i) => {
                      const next = selectedYears[i + 1]
                      const delta = next ? ((row.total_cost - next.total_cost) / next.total_cost) * 100 : null
                      return (
                        <tr key={row.budget_year} className="border-b border-border/20">
                          <td className="py-2 font-mono">{row.budget_year}</td>
                          <td className="py-2 text-right font-mono">{formatAed(row.total_cost)}</td>
                          <td className={`py-2 text-right font-mono text-xs font-semibold ${delta === null ? "text-muted-foreground" : delta > 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {latestYear.category_breakdown.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-3">
              <button
                onClick={() => setShowCategories(v => !v)}
                className="flex items-center justify-between w-full"
              >
                <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  Budget Breakdown by Category
                </h3>
                {showCategories ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {showCategories && (
                <div className="space-y-2 pt-1">
                  {latestYear.category_breakdown.slice(0, 10).map(({ category, cost }) => {
                    const pct = (cost / latestYear.total_cost) * 100
                    return (
                      <div key={category} className="flex items-center gap-3">
                        <div className="w-32 shrink-0 text-xs text-muted-foreground truncate">{category}</div>
                        <div className="flex-1 rounded-full bg-muted/20 h-2">
                          <div
                            className="h-full rounded-full bg-emerald-500/50"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="w-20 text-right font-mono text-xs">{formatAed(cost)}</div>
                        <div className="w-10 text-right font-mono text-xs text-muted-foreground">{pct.toFixed(0)}%</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: per-unit estimator */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground font-mono">
              Step 2 — Estimate Your Unit Cost
            </h2>

            {perUnitEstimate !== null ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-widest font-mono block mb-1.5">
                      Your Unit Size (sqft)
                    </label>
                    <Input
                      type="number"
                      min="100"
                      max="10000"
                      value={unitSizeSqft}
                      onChange={e => setUnitSizeSqft(e.target.value)}
                      placeholder="800"
                      className="bg-background/60"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-widest font-mono block mb-1.5">
                      Annual Rent (AED, optional)
                    </label>
                    <Input
                      type="text"
                      value={annualRent}
                      onChange={e => setAnnualRent(e.target.value)}
                      placeholder="90,000"
                      className="bg-background/60"
                    />
                  </div>
                </div>

                {unitSizeSqftNum > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Your Est. Service Charge</p>
                      <p className="text-xl font-bold text-emerald-400 mt-1">{formatAed(perUnitEstimate)}<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">based on avg unit share</p>
                    </div>
                    {psfEstimate !== null && (
                      <div className="rounded-lg bg-background/50 border border-border/30 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">AED / sqft / yr</p>
                        <p className="text-xl font-bold mt-1">{psfEstimate.toFixed(1)}</p>
                      </div>
                    )}
                    {serviceChargeAsRentPct !== null && (
                      <div className="rounded-lg bg-background/50 border border-border/30 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">% of Rent</p>
                        <p className="text-xl font-bold mt-1">{serviceChargeAsRentPct.toFixed(1)}%</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">of your annual rent</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Unit count data not available for this project. Enter your unit size and typical service charge rate to estimate:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_PSF.map(({ label, psf }) => {
                    const estimate = unitSizeSqftNum > 0 ? psf * unitSizeSqftNum : null
                    return (
                      <div key={label} className="rounded-lg bg-background/50 border border-border/30 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className="text-base font-bold mt-1 font-mono">AED {psf}/sqft</p>
                        {estimate !== null && <p className="text-xs text-emerald-400 font-mono mt-0.5">{formatAed(estimate)}/yr for {unitSizeSqftNum} sqft</p>}
                      </div>
                    )
                  })}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-widest font-mono block mb-1.5">
                    Your Unit Size (sqft)
                  </label>
                  <Input
                    type="number"
                    min="100"
                    max="10000"
                    value={unitSizeSqft}
                    onChange={e => setUnitSizeSqft(e.target.value)}
                    placeholder="800"
                    className="bg-background/60 max-w-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state — show market reference */}
      {!selected && (
        <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground font-mono">
            Dubai Market Service Charge Reference
          </h2>
          <p className="text-sm text-muted-foreground">Search for a specific building above, or use these benchmarks to estimate:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMMON_PSF.map(({ label, psf }) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-background/50 border border-border/30 px-4 py-3">
                <span className="text-sm">{label}</span>
                <span className="font-mono font-semibold text-sm">AED {psf}/sqft/yr</span>
              </div>
            ))}
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Quick estimate — enter your unit size:</p>
            <Input
              type="number"
              min="100"
              max="10000"
              value={unitSizeSqft}
              onChange={e => setUnitSizeSqft(e.target.value)}
              placeholder="800"
              className="bg-background/60 max-w-xs"
            />
            {unitSizeSqftNum > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COMMON_PSF.map(({ label, psf }) => (
                  <div key={label} className="rounded-lg bg-background/50 border border-border/30 p-3">
                    <p className="text-[10px] font-mono text-muted-foreground">{label.split(" (")[0]}</p>
                    <p className="text-base font-bold font-mono text-emerald-400 mt-1">{formatAed(psf * unitSizeSqftNum)}</p>
                    <p className="text-[10px] text-muted-foreground/50">per year</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
