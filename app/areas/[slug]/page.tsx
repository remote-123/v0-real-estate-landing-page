import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, TrendingUp, TrendingDown, Building2, BarChart3, Layers } from "lucide-react"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"
import { EmailCaptureWidget } from "@/components/terminal/email-capture-widget"

export const revalidate = 3600 // 1-hour ISR

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function formatPsf(n: number): string {
  return `AED ${Math.round(n).toLocaleString("en-US")}/sqft`
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${Math.round(n).toLocaleString()}`
}

// Top 50 areas by transaction volume — used for generateStaticParams
async function getTop50Areas(): Promise<string[]> {
  try {
    const rows = await sql<{ area_name_en: string }[]>`
      SELECT area_name_en
      FROM (
        SELECT area_name_en, SUM(txn_count) AS total
        FROM mv_txn_monthly_unified
        WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
        GROUP BY area_name_en
        ORDER BY total DESC
        LIMIT 50
      ) sub
    `
    return rows.map((r) => r.area_name_en)
  } catch {
    return []
  }
}

export async function generateStaticParams() {
  const areas = await getTop50Areas()
  return areas.map((name) => ({ slug: toSlug(name) }))
}

interface AreaPageData {
  area_name_en: string
  displayName: string
  slug: string
  avg_psf: number
  prev_avg_psf: number | null
  mom_change: number | null
  pipeline_count: number
  distress_count: number
  avg_service_charge: number | null
  txn_count_12m: number
  avg_price_12m: number | null
  price_history: { month: string; avg_psf: number }[]
}

async function fetchAreaPageData(slug: string): Promise<AreaPageData | null> {
  try {
    // Resolve slug → area name
    const rows = await sql<{ area_name_en: string }[]>`
      SELECT DISTINCT area_name_en
      FROM mv_txn_monthly_unified
      WHERE area_name_en IS NOT NULL AND trans_group_en = 'Sales'
      ORDER BY area_name_en
      LIMIT 200
    `
    const match = rows.find((r) => toSlug(r.area_name_en) === slug)
    if (!match) return null

    const areaName = match.area_name_en
    const displayName = formatAreaName(areaName)

    const [psfRows, historyRows, pipelineRows, scRows, distressRows, txnRows] = await Promise.all([
      // Current + prev PSF
      sql<{ avg_psf: string; prev_psf: string | null }[]>`
        WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified),
        curr AS (
          SELECT SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified, latest
          WHERE txn_month = latest.m AND trans_group_en = 'Sales' AND area_name_en = ${areaName}
        ),
        prev AS (
          SELECT SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
          FROM mv_txn_monthly_unified, latest
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
        FROM mv_txn_monthly_unified
        WHERE area_name_en = ${areaName}
          AND trans_group_en = 'Sales'
          AND txn_month >= NOW() - INTERVAL '12 months'
        GROUP BY txn_month
        ORDER BY txn_month
      `,

      // Off-plan pipeline
      sql<{ cnt: string }[]>`
        SELECT COUNT(*) AS cnt
        FROM dld_projects
        WHERE area_name_en ILIKE ${`%${areaName}%`}
          AND project_status IN ('Under Construction', 'Pre-Sale', 'Sold Out')
      `,

      // Service charge
      sql<{ avg_sc: string | null }[]>`
        SELECT ROUND(AVG(service_cost)::numeric, 0) AS avg_sc
        FROM dld_service_charges
        WHERE LOWER(master_community_name_en) LIKE LOWER(${`%${areaName.split(" ")[0]}%`})
          AND service_cost > 0
      `,

      // Distress count
      sql<{ cnt: string }[]>`
        SELECT COUNT(*) AS cnt
        FROM distress_listings
        WHERE area_name ILIKE ${`%${areaName}%`}
          AND disappeared_at IS NULL
          AND price_drop_confirmed = true
      `.catch(() => [{ cnt: "0" }]),

      // 12-month transaction count + avg price
      sql<{ txn_count: string; avg_price: string | null }[]>`
        SELECT
          SUM(txn_count)::integer AS txn_count,
          ROUND(AVG(avg_price_sqm * 80)::numeric, 0) AS avg_price
        FROM mv_txn_monthly_unified
        WHERE area_name_en = ${areaName}
          AND trans_group_en = 'Sales'
          AND txn_month >= NOW() - INTERVAL '12 months'
      `,
    ])

    const avgPsf = Number(psfRows[0]?.avg_psf ?? 0)
    const prevPsf = psfRows[0]?.prev_psf ? Number(psfRows[0].prev_psf) : null
    const momChange =
      prevPsf && prevPsf > 0 ? Number((((avgPsf - prevPsf) / prevPsf) * 100).toFixed(1)) : null

    const priceHistory = historyRows.map((r) => ({
      month: r.txn_month.toString().slice(0, 7),
      avg_psf: Number(r.avg_psf),
    }))

    return {
      area_name_en: areaName,
      displayName,
      slug,
      avg_psf: avgPsf,
      prev_avg_psf: prevPsf,
      mom_change: momChange,
      pipeline_count: Number(pipelineRows[0]?.cnt ?? 0),
      distress_count: Number(distressRows[0]?.cnt ?? 0),
      avg_service_charge: scRows[0]?.avg_sc ? Number(scRows[0].avg_sc) : null,
      txn_count_12m: Number(txnRows[0]?.txn_count ?? 0),
      avg_price_12m: txnRows[0]?.avg_price ? Number(txnRows[0].avg_price) : null,
      price_history: priceHistory,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchAreaPageData(slug)
  if (!data) return { title: "Area Not Found | North Capital DXB" }

  const title = `${data.displayName} Property Prices & PSF Data 2025 | North Capital DXB`
  const desc = data.avg_psf > 0
    ? `${data.displayName} current average PSF: AED ${Math.round(data.avg_psf).toLocaleString()}/sqft. ${data.mom_change !== null ? `${data.mom_change > 0 ? "+" : ""}${data.mom_change}% MoM. ` : ""}${data.pipeline_count} off-plan projects tracked. Live DLD transaction data.`
    : `Track ${data.displayName} real estate prices, PSF trends, off-plan pipeline and distress deals. Institutional-grade DLD data by North Capital DXB.`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `https://www.northcapitaldxb.com/areas/${slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description: desc,
    },
    alternates: {
      canonical: `https://www.northcapitaldxb.com/areas/${slug}`,
    },
  }
}

// Simple inline SVG sparkline
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const W = 120
  const H = 36
  const pts = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * W
      const y = H - ((v - min) / range) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  const trend = points[points.length - 1] > points[0]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={trend ? "#10b981" : "#ef4444"}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await fetchAreaPageData(slug)
  if (!data) notFound()

  const trendUp = data.mom_change !== null && data.mom_change >= 0
  const psf12mHigh = data.price_history.length > 0 ? Math.max(...data.price_history.map((p) => p.avg_psf)) : null
  const psf12mLow = data.price_history.length > 0 ? Math.min(...data.price_history.map((p) => p.avg_psf)) : null
  const sparkPoints = data.price_history.map((p) => p.avg_psf)

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${data.displayName} Property Market Data`,
    description: `DLD transaction data, PSF trends, off-plan pipeline and distress listings for ${data.displayName}, Dubai.`,
    url: `https://www.northcapitaldxb.com/areas/${slug}`,
    creator: { "@type": "Organization", name: "North Capital DXB" },
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-14 items-center justify-between">
          <Link href="/" className="font-serif text-sm font-bold tracking-tight">
            NORTH CAPITAL DXB
          </Link>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/areas" className="hover:text-foreground transition-colors">All Areas</Link>
            <Link href="/terminal" className="hover:text-foreground transition-colors">Terminal</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-10">
        {/* Breadcrumb */}
        <nav className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Link href="/areas" className="hover:text-foreground transition-colors">Areas</Link>
          <span>/</span>
          <span className="text-foreground">{data.displayName}</span>
        </nav>

        {/* Hero */}
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Dubai Property Intelligence
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
            {data.displayName} Property Prices
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Live DLD transaction data for {data.displayName}. Current average price per square foot,
            12-month trend, off-plan pipeline, and distress deal signals — updated daily.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg PSF</p>
            <p className="text-2xl font-bold font-mono">
              {data.avg_psf > 0 ? `AED ${Math.round(data.avg_psf).toLocaleString()}` : "—"}
            </p>
            {data.mom_change !== null && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
                {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendUp ? "+" : ""}{data.mom_change}% MoM
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">12M Range</p>
            <p className="text-sm font-mono font-semibold">
              {psf12mLow && psf12mHigh
                ? `${psf12mLow.toLocaleString()} – ${psf12mHigh.toLocaleString()}`
                : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">AED/sqft</p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pipeline</p>
            <p className="text-2xl font-bold font-mono">{data.pipeline_count.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Off-plan projects</p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Distress Deals</p>
            <p className="text-2xl font-bold font-mono">{data.distress_count}</p>
            <p className="text-[10px] text-muted-foreground">Price-confirmed drops</p>
          </div>
        </div>

        {/* PSF trend + sparkline */}
        {sparkPoints.length >= 2 && (
          <div className="rounded-xl border border-border/40 bg-card/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">12-Month PSF Trend</p>
                <p className="text-lg font-semibold mt-1">{data.displayName}</p>
              </div>
              <Sparkline points={sparkPoints} />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/30">
              {data.price_history.slice(-3).map((p) => (
                <div key={p.month} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{p.month}</p>
                  <p className="text-sm font-mono font-medium">{p.avg_psf.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional data */}
        <div className="grid sm:grid-cols-2 gap-4">
          {data.avg_service_charge && (
            <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="h-4 w-4" />
                <p className="text-[10px] uppercase tracking-widest">Avg Service Charge</p>
              </div>
              <p className="text-xl font-bold font-mono">
                AED {data.avg_service_charge.toFixed(2)}/sqft/yr
              </p>
              <p className="text-xs text-muted-foreground">Based on DLD RERA service charge data</p>
            </div>
          )}

          <div className="rounded-xl border border-border/40 bg-card/40 p-5 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <p className="text-[10px] uppercase tracking-widest">Transactions (12M)</p>
            </div>
            <p className="text-xl font-bold font-mono">{data.txn_count_12m.toLocaleString()}</p>
            {data.avg_price_12m && (
              <p className="text-xs text-muted-foreground">
                Median deal size ~{formatPrice(data.avg_price_12m)}
              </p>
            )}
          </div>
        </div>

        {/* CTA: terminal deep-link */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">Track {data.displayName} in real time</p>
            <p className="text-xs text-muted-foreground">
              Full transaction pulse, area momentum score, floor-plan pricer, and distress deal feed — live DLD data.
            </p>
          </div>
          <Link
            href={`/terminal/areas/${slug}`}
            className="shrink-0 flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Open Terminal
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Email capture */}
        <div className="max-w-md">
          <EmailCaptureWidget
            source="area-page"
            areaInterest={data.displayName}
            label={`Get weekly alerts for ${data.displayName}`}
          />
        </div>

        {/* SEO footer */}
        <div className="border-t border-border/30 pt-8 space-y-3">
          <p className="text-xs text-muted-foreground">
            Data sourced from Dubai Land Department (DLD) transaction records. PSF figures are
            averages across all sale transactions for residential property in {data.displayName}.
            All prices in AED. Last updated: {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
            <Link href="/areas" className="hover:text-muted-foreground transition-colors">All Dubai Areas</Link>
            <Link href="/terminal/distress-deals" className="hover:text-muted-foreground transition-colors">Distress Deals</Link>
            <Link href="/terminal/price-index" className="hover:text-muted-foreground transition-colors">Price Index</Link>
            <Link href="/terminal/communities" className="hover:text-muted-foreground transition-colors">Community Screener</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
