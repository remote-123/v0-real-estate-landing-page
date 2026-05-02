import type { Metadata } from "next"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"
import { RentalYieldClient, type AreaYieldRow } from "@/components/terminal/rental-yield-client"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Rental Yield Calculator — Dubai Area Benchmarks | North Capital DXB",
  description:
    "Compute gross and net rental yield for Dubai properties. Benchmarks: avg PSF and service charges per area from DLD data.",
  alternates: {
    canonical: "/terminal/rental-yield",
  },
  openGraph: {
    title: "Rental Yield Calculator — Dubai Area Benchmarks | North Capital DXB",
    description:
      "Compute gross and net rental yield for Dubai properties using live DLD benchmarks.",
    url: "/terminal/rental-yield",
    images: [
      {
        url: "https://www.northcapitaldxb.com/images/distress-social.png",
        width: 1200,
        height: 630,
        alt: "Rental Yield Calculator — North Capital DXB",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rental Yield Calculator — Dubai Area Benchmarks | North Capital DXB",
    description:
      "Compute gross and net rental yield for Dubai properties using live DLD benchmarks.",
    images: ["https://www.northcapitaldxb.com/images/distress-social.png"],
  },
}

async function fetchBenchmarks(): Promise<AreaYieldRow[]> {
  try {
    // Avg sale PSF per area (last 12 months, sales only)
    const psfRows = await sql<
      { area_name_en: string; avg_psf: string; txn_count: string }[]
    >`
      SELECT
        area_name_en,
        ROUND(AVG(meter_sale_price / 10.764)::numeric, 0) AS avg_psf,
        COUNT(*)::integer AS txn_count
      FROM dld_transactions
      WHERE trans_group_en = 'Sales'
        AND instance_date >= NOW() - INTERVAL '12 months'
        AND meter_sale_price BETWEEN 500 AND 150000
        AND area_name_en IS NOT NULL
      GROUP BY area_name_en
      HAVING COUNT(*) >= 20
      ORDER BY COUNT(*) DESC
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
          Area benchmarks from DLD registered sales. Enter your expected annual rent to compute
          gross and estimated net yield.
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
