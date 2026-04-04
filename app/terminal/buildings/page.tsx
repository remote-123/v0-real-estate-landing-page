import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import { auth } from '@/auth'
import { BuildingsTable } from '@/components/terminal/buildings-table'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Buildings Directory | North Capital DXB',
  description: 'Browse and search the Dubai buildings registry — completion year, developer, area, and coordinates.',
}

type BuildingRow = {
  building_key: string
  building_name_en: string
  area_name_en: string | null
  primary_sub_type: string | null
  developer_name: string | null
  completion_year: number | null
  propsearch_status: string | null
  osm_lat: string | null
  osm_lng: string | null
  total_floors: number | null
  total_units: number | null
  property_types: string | null
  amenities: string | null
}

async function fetchBuildings(): Promise<BuildingRow[]> {
  try {
    const rows = await sql<BuildingRow[]>`
      SELECT
        building_key,
        building_name_en,
        area_name_en,
        primary_sub_type,
        developer_name,
        completion_year,
        propsearch_status,
        osm_lat,
        osm_lng,
        total_floors,
        total_units,
        property_types,
        amenities
      FROM buildings_enriched
      WHERE building_name_en IS NOT NULL
      ORDER BY building_name_en
      LIMIT 200
    `
    return rows
  } catch {
    return []
  }
}

const FREE_ROWS = 5

export default async function BuildingsPage() {
  const [session, allData] = await Promise.all([auth(), fetchBuildings()])
  const isAuthenticated = !!session
  const data = isAuthenticated ? allData : allData.slice(0, FREE_ROWS)

  const withCoords = allData.filter(r => r.osm_lat != null && r.osm_lng != null).length
  const offPlan = allData.filter(r =>
    r.propsearch_status === 'under_construction' || r.propsearch_status === 'planned'
  ).length
  const withUnits = allData.filter(r => r.total_units != null).length

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row shadow-sm border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
            <h1 className="font-mono text-xs tracking-widest text-muted-foreground uppercase font-bold">
              Buildings Directory &mdash; {allData.length} Records
            </h1>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Dubai Buildings Registry
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Search and filter Dubai buildings by area, type, developer, and completion status. Data sourced from DLD and enriched with OpenStreetMap coordinates.
          </p>
        </div>

        {/* Stat cards */}
        <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto">
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Total Buildings</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-accent">
              {allData.length.toLocaleString()}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">With Coordinates</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-emerald-400">
              {withCoords.toLocaleString()}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Off-Plan</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-foreground">
              {offPlan.toLocaleString()}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">With Unit Data</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-blue-400">
              {withUnits.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Data disclaimer */}
      <p className="text-[11px] font-mono text-muted-foreground/50 px-1">
        Source: Dubai Land Department buildings registry, enriched with OpenStreetMap geocoding
      </p>

      {/* Table */}
      <section>
        <BuildingsTable
          data={data}
          isAuthenticated={isAuthenticated}
          totalRows={allData.length}
        />
      </section>

    </div>
  )
}
