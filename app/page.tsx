import type { Metadata } from "next"
import { headers } from "next/headers"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { StrategicAlliances } from "@/components/strategic-alliances"
import { InvestmentStrategy } from "@/components/investment-strategy"
import { TrackRecord } from "@/components/track-record"
import { KnowledgeHub } from "@/components/knowledge-hub"
import { FounderNote } from "@/components/founder-note"
import { TrustSignals } from "@/components/trust-signals"
import { LeadForm } from "@/components/lead-form"
import { Footer } from "@/components/footer"
import { FaqSection } from "@/components/faq-section"
import { FeaturedProjects } from "@/components/featured-projects"
import { MarketIntelligenceTeaser } from "@/components/market-intelligence-teaser"
import { CityRegistryLanding } from "@/components/city-registry-landing"
import { sql } from "@/lib/db"

async function fetchCityStats(): Promise<{ communities: number; transactions: number; topYield: number; topYieldArea: string }> {
  try {
    const [countsRows, yieldRows] = await Promise.all([
      sql<{ communities: string; transactions: string }[]>`
        SELECT
          COUNT(DISTINCT area_name_en)::integer AS communities,
          SUM(txn_count)::integer AS transactions
        FROM mv_txn_monthly_unified
        WHERE area_name_en IS NOT NULL
      `,
      sql<{ gross_yield_pct: string; area_name_en: string }[]>`
        WITH sales AS (
          SELECT area_name_en, rooms_en,
            SUM(txn_count * avg_price) / NULLIF(SUM(txn_count), 0) AS avg_sale_price,
            SUM(txn_count) AS sale_txns
          FROM mv_txn_monthly_unified
          WHERE trans_group_en = 'Sales' AND property_type_en = 'Unit'
            AND txn_month >= NOW() - INTERVAL '12 months'
            AND area_name_en IS NOT NULL AND rooms_en IS NOT NULL
          GROUP BY area_name_en, rooms_en
        ),
        rents AS (
          SELECT area_name_en, rooms_en,
            SUM(txn_count * avg_rent) / NULLIF(SUM(txn_count), 0) AS avg_annual_rent,
            SUM(txn_count) AS rent_txns
          FROM mv_txn_monthly_unified
          WHERE trans_group_en = 'Rent' AND property_type_en = 'Unit'
            AND txn_month >= NOW() - INTERVAL '12 months'
            AND area_name_en IS NOT NULL AND rooms_en IS NOT NULL
          GROUP BY area_name_en, rooms_en
        )
        SELECT
          s.area_name_en,
          ROUND(((r.avg_annual_rent * 12) / NULLIF(s.avg_sale_price, 0) * 100)::numeric, 1) AS gross_yield_pct
        FROM sales s JOIN rents r USING (area_name_en, rooms_en)
        WHERE s.sale_txns >= 10 AND r.rent_txns >= 10
          AND s.avg_sale_price > 100000
          AND r.avg_annual_rent > 0
        ORDER BY gross_yield_pct DESC
        LIMIT 1
      `,
    ])

    const counts = countsRows[0]
    const topYieldRow = yieldRows[0]

    return {
      communities: Number(counts?.communities ?? 0),
      transactions: Number(counts?.transactions ?? 0),
      topYield: Number(topYieldRow?.gross_yield_pct ?? 0),
      topYieldArea: topYieldRow?.area_name_en ?? '',
    }
  } catch {
    // Fallback values if DB unreachable
    return { communities: 82, transactions: 1_660_000, topYield: 9.2, topYieldArea: 'Discovery Gardens' }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const site = headersList.get("x-site") ?? "northcapital"

  if (site === "cityregistry") {
    return {
      title: "Dubai Real Estate Intelligence Platform | The City Registry",
      description: "Institutional-grade Dubai property data. Transaction analytics, yield maps, community screener, distress deal scanner — powered by DLD and Bayut data.",
      metadataBase: new URL("https://thecityregistry.com"),
      alternates: { canonical: "https://thecityregistry.com" },
      openGraph: {
        title: "The City Registry — Dubai Real Estate Data Platform",
        description: "Institutional-grade Dubai property data. Transaction analytics, yield maps, community screener, distress deal scanner.",
        url: "https://thecityregistry.com",
        siteName: "The City Registry",
      },
    }
  }

  return {
    title: "Institutional-Grade Dubai Real Estate Advisory | North Capital DXB",
    description: "Boutique real estate portfolio engineering for global expats. 0% tax, 7%+ net yields, and hard-currency hedging. Vetted inventory and strategic market intelligence.",
    openGraph: {
      title: "North Capital DXB | Real Estate Investment Strategy",
      description: "Boutique real estate portfolio engineering for global expats. 7%+ net yields and tax-free capital preservation.",
    },
  }
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "North Capital DXB",
  "url": "https://www.northcapitaldxb.com",
  "logo": "https://www.northcapitaldxb.com/images/hero-dubai.jpg",
  "description": "Institutional-grade real estate advisory for global capital in Dubai. Specialized in high-yield, tax-free property portfolios.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Dubai",
    "addressCountry": "UAE"
  },
  "sameAs": [
    "https://twitter.com/northcapitaldxb",
    "https://www.linkedin.com/company/northcapitaldxb"
  ]
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can foreigners actually own property in Dubai?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, 100% freehold ownership is possible for international investors in designated areas like Dubai Marina, Downtown, and Palm Jumeirah."
      }
    },
    {
      "@type": "Question",
      "name": "Are there property taxes in Dubai?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. The UAE has zero annual property tax, zero capital gains tax, and zero income tax on rental yields for individual investors."
      }
    },
    {
      "@type": "Question",
      "name": "What is the typical ROI for Dubai real estate?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Institutional-grade assets in Dubai typically offer 7% to 10% net rental yields, significantly higher than most North American or European markets."
      }
    }
  ]
}

export default async function Home() {
  const headersList = await headers()
  const site = headersList.get("x-site") ?? "northcapital"
  const isCityRegistry = site === "cityregistry"

  if (isCityRegistry) {
    const liveStats = await fetchCityStats()
    return <CityRegistryLanding liveStats={liveStats} />
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />
      <main>
        <Hero />
        <StrategicAlliances />
        <FounderNote />
        <MarketIntelligenceTeaser />
        <InvestmentStrategy />
        <FeaturedProjects />
        <TrackRecord />
        <TrustSignals />
        <KnowledgeHub />
        <FaqSection />
        <LeadForm />
      </main>
      <Footer />
    </>
  )
}
