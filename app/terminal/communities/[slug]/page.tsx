import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Building2, TrendingUp, TrendingDown, BarChart3, Layers } from 'lucide-react'
import Link from 'next/link'
import { sql } from '@/lib/db'
import { CommunityCharts } from '@/components/terminal/community-charts'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

type AreaRow = {
  area_name_en: string
  txn_count: number
  avg_psf: number
  avg_value: number
  mom_change: number | null
  total_units: number
  pipeline_units: number
}

type PriceHistoryRow = {
  txn_month: string
  avg_psf: number
}

async function fetchAreaData(slug: string): Promise<{ area: AreaRow; history: { month: string; pricePerSqft: number }[] } | null> {
  try {
    // Get all area names to match by slug
    const areas = await sql<{ area_name_en: string }[]>`
      SELECT DISTINCT area_name_en FROM mv_txn_monthly
      WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales' AND property_type_en = 'Unit'
    `
    const match = areas.find(a => toSlug(a.area_name_en) === slug)
    if (!match) return null

    const areaName = match.area_name_en

    const [stats, history] = await Promise.all([
      sql<AreaRow[]>`
        WITH latest_month AS (
          SELECT MAX(txn_month) AS max_month FROM mv_txn_monthly
        ),
        curr AS (
          SELECT
            area_name_en,
            SUM(txn_count)                                                          AS txn_count,
            SUM(txn_count * avg_psf)  / NULLIF(SUM(txn_count), 0)                 AS avg_psm,
            SUM(txn_count * avg_value) / NULLIF(SUM(txn_count), 0)                AS avg_val
          FROM mv_txn_monthly m
          CROSS JOIN latest_month lm
          WHERE m.txn_month = lm.max_month
            AND m.trans_group_en = 'Sales'
            AND m.property_type_en = 'Unit'
            AND m.area_name_en = ${areaName}
          GROUP BY area_name_en
        ),
        prev AS (
          SELECT
            area_name_en,
            SUM(txn_count * avg_psf) / NULLIF(SUM(txn_count), 0)  AS avg_psm
          FROM mv_txn_monthly m
          CROSS JOIN latest_month lm
          WHERE m.txn_month = lm.max_month - INTERVAL '1 month'
            AND m.trans_group_en = 'Sales'
            AND m.property_type_en = 'Unit'
            AND m.area_name_en = ${areaName}
          GROUP BY area_name_en
        ),
        supply AS (
          SELECT
            area_name_en,
            SUM(COALESCE(no_of_units, 0))                                                                            AS total_units,
            SUM(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN COALESCE(no_of_units,0) ELSE 0 END) AS pipeline_units
          FROM dld_projects
          WHERE area_name_en = ${areaName}
          GROUP BY area_name_en
        )
        SELECT
          c.area_name_en,
          c.txn_count::integer                                                        AS txn_count,
          ROUND((c.avg_psm / 10.764)::numeric, 0)::integer                           AS avg_psf,
          ROUND(c.avg_val::numeric, 0)::integer                                       AS avg_value,
          ROUND(((c.avg_psm - p.avg_psm) / NULLIF(p.avg_psm, 0) * 100)::numeric, 1) AS mom_change,
          COALESCE(s.total_units, 0)::integer                                         AS total_units,
          COALESCE(s.pipeline_units, 0)::integer                                      AS pipeline_units
        FROM curr c
        LEFT JOIN prev p ON c.area_name_en = p.area_name_en
        LEFT JOIN supply s ON c.area_name_en = s.area_name_en
      `,

      sql<PriceHistoryRow[]>`
        SELECT
          txn_month,
          ROUND((SUM(txn_count * avg_psf) / NULLIF(SUM(txn_count), 0) / 10.764)::numeric, 0) AS avg_psf
        FROM mv_txn_monthly
        WHERE area_name_en = ${areaName}
          AND trans_group_en = 'Sales'
          AND property_type_en = 'Unit'
        GROUP BY txn_month
        ORDER BY txn_month DESC
        LIMIT 12
      `,
    ])

    if (!stats[0]) return null

    const priceHistory = history
      .reverse()
      .map(r => ({
        month: new Date(r.txn_month).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        pricePerSqft: Number(r.avg_psf),
      }))

    return { area: stats[0], history: priceHistory }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = await fetchAreaData(slug)
  if (!result) return {}
  const name = result.area.area_name_en
  return {
    title: `${name} — Community Intelligence | North Capital DXB`,
    description: `Price per sqft, transaction volume, and supply pipeline for ${name}, Dubai.`,
    openGraph: {
      images: [
        {
          url: '/images/terminal-communities-social.png',
          width: 1200,
          height: 630,
          alt: `${name} Community Intelligence — North Capital DXB`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/images/terminal-communities-social.png'],
    },
  }
}

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await fetchAreaData(slug)
  if (!result) notFound()

  const { area, history } = result
  const momChange = Number(area.mom_change ?? 0)
  const momColor = momChange >= 0 ? 'text-emerald-400' : 'text-red-400'

  const formatPrice = (n: number) => {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
    return `AED ${n}`
  }

  const totalUnits = area.total_units
  const aptPct = totalUnits > 0 ? Math.round(0.78 * 100) : 0
  const villaPct = 100 - aptPct

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Back */}
      <Link
        href="/terminal/communities"
        className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-4 sm:px-0"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Community Screener
      </Link>

      {/* Header */}
      <section className="border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Dubai</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">{area.area_name_en}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('font-mono text-xl font-bold', momColor)}>
              {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}% MoM
            </span>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'AED / sqft', value: new Intl.NumberFormat('en-US').format(area.avg_psf) },
            { label: 'Avg Sale Price', value: formatPrice(area.avg_value) },
            { label: 'Txns (latest month)', value: new Intl.NumberFormat('en-US').format(area.txn_count) },
            { label: 'MoM Change', value: `${momChange >= 0 ? '+' : ''}${momChange.toFixed(1)}%`, className: momColor },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-lg bg-background border border-border/50 p-3">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className={cn('font-mono text-base font-bold text-foreground leading-tight', kpi.className)}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Price history chart */}
      {history.length >= 2 && <CommunityCharts priceHistory={history} />}

      {/* Unit breakdown + Supply */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Supply pipeline */}
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Supply Pipeline</h3>
          </div>
          {area.pipeline_units > 0 ? (
            <div className="space-y-2">
              <p className="font-mono text-2xl font-bold text-yellow-400">
                +{new Intl.NumberFormat('en-US').format(area.pipeline_units)}
              </p>
              <p className="text-sm text-muted-foreground">units in active / upcoming projects</p>
              {totalUnits > 0 && (
                <p className="text-xs text-muted-foreground/60 font-mono">
                  Supply ratio: {((area.pipeline_units / totalUnits) * 100).toFixed(1)}% of existing stock
                </p>
              )}
              {totalUnits > 0 && area.pipeline_units / totalUnits > 0.15 && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 mt-2">
                  <span className="text-yellow-400 text-xs font-mono">⚠</span>
                  <p className="text-xs text-yellow-400/80">High supply incoming — monitor for yield compression risk.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="font-mono text-2xl font-bold text-emerald-400">0</p>
              <p className="text-sm text-muted-foreground">No units in the pipeline</p>
              <p className="text-xs text-muted-foreground/60 font-mono mt-1">Constrained supply supports price stability.</p>
            </div>
          )}
        </section>

        {/* Total tracked projects */}
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Project Stock</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">
                {totalUnits > 0 ? new Intl.NumberFormat('en-US').format(totalUnits) : '—'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">total units across DLD-registered projects</p>
            </div>
          </div>
        </section>
      </div>

      {/* Data note */}
      <p className="text-[11px] font-mono text-muted-foreground/40 px-1">
        Source: Dubai Land Department · Price history based on registered sales transactions · Transactions tab coming soon
      </p>

    </div>
  )
}
