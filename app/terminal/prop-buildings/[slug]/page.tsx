import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Building2, Calendar, Layers, Users2, DollarSign, Wifi } from "lucide-react"
import { sql } from "@/lib/db"
import { getTerminalSiteInfo } from "@/lib/terminal-metadata"
import { cn } from "@/lib/utils"

export const revalidate = 86400

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const rows = await sql<{ building_slug: string }[]>`
      SELECT building_slug FROM prop_building_details WHERE building_slug IS NOT NULL
    `
    return rows.map(r => ({ slug: r.building_slug }))
  } catch { return [] }
}

type Building = {
  building_slug: string
  area_slug: string | null
  area_name: string | null
  name: string | null
  developer: string | null
  master_developer: string | null
  building_type: string | null
  status: string | null
  completion_year: number | null
  total_floors: number | null
  total_units: number | null
  property_types: string | null
  amenities: string | null
  is_freehold: boolean | null
  service_charge_psf: string | null
  project_value_aed: string | null
  description: string | null
}

async function fetchBuilding(slug: string): Promise<Building | null> {
  try {
    const rows = await sql<Building[]>`
      SELECT
        pbd.*,
        COALESCE(pa.name, pbd.area_slug) AS area_name
      FROM prop_building_details pbd
      LEFT JOIN prop_areas pa ON pbd.area_slug = pa.slug
      WHERE pbd.building_slug = ${slug}
      LIMIT 1
    `
    return rows[0] ?? null
  } catch { return null }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [b, { siteName, base }] = await Promise.all([fetchBuilding(slug), getTerminalSiteInfo()])
  if (!b) return {}
  const displayName = b.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const areaLabel = b.area_name ? `, ${b.area_name}` : ''
  return {
    title: `${displayName}${areaLabel} | ${siteName}`,
    description: b.description
      ? b.description.slice(0, 155)
      : `Building profile for ${displayName}${areaLabel}, Dubai — completion year, developer, floors, units, and amenities.`,
    metadataBase: new URL(base),
    alternates: { canonical: `${base}/terminal/prop-buildings/${slug}` },
    openGraph: {
      title: `${displayName}${areaLabel} | ${siteName}`,
      description: `Floors: ${b.total_floors ?? '—'} · Units: ${b.total_units ?? '—'} · Built: ${b.completion_year ?? '—'}`,
      url: `${base}/terminal/prop-buildings/${slug}`,
      siteName,
    },
  }
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  complete:           { label: 'Complete',            color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  under_construction: { label: 'Under Construction',  color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  planned:            { label: 'Planned',              color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  cancelled:          { label: 'Cancelled',            color: 'text-red-400 border-red-400/30 bg-red-400/10' },
}

const CURRENT_YEAR = 2026

export default async function PropBuildingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const building = await fetchBuilding(slug)
  if (!building) notFound()

  const displayName = building.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const status = building.status ? STATUS_MAP[building.status] : null
  const age = building.completion_year ? CURRENT_YEAR - building.completion_year : null

  const amenityList = building.amenities
    ? building.amenities.split(',').map(a => a.trim()).filter(Boolean)
    : []

  const propertyTypeList = building.property_types
    ? building.property_types.split(',').map(t => t.trim()).filter(Boolean)
    : []

  const projectValue = building.project_value_aed ? BigInt(building.project_value_aed) : null
  const projectValueStr = projectValue
    ? projectValue >= 1_000_000_000n
      ? `AED ${(Number(projectValue) / 1_000_000_000).toFixed(2)}B`
      : `AED ${(Number(projectValue) / 1_000_000).toFixed(0)}M`
    : null

  // Schema.org
  const schema = {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    "name": displayName,
    ...(building.description && { "description": building.description }),
    ...(building.area_name && {
      "address": {
        "@type": "PostalAddress",
        "streetAddress": displayName,
        "addressLocality": building.area_name,
        "addressRegion": "Dubai",
        "addressCountry": "AE",
      },
    }),
    ...(building.developer && { "creator": { "@type": "Organization", "name": building.developer } }),
    ...(building.completion_year && { "yearBuilt": building.completion_year }),
    ...(building.total_floors && { "numberOfFloors": building.total_floors }),
    ...(building.total_units && { "numberOfAccommodationUnits": building.total_units }),
    ...(building.is_freehold && {
      "amenityFeature": [{ "@type": "LocationFeatureSpecification", "name": "Freehold", "value": true }],
    }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-5 max-w-5xl mx-auto pb-24 lg:pb-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 px-4 sm:px-0 text-xs font-mono text-muted-foreground">
          <Link href="/terminal/prop-buildings" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Prop Buildings
          </Link>
          {building.area_name && (
            <>
              <span className="opacity-40">/</span>
              <Link
                href={`/terminal/prop-buildings?area=${building.area_slug}`}
                className="hover:text-foreground transition-colors"
              >
                {building.area_name}
              </Link>
            </>
          )}
        </div>

        {/* Header card */}
        <section className="border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {building.area_name && (
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                {building.area_name}
              </span>
            )}
            {status && (
              <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold', status.color)}>
                {status.label}
              </span>
            )}
            {building.is_freehold !== null && (
              <span className={cn(
                'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                building.is_freehold
                  ? 'text-accent border-accent/30 bg-accent/10'
                  : 'text-muted-foreground border-border/40 bg-muted/30'
              )}>
                {building.is_freehold ? 'Freehold' : 'Leasehold'}
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              {displayName}
            </h1>
            {building.developer && (
              <p className="mt-1 text-sm text-muted-foreground">
                {building.developer}
                {building.master_developer && building.master_developer !== building.developer && (
                  <span className="text-muted-foreground/50"> · {building.master_developer}</span>
                )}
              </p>
            )}
            {building.building_type && (
              <p className="mt-0.5 text-xs font-mono text-muted-foreground/60 uppercase tracking-wide">
                {building.building_type}
              </p>
            )}
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {[
              {
                label: 'Floors',
                value: building.total_floors ?? '—',
                icon: Layers,
                highlight: false,
              },
              {
                label: 'Units',
                value: building.total_units ? building.total_units.toLocaleString() : '—',
                icon: Building2,
                highlight: false,
              },
              {
                label: 'Year Built',
                value: building.completion_year
                  ? `${building.completion_year}${age !== null && age >= 0 ? ` (${age === 0 ? 'new' : `${age} yrs`})` : ''}`
                  : '—',
                icon: Calendar,
                highlight: !!building.completion_year,
              },
              {
                label: 'Project Value',
                value: projectValueStr ?? '—',
                icon: DollarSign,
                highlight: !!projectValueStr,
              },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-lg bg-background border border-border/50 p-3">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <kpi.icon className="h-3 w-3" />
                  {kpi.label}
                </p>
                <p className={cn(
                  'font-mono text-sm sm:text-base font-bold leading-tight',
                  kpi.highlight ? 'text-foreground' : 'text-foreground/60'
                )}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Two-column content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Description */}
          {building.description && (
            <section className="sm:col-span-2 rounded-xl border border-border/50 bg-card p-5 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">About</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{building.description}</p>
            </section>
          )}

          {/* Property types */}
          {propertyTypeList.length > 0 && (
            <section className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold flex items-center gap-1">
                <Users2 className="h-3 w-3" /> Unit Mix
              </p>
              <div className="flex flex-wrap gap-2">
                {propertyTypeList.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-md border border-border/50 bg-muted/30 px-2.5 py-1 font-mono text-xs font-semibold text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Amenities */}
          {amenityList.length > 0 && (
            <section className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Amenities
              </p>
              <div className="flex flex-wrap gap-2">
                {amenityList.map(a => (
                  <span
                    key={a}
                    className="inline-flex items-center rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1 font-mono text-xs text-accent/80"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Building details */}
          <section className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
              Details
            </p>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Area',       value: building.area_name },
                { label: 'Type',       value: building.building_type },
                { label: 'Status',     value: status?.label },
                { label: 'Developer',  value: building.developer },
                { label: 'Completed',  value: building.completion_year?.toString() },
                { label: 'Tenure',     value: building.is_freehold === true ? 'Freehold' : building.is_freehold === false ? 'Leasehold' : null },
              ].filter(d => d.value).map(d => (
                <div key={d.label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground shrink-0">{d.label}</dt>
                  <dd className="font-mono text-foreground text-right">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Service charge */}
          {building.service_charge_psf && (
            <section className="rounded-xl border border-border/50 bg-card p-5 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
                Service Charge
              </p>
              <p className="font-mono text-2xl font-bold text-foreground">
                AED {Number(building.service_charge_psf).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">per sqft / year</p>
            </section>
          )}

        </div>

        <p className="text-[11px] font-mono text-muted-foreground/40 px-1">
          Source: propsearch.ae · Data may not reflect latest changes
        </p>

      </div>
    </>
  )
}
