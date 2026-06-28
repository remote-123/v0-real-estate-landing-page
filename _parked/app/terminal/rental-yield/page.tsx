import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"
import { RentalYieldClient, type AreaYieldRow } from "@/components/terminal/rental-yield-client"

export const revalidate = 3600

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Rental Yield Calculator — Dubai Area Benchmarks",
    description: "Compute gross and net rental yield for Dubai properties. Benchmarks: avg PSF and service charges per area from DLD data.",
    path: "/terminal/rental-yield",
  })
}

async function fetchBenchmarks(): Promise<AreaYieldRow[]> {
  try {
    // Avg sale PSF per area — rolling 12 months from most recent data in unified view
    const psfRows = await sql<
      { area_name_en: string; avg_psf: string; txn_count: string }[]
    >`
      WITH latest AS (
        SELECT MAX(txn_month) AS max_month
        FROM mv_txn_monthly_unified
        WHERE trans_group_en = 'Sales' AND property_type_en = 'Unit'
      )
      SELECT
        area_name_en,
        ROUND(
          (SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764)::numeric,
          0
        ) AS avg_psf,
        SUM(txn_count)::integer AS txn_count
      FROM mv_txn_monthly_unified
      CROSS JOIN latest
      WHERE trans_group_en = 'Sales'
        AND property_type_en = 'Unit'
        AND txn_month >= latest.max_month - INTERVAL '11 months'
        AND area_name_en IS NOT NULL
      GROUP BY area_name_en
      HAVING SUM(txn_count) >= 20
      ORDER BY SUM(txn_count) DESC
      LIMIT 15
    `

    if (psfRows.length === 0) return []

    // Pull avg service charges grouped by community (approximate area match)
    const scRows = await sql<
      { community_name: string; avg_annual_cost: string }[]
    >`
      SELECT
        master_community_name_en AS community_name,
        ROUND(AVG(service_cost)::numeric, 0) AS avg_annual_cost
      FROM dld_service_charges
      WHERE service_cost > 0 AND master_community_name_en IS NOT NULL
      GROUP BY master_community_name_en
    `

    // Build a lookup: normalised community_name → avg cost
    const scMap = new Map<string, number>()
    for (const sc of scRows) {
      scMap.set(sc.community_name.toLowerCase().trim(), Number(sc.avg_annual_cost))
    }

    // Fuzzy match: for each area find best SC match
    function matchSC(areaName: string): number | null {
      const key = areaName.toLowerCase()
      if (scMap.has(key)) return scMap.get(key)!
      // Try contains match
      for (const [k, v] of scMap) {
        if (k.includes(key.split(" ")[0]) || key.includes(k.split(" ")[0])) return v
      }
      return null
    }

    return psfRows.map((row) => {
      const avgPsf = Number(row.avg_psf)
      // Estimate 1BR price: PSF × 750 sqft typical
      const samplePrice1BR = Math.round(avgPsf * 750 / 50000) * 50000
      const sc = matchSC(row.area_name_en)
      return {
        area_name_en: row.area_name_en,
        display_name: formatAreaName(row.area_name_en),
        avg_psf: avgPsf,
        avg_service_charge: sc,
        sample_price_1br: samplePrice1BR,
      }
    })
  } catch (err) {
    console.error("[rental-yield] fetchBenchmarks error:", err)
    return []
  }
}

export default async function RentalYieldPage() {
  const benchmarks = await fetchBenchmarks()

  return (
    <div className="flex w-full flex-col px-4 sm:px-8 xl:px-12 py-6 space-y-6 max-w-5xl mx-auto pb-24 lg:pb-12">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Tools
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          Rental Yield Calculator
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg">
          Area benchmarks from DLD and Bayut registered sales. Enter your expected annual rent to
          compute gross and estimated net yield.
        </p>
      </div>

      {benchmarks.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/40 p-8 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            Benchmark data unavailable — please try again later.
          </p>
        </div>
      ) : (
        <RentalYieldClient benchmarks={benchmarks} />
      )}
    </div>
  )
}
