import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Building2, Calendar, Layers, MapPin, DollarSign, Activity } from "lucide-react"
import { sql } from "@/lib/db"
import { BuildingPSFChart, type PSFPoint } from "@/components/terminal/building-psf-chart"
import { cn } from "@/lib/utils"

// NOTE: dld_transactions has no index on building_name_en — query is table-scan on 1.66M rows.
// With revalidate=86400 (once/day), this is acceptable. Add index if latency becomes an issue:
// CREATE INDEX CONCURRENTLY dld_transactions_building_name_idx ON dld_transactions (building_name_en);
export const revalidate = 86400

type Building = {
  building_key: string
  global_slug: string
  slug: string | null
  building_name_en: string
  area_name_en: string | null
  developer_name: string | null
  master_developer_name: string | null
  completion_year: number | null
  propsearch_status: string | null
  primary_sub_type: string | null
  total_floors: number | null
  total_units: number | null
  property_types: string | null
  amenities: string | null
  is_free_hold: boolean | null
  avg_psf: string | null
  median_psf: string | null
  txn_count: number | null
  first_txn_date: string | null
  last_txn_date: string | null
  avg_unit_size_sqft: string | null
  project_name_en: string | null
  osm_lat: number | null
  osm_lng: number | null
}

type TxnRow = {
  instance_date: string
  trans_group_en: string
  rooms_en: string | null
  procedure_area: string | null
  actual_worth: string | null
  meter_sale_price: string | null
}

type TrendRow = {
  txn_month: string
  avg_psf: string
  deals: string
}

type ServiceRow = {
  avg_cost: string
  latest_year: string
}

async function fetchByGlobalSlug(globalSlug: string): Promise<Building | null> {
  try {
    const rows = await sql<Building[]>`
      SELECT
        building_key, global_slug, slug, building_name_en, area_name_en,
        developer_name, master_developer_name, completion_year,
        propsearch_status, primary_sub_type,
        total_floors, total_units, property_types, amenities,
        is_free_hold, avg_psf, median_psf, txn_count,
        first_txn_date::text, last_txn_date::text,
        avg_unit_size_sqft, project_name_en,
        osm_lat, osm_lng
      FROM re_buildings
      WHERE global_slug = ${globalSlug}
      LIMIT 1
    `
    return rows[0] ?? null
  } catch {
    return null
  }
}

async function fetchByLegacySlug(legacySlug: string): Promise<string | null> {
  try {
    const rows = await sql<{ global_slug: string }[]>`
      SELECT global_slug FROM re_buildings WHERE slug = ${legacySlug} LIMIT 1
    `
    return rows[0]?.global_slug ?? null
  } catch {
    return null
  }
}

async function fetchPSFTrend(buildingName: string): Promise<PSFPoint[]> {
  try {
    const rows = await sql<TrendRow[]>`
      SELECT
        DATE_TRUNC('month', instance_date)::text AS txn_month,
        ROUND((AVG(meter_sale_price) / 10.764)::numeric, 0) AS avg_psf,
        COUNT(*)::integer AS deals
      FROM dld_transactions
      WHERE building_name_en = ${buildingName}
        AND trans_group_en = 'Sales'
        AND meter_sale_price > 0
        AND instance_date >= NOW() - INTERVAL '24 months'
      GROUP BY txn_month
      ORDER BY txn_month ASC
    `
    return rows.map((r) => {
      const d = new Date(r.txn_month + "T00:00:00Z")
      return {
        label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
        avg_psf: Number(r.avg_psf),
        deals: Number(r.deals),
      }
    })
  } catch {
    return []
  }
}

async function fetchRecentTxns(buildingName: string): Promise<TxnRow[]> {
  try {
    return await sql<TxnRow[]>`
      SELECT
        instance_date::text,
        trans_group_en,
        rooms_en,
        ROUND(procedure_area::numeric, 0)::text AS procedure_area,
        actual_worth::text,
        ROUND((meter_sale_price / 10.764)::numeric, 0)::text AS meter_sale_price
      FROM dld_transactions
      WHERE building_name_en = ${buildingName}
        AND trans_group_en IN ('Sales', 'Mortgages')
        AND actual_worth > 0
      ORDER BY instance_date DESC
      LIMIT 12
    `
  } catch {
    return []
  }
}

async function fetchServiceCharge(area: string | null, project: string | null): Promise<ServiceRow | null> {
  if (!area && !project) return null
  try {
    const firstWord = (project ?? area ?? "").split(" ")[0]
    const rows = await sql<ServiceRow[]>`
      SELECT
        ROUND(AVG(service_cost)::numeric, 0) AS avg_cost,
        MAX(budget_year)::text AS latest_year
      FROM dld_service_charges
      WHERE service_cost > 0
        AND (
          LOWER(project_name) LIKE LOWER(${`%${firstWord}%`})
          OR LOWER(master_community_name_en) LIKE LOWER(${`%${firstWord}%`})
        )
    `
    return rows[0]?.avg_cost ? rows[0] : null
  } catch {
    return null
  }
}

export async function generateStaticParams() {
  try {
    const rows = await sql<{ global_slug: string }[]>`
      SELECT global_slug FROM re_buildings
      WHERE global_slug IS NOT NULL
      ORDER BY txn_count DESC NULLS LAST
      LIMIT 200
    `
    return rows.map((r) => ({ slug: r.global_slug.split("/") }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const globalSlug = slug.join("/")
  const b = await fetchByGlobalSlug(globalSlug)
  if (!b) return {}
  return {
    title: `${b.building_name_en} — Building Profile | North Capital DXB`,
    description: `DLD transaction history, price per sqft trend, and building data for ${b.building_name_en}${b.area_name_en ? `, ${b.area_name_en}` : ""}.`,
    alternates: { canonical: `/terminal/buildings/${globalSlug}` },
  }
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  complete: { label: "Complete", color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  under_construction: { label: "Under Construction", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" },
  planned: { label: "Planned", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  cancelled: { label: "Cancelled", color: "text-red-400 border-red-400/30 bg-red-400/10" },
}

function formatPrice(n: number | string | null) {
  const v = Number(n)
  if (!v) return "—"
  if (v >= 1_000_000) return `AED ${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `AED ${(v / 1_000).toFixed(0)}K`
  return `AED ${v}`
}

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const globalSlug = slug.join("/")

  // Redirect legacy single-segment slugs (e.g. 'marina-living--dubai-marina') to global_slug
  if (slug.length === 1 && slug[0].includes("--")) {
    const newGlobalSlug = await fetchByLegacySlug(slug[0])
    if (newGlobalSlug) {
      redirect(`/terminal/buildings/${newGlobalSlug}`)
    }
  }

  const building = await fetchByGlobalSlug(globalSlug)
  if (!building) notFound()

  const [trendData, txns, sc] = await Promise.all([
    fetchPSFTrend(building.building_name_en),
    fetchRecentTxns(building.building_name_en),
    fetchServiceCharge(building.area_name_en, building.project_name_en),
  ])

  const status = building.propsearch_status ? STATUS_MAP[building.propsearch_status] : null

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-5xl mx-auto pb-24 lg:pb-12">

      {/* Back */}
      <div className="flex items-center px-4 sm:px-0">
        <Link
          href="/terminal/buildings"
          className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Buildings Directory
        </Link>
      </div>

      {/* Header */}
      <section className="border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {building.area_name_en && (
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                  {building.area_name_en}
                </span>
              )}
              {status && (
                <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold", status.color)}>
                  {status.label}
                </span>
              )}
              {building.is_free_hold && (
                <span className="inline-flex items-center rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">
                  Freehold
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
              {building.building_name_en}
            </h1>
            {building.developer_name && (
              <p className="text-sm text-muted-foreground">
                {building.developer_name}
                {building.master_developer_name && building.master_developer_name !== building.developer_name && (
                  <span className="text-muted-foreground/50"> · {building.master_developer_name}</span>
                )}
              </p>
            )}
          </div>

          {building.completion_year && (
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <Calendar className="h-4 w-4" />
              <span className="font-mono text-lg font-bold text-foreground">{building.completion_year}</span>
            </div>
          )}
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            { label: "Floors", value: building.total_floors ?? "—", icon: Layers },
            { label: "Units", value: building.total_units ? building.total_units.toLocaleString() : "—", icon: Building2 },
            { label: "Avg PSF", value: building.avg_psf ? `AED ${Number(building.avg_psf).toLocaleString()}` : "—", icon: DollarSign },
            { label: "DLD Transactions", value: building.txn_count ? building.txn_count.toLocaleString() : "—", icon: Activity },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg bg-background border border-border/50 p-3">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <kpi.icon className="h-3 w-3" />
                {kpi.label}
              </p>
              <p className="font-mono text-base font-bold text-foreground leading-tight">{kpi.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PSF Trend Chart */}
      <div className="px-0">
        <BuildingPSFChart data={trendData} />
      </div>

      {/* Recent Transactions */}
      {txns.length > 0 && (
        <section className="rounded-md border border-border/40 bg-card/40 overflow-hidden">
          <div className="p-4 border-b border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Recent DLD Transactions
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground/70">
                  <th className="text-left px-4 py-2 font-mono text-[10px] uppercase">Date</th>
                  <th className="text-left px-4 py-2 font-mono text-[10px] uppercase">Type</th>
                  <th className="text-left px-4 py-2 font-mono text-[10px] uppercase">Bedrooms</th>
                  <th className="text-right px-4 py-2 font-mono text-[10px] uppercase">Size (sqft)</th>
                  <th className="text-right px-4 py-2 font-mono text-[10px] uppercase">Value</th>
                  <th className="text-right px-4 py-2 font-mono text-[10px] uppercase">AED/sqft</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                      {new Date(t.instance_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "font-mono text-[10px] uppercase font-semibold",
                        t.trans_group_en === "Sales" ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {t.trans_group_en}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.rooms_en ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {t.procedure_area ? Number(t.procedure_area).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground">
                      {formatPrice(t.actual_worth)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                      {t.meter_sale_price ? `${Number(t.meter_sale_price).toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Additional Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Building Info */}
        <section className="rounded-xl border border-border/50 p-5 bg-card space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
            Building Details
          </p>
          <dl className="space-y-2 text-sm">
            {[
              { label: "Type", value: building.primary_sub_type },
              { label: "Property Mix", value: building.property_types },
              { label: "Avg Unit Size", value: building.avg_unit_size_sqft ? `${Number(building.avg_unit_size_sqft).toFixed(0)} sqft` : null },
              { label: "Median PSF", value: building.median_psf ? `AED ${Number(building.median_psf).toLocaleString()}` : null },
              { label: "First Transaction", value: building.first_txn_date ? new Date(building.first_txn_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null },
              { label: "Latest Transaction", value: building.last_txn_date ? new Date(building.last_txn_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null },
              { label: "Tenure", value: building.is_free_hold ? "Freehold" : "Leasehold" },
            ].filter((d) => d.value).map((d) => (
              <div key={d.label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{d.label}</dt>
                <dd className="font-mono text-foreground text-right">{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Service Charge + Location */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border/50 p-5 bg-card space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
              Service Charge
            </p>
            {sc ? (
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">
                  AED {Number(sc.avg_cost).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">avg/year · {sc.latest_year} budget data</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No service charge data available for this building</p>
            )}
          </section>

          {building.osm_lat && building.osm_lng && (
            <section className="rounded-xl border border-border/50 p-5 bg-card space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Coordinates
              </p>
              <p className="font-mono text-sm text-foreground">
                {Number(building.osm_lat).toFixed(6)}, {Number(building.osm_lng).toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${building.osm_lat},${building.osm_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                Open in Google Maps →
              </a>
            </section>
          )}

          {building.amenities && (
            <section className="rounded-xl border border-border/50 p-5 bg-card space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
                Amenities
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{building.amenities}</p>
            </section>
          )}
        </div>
      </div>

      <p className="text-[11px] font-mono text-muted-foreground/40 px-1">
        Source: Dubai Land Department · Data refreshed daily
      </p>

    </div>
  )
}
