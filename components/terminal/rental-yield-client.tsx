"use client"

import { useState, useMemo } from "react"
import { Info } from "lucide-react"

export interface AreaYieldRow {
  area_name_en: string
  display_name: string
  avg_psf: number
  avg_service_charge: number | null
  sample_price_1br: number
}

interface RentalYieldClientProps {
  benchmarks: AreaYieldRow[]
}

function formatNum(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(n)
}

export function RentalYieldClient({ benchmarks }: RentalYieldClientProps) {
  const [selectedArea, setSelectedArea] = useState(benchmarks[0]?.display_name ?? "")
  const [annualRent, setAnnualRent] = useState<string>("")
  const [purchasePrice, setPurchasePrice] = useState<string>("")

  const selected = useMemo(
    () => benchmarks.find((b) => b.display_name === selectedArea) ?? benchmarks[0],
    [benchmarks, selectedArea]
  )

  const grossYield = useMemo(() => {
    const rent = Number(annualRent)
    const price = Number(purchasePrice)
    if (!rent || !price || price === 0) return null
    return (rent / price) * 100
  }, [annualRent, purchasePrice])

  const netYield = useMemo(() => {
    if (grossYield === null || !selected) return null
    const sc = selected.avg_service_charge ?? 0
    const annualCosts = sc + Number(purchasePrice) * 0.005 // DLD 4% amortised (est.) + SC
    const rent = Number(annualRent)
    if (!rent || !Number(purchasePrice)) return null
    const net = ((rent - annualCosts) / Number(purchasePrice)) * 100
    return net
  }, [grossYield, selected, annualRent, purchasePrice])

  const inputClass =
    "w-full rounded-md border border-border/50 bg-background/60 px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"

  return (
    <div className="space-y-6">
      {/* DLD Benchmarks table */}
      <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Gross Yield Inputs — DLD Benchmarks (Last 12 Months)
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            Add your expected annual rental income below to compute gross yield for any area.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Area
                </th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Avg PSF (AED)
                </th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Est. 1BR Price
                </th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Avg Service Charge / yr
                </th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((row, i) => (
                <tr
                  key={row.area_name_en}
                  className={`border-b border-border/20 transition-colors cursor-pointer ${
                    row.display_name === selectedArea
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : i % 2 === 0
                      ? "bg-background/20"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedArea(row.display_name)
                    if (!purchasePrice) {
                      setPurchasePrice(String(row.sample_price_1br))
                    }
                  }}
                >
                  <td className="px-4 py-2.5 font-medium text-foreground text-xs">
                    {row.display_name}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {formatNum(row.avg_psf)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    AED {formatNum(row.sample_price_1br)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {row.avg_service_charge
                      ? `AED ${formatNum(row.avg_service_charge)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border/20">
          <p className="font-mono text-[10px] text-muted-foreground/50">
            Click a row to use as the purchase price in the calculator below. Est. 1BR price =
            avg PSF × 750 sqft.
          </p>
        </div>
      </div>

      {/* Calculator */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Yield Calculator
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Area selector */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Area
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className={inputClass}
            >
              {benchmarks.map((b) => (
                <option key={b.area_name_en} value={b.display_name}>
                  {b.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Price */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Purchase Price (AED)
            </label>
            <input
              type="number"
              min={100_000}
              max={100_000_000}
              step={50_000}
              placeholder={selected ? String(selected.sample_price_1br) : "1500000"}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Annual Rent */}
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Expected Annual Rent (AED)
            </label>
            <input
              type="number"
              min={1_000}
              max={10_000_000}
              step={1_000}
              placeholder="e.g. 90000"
              value={annualRent}
              onChange={(e) => setAnnualRent(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Results */}
        {grossYield !== null ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Gross Yield
              </p>
              <p className="font-mono text-2xl font-bold text-emerald-400">
                {grossYield.toFixed(2)}%
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                Annual rent ÷ purchase price
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/30 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Est. Net Yield
              </p>
              <p
                className={`font-mono text-2xl font-bold ${
                  netYield !== null && netYield > 0 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {netYield !== null ? `${netYield.toFixed(2)}%` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                After service charge + est. costs
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/20 px-4 py-3">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Enter a purchase price and expected annual rent to compute gross yield.
            </p>
          </div>
        )}

        {selected?.avg_service_charge && (
          <p className="font-mono text-[10px] text-muted-foreground/60">
            Benchmark service charge for {selected.display_name}:{" "}
            <span className="text-muted-foreground">
              AED {formatNum(selected.avg_service_charge)} / yr
            </span>
            {" "}(avg across DLD-registered projects in area)
          </p>
        )}
      </div>

      <p className="font-mono text-[10px] text-muted-foreground/40 px-1">
        Source: Dubai Land Department sales transactions (last 12 months) + DLD service charge
        registry. Net yield estimate deducts service charges and 0.5% of purchase price for
        maintenance provisions. Does not include mortgage financing costs.
      </p>
    </div>
  )
}
