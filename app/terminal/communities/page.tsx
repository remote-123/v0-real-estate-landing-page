import React from 'react'
import { terminalPageMeta } from "@/lib/terminal-metadata"
import { CommunitiesTable } from '@/components/terminal/communities-table'
import { type Community } from '@/lib/types/community'
import { sql } from '@/lib/db'
import { unstable_cache } from 'next/cache'
import { formatAreaName } from '@/lib/area-names'
import { auth } from '@/auth'
import { isTerminalUnlocked } from '@/lib/terminal-gate'
import Link from 'next/link'
import { DUBAI_COMMUNITIES, FEATURED_COMMUNITIES, type DubaiCommunity } from '@/lib/area-data/dubai-communities'
import { TrendingUp, Zap, BarChart3 } from 'lucide-react'
import { StatCard } from '@/components/terminal/stat-card'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Community Screener",
    description: "Institutional-grade metrics across every Dubai community — price/sqft, transaction velocity, supply pipeline, and momentum signals. Identify breakout areas before wider coverage.",
    path: "/terminal/communities",
  })
}

type CommunityRow = {
  area_name_en: string
  nc_display_name: string | null
  nc_slug: string | null
  txn_count: number
  avg_psf: number
  avg_value: number
  mom_change: number | null
  total_units: number
  pipeline_units: number
  price_history: number[] | string | null
  price_mom_pct: number | null
  vol_mom_pct: number | null
  momentum_score: number | null
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function mapToCommunity(r: CommunityRow): Community {
  const totalUnits = r.total_units
  const apartments = Math.round(totalUnits * 0.78)
  return {
    slug: r.nc_slug ?? toSlug(r.area_name_en),
    name: r.nc_display_name ?? formatAreaName(r.area_name_en),
    area: '',
    type: 'mixed',
    isFreehold: true,
    avgPricePerSqft: r.avg_psf,
    medianPrice: r.avg_value,
    totalUnits,
    apartments,
    villas: totalUnits - apartments,
    grossYield: 0,
    transactions30d: r.txn_count,
    upcomingSupply: r.pipeline_units,
    momChange: r.mom_change ?? 0,
    avgDaysOnMarket: 0,
    priceHistory: r.price_history ? (typeof r.price_history === 'string' ? JSON.parse(r.price_history) : r.price_history) : undefined,
    priceMomPct: Number(r.price_mom_pct ?? 0),
    volMomPct: Number(r.vol_mom_pct ?? 0),
    momentumScore: Number(r.momentum_score ?? 0),
  }
}

const fetchCommunities = unstable_cache(
  async (): Promise<Community[]> => {
  try {
    const rows = await sql<CommunityRow[]>`
      WITH latest_month AS (
        SELECT MAX(txn_month) AS max_month FROM mv_txn_monthly_unified
      ),
      curr AS (
        SELECT
          area_name_en,
          MAX(nc_display_name) AS nc_display_name,
          MAX(nc_slug)         AS nc_slug,
          SUM(txn_count)                                                             AS txn_count,
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0)               AS avg_psm,
          SUM(txn_count * avg_price)     / NULLIF(SUM(txn_count), 0)               AS avg_val
        FROM mv_txn_monthly_unified m
        CROSS JOIN latest_month lm
        WHERE m.txn_month = lm.max_month
          AND m.trans_group_en = 'Sales'
          AND m.property_type_en = 'Unit'
          AND m.area_name_en IS NOT NULL
        GROUP BY area_name_en
      ),
      prev AS (
        SELECT
          area_name_en,
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS avg_psm,
          SUM(txn_count) AS prev_vol
        FROM mv_txn_monthly_unified m
        CROSS JOIN latest_month lm
        WHERE m.txn_month = lm.max_month - INTERVAL '1 month'
          AND m.trans_group_en = 'Sales'
          AND m.property_type_en = 'Unit'
          AND m.area_name_en IS NOT NULL
        GROUP BY area_name_en
      ),
      supply AS (
        SELECT
          area_name_en,
          SUM(COALESCE(no_of_units, 0))                                                                       AS total_units,
          SUM(CASE WHEN project_status IN ('ACTIVE','NOT_STARTED','PENDING') THEN COALESCE(no_of_units,0) ELSE 0 END) AS pipeline_units
        FROM dld_projects
        WHERE area_name_en IS NOT NULL
        GROUP BY area_name_en
      ),
      history AS (
        SELECT
          area_name_en,
          json_agg(ROUND((avg_psm / 10.764)::numeric, 0)::integer ORDER BY txn_month ASC) as price_history
        FROM (
          SELECT
            m.area_name_en,
            m.txn_month,
            SUM(m.txn_count * m.avg_price_sqm) / NULLIF(SUM(m.txn_count), 0) AS avg_psm
          FROM mv_txn_monthly_unified m
          CROSS JOIN latest_month lm
          WHERE m.txn_month >= lm.max_month - INTERVAL '11 months'
            AND m.trans_group_en = 'Sales'
            AND m.property_type_en = 'Unit'
            AND m.area_name_en IS NOT NULL
          GROUP BY m.area_name_en, m.txn_month
        ) sub
        GROUP BY area_name_en
      )
      SELECT
        c.area_name_en,
        c.nc_display_name,
        c.nc_slug,
        c.txn_count::integer                                                         AS txn_count,
        ROUND((c.avg_psm / 10.764)::numeric, 0)::integer                            AS avg_psf,
        ROUND(c.avg_val::numeric, 0)::integer                                        AS avg_value,
        ROUND(((c.avg_psm - p.avg_psm) / NULLIF(p.avg_psm, 0) * 100)::numeric, 1)  AS mom_change,
        COALESCE(s.total_units, 0)::integer                                          AS total_units,
        COALESCE(s.pipeline_units, 0)::integer                                       AS pipeline_units,
        h.price_history,
        ROUND(((c.avg_psm - p.avg_psm) / NULLIF(p.avg_psm, 0) * 100)::numeric, 2)  AS price_mom_pct,
        ROUND(((c.txn_count::numeric - p.prev_vol) / NULLIF(p.prev_vol, 0) * 100)::numeric, 1) AS vol_mom_pct,
        ROUND((
          COALESCE((c.avg_psm - p.avg_psm) / NULLIF(p.avg_psm, 0), 0)
          + COALESCE((c.txn_count::numeric - p.prev_vol) / NULLIF(p.prev_vol, 0), 0)
        ) * 50, 1) AS momentum_score
      FROM curr c
      LEFT JOIN prev p ON c.area_name_en = p.area_name_en
      LEFT JOIN supply s ON c.area_name_en = s.area_name_en
      LEFT JOIN history h ON c.area_name_en = h.area_name_en
      WHERE c.txn_count >= 5
        AND c.avg_psm > 0
      ORDER BY c.txn_count DESC
      LIMIT 80
    `
    return rows.map(mapToCommunity)
  } catch {
    return []
  }
  },
  ['communities-data'],
  { revalidate: 3600 }
)

const FREE_ROWS = 3

const SECTOR_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function SectorBadge({ sector }: { sector: number }) {
  const colors: Record<number, string> = {
    1: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    2: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    3: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    4: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    5: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    6: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    7: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    8: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    9: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono border ${colors[sector] ?? ''}`}>
      S{sector}
    </span>
  )
}

interface SectorSectionProps {
  sector: number
  communities: DubaiCommunity[]
  liveDataSlugs: Set<string>
}

function SectorSection({ sector, communities, liveDataSlugs }: SectorSectionProps) {
  if (communities.length === 0) return null
  const sectorName = communities[0].sectorName

  return (
    <section>
      <div className="flex items-center gap-3 mb-3 px-1">
        <SectorBadge sector={sector} />
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {sectorName}
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground/50">
          {communities.length} communities
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
        {communities.map(community => {
          const hasLive = liveDataSlugs.has(community.slug)
          return (
            <Link
              key={community.code}
              href={`/terminal/communities/${community.slug}`}
              className="group rounded-lg border border-border/40 bg-card/40 hover:bg-card hover:border-border/80 transition-all p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between gap-1">
                <p className="font-mono text-xs font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                  {community.name}
                </p>
                {hasLive && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-auto">
                {community.population > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(community.population)} pop
                  </span>
                )}
                <span className="font-mono text-[10px] text-muted-foreground">
                  {community.area_km2} km²
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default async function CommunitiesPage() {
  const [session, allData] = await Promise.all([auth(), fetchCommunities()])
  const isAuthenticated = await isTerminalUnlocked(session)
  const data = isAuthenticated ? allData : allData.slice(0, FREE_ROWS)

  const totalTxns = allData.reduce((s, c) => s + (c.transactions30d || 0), 0)
  const avgPsf = allData.length > 0
    ? Math.round(allData.reduce((s, c) => s + c.avgPricePerSqft, 0) / allData.length)
    : 0

  // Momentum stats
  const breakouts = allData.filter(a => a.priceMomPct > 2 && a.volMomPct > 5).length
  const avgPriceMom = allData.length > 0
    ? allData.reduce((s, a) => s + a.priceMomPct, 0) / allData.length
    : 0
  const topMomentum = allData.reduce((max, a) => a.momentumScore > max.score ? { name: a.name, score: a.momentumScore } : max, { name: '—', score: 0 })

  // Build set of slugs that have live DLD data
  const liveDataSlugs = new Set(allData.map(c => c.slug))

  // Group featured communities by sector
  const bySector = new Map<number, DubaiCommunity[]>()
  for (const community of FEATURED_COMMUNITIES) {
    if (!bySector.has(community.sector)) bySector.set(community.sector, [])
    bySector.get(community.sector)!.push(community)
  }

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row shadow-sm border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
            <h1 className="font-mono text-xs tracking-widest text-muted-foreground uppercase font-bold">
              Community Screener — {DUBAI_COMMUNITIES.length} Mapped · {allData.length} Live Markets
            </h1>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Dubai Community Intelligence
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            All 224 Dubai municipalities with census data, plus live DLD transaction metrics for active markets. Sort any column. Click a row for a deep-dive.
          </p>
        </div>

        {/* Macro stats */}
        <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto">
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Total Communities</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-accent">{DUBAI_COMMUNITIES.length}</p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Avg AED/sqft</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-accent">
              {avgPsf.toLocaleString()}
            </p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Txns (30d)</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-foreground">
              {new Intl.NumberFormat('en-US').format(totalTxns)}
            </p>
          </div>
        </div>
      </section>

      {/* Momentum stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-0">
        <StatCard
          label="Breakouts"
          value={breakouts.toString()}
          icon={Zap}
          description="Areas: price >+2% AND vol >+5% MoM"
        />
        <StatCard
          label="Avg Price MoM"
          value={`${avgPriceMom > 0 ? '+' : ''}${avgPriceMom.toFixed(2)}%`}
          icon={TrendingUp}
          description={`Across ${allData.length} active areas`}
        />
        <StatCard
          label="Top Momentum"
          value={topMomentum.score.toFixed(1)}
          icon={BarChart3}
          description={topMomentum.name}
        />
      </div>

      {/* Data disclaimer */}
      <p className="text-[11px] font-mono text-muted-foreground/50 px-1">
        Source: Dubai Land Department transactions · Census data: Dubai Statistics Centre 2021/2022
      </p>

      {/* Live data table */}
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Live Data Markets — {allData.length} communities with recent DLD transactions
          </p>
        </div>
        <CommunitiesTable data={data} isAuthenticated={isAuthenticated} totalRows={allData.length} />
      </section>

      {/* Sector-organized full directory */}
      <section className="space-y-6 pt-2">
        <div className="flex items-center gap-2 px-1">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            All Communities by Sector
          </p>
          <span className="font-mono text-[10px] text-muted-foreground/50">
            — {FEATURED_COMMUNITIES.length} with population data
          </span>
        </div>
        <div className="space-y-8">
          {SECTOR_ORDER.map(sector => (
            <SectorSection
              key={sector}
              sector={sector}
              communities={bySector.get(sector) ?? []}
              liveDataSlugs={liveDataSlugs}
            />
          ))}
        </div>
      </section>

    </div>
  )
}
