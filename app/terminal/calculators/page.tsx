import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"
import { CalculatorsTabs } from "@/components/terminal/calculators-tabs"
import type { AreaYieldRow } from "@/components/terminal/rental-yield-client"

export const revalidate = 3600

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Calculators — ROI Engine, Mortgage & Rental Yield",
    description: "Dubai property investment calculators: ROI Engine with live DLD benchmarks, Mortgage repayment modelling, and Rental Yield analysis.",
    path: "/terminal/calculators",
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

const ROOM_ORDER: Record<string, number> = { Studio: 0, "1 B/R": 1, "2 B/R": 2, "3 B/R": 3 }

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
    return rows.map((r) => ({
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
    return rows.map((r) => ({
      community_name: r.community_name,
      avg_annual_cost: Number(r.avg_annual_cost),
      project_count: Number(r.project_count),
    }))
  } catch {
    return []
  }
}

async function fetchRentalBenchmarks(): Promise<AreaYieldRow[]> {
  try {
    const psfRows = await sql<{ area_name_en: string; nc_display_name: string | null; avg_psf: string; txn_count: string }[]>`
      WITH latest AS (
        SELECT MAX(txn_month) AS max_month
        FROM mv_txn_monthly_unified
        WHERE trans_group_en = 'Sales' AND property_type_en = 'Unit'
      )
      SELECT
        area_name_en,
        MAX(nc_display_name) AS nc_display_name,
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

    const scRows = await sql<{ community_name: string; avg_annual_cost: string }[]>`
      SELECT
        master_community_name_en AS community_name,
        ROUND(AVG(service_cost)::numeric, 0) AS avg_annual_cost
      FROM dld_service_charges
      WHERE service_cost > 0 AND master_community_name_en IS NOT NULL
      GROUP BY master_community_name_en
    `

    const scMap = new Map<string, number>()
    for (const sc of scRows) {
      scMap.set(sc.community_name.toLowerCase().trim(), Number(sc.avg_annual_cost))
    }

    function matchSC(areaName: string): number | null {
      const key = areaName.toLowerCase()
      if (scMap.has(key)) return scMap.get(key)!
      for (const [k, v] of scMap) {
        if (k.includes(key.split(" ")[0]) || key.includes(k.split(" ")[0])) return v
      }
      return null
    }

    return psfRows.map((row) => {
      const avgPsf = Number(row.avg_psf)
      const samplePrice1BR = Math.round((avgPsf * 750) / 50000) * 50000
      const sc = matchSC(row.area_name_en)
      return {
        area_name_en: row.area_name_en,
        display_name: row.nc_display_name ?? formatAreaName(row.area_name_en),
        avg_psf: avgPsf,
        avg_service_charge: sc,
        sample_price_1br: samplePrice1BR,
      }
    })
  } catch {
    return []
  }
}

function groupByArea(benchmarks: AreaBenchmark[]) {
  const map = new Map<string, AreaBenchmark[]>()
  for (const b of benchmarks) {
    const existing = map.get(b.area_name_en) ?? []
    existing.push(b)
    map.set(b.area_name_en, existing)
  }
  return map
}

export default async function CalculatorsPage() {
  const [benchmarks, serviceCharges, rentalBenchmarks] = await Promise.all([
    fetchAreaBenchmarks(),
    fetchServiceCharges(),
    fetchRentalBenchmarks(),
  ])

  const areaGroups = groupByArea(benchmarks)
  const topAreas = Array.from(areaGroups.entries())
    .map(([area, rows]) => ({
      area,
      rows: rows.sort((a, b) => (ROOM_ORDER[a.rooms_en] ?? 9) - (ROOM_ORDER[b.rooms_en] ?? 9)),
      totalTx: rows.reduce((s, r) => s + r.tx_count, 0),
    }))
    .sort((a, b) => b.totalTx - a.totalTx)
    .slice(0, 12)

  return (
    <div className="space-y-8 pb-24 lg:pb-10 px-4 sm:px-0">
      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Tools</p>
        <h2 className="font-serif text-3xl font-bold tracking-tight">Calculators</h2>
        <p className="text-muted-foreground">ROI Engine, Mortgage modelling, and Rental Yield analysis — all in one place.</p>
      </div>

      <CalculatorsTabs
        topAreas={topAreas}
        serviceCharges={serviceCharges}
        rentalBenchmarks={rentalBenchmarks}
      />
    </div>
  )
}
