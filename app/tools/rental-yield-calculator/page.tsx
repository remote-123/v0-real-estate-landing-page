import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { RentalYieldCalculator, type YieldBenchmark } from "@/components/tools/rental-yield-calculator"
import { sql } from "@/lib/db"
import { headers } from "next/headers"
import type { Metadata } from "next"

export const revalidate = 86400 // 24h

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const isCR = (h.get("x-site") ?? "") === "cityregistry"
  const base = isCR ? "https://thecityregistry.com" : "https://www.northcapitaldxb.com"
  const siteName = isCR ? "The City Registry" : "North Capital DXB"

  return {
    title: `Dubai Rental Yield Calculator 2026 — Free Tool | ${siteName}`,
    description:
      "Calculate gross and net rental yield for Dubai properties. Live benchmarks from DLD-registered transactions and active PropertyFinder listings — sorted by highest-yield communities.",
    metadataBase: new URL(base),
    alternates: { canonical: "/tools/rental-yield-calculator" },
    keywords: [
      "Dubai rental yield calculator",
      "Dubai property yield",
      "rental yield Dubai 2026",
      "gross yield Dubai",
      "net yield Dubai property",
      "Dubai real estate ROI",
      "best rental yield Dubai",
    ],
    openGraph: {
      title: `Dubai Rental Yield Calculator 2026 | ${siteName}`,
      description: "Free calculator: gross yield, net yield, cash-on-cash, and mortgage cashflow for Dubai residential property. Live market benchmarks.",
      url: `${base}/tools/rental-yield-calculator`,
      siteName,
      images: [{ url: "/images/terminal-social.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Dubai Rental Yield Calculator 2026 | ${siteName}`,
      description: "Free calculator for Dubai rental yields with live DLD benchmarks.",
    },
  }
}

async function fetchBenchmarks(): Promise<YieldBenchmark[]> {
  try {
    const rows = await sql<{
      area_name_en: string
      rooms_en: string
      avg_sale_price: string
      avg_psf: string
      sale_txns: string
      avg_annual_rent: string
      rent_listings: string
      gross_yield_pct: string
    }[]>`
      WITH latest AS (
        SELECT MAX(txn_month) AS max_month
        FROM mv_txn_monthly_unified
        WHERE trans_group_en = 'Sales' AND property_type_en = 'Unit'
      ),
      sales AS (
        SELECT
          u.area_name_en,
          u.rooms_en,
          ROUND(SUM(u.txn_count * u.avg_price) / NULLIF(SUM(u.txn_count), 0), 0) AS avg_sale_price,
          ROUND(SUM(u.txn_count * u.avg_price_sqm) / NULLIF(SUM(u.txn_count), 0) / 10.764, 0) AS avg_psf,
          SUM(u.txn_count)::integer AS sale_txns
        FROM mv_txn_monthly_unified u
        CROSS JOIN latest
        WHERE u.trans_group_en = 'Sales'
          AND u.property_type_en = 'Unit'
          AND u.property_sub_type_en IN ('Flat', 'Hotel Apartments')
          AND u.txn_month >= latest.max_month - INTERVAL '11 months'
          AND u.area_name_en IS NOT NULL
          AND u.rooms_en IN ('Studio', '1 B/R', '2 B/R', '3 B/R')
        GROUP BY u.area_name_en, u.rooms_en
        HAVING SUM(u.txn_count) >= 15
      ),
      rents AS (
        SELECT
          area,
          bedrooms,
          ROUND(AVG(annual_price), 0) AS avg_annual_rent,
          COUNT(*)::integer AS rent_listings
        FROM rental_listings
        WHERE annual_price > 5000
          AND area IS NOT NULL
          AND bedrooms IN ('Studio', '0', '1', '2', '3')
        GROUP BY area, bedrooms
        HAVING COUNT(*) >= 3
      )
      SELECT
        s.area_name_en,
        s.rooms_en,
        s.avg_sale_price::bigint AS avg_sale_price,
        s.avg_psf::integer AS avg_psf,
        s.sale_txns,
        r.avg_annual_rent::bigint AS avg_annual_rent,
        r.rent_listings,
        ROUND((r.avg_annual_rent / NULLIF(s.avg_sale_price, 0) * 100)::numeric, 2) AS gross_yield_pct
      FROM sales s
      JOIN rents r ON
        s.area_name_en ILIKE '%' || r.area || '%'
        AND s.rooms_en = CASE r.bedrooms
          WHEN '0' THEN 'Studio'
          WHEN 'Studio' THEN 'Studio'
          WHEN '1' THEN '1 B/R'
          WHEN '2' THEN '2 B/R'
          WHEN '3' THEN '3 B/R'
          ELSE r.bedrooms
        END
      WHERE s.avg_sale_price > 0 AND r.avg_annual_rent > 0
        AND (r.avg_annual_rent / NULLIF(s.avg_sale_price, 0) * 100) BETWEEN 2 AND 20
      ORDER BY gross_yield_pct DESC
      LIMIT 80
    `

    return rows.map(r => ({
      area_name_en: r.area_name_en,
      rooms_en: r.rooms_en,
      avg_sale_price: Number(r.avg_sale_price),
      avg_psf: Number(r.avg_psf),
      sale_txns: Number(r.sale_txns),
      avg_annual_rent: Number(r.avg_annual_rent),
      rent_listings: Number(r.rent_listings),
      gross_yield_pct: Number(r.gross_yield_pct),
    }))
  } catch (err: any) {
    console.error("[rental-yield-calculator] fetch error:", err.message)
    return []
  }
}

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Dubai Rental Yield Calculator",
  description:
    "Calculate gross yield, net yield, mortgage cashflow, and cash-on-cash return for Dubai residential property investments. Includes live market benchmarks from DLD-registered transactions.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
  featureList: [
    "Gross rental yield calculation",
    "Net yield after service charges",
    "Mortgage cashflow analysis",
    "Cash-on-cash return",
    "Live Dubai market benchmarks",
    "Sortable area/bedroom yield table",
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a good rental yield in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A gross rental yield of 6–8% is considered good in Dubai. Areas like Jumeirah Village Circle, Discovery Gardens, and International City regularly achieve 7–9% gross yields. Premium locations like Dubai Marina and Downtown Dubai typically yield 5–6%.",
      },
    },
    {
      "@type": "Question",
      name: "How is rental yield calculated in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Gross rental yield = (Annual Rent ÷ Purchase Price) × 100. Net yield deducts service charges, maintenance, and vacancy periods. Cash-on-cash return factors in mortgage financing — it's calculated as annual cashflow after debt service divided by the down payment.",
      },
    },
    {
      "@type": "Question",
      name: "What is the average rental yield in Dubai in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Average gross rental yield in Dubai for apartments ranges from 5% to 9% depending on community and bedroom type. Studios and 1-bedroom units in mid-market areas (JVC, International City, Al Nahda) typically achieve the highest yields, while premium waterfront units yield 4–6%.",
      },
    },
    {
      "@type": "Question",
      name: "Are there taxes on rental income in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "There is no income tax on rental income in Dubai for individuals. There is no capital gains tax. The primary costs are a 4% DLD transfer fee on purchase, annual service charges (AED 10–30/sqft depending on building), and 5% municipality tax on rent (paid by tenant).",
      },
    },
  ],
}

export default async function RentalYieldCalculatorPage() {
  const benchmarks = await fetchBenchmarks()

  const topYield = benchmarks[0]?.gross_yield_pct ?? null
  const avgYield = benchmarks.length > 0
    ? benchmarks.reduce((s, r) => s + r.gross_yield_pct, 0) / benchmarks.length
    : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />

      <main className="min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-6 space-y-8">

          {/* Header */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
              Free Tool — No sign-up required
            </p>
            <h1 className="font-serif text-4xl font-bold tracking-tight">
              Dubai Rental Yield Calculator
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Calculate gross yield, net yield after service charges, and mortgage cashflow for any Dubai property.
              Live benchmarks sourced from DLD-registered transactions and active listings.
            </p>

            {/* Quick stats */}
            {benchmarks.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-1">
                {topYield && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-full w-2 h-2 bg-emerald-500 inline-block" />
                    <span className="text-muted-foreground">Top area yield:</span>
                    <span className="font-mono font-semibold text-emerald-400">{topYield.toFixed(2)}%</span>
                  </div>
                )}
                {avgYield && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-full w-2 h-2 bg-muted-foreground/40 inline-block" />
                    <span className="text-muted-foreground">Market avg:</span>
                    <span className="font-mono font-semibold">{avgYield.toFixed(2)}%</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded-full w-2 h-2 bg-muted-foreground/40 inline-block" />
                  <span className="text-muted-foreground">{benchmarks.length} area/bed combinations tracked</span>
                </div>
              </div>
            )}
          </div>

          {/* Calculator + Benchmark table */}
          <RentalYieldCalculator benchmarks={benchmarks} />

          {/* FAQ */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqSchema.mainEntity.map((faq, i) => (
                <div key={i} className="space-y-1.5">
                  <h3 className="font-medium text-sm">{faq.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold">Found a high-yield opportunity?</p>
              <p className="text-sm text-muted-foreground">Our team can help you verify the numbers and close at the right price.</p>
            </div>
            <a
              href="/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Talk to an agent →
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
