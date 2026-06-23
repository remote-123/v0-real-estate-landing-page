import { terminalPageMeta } from "@/lib/terminal-metadata"
import { sql } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import { BuildingsTable } from '@/components/terminal/buildings-table'
import { AreaSelector } from '@/components/terminal/area-selector'
import { BuildingsFilters } from '@/components/terminal/buildings-filters'
import { auth } from "@/auth"
import { GatedTableOverlay } from "@/components/auth/gated-table-overlay"
import { isTerminalUnlocked } from "@/lib/terminal-gate"
import { Suspense } from 'react'
import Link from 'next/link'

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Buildings Directory",
    description: "Browse Dubai buildings — grade, bedroom breakdown, highway access, and DLD transaction data.",
    path: "/terminal/buildings",
  })
}

export type BuildingRow = {
  nc_slug: string
  name: string
  nc_area_slug: string | null
  area_display: string | null
  building_type: string | null
  building_grade: string | null
  developer: string | null
  completion_year: number | null
  total_floors: number | null
  total_units: number | null
  units_1br: number | null
  units_2br: number | null
  units_3br_plus: number | null
  nearest_highway: string | null
  nearest_metro: string | null
  has_school_nearby: boolean | null
  view_type: string[] | null
  has_pool: boolean | null
  has_gym: boolean | null
  is_freehold: boolean | null
  data_quality: number
  global_slug: string | null
  status: string | null
}

type AreaOption = { value: string; label: string }

type Filters = {
  area: string | null
  status: string
  grade: string
  type: string
  freehold: string
  yearFrom: string
  yearTo: string
}

const PAGE_SIZE = 100

const fetchAreas = unstable_cache(
  async (): Promise<AreaOption[]> => {
    try {
      const rows = await sql<{ slug: string; display_name: string }[]>`
        SELECT na.slug, na.display_name
        FROM nc_areas na
        WHERE na.slug IN (
          SELECT DISTINCT nc_area_slug FROM nc_buildings WHERE nc_area_slug IS NOT NULL
        )
        ORDER BY na.display_name
      `
      return rows.map(r => ({ value: r.slug, label: r.display_name }))
    } catch {
      return []
    }
  },
  ['nc-buildings-areas'],
  { revalidate: 86400 }
)

const fetchStats = unstable_cache(
  async () => {
    try {
      const rows = await sql<{ total: string; complete: string; offplan: string }[]>`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE status = 'complete')::text AS complete,
          COUNT(*) FILTER (WHERE status IN ('under_construction','planned','under_development'))::text AS offplan
        FROM nc_buildings
      `
      return {
        total: Number(rows[0].total),
        complete: Number(rows[0].complete),
        offplan: Number(rows[0].offplan),
      }
    } catch {
      return { total: 0, complete: 0, offplan: 0 }
    }
  },
  ['nc-buildings-stats'],
  { revalidate: 3600 }
)

async function fetchBuildings(
  filters: Filters,
  page: number
): Promise<{ rows: BuildingRow[]; total: number }> {
  const offset = (page - 1) * PAGE_SIZE

  const areaFilter   = filters.area     ? sql`AND nb.nc_area_slug = ${filters.area}`           : sql``
  const statusFilter = filters.status   ? sql`AND nb.status = ${filters.status}`               : sql``
  const gradeFilter  = filters.grade    ? sql`AND nb.building_grade = ${filters.grade}`        : sql``
  const typeFilter   = filters.type     ? sql`AND nb.building_type = ${filters.type}`          : sql``
  const freeholdFilter = filters.freehold === 'true' ? sql`AND nb.is_freehold = true`         : sql``
  const yearFromFilter = filters.yearFrom ? sql`AND nb.completion_year >= ${Number(filters.yearFrom)}` : sql``
  const yearToFilter   = filters.yearTo   ? sql`AND nb.completion_year <= ${Number(filters.yearTo)}`   : sql``

  try {
    const [rows, countRows] = await Promise.all([
      sql<BuildingRow[]>`
        SELECT
          nb.slug AS nc_slug, nb.name, nb.nc_area_slug,
          na.display_name AS area_display,
          nb.building_type, nb.building_grade, nb.developer,
          nb.completion_year, nb.total_floors, nb.total_units,
          nb.units_1br, nb.units_2br, nb.units_3br_plus,
          nb.nearest_highway, nb.nearest_metro, nb.has_school_nearby,
          nb.view_type,
          nb.has_pool, nb.has_gym, nb.is_freehold, nb.data_quality,
          nb.global_slug, nb.status
        FROM nc_buildings nb
        LEFT JOIN nc_areas na ON na.slug = nb.nc_area_slug
        WHERE nb.name IS NOT NULL
          ${areaFilter}
          ${statusFilter}
          ${gradeFilter}
          ${typeFilter}
          ${freeholdFilter}
          ${yearFromFilter}
          ${yearToFilter}
        ORDER BY nb.name
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `,
      sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM nc_buildings nb
        WHERE nb.name IS NOT NULL
          ${areaFilter}
          ${statusFilter}
          ${gradeFilter}
          ${typeFilter}
          ${freeholdFilter}
          ${yearFromFilter}
          ${yearToFilter}
      `,
    ])
    return { rows: rows.map(coerce), total: Number(countRows[0].count) }
  } catch {
    return { rows: [], total: 0 }
  }
}

function coerce(r: BuildingRow): BuildingRow {
  return {
    ...r,
    completion_year: r.completion_year != null ? Number(r.completion_year) : null,
    total_floors: r.total_floors != null ? Number(r.total_floors) : null,
    total_units: r.total_units != null ? Number(r.total_units) : null,
    units_1br: r.units_1br != null ? Number(r.units_1br) : null,
    units_2br: r.units_2br != null ? Number(r.units_2br) : null,
    units_3br_plus: r.units_3br_plus != null ? Number(r.units_3br_plus) : null,
    data_quality: Number(r.data_quality),
  }
}

function Pagination({
  page, totalPages, pageUrl,
}: {
  page: number; totalPages: number; pageUrl: (p: number) => string
}) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce<(number | '…')[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span className="font-mono text-xs">Page {page} of {totalPages}</span>
      <div className="flex gap-1.5 flex-wrap">
        {page > 1 && (
          <Link href={pageUrl(page - 1)} className="rounded-md border border-border/50 px-3 py-1.5 text-xs hover:bg-accent/10 hover:text-foreground transition-colors">
            ← Prev
          </Link>
        )}
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ell-${i}`} className="px-2 py-1.5 text-xs text-muted-foreground/40">…</span>
          ) : (
            <Link
              key={p}
              href={pageUrl(p as number)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                p === page
                  ? 'border-accent/50 bg-accent/10 text-accent font-medium'
                  : 'border-border/50 hover:bg-accent/10 hover:text-foreground'
              }`}
            >
              {p}
            </Link>
          )
        )}
        {page < totalPages && (
          <Link href={pageUrl(page + 1)} className="rounded-md border border-border/50 px-3 py-1.5 text-xs hover:bg-accent/10 hover:text-foreground transition-colors">
            Next →
          </Link>
        )}
      </div>
    </div>
  )
}

const FREE_ROWS = 5

export default async function BuildingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    area?: string; page?: string
    status?: string; grade?: string; type?: string
    freehold?: string; year_from?: string; year_to?: string
  }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? '1'))

  const filters: Filters = {
    area:     sp.area     ?? null,
    status:   sp.status   ?? '',
    grade:    sp.grade    ?? '',
    type:     sp.type     ?? '',
    freehold: sp.freehold ?? '',
    yearFrom: sp.year_from ?? '',
    yearTo:   sp.year_to  ?? '',
  }

  const activeFilterCount = [
    filters.status, filters.grade, filters.type, filters.freehold, filters.yearFrom, filters.yearTo,
  ].filter(Boolean).length

  const [session, { rows: buildings, total }, areas, stats] = await Promise.all([
    auth(),
    fetchBuildings(filters, page),
    fetchAreas(),
    fetchStats(),
  ])

  const isAuthenticated = await isTerminalUnlocked(session)
  const display = isAuthenticated ? buildings : buildings.slice(0, FREE_ROWS)

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const areaLabel = filters.area ? (areas.find(a => a.value === filters.area)?.label ?? filters.area) : null

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (filters.area)     params.set('area',      filters.area)
    if (filters.status)   params.set('status',    filters.status)
    if (filters.grade)    params.set('grade',     filters.grade)
    if (filters.type)     params.set('type',      filters.type)
    if (filters.freehold) params.set('freehold',  filters.freehold)
    if (filters.yearFrom) params.set('year_from', filters.yearFrom)
    if (filters.yearTo)   params.set('year_to',   filters.yearTo)
    if (p > 1)            params.set('page',      String(p))
    const qs = params.toString()
    return `/terminal/buildings${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="flex w-full flex-col px-0 sm:px-2 py-0 sm:py-4 space-y-4 max-w-[1400px] mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center border-y sm:border border-border/50 rounded-none sm:rounded-xl px-5 py-4 bg-card">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase font-bold mb-0.5">
            Buildings Directory
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground truncate">
            {areaLabel ?? 'Dubai Buildings'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filters.area
              ? `${total.toLocaleString()} buildings in ${areaLabel}`
              : `${stats.total.toLocaleString()} buildings across Dubai — grade, unit mix, highway access`
            }
          </p>
        </div>

        {/* KPIs */}
        <div className="flex gap-3 shrink-0">
          <div className="rounded-lg bg-background border border-border/50 px-4 py-2.5 text-center min-w-[80px]">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="font-mono text-lg font-bold text-accent mt-0.5">{stats.total.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-background border border-border/50 px-4 py-2.5 text-center min-w-[80px]">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">Complete</p>
            <p className="font-mono text-lg font-bold text-emerald-400 mt-0.5">{stats.complete.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-background border border-border/50 px-4 py-2.5 text-center min-w-[80px]">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">Off-Plan</p>
            <p className="font-mono text-lg font-bold text-yellow-400 mt-0.5">{stats.offplan.toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* Controls bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Suspense>
          <AreaSelector areas={areas} selected={filters.area} />
        </Suspense>
        <Suspense>
          <BuildingsFilters
            activeFilters={{
              status:   filters.status,
              grade:    filters.grade,
              type:     filters.type,
              freehold: filters.freehold,
              yearFrom: filters.yearFrom,
              yearTo:   filters.yearTo,
            }}
            activeCount={activeFilterCount}
          />
        </Suspense>
        {total > 0 && (
          <p className="text-xs font-mono text-muted-foreground ml-auto shrink-0">
            {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
          </p>
        )}
      </div>

      {/* Top pagination */}
      <Pagination page={page} totalPages={totalPages} pageUrl={pageUrl} />

      {/* Table */}
      <section className="relative">
        <BuildingsTable data={display} />
        {!isAuthenticated && buildings.length > FREE_ROWS && (
          <GatedTableOverlay
            freeRows={display.length}
            totalRows={total}
            noun="buildings"
            callbackUrl="/terminal/buildings"
          />
        )}
      </section>

      {/* Bottom pagination */}
      <Pagination page={page} totalPages={totalPages} pageUrl={pageUrl} />

    </div>
  )
}
