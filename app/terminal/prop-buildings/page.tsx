import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from "@/lib/db"
import { unstable_cache } from "next/cache"
import { PropBuildingsTable, type PropBuildingRow } from "@/components/terminal/prop-buildings-table"
import { AreaSelector } from "@/components/terminal/area-selector"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Prop Buildings",
    description: "7,000+ Dubai buildings sourced from propsearch.ae — completion year, developer, floors, units, amenities.",
    path: "/terminal/prop-buildings",
  })
}

const fetchAreas = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const rows = await sql<{ slug: string; name: string }[]>`
        SELECT slug, name FROM prop_areas ORDER BY name
      `
      return rows.map(r => r.slug)
    } catch { return [] }
  },
  ['prop-buildings-areas'],
  { revalidate: 3600 }
)

const fetchBuildings = unstable_cache(
  async (areaSlug: string | null): Promise<PropBuildingRow[]> => {
    try {
      if (areaSlug) {
        return await sql<PropBuildingRow[]>`
          SELECT
            pbd.building_slug,
            pbd.name,
            pbd.area_slug,
            COALESCE(pa.name, pbd.area_slug) AS area_name,
            pbd.status,
            pbd.completion_year,
            pbd.total_floors,
            pbd.total_units,
            pbd.building_type,
            pbd.developer,
            pbd.is_freehold,
            pbd.property_types
          FROM prop_building_details pbd
          LEFT JOIN prop_areas pa ON pbd.area_slug = pa.slug
          WHERE pbd.area_slug = ${areaSlug}
          ORDER BY COALESCE(pbd.name, pbd.building_slug)
        `
      }
      return await sql<PropBuildingRow[]>`
        SELECT
          pbd.building_slug,
          pbd.name,
          pbd.area_slug,
          COALESCE(pa.name, pbd.area_slug) AS area_name,
          pbd.status,
          pbd.completion_year,
          pbd.total_floors,
          pbd.total_units,
          pbd.building_type,
          pbd.developer,
          pbd.is_freehold,
          pbd.property_types
        FROM prop_building_details pbd
        LEFT JOIN prop_areas pa ON pbd.area_slug = pa.slug
        ORDER BY COALESCE(pbd.name, pbd.building_slug)
        LIMIT 400
      `
    } catch { return [] }
  },
  ['prop-buildings-list'],
  { revalidate: 3600 }
)

const fetchStats = unstable_cache(
  async () => {
    try {
      const [totals, areas] = await Promise.all([
        sql<{ total: string; with_year: string; avg_year: string }[]>`
          SELECT
            COUNT(*)::text AS total,
            COUNT(completion_year)::text AS with_year,
            ROUND(AVG(completion_year))::text AS avg_year
          FROM prop_building_details
        `,
        sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM prop_areas`,
      ])
      return {
        total: parseInt(totals[0]?.total ?? '0', 10),
        withYear: parseInt(totals[0]?.with_year ?? '0', 10),
        avgYear: totals[0]?.avg_year ?? null,
        areas: parseInt(areas[0]?.count ?? '0', 10),
      }
    } catch {
      return { total: 0, withYear: 0, avgYear: null, areas: 0 }
    }
  },
  ['prop-building-stats'],
  { revalidate: 3600 }
)

export default async function PropBuildingsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>
}) {
  const { area } = await searchParams
  const selectedArea = area ?? null

  const [buildings, areas, stats] = await Promise.all([
    fetchBuildings(selectedArea),
    fetchAreas(),
    fetchStats(),
  ])

  const complete = buildings.filter(b => b.status === 'complete').length
  const offPlan  = buildings.filter(b => b.status === 'under_construction' || b.status === 'planned').length

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row shadow-sm border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase font-bold">
              Prop Buildings &mdash; {stats.total.toLocaleString()} buildings · {stats.areas} areas
            </p>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            {selectedArea
              ? areas.includes(selectedArea) ? selectedArea.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Buildings'
              : 'Dubai Building Intelligence'
            }
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            {selectedArea
              ? `${buildings.length} buildings in this area. Sourced from propsearch.ae — completion year, developer, unit mix, and amenities.`
              : `${stats.total.toLocaleString()} buildings across ${stats.areas} Dubai areas. Select an area to see every building in it. Click any row for a full profile.`
            }
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap lg:flex-nowrap gap-3 w-full lg:w-auto">
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">
              {selectedArea ? 'In Area' : 'Total Buildings'}
            </p>
            <p className="font-mono text-xl font-bold text-accent">{buildings.length.toLocaleString()}</p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Complete</p>
            <p className="font-mono text-xl font-bold text-emerald-400">{complete.toLocaleString()}</p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Off-Plan</p>
            <p className="font-mono text-xl font-bold text-yellow-400">{offPlan.toLocaleString()}</p>
          </div>
          {stats.avgYear && (
            <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
              <p className="font-mono text-xs text-muted-foreground mb-1">Avg Year Built</p>
              <p className="font-mono text-xl font-bold text-foreground">{stats.avgYear}</p>
            </div>
          )}
        </div>
      </section>

      <p className="text-[11px] font-mono text-muted-foreground/50 px-1">
        Source: propsearch.ae · Scraped {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        {!selectedArea && ` · Showing first 400 — select an area to see all`}
      </p>

      {/* Area selector + table */}
      <section className="space-y-4">
        <Suspense>
          <AreaSelector areas={areas} selected={selectedArea} />
        </Suspense>
        <PropBuildingsTable data={buildings} />
      </section>

    </div>
  )
}
