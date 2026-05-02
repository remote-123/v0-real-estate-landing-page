import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, BarChart3, Building2, Layers, TrendingUp } from "lucide-react"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"
import { EmailCaptureWidget } from "@/components/terminal/email-capture-widget"

export const dynamic = "force-dynamic"

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n}`
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

type SparkPoint = { month: string; avg_psf: number }

interface AreaDeepDiveData {
  area_name_en: string
  avg_psf: number
  prev_avg_psf: number | null
  pipeline_units: number
  distress_count: number
  price_history: SparkPoint[]
  service_charge_avg: number | null
  top_projects: { project_name_en: string; no_of_units: number; project_status: string }[]
}

async function fetchAreaData(slug: string): Promise<AreaDeepDiveData | null> {
  try {
    // Resolve slug → DLD area name
    const areas = await sql<{ area_name_en: string }[]>`
      SELECT DISTINCT area_name_en
      FROM mv_txn_monthly
      WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
      ORDER BY area_name_en
      LIMIT 200
    `
    const match = areas.find((a) => toSlug(a.area_name_en) === slug)
    if (!match) return null

    const areaName = match.area_name_en

    const [psfRows, historyRows, pipelineRows, scRows, distressRows] = await Promise.all([
      // Current + prev month avg PSF
      sql<{ avg_psf: string; prev_psf: string | null }[]>`
        WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly),
        curr AS (
          SELECT SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly, latest
          WHERE txn_month = latest.m AND trans_group_en = 'Sales' AND area_name_en = ${areaName}
        ),
        prev AS (
          SELECT SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly, latest
          WHERE txn_month = latest.m - INTERVAL '1 month' AND trans_group_en = 'Sales' AND area_name_en = ${areaName}
        )
        SELECT
          ROUND((curr.psm / 10.764)::numeric, 0) AS avg_psf,
          ROUND((prev.psm / 10.764)::numeric, 0) AS prev_psf
        FROM curr, prev
      `,

      // 12-month price history
      sql<{ txn_month: string; avg_psf: string }[]>`
        SELECT
          txn_month,
          ROUND((SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) / 10.764)::numeric, 0) AS avg_psf
        FROM mv_txn_monthly
        WHERE area_name_en = ${areaName}
          AND trans_group_en = 'Sales'
          AND txn_month >= NOW() - INTERVAL '12 months'
        GROUP BY txn_month
        ORDER BY txn_month ASC
      `,

      // Pipeline from dld_projects
      sql<{ project_name_en: string; no_of_units: string; project_status: string }[]>`
        SELECT project_name_en, COALESCE(no_of_units, 0) AS no_of_units, project_status
        FROM dld_projects
        WHERE area_name_en = ${areaName}
          AND project_status IN ('ACTIVE','NOT_STARTED','PENDING')
        ORDER BY no_of_units DESC
        LIMIT 5
      `,

      // Service charge avg for this area (community name fuzzy match)
      sql<{ avg_cost: string }[]>`
        SELECT ROUND(AVG(service_cost)::numeric, 0) AS avg_cost
        FROM dld_service_charges
        WHERE service_cost > 0
          AND LOWER(master_community_name_en) LIKE LOWER(${`%${areaName.split(" ")[0]}%`})
      `,

      // Distress listings count — graceful fallback if table doesn't exist
      sql<{ cnt: string }[]>`
        SELECT COUNT(*)::integer AS cnt
        FROM distress_listings
        WHERE LOWER(area_name) LIKE LOWER(${`%${areaName.split(" ")[0]}%`})
          AND disappeared_at IS NULL
      `.catch(() => [{ cnt: "0" }]),
    ])

    const avgPsf = Number(psfRows[0]?.avg_psf ?? 0)
    const prevAvgPsf = psfRows[0]?.prev_psf ? Number(psfRows[0].prev_psf) : null

    const history: SparkPoint[] = historyRows.map((r) => ({
      month: new Date(r.txn_month).toLocaleString("en-US", { month: "short", year: "2-digit" }),
      avg_psf: Number(r.avg_psf),
    }))

    const pipelineUnits = pipelineRows.reduce((s, r) => s + Number(r.no_of_units), 0)
    const topProjects = pipelineRows.map((r) => ({
      project_name_en: r.project_name_en,
      no_of_units: Number(r.no_of_units),
      project_status: r.project_status,
    }))

    const scAvg = scRows[0]?.avg_cost ? Number(scRows[0].avg_cost) : null
    const distressCount = Number(distressRows[0]?.cnt ?? 0)

    return {
      area_name_en: areaName,
      avg_psf: avgPsf,
      prev_avg_psf: prevAvgPsf,
      pipeline_units: pipelineUnits,
      distress_count: distressCount,
      price_history: history,
      service_charge_avg: scAvg,
      top_projects: topProjects,
    }
  } catch (err) {
    console.error("[areas/slug] fetchAreaData error:", err)
    return null
  }
}

// Top 20 areas by transaction volume for static generation
export async function generateStaticParams() {
  try {
    const rows = await sql<{ area_name_en: string }[]>`
      SELECT area_name_en, SUM(txn_count) AS total
      FROM mv_txn_monthly
      WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
      GROUP BY area_name_en
      ORDER BY total DESC
      LIMIT 20
    `
    return rows.map((r) => ({ slug: toSlug(r.area_name_en) }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchAreaData(slug)
  if (!data) return {}
  const name = formatAreaName(data.area_name_en)
  return {
    title: `${name} Area Deep-Dive — Price, Pipeline & Distress | North Capital DXB`,
    description: `Full investment profile for ${name}: price per sqft trend, off-plan pipeline, service charges, and active distress deals.`,
    alternates: { canonical: `/terminal/areas/${slug}` },
    openGraph: {
      images: [
        {
          url: "/images/terminal-communities-social.png",
          width: 1200,
          height: 630,
          alt: `${name} Area Analysis — North Capital DXB`,
        },
      ],
    },
    twitter: { card: "summary_large_image", images: ["/images/terminal-communities-social.png"] },
  }
}

function PriceSparkline({ history }: { history: SparkPoint[] }) {
  if (history.length < 2) return null
  const values = history.map((p) => p.avg_psf).filter(Boolean)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 200
  const H = 40
  const pts = history
    .filter((p) => p.avg_psf > 0)
    .map((p, i, arr) => {
      const x = (i / (arr.length - 1)) * W
      const y = H - ((p.avg_psf - min) / range) * H
      return `${x},${y}`
    })
    .join(" ")

  const isUp = values[values.length - 1] >= values[0]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 40 }}
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? "var(--accent, #10b981)" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default async function AreaDeepDivePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await fetchAreaData(slug)
  if (!data) notFound()

  const displayName = formatAreaName(data.area_name_en)
  const momChange =
    data.prev_avg_psf && data.avg_psf
      ? ((data.avg_psf - data.prev_avg_psf) / data.prev_avg_psf) * 100
      : null
  const momColor = momChange === null ? "" : momChange >= 0 ? "text-accent" : "text-red-400"

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-6xl mx-auto pb-24 lg:pb-12">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-0">
        <Link
          href={`/terminal/communities/${slug}`}
          className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Community Screener
        </Link>
      </div>

      {/* Header */}
      <section className="border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Area Deep-Dive
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            {displayName}
          </h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Current Avg PSF
            </p>
            <p className="font-mono text-base font-bold text-foreground">
              {data.avg_psf > 0 ? `AED ${formatNum(data.avg_psf)}` : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              MoM Change
            </p>
            <p className={`font-mono text-base font-bold ${momColor || "text-muted-foreground"}`}>
              {momChange !== null
                ? `${momChange >= 0 ? "+" : ""}${momChange.toFixed(1)}%`
                : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Active Distress
            </p>
            <p className={`font-mono text-base font-bold ${data.distress_count > 0 ? "text-accent" : "text-foreground"}`}>
              {data.distress_count > 0 ? data.distress_count : "0"}
            </p>
          </div>
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Pipeline Units
            </p>
            <p className={`font-mono text-base font-bold ${data.pipeline_units > 0 ? "text-yellow-400" : "text-foreground"}`}>
              {data.pipeline_units > 0 ? `+${formatNum(data.pipeline_units)}` : "0"}
            </p>
          </div>
        </div>
      </section>

      {/* Price sparkline */}
      {data.price_history.length >= 2 && (
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Price History (AED/sqft — 12 Months)
              </h2>
            </div>
            {data.price_history.length > 0 && (
              <span className="font-mono text-xs text-muted-foreground">
                {data.price_history[0]?.month} → {data.price_history[data.price_history.length - 1]?.month}
              </span>
            )}
          </div>
          <div className="w-full">
            <PriceSparkline history={data.price_history} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground/60">
            {data.price_history.filter((_, i) => i % 3 === 0).map((p) => (
              <span key={p.month}>{p.month}</span>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Off-plan pipeline */}
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Off-Plan Pipeline
            </h2>
          </div>
          {data.top_projects.length > 0 ? (
            <div className="space-y-2">
              <p className="font-mono text-2xl font-bold text-yellow-400">
                +{formatNum(data.pipeline_units)} units
              </p>
              <ul className="space-y-1.5 mt-2">
                {data.top_projects.map((p) => (
                  <li
                    key={p.project_name_en}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {p.project_name_en}
                    </span>
                    <span className="font-mono text-foreground ml-2 shrink-0">
                      {formatNum(p.no_of_units)} units
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <p className="font-mono text-2xl font-bold text-accent">0</p>
              <p className="text-sm text-muted-foreground mt-1">No active pipeline projects</p>
              <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                Constrained supply supports price stability.
              </p>
            </div>
          )}
        </section>

        {/* Service charges + distress */}
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Holding Costs
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Avg Service Charge / yr
              </p>
              <p className="font-mono text-xl font-bold text-foreground">
                {data.service_charge_avg
                  ? `AED ${formatNum(data.service_charge_avg)}`
                  : "—"}
              </p>
              {!data.service_charge_avg && (
                <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                  No service charge data for this area in DLD registry.
                </p>
              )}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Active Distress Listings
              </p>
              <p className={`font-mono text-xl font-bold ${data.distress_count > 0 ? "text-accent" : "text-muted-foreground"}`}>
                {data.distress_count}
              </p>
              {data.distress_count > 0 && (
                <Link
                  href={`/terminal/distress-deals?area=${encodeURIComponent(displayName)}`}
                  className="text-[11px] text-accent hover:underline font-mono mt-1 block"
                >
                  View distress deals for {displayName} →
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Communities page cross-link */}
      <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Transaction Intelligence</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-bedroom price breakdown and 12-month chart
          </p>
        </div>
        <Link
          href={`/terminal/communities/${slug}`}
          className="shrink-0 text-xs font-mono text-accent hover:underline"
        >
          Community screener →
        </Link>
      </div>

      {/* Email capture */}
      <EmailCaptureWidget
        source="area-deep-dive"
        areaInterest={displayName}
        label={`Get alerts for ${displayName}`}
      />

      <p className="text-[11px] font-mono text-muted-foreground/40 px-1">
        Source: Dubai Land Department · Transactions, projects, and service charge registry
      </p>
    </div>
  )
}
