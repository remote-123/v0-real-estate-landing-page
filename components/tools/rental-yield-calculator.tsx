"use client"

import React, { useState, useMemo } from "react"
import { formatAreaName } from "@/lib/area-names"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus, ArrowUpDown } from "lucide-react"

export interface YieldBenchmark {
  area_name_en: string
  rooms_en: string
  avg_sale_price: number
  avg_psf: number
  sale_txns: number
  avg_annual_rent: number
  rent_listings: number
  gross_yield_pct: number
}

interface Props {
  benchmarks: YieldBenchmark[]
}

const BED_LABELS: Record<string, string> = {
  "Studio": "Studio",
  "1 B/R": "1 Bed",
  "2 B/R": "2 Bed",
  "3 B/R": "3 Bed",
}

function fmt(n: number, prefix = "AED "): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(0)}K`
  return `${prefix}${n.toLocaleString()}`
}

function YieldBadge({ pct }: { pct: number }) {
  if (pct >= 8) return (
    <span className="rounded-full px-2 py-0.5 text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
      {pct.toFixed(2)}%
    </span>
  )
  if (pct >= 6) return (
    <span className="rounded-full px-2 py-0.5 text-xs font-mono font-semibold bg-yellow-400/15 text-yellow-400 ring-1 ring-yellow-400/30">
      {pct.toFixed(2)}%
    </span>
  )
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-mono font-semibold bg-muted/50 text-muted-foreground ring-1 ring-border/40">
      {pct.toFixed(2)}%
    </span>
  )
}

export function RentalYieldCalculator({ benchmarks }: Props) {
  const [purchasePrice, setPurchasePrice] = useState("")
  const [annualRent, setAnnualRent] = useState("")
  const [isFinanced, setIsFinanced] = useState(true)
  const [ltv, setLtv] = useState(75)
  const [interestRate, setInterestRate] = useState(4.5)
  const [serviceChargePsf, setServiceChargePsf] = useState(15)
  const [sizeSqft, setSizeSqft] = useState("")
  const [sortCol, setSortCol] = useState<"gross_yield_pct" | "avg_sale_price" | "avg_annual_rent">("gross_yield_pct")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [filterBeds, setFilterBeds] = useState("all")

  // Get unique areas and beds from benchmarks
  const bedOptions = useMemo(() => {
    const beds = [...new Set(benchmarks.map(b => b.rooms_en))]
    return beds.sort((a, b) => {
      const order = ["Studio", "1 B/R", "2 B/R", "3 B/R"]
      return order.indexOf(a) - order.indexOf(b)
    })
  }, [benchmarks])

  const filteredBenchmarks = useMemo(() => {
    const rows = filterBeds === "all" ? benchmarks : benchmarks.filter(b => b.rooms_en === filterBeds)
    return [...rows].sort((a, b) => {
      const val = sortDir === "desc" ? b[sortCol] - a[sortCol] : a[sortCol] - b[sortCol]
      return val
    })
  }, [benchmarks, filterBeds, sortCol, sortDir])

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) {
      setSortDir(d => d === "desc" ? "asc" : "desc")
    } else {
      setSortCol(col)
      setSortDir("desc")
    }
  }

  // Calculations
  const price = parseFloat(purchasePrice.replace(/,/g, "")) || 0
  const rent = parseFloat(annualRent.replace(/,/g, "")) || 0
  const size = parseFloat(sizeSqft) || 0

  const grossYield = price > 0 && rent > 0 ? (rent / price) * 100 : null
  const annualServiceCharge = size > 0 ? size * serviceChargePsf : 0
  const netRent = rent - annualServiceCharge
  const netYield = price > 0 && rent > 0 ? (netRent / price) * 100 : null

  const loanAmount = price * (ltv / 100)
  const monthlyRate = interestRate / 100 / 12
  const termMonths = 25 * 12
  const annualMortgage = isFinanced && loanAmount > 0 && monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1) * 12
    : 0

  const annualCashflow = netRent - annualMortgage
  const equity = price * (1 - ltv / 100)
  const cashOnCash = isFinanced && equity > 0 && annualCashflow !== 0
    ? (annualCashflow / equity) * 100
    : null

  const hasResult = price > 0 && rent > 0

  return (
    <div className="space-y-10">
      {/* --- Calculator panel --- */}
      <div className="grid md:grid-cols-2 gap-0 rounded-xl border border-border/40 overflow-hidden">
        {/* Inputs */}
        <div className="bg-card/40 p-6 space-y-5 border-r border-border/40">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">Your Property</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Purchase Price (AED)</Label>
              <Input
                placeholder="e.g. 1,200,000"
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Annual Rent (AED)</Label>
              <Input
                placeholder="e.g. 72,000"
                value={annualRent}
                onChange={e => setAnnualRent(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Size (sqft) — for service charge</Label>
              <Input
                placeholder="e.g. 750"
                value={sizeSqft}
                onChange={e => setSizeSqft(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Service Charge (AED/sqft/yr)</Label>
              <Input
                type="number"
                value={serviceChargePsf}
                onChange={e => setServiceChargePsf(Number(e.target.value))}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 pt-1">Financing</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsFinanced(true)}
                className={`p-2.5 border rounded-lg text-sm font-medium transition-colors ${isFinanced ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border hover:bg-secondary"}`}
              >
                Mortgage
              </button>
              <button
                onClick={() => setIsFinanced(false)}
                className={`p-2.5 border rounded-lg text-sm font-medium transition-colors ${!isFinanced ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border hover:bg-secondary"}`}
              >
                Cash
              </button>
            </div>
          </div>

          {isFinanced && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">LTV %</Label>
                <Input
                  type="number"
                  min={50} max={80} step={5}
                  value={ltv}
                  onChange={e => setLtv(Number(e.target.value))}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Interest Rate %</Label>
                <Input
                  type="number"
                  min={2} max={12} step={0.25}
                  value={interestRate}
                  onChange={e => setInterestRate(Number(e.target.value))}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-card/20 p-6 space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">Results</p>

          {!hasResult ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground/40 text-sm">
              Enter price and annual rent to calculate
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-card/60 border border-border/40 p-3 space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Gross Yield</p>
                  <p className={`text-2xl font-bold font-mono ${grossYield !== null && grossYield >= 6 ? "text-emerald-400" : "text-foreground"}`}>
                    {grossYield !== null ? `${grossYield.toFixed(2)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">Before costs</p>
                </div>
                <div className="rounded-lg bg-card/60 border border-border/40 p-3 space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Net Yield</p>
                  <p className={`text-2xl font-bold font-mono ${netYield !== null && netYield >= 5 ? "text-emerald-400" : "text-foreground"}`}>
                    {netYield !== null ? `${netYield.toFixed(2)}%` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">After service charge</p>
                </div>
              </div>

              {isFinanced && annualMortgage > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-card/60 border border-border/40 p-3 space-y-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Annual Mortgage</p>
                    <p className="text-xl font-bold font-mono text-foreground">{fmt(Math.round(annualMortgage))}</p>
                    <p className="text-[10px] text-muted-foreground/60">{fmt(Math.round(annualMortgage / 12))}/mo</p>
                  </div>
                  <div className="rounded-lg bg-card/60 border border-border/40 p-3 space-y-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Annual Cashflow</p>
                    <p className={`text-xl font-bold font-mono ${annualCashflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {annualCashflow >= 0 ? "+" : ""}{fmt(Math.round(Math.abs(annualCashflow)), annualCashflow >= 0 ? "+AED " : "-AED ")}
                    </p>
                    {cashOnCash !== null && (
                      <p className="text-[10px] text-muted-foreground/60">CoC: {cashOnCash.toFixed(1)}%</p>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-card/60 border border-border/40 p-3 space-y-1.5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Summary</p>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  <div className="flex justify-between"><span>Purchase price</span><span className="text-foreground">{fmt(price)}</span></div>
                  <div className="flex justify-between"><span>Annual rent</span><span className="text-foreground">{fmt(rent)}</span></div>
                  {annualServiceCharge > 0 && <div className="flex justify-between"><span>Service charge est.</span><span className="text-foreground">−{fmt(Math.round(annualServiceCharge))}</span></div>}
                  {isFinanced && loanAmount > 0 && <div className="flex justify-between"><span>Loan ({ltv}% LTV)</span><span className="text-foreground">{fmt(Math.round(loanAmount))}</span></div>}
                  {isFinanced && loanAmount > 0 && <div className="flex justify-between"><span>Equity (down)</span><span className="text-foreground">{fmt(Math.round(equity))}</span></div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Benchmark table --- */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">Market Benchmarks</p>
            <h2 className="text-lg font-semibold">Dubai Rental Yields by Area & Bedroom Type</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterBeds} onValueChange={setFilterBeds}>
              <SelectTrigger className="w-32 text-xs h-8">
                <SelectValue placeholder="All beds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All beds</SelectItem>
                {bedOptions.map(b => (
                  <SelectItem key={b} value={b}>{BED_LABELS[b] ?? b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-card/40">
                  <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">Area</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">Beds</th>
                  <th
                    className="text-right px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("avg_sale_price")}
                  >
                    <span className="flex items-center justify-end gap-1">Avg Price <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th
                    className="text-right px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("avg_annual_rent")}
                  >
                    <span className="flex items-center justify-end gap-1">Avg Annual Rent <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th
                    className="text-right px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("gross_yield_pct")}
                  >
                    <span className="flex items-center justify-end gap-1">Gross Yield <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBenchmarks.map((row, i) => (
                  <tr key={`${row.area_name_en}-${row.rooms_en}`} className={`border-b border-border/20 hover:bg-card/30 transition-colors ${i % 2 === 0 ? "" : "bg-card/10"}`}>
                    <td className="px-4 py-2.5 font-medium text-sm">{formatAreaName(row.area_name_en)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{BED_LABELS[row.rooms_en] ?? row.rooms_en}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono">{fmt(row.avg_sale_price)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono">{fmt(row.avg_annual_rent)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <YieldBadge pct={row.gross_yield_pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-card/20 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground/50 font-mono">
              Sales: DLD-registered transactions (last 12 months). Rents: live PropertyFinder listings. {filteredBenchmarks.length} area/bedroom pairs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
