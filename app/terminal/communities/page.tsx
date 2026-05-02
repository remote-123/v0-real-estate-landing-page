import React from 'react'
import { terminalPageMeta } from "@/lib/terminal-metadata"
import { CommunitiesTable } from '@/components/terminal/communities-table'
import { type Community } from '@/lib/types/community'
import { sql } from '@/lib/db'
import { formatAreaName } from '@/lib/area-names'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Community Screener",
    description: "Institutional-grade metrics across every Dubai community — yield, price/sqft, transaction velocity, and supply pipeline.",
    path: "/terminal/communities",
  })
}

type CommunityRow = {
  area_name_en: string
  txn_count: number
  avg_psf: number
  avg_value: number
  mom_change: number | null
  total_units: number
  pipeline_units: number
  price_history: number[] | string | null
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function mapToCommunity(r: CommunityRow): Community {
  const totalUnits = r.total_units
  const apartments = Math.round(totalUnits * 0.78)
  return {
    slug: toSlug(r.area_name_en),
    name: formatAreaName(r.area_name_en),
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
  }
}

async function fetchCommunities(): Promise<Community[]> {
  try {
    const rows = await sql<CommunityRow[]>`
      WITH latest_month AS (
        SELECT MAX(txn_month) AS max_month FROM mv_txn_monthly_unified
      ),
      curr AS (
        SELECT
          area_name_en,
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
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0)  AS avg_psm
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
        c.txn_count::integer                                                         AS txn_count,
        ROUND((c.avg_psm / 10.764)::numeric, 0)::integer                            AS avg_psf,
        ROUND(c.avg_val::numeric, 0)::integer                                        AS avg_value,
        ROUND(((c.avg_psm - p.avg_psm) / NULLIF(p.avg_psm, 0) * 100)::numeric, 1)  AS mom_change,
        COALESCE(s.total_units, 0)::integer                                          AS total_units,
        COALESCE(s.pipeline_units, 0)::integer                                       AS pipeline_units,
        h.price_history
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
}

const FREE_ROWS = 3

export default async function CommunitiesPage() {
  const [session, allData] = await Promise.all([auth(), fetchCommunities()])
  const isAuthenticated = !!session
  const data = isAuthenticated ? allData : allData.slice(0, FREE_ROWS)

  const totalTxns = allData.reduce((s, c) => s + (c.transactions30d || 0), 0)
  const avgPsf = allData.length > 0
    ? Math.round(allData.reduce((s, c) => s + c.avgPricePerSqft, 0) / allData.length)
    : 0

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row shadow-sm border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
            <h1 className="font-mono text-xs tracking-widest text-muted-foreground uppercase font-bold">
              Community Screener — {data.length} Markets
            </h1>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Dubai Community Intelligence
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Yield, transaction velocity, supply pipeline, and price momentum across every major Dubai community. Sort any column. Click a row for a deep-dive.
          </p>
        </div>

        {/* Macro stats */}
        <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto">
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Areas Tracked</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-accent">{data.length}</p>
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

      {/* Data disclaimer */}
      <p className="text-[11px] font-mono text-muted-foreground/50 px-1">
        Source: Dubai Land Department — Feb 2026 transactions
      </p>

      {/* Table */}
      <section>
        <CommunitiesTable data={data} isAuthenticated={isAuthenticated} totalRows={allData.length} />
      </section>

    </div>
  )
}
