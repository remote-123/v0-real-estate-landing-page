import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, BarChart3, Layers } from 'lucide-react'
import Link from 'next/link'
import { sql } from '@/lib/db'
import { CommunityCharts, type MultiPricePoint } from '@/components/terminal/community-charts'
import { CommunityFilters } from '@/components/terminal/community-filters'
import { EmailCaptureWidget } from '@/components/terminal/email-capture-widget'
import { cn } from '@/lib/utils'
import { Suspense } from 'react'
import { formatAreaName } from '@/lib/area-names'

export const dynamic = 'force-dynamic'

type TypeFilter = 'flat' | 'villa'

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
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

type RoomHistoryRow = {
  txn_month: string
  room_label: string
  avg_psf: number
}

// Map DB room label → chart key
const ROOM_KEY: Record<string, string> = {
  'Studio': 'studio',
  '1 BR':   '1br',
  '2 BR':   '2br',
  '3 BR':   '3br',
  '4 BR+':  '4br',
  'Villa':  'all',
}

async function fetchAreaData(
  slug: string,
  type: TypeFilter,
): Promise<{
  area: AreaRow
  history: MultiPricePoint[]
  noData: boolean
  serviceChargeAvg: number | null
  distressCount: number
  topProjects: { project_name_en: string; no_of_units: number; project_status: string }[]
} | null> {
  try {
    // Type-agnostic discovery — don't 404 just because the type has no data
    const areas = await sql<{ area_name_en: string }[]>`
      SELECT DISTINCT area_name_en FROM mv_txn_monthly
      WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
    `
    const match = areas.find(a => toSlug(a.area_name_en) === slug)
    if (!match) return null

    const areaName = match.area_name_en
    const firstWord = areaName.split(' ')[0]

    const typeCond = type === 'flat'
      ? sql`AND m.property_type_en = 'Unit' AND m.property_sub_type_en = 'Flat'`
      : sql`AND m.property_type_en = 'Villa'`

    const [stats, roomHistory, scRows, distressRows, topProjectRows] = await Promise.all([
      // KPI stats (aggregate over all rooms)
      sql<AreaRow[]>`
        WITH latest_month AS (
          SELECT MAX(txn_month) AS max_month FROM mv_txn_monthly
        ),
        curr AS (
          SELECT
            m.area_name_en,
            SUM(m.txn_count)                                                       AS txn_count,
            SUM(m.txn_count * m.avg_price_sqm) / NULLIF(SUM(m.txn_count), 0)      AS avg_psm,
            SUM(m.txn_count * m.avg_price)     / NULLIF(SUM(m.txn_count), 0)      AS avg_val
          FROM mv_txn_monthly m
          CROSS JOIN latest_month lm
          WHERE m.txn_month = lm.max_month
            AND m.trans_group_en = 'Sales'
            AND m.area_name_en = ${areaName}
            ${typeCond}
          GROUP BY m.area_name_en
        ),
        prev AS (
          SELECT
            m.area_name_en,
            SUM(m.txn_count * m.avg_price_sqm) / NULLIF(SUM(m.txn_count), 0) AS avg_psm
          FROM mv_txn_monthly m
          CROSS JOIN latest_month lm
          WHERE m.txn_month = lm.max_month - INTERVAL '1 month'
            AND m.trans_group_en = 'Sales'
            AND m.area_name_en = ${areaName}
            ${typeCond}
          GROUP BY m.area_name_en
        ),
        supply AS (
          SELECT
            area_name_en,
            SUM(COALESCE(no_of_units, 0))                                                                               AS total_units,
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

      // Multi-room price history in one query
      type === 'flat'
        ? sql<RoomHistoryRow[]>`
            SELECT
              txn_month,
              CASE
                WHEN rooms_en = 'Studio'                                        THEN 'Studio'
                WHEN rooms_en = '1 B/R'                                         THEN '1 BR'
                WHEN rooms_en = '2 B/R'                                         THEN '2 BR'
                WHEN rooms_en = '3 B/R'                                         THEN '3 BR'
                WHEN rooms_en IN ('4 B/R','5 B/R','6 B/R','PENTHOUSE')         THEN '4 BR+'
              END AS room_label,
              ROUND((SUM(m.txn_count * m.avg_price_sqm) / NULLIF(SUM(m.txn_count), 0) / 10.764)::numeric, 0) AS avg_psf
            FROM mv_txn_monthly m
            WHERE m.area_name_en = ${areaName}
              AND m.trans_group_en = 'Sales'
              AND m.property_type_en = 'Unit'
              AND m.property_sub_type_en = 'Flat'
              AND m.rooms_en IN ('Studio','1 B/R','2 B/R','3 B/R','4 B/R','5 B/R','6 B/R','PENTHOUSE')
            GROUP BY txn_month, room_label
            ORDER BY txn_month DESC
            LIMIT 120
          `
        : sql<RoomHistoryRow[]>`
            SELECT
              txn_month,
              'Villa' AS room_label,
              ROUND((SUM(m.txn_count * m.avg_price_sqm) / NULLIF(SUM(m.txn_count), 0) / 10.764)::numeric, 0) AS avg_psf
            FROM mv_txn_monthly m
            WHERE m.area_name_en = ${areaName}
              AND m.trans_group_en = 'Sales'
              AND m.property_type_en = 'Villa'
            GROUP BY txn_month, room_label
            ORDER BY txn_month DESC
            LIMIT 24
          `,

      // Service charge avg for this area
      sql<{ avg_cost: string }[]>`
        SELECT ROUND(AVG(service_cost)::numeric, 0) AS avg_cost
        FROM dld_service_charges
        WHERE service_cost > 0
          AND LOWER(master_community_name_en) LIKE LOWER(${`%${firstWord}%`})
      `,

      // Distress listings count — graceful fallback if table doesn't exist
      sql<{ cnt: string }[]>`
        SELECT COUNT(*)::integer AS cnt
        FROM distress_listings
        WHERE LOWER(area_name) LIKE LOWER(${`%${firstWord}%`})
          AND disappeared_at IS NULL
      `.catch(() => [{ cnt: '0' }]),

      // Top pipeline projects
      sql<{ project_name_en: string; no_of_units: string; project_status: string }[]>`
        SELECT project_name_en, COALESCE(no_of_units, 0) AS no_of_units, project_status
        FROM dld_projects
        WHERE area_name_en = ${areaName}
          AND project_status IN ('ACTIVE','NOT_STARTED','PENDING')
        ORDER BY no_of_units DESC
        LIMIT 5
      `,
    ])

    // Graceful no-data: area exists but no transactions for this type
    const area: AreaRow = stats[0] ?? {
      area_name_en: areaName,
      txn_count: 0,
      avg_psf: 0,
      avg_value: 0,
      mom_change: null,
      total_units: 0,
      pipeline_units: 0,
    }

    // Pivot room history into { month, studio, 1br, 2br, ... }
    const monthMap = new Map<string, MultiPricePoint>()
    for (const row of [...roomHistory].reverse()) {
      const month = new Date(row.txn_month).toLocaleString('en-US', { month: 'short', year: '2-digit' })
      if (!monthMap.has(month)) monthMap.set(month, { month })
      const key = ROOM_KEY[row.room_label]
      if (key) monthMap.get(month)![key] = Number(row.avg_psf)
    }
    const history = Array.from(monthMap.values())

    const serviceChargeAvg = scRows[0]?.avg_cost ? Number(scRows[0].avg_cost) : null
    const distressCount = Number(distressRows[0]?.cnt ?? 0)
    const topProjects = topProjectRows.map(r => ({
      project_name_en: r.project_name_en,
      no_of_units: Number(r.no_of_units),
      project_status: r.project_status,
    }))

    return { area, history, noData: !stats[0], serviceChargeAvg, distressCount, topProjects }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = await fetchAreaData(slug, 'flat')
  if (!result) return {}
  const name = formatAreaName(result.area.area_name_en)
  return {
    title: `${name} — Community Intelligence | North Capital DXB`,
    description: `Price per sqft, transaction volume, and supply pipeline for ${name}, Dubai.`,
    openGraph: {
      images: [{ url: '/images/terminal-communities-social.png', width: 1200, height: 630, alt: `${name} Community Intelligence — North Capital DXB` }],
    },
    twitter: { card: 'summary_large_image', images: ['/images/terminal-communities-social.png'] },
  }
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { slug } = await params
  const sp = await searchParams
  const type: TypeFilter = sp.type === 'villa' ? 'villa' : 'flat'

  const result = await fetchAreaData(slug, type)
  if (!result) notFound()

  const { area, history, noData, serviceChargeAvg, distressCount, topProjects } = result
  const momChange = Number(area.mom_change ?? 0)
  const momColor = momChange >= 0 ? 'text-emerald-400' : 'text-red-400'

  const formatPrice = (n: number) => {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
    return `AED ${n}`
  }

  const displayName = formatAreaName(area.area_name_en)

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      <div className="flex items-center px-4 sm:px-0">
        <Link
          href="/terminal/communities"
          className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Community Screener
        </Link>
      </div>

      <section className="border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Dubai</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">{displayName}</h1>
          </div>
          {!noData && (
            <div className="flex items-center gap-2">
              <span className={cn('font-mono text-xl font-bold', momColor)}>
                {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}% MoM
              </span>
            </div>
          )}
        </div>

        <Suspense fallback={null}>
          <CommunityFilters selectedType={type} />
        </Suspense>

        {noData ? (
          <p className="font-mono text-sm text-muted-foreground py-2">
            No {type === 'flat' ? 'flat' : 'villa'} sales recorded in this area.{' '}
            <Link
              href={`?type=${type === 'flat' ? 'villa' : 'flat'}`}
              className="text-emerald-400 hover:underline"
            >
              Try {type === 'flat' ? 'Villa' : 'Flat'}
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'AED / sqft', value: formatNum(area.avg_psf) },
              { label: 'Avg Sale Price', value: formatPrice(area.avg_value) },
              { label: 'Txns (latest month)', value: formatNum(area.txn_count) },
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
        )}
      </section>

      {history.length >= 2 && <CommunityCharts priceHistory={history} type={type} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Supply Pipeline — with top projects list */}
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Supply Pipeline</h3>
          </div>
          {area.pipeline_units > 0 ? (
            <div className="space-y-3">
              <div>
                <p className="font-mono text-2xl font-bold text-yellow-400">
                  +{formatNum(area.pipeline_units)}
                </p>
                <p className="text-sm text-muted-foreground">units in active / upcoming projects</p>
                {area.total_units > 0 && (
                  <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                    Supply ratio: {((area.pipeline_units / area.total_units) * 100).toFixed(1)}% of existing stock
                  </p>
                )}
                {area.total_units > 0 && area.pipeline_units / area.total_units > 0.15 && (
                  <div className="flex items-start gap-2 rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 mt-2">
                    <span className="text-yellow-400 text-xs font-mono">⚠</span>
                    <p className="text-xs text-yellow-400/80">High supply incoming — monitor for yield compression risk.</p>
                  </div>
                )}
              </div>
              {topProjects.length > 0 && (
                <ul className="space-y-1.5 border-t border-border/30 pt-3">
                  {topProjects.map(p => (
                    <li key={p.project_name_en} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[200px]">{p.project_name_en}</span>
                      <span className="font-mono text-foreground ml-2 shrink-0">{formatNum(p.no_of_units)} units</span>
                    </li>
                  ))}
                </ul>
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

        {/* Holding Costs */}
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Holding Costs</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Avg Service Charge / yr</p>
              <p className="font-mono text-xl font-bold text-foreground">
                {serviceChargeAvg ? `AED ${formatNum(serviceChargeAvg)}` : '—'}
              </p>
              {!serviceChargeAvg && (
                <p className="text-xs text-muted-foreground/60 font-mono mt-1">No service charge data in DLD registry.</p>
              )}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Active Distress Listings</p>
              <p className={cn('font-mono text-xl font-bold', distressCount > 0 ? 'text-accent' : 'text-muted-foreground')}>
                {distressCount}
              </p>
              {distressCount > 0 && (
                <Link
                  href={`/terminal/distress-deals?area=${encodeURIComponent(displayName)}`}
                  className="text-[11px] text-emerald-400 hover:underline font-mono mt-1 block"
                >
                  View distress deals for {displayName} →
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Email capture — area-specific lead intent */}
      <div className="px-0">
        <EmailCaptureWidget
          source="community-page"
          areaInterest={displayName}
          label={`Get alerts for ${displayName}`}
        />
      </div>

      <p className="text-[11px] font-mono text-muted-foreground/40 px-1">
        Source: Dubai Land Department · Price history based on registered sales transactions
      </p>

    </div>
  )
}
