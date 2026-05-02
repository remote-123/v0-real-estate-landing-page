import type { Metadata } from "next"
import Link from "next/link"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"

export const revalidate = 3600 // 1-hour ISR

export const metadata: Metadata = {
  title: "Dubai Area Property Prices 2025 | All Areas | North Capital DXB",
  description:
    "Track property prices per square foot, MoM trends, and off-plan pipeline across all major Dubai areas. Live DLD transaction data — Business Bay, Dubai Marina, JVC, Downtown, and more.",
  openGraph: {
    title: "Dubai Area Property Prices 2025 | North Capital DXB",
    description:
      "PSF data, 12-month trends, and off-plan pipeline for every major Dubai community. Institutional-grade DLD transaction data.",
    url: "https://www.northcapitaldxb.com/areas",
  },
  twitter: {
    card: "summary",
    title: "Dubai Area Property Prices 2025 | North Capital DXB",
    description: "PSF data, 12-month trends, and off-plan pipeline for every major Dubai community.",
  },
  alternates: {
    canonical: "https://www.northcapitaldxb.com/areas",
  },
}

interface AreaRow {
  area_name_en: string
  avg_psf: number
  prev_psf: number | null
  mom_change: number | null
  txn_count: number
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

async function fetchAreas(): Promise<AreaRow[]> {
  try {
    const rows = await sql<{
      area_name_en: string
      avg_psf: string
      prev_psf: string | null
      txn_count: string
    }[]>`
      WITH latest AS (SELECT MAX(txn_month) AS m FROM mv_txn_monthly_unified),
      curr AS (
        SELECT
          area_name_en,
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm,
          SUM(txn_count) AS cnt
        FROM mv_txn_monthly_unified, latest
        WHERE txn_month = latest.m
          AND trans_group_en = 'Sales'
          AND area_name_en IS NOT NULL
        GROUP BY area_name_en
        HAVING SUM(txn_count) >= 3
      ),
      prev AS (
        SELECT
          area_name_en,
          SUM(txn_count * avg_price_sqm) / NULLIF(SUM(txn_count), 0) AS psm
        FROM mv_txn_monthly_unified, latest
        WHERE txn_month = latest.m - INTERVAL '1 month'
          AND trans_group_en = 'Sales'
          AND area_name_en IS NOT NULL
        GROUP BY area_name_en
      ),
      vol AS (
        SELECT area_name_en, SUM(txn_count) AS total_vol
        FROM mv_txn_monthly_unified
        WHERE trans_group_en = 'Sales'
          AND txn_month >= NOW() - INTERVAL '12 months'
        GROUP BY area_name_en
      )
      SELECT
        curr.area_name_en,
        ROUND((curr.psm / 10.764)::numeric, 0) AS avg_psf,
        ROUND((prev.psm / 10.764)::numeric, 0) AS prev_psf,
        curr.cnt AS txn_count
      FROM curr
      LEFT JOIN prev USING (area_name_en)
      LEFT JOIN vol USING (area_name_en)
      ORDER BY vol.total_vol DESC NULLS LAST
      LIMIT 60
    `

    return rows.map((r) => {
      const avgPsf = Number(r.avg_psf)
      const prevPsf = r.prev_psf ? Number(r.prev_psf) : null
      const momChange =
        prevPsf && prevPsf > 0 ? Number((((avgPsf - prevPsf) / prevPsf) * 100).toFixed(1)) : null
      return {
        area_name_en: r.area_name_en,
        avg_psf: avgPsf,
        prev_psf: prevPsf,
        mom_change: momChange,
        txn_count: Number(r.txn_count),
      }
    })
  } catch {
    return []
  }
}

export default async function AreasPage() {
  const areas = await fetchAreas()

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dubai Area Property Prices 2025",
    description: "Property price per sqft and market trends for all major Dubai areas",
    url: "https://www.northcapitaldxb.com/areas",
    numberOfItems: areas.length,
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
            <Link href="/terminal" className="hover:text-foreground transition-colors">Terminal</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Research</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Dubai Property Intelligence
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
            Dubai Area Property Prices
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Average price per square foot, month-on-month trend, and transaction volume for every
            major Dubai community. Data sourced from DLD transaction records, updated daily.
          </p>
        </div>

        {/* Area table */}
        {areas.length > 0 ? (
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                      Area
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                      Avg PSF
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                      MoM
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-muted-foreground font-medium hidden sm:table-cell">
                      Txns (latest)
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area, i) => {
                    const slug = toSlug(area.area_name_en)
                    const displayName = formatAreaName(area.area_name_en)
                    const trendUp = area.mom_change !== null && area.mom_change >= 0

                    return (
                      <tr
                        key={area.area_name_en}
                        className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/areas/${slug}`}
                            className="font-medium hover:text-emerald-400 transition-colors"
                          >
                            {displayName}
                          </Link>
                          <p className="text-[10px] text-muted-foreground/60 font-mono">
                            {area.area_name_en}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {area.avg_psf > 0 ? area.avg_psf.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {area.mom_change !== null ? (
                            <span
                              className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                                trendUp ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {trendUp ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {trendUp ? "+" : ""}
                              {area.mom_change}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                          {area.txn_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/areas/${slug}`}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            View <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-center text-muted-foreground">
            Area data unavailable — DLD connection required.
          </div>
        )}

        {/* CTA */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">Full market intelligence</p>
            <p className="text-xs text-muted-foreground">
              Area momentum, distress deal scanner, building comparator, and floor-plan pricer — all
              in the Investor Terminal.
            </p>
          </div>
          <Link
            href="/terminal"
            className="shrink-0 flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Open Terminal
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <p className="text-xs text-muted-foreground/50">
          Source: Dubai Land Department — latest available monthly data. AED/sqft.
        </p>
      </main>
    </div>
  )
}
