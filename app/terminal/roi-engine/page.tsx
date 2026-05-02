import { terminalPageMeta } from "@/lib/terminal-metadata"
import { ROICalculator } from "@/components/roi-calculator"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"

export const revalidate = 3600

export async function generateMetadata() {
  return terminalPageMeta({
    title: "ROI Engine — Dubai Real Estate Yield Calculator",
    description: "Model net rental yields, gross yields, and cash-on-cash returns for Dubai property investments. Live DLD benchmarks: avg PSF by area and bedroom type.",
    path: "/terminal/roi-engine",
  })
}

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

async function fetchAreaBenchmarks(): Promise<AreaBenchmark[]> {
  try {
    const rows = await sql<{ area_name_en: string; rooms_en: string; avg_psf: string; tx_count: string }[]>`
      WITH latest AS (
        SELECT MAX(txn_month) AS max_month
        FROM mv_txn_monthly_unified
        WHERE trans_group_en = 'Sales' AND property_type_en = 'Unit'
      )
      SELECT
        area_name_en,
        rooms_en,
        ROUND(
          (SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764)::numeric,
          0
        ) AS avg_psf,
        SUM(txn_count)::integer AS tx_count
      FROM mv_txn_monthly_unified
      CROSS JOIN latest
      WHERE trans_group_en = 'Sales'
        AND property_type_en = 'Unit'
        AND property_sub_type_en IN ('Flat', 'Hotel Apartments')
        AND txn_month >= latest.max_month - INTERVAL '11 months'
        AND area_name_en IS NOT NULL
        AND rooms_en IN ('1 B/R', '2 B/R', '3 B/R', 'Studio')
      GROUP BY area_name_en, rooms_en
      HAVING SUM(txn_count) >= 10
      ORDER BY SUM(txn_count) DESC
      LIMIT 80
    `
    return rows.map(r => ({
      area_name_en: r.area_name_en,
      rooms_en: r.rooms_en,
      avg_psf: Number(r.avg_psf),
      tx_count: Number(r.tx_count),
    }))
  } catch {
    return []
  }
}

async function fetchServiceCharges(): Promise<ServiceChargeRow[]> {
  try {
    // dld_service_charges schema: master_community_name_en, service_cost (annual per project/category)
    const rows = await sql<{ community_name: string; avg_annual_cost: string; project_count: string }[]>`
      SELECT
        master_community_name_en AS community_name,
        ROUND(AVG(service_cost)::numeric, 0) AS avg_annual_cost,
        COUNT(DISTINCT project_id)::integer AS project_count
      FROM dld_service_charges
      WHERE service_cost > 0
        AND master_community_name_en IS NOT NULL
        AND budget_year >= 2023
      GROUP BY master_community_name_en
      HAVING COUNT(DISTINCT project_id) >= 2
      ORDER BY AVG(service_cost) DESC
      LIMIT 30
    `
    return rows.map(r => ({
      community_name: r.community_name,
      avg_annual_cost: Number(r.avg_annual_cost),
      project_count: Number(r.project_count),
    }))
  } catch {
    return []
  }
}

// Group benchmarks by area for display
function groupByArea(benchmarks: AreaBenchmark[]): Map<string, AreaBenchmark[]> {
  const map = new Map<string, AreaBenchmark[]>()
  for (const b of benchmarks) {
    const existing = map.get(b.area_name_en) ?? []
    existing.push(b)
    map.set(b.area_name_en, existing)
  }
  return map
}

const ROOM_ORDER: Record<string, number> = { 'Studio': 0, '1 B/R': 1, '2 B/R': 2, '3 B/R': 3 }

export default async function ROIEnginePage() {
  const [benchmarks, serviceCharges] = await Promise.all([
    fetchAreaBenchmarks(),
    fetchServiceCharges(),
  ])

  // Build top 12 areas by total transaction count
  const areaGroups = groupByArea(benchmarks)
  const topAreas = Array.from(areaGroups.entries())
    .map(([area, rows]) => ({
      area,
      rows: rows.sort((a, b) => (ROOM_ORDER[a.rooms_en] ?? 9) - (ROOM_ORDER[b.rooms_en] ?? 9)),
      totalTx: rows.reduce((s, r) => s + r.tx_count, 0),
    }))
    .sort((a, b) => b.totalTx - a.totalTx)
    .slice(0, 12)

  const hasBenchmarks = topAreas.length > 0
  const hasServiceCharges = serviceCharges.length > 0

  return (
    <div className="space-y-8 pb-24 lg:pb-10 px-4 sm:px-0">
      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tool</p>
        <h2 className="font-serif text-3xl font-bold tracking-tight">ROI Engine</h2>
        <p className="text-muted-foreground">Advanced yield modeling with live DLD transaction benchmarks.</p>
      </div>

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

        {!hasBenchmarks ? (
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
                  const psf = (room: string) => rows.find(r => r.rooms_en === room)?.avg_psf
                  return (
                    <tr key={area} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {formatAreaName(area)}
                      </td>
                      {(['Studio', '1 B/R', '2 B/R', '3 B/R'] as const).map(room => (
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
      {hasServiceCharges && (
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
                {serviceCharges.slice(0, 15).map(sc => (
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
  )
}
