"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ROICalculator } from "@/components/roi-calculator"
import { MortgageCalculatorClient } from "@/components/terminal/mortgage-calculator-client"
import { RentalYieldClient, type AreaYieldRow } from "@/components/terminal/rental-yield-client"
import { formatAreaName } from "@/lib/area-names"

interface AreaBenchmark {
  area_name_en: string
  rooms_en: string
  avg_psf: number
  tx_count: number
}

interface ServiceChargeRow {
  community_name: string
  avg_annual_cost: number
  project_count: number
}

interface CalculatorsTabsProps {
  topAreas: { area: string; rows: AreaBenchmark[]; totalTx: number }[]
  serviceCharges: ServiceChargeRow[]
  rentalBenchmarks: AreaYieldRow[]
}

const TABS = ["ROI Engine", "Mortgage", "Rental Yield"] as const
type Tab = (typeof TABS)[number]

export function CalculatorsTabs({ topAreas, serviceCharges, rentalBenchmarks }: CalculatorsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("ROI Engine")

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border/40">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px",
              activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ROI Engine tab */}
      {activeTab === "ROI Engine" && (
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ROICalculator />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-xl border border-border/40 bg-card/40 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-accent mb-4">Investment Strategy</h3>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    A net ROI of <span className="text-foreground font-medium">7% or higher</span> is considered institutional-grade in the current Dubai market.
                  </p>
                  <div className="p-3 border-l-2 border-accent bg-accent/5">
                    <p className="italic">
                      "Yield compression is expected in prime areas like Downtown. Focus on high-density secondary hubs for maximum rental growth."
                    </p>
                  </div>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Optimize for 1BR volatility</li>
                    <li>Factor in 15% maintenance buffer</li>
                    <li>Secondary market exit strategy ready</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/40 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-accent mb-2">Tax Optimization</h3>
                <p className="text-sm text-muted-foreground">
                  Dubai offers 0% personal income tax on rental yields. Corporate tax may apply for institutional holders (9% above AED 375k threshold).
                </p>
              </div>
            </div>
          </div>

          {/* Live DLD Area Benchmarks */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
                Live Area Benchmarks — Avg Sale PSF (Last 12 Months)
              </h3>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Apartments only</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Use these DLD-sourced averages to calibrate your entry price in the calculator above. Showing top 12 areas by transaction volume.
            </p>

            {topAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Benchmark data loading — DLD transactions are being processed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="pb-3 text-left font-medium">Area</th>
                      <th className="pb-3 text-right font-medium">Studio</th>
                      <th className="pb-3 text-right font-medium">1BR</th>
                      <th className="pb-3 text-right font-medium">2BR</th>
                      <th className="pb-3 text-right font-medium">3BR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {topAreas.map(({ area, rows }) => {
                      const psf = (room: string) => rows.find((r) => r.rooms_en === room)?.avg_psf
                      return (
                        <tr key={area} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-2.5 pr-4 font-medium text-foreground">
                            {formatAreaName(area)}
                          </td>
                          {(["Studio", "1 B/R", "2 B/R", "3 B/R"] as const).map((room) => (
                            <td key={room} className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                              {psf(room) ? (
                                <span>AED {psf(room)!.toLocaleString()}</span>
                              ) : (
                                <span className="text-border">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-4 text-[10px] text-muted-foreground/60">
              Source: DLD Transactions · Sales only · meter_sale_price 500–150,000 AED/sqm · Min 10 transactions per segment
            </p>
          </div>

          {/* Service Charges Reference */}
          {serviceCharges.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/40 p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
                  Service Charge Reference — DLD Data (2023+)
                </h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Annual avg per project</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Average annual service charge cost by community. Use as a holding cost input in your net yield model.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="pb-3 text-left font-medium">Community</th>
                      <th className="pb-3 text-right font-medium">Avg Annual (AED)</th>
                      <th className="pb-3 text-right font-medium">Projects</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {serviceCharges.slice(0, 15).map((sc) => (
                      <tr key={sc.community_name} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 pr-4 font-medium text-foreground">{sc.community_name}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                          {sc.avg_annual_cost.toLocaleString()}
                        </td>
                        <td className="py-2.5 pl-2 text-right tabular-nums text-muted-foreground">
                          {sc.project_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground/60">
                Source: DLD Service Charges · Budget year 2023+ · Averaged across service categories
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mortgage tab */}
      {activeTab === "Mortgage" && (
        <div className="max-w-4xl space-y-4">
          <p className="text-sm text-muted-foreground max-w-lg">
            Estimate monthly repayments, total interest, and total cost of ownership for a Dubai
            property purchase. All calculations are client-side.
          </p>
          <MortgageCalculatorClient />
        </div>
      )}

      {/* Rental Yield tab */}
      {activeTab === "Rental Yield" && (
        <div className="max-w-5xl space-y-4">
          <p className="text-sm text-muted-foreground max-w-lg">
            Area benchmarks from DLD and Bayut registered sales. Enter your expected annual rent to
            compute gross and estimated net yield.
          </p>
          {rentalBenchmarks.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card/40 p-8 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                Benchmark data unavailable — please try again later.
              </p>
            </div>
          ) : (
            <RentalYieldClient benchmarks={rentalBenchmarks} />
          )}
        </div>
      )}
    </div>
  )
}
