import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ServiceChargeEstimator, type ProjectData } from "@/components/tools/service-charge-estimator"
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
    title: `Dubai Service Charge Calculator 2026 — Free Tool | ${siteName}`,
    description:
      "Estimate annual service charges for any Dubai residential project. Official DLD service charge data for 45,000+ buildings — search by project name and calculate net yield impact.",
    metadataBase: new URL(base),
    alternates: { canonical: "/tools/service-charge-estimator" },
    keywords: [
      "Dubai service charge calculator",
      "Dubai service charge 2026",
      "Dubai strata fees",
      "service charge per sqft Dubai",
      "RERA service charge",
      "Dubai building maintenance fees",
      "annual service charge Dubai apartment",
    ],
    openGraph: {
      title: `Dubai Service Charge Calculator 2026 | ${siteName}`,
      description: "Free tool: estimate annual service charges for any Dubai building. Official DLD data, 45,000+ projects. Calculate net yield impact.",
      url: `${base}/tools/service-charge-estimator`,
      siteName,
      images: [{ url: "/images/terminal-social.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Dubai Service Charge Calculator 2026 | ${siteName}`,
      description: "Free tool: estimate annual service charges for any Dubai building using official DLD data.",
    },
  }
}

export interface ServiceChargeRow {
  project_name: string
  master_community_name_en: string | null
  budget_year: number
  total_cost: number
  category_breakdown: { category: string; cost: number }[]
  no_of_units: number | null
}

async function fetchProjectData(): Promise<ProjectData[]> {
  try {
    const rows = await sql<{
      project_name: string
      master_community_name_en: string | null
      budget_year: number
      total_cost: string
      no_of_units: string | null
      categories: string
    }[]>`
      SELECT
        sc.project_name,
        sc.master_community_name_en,
        sc.budget_year,
        SUM(sc.service_cost) AS total_cost,
        MAX(p.no_of_units)   AS no_of_units,
        json_agg(
          json_build_object(
            'category', sc.service_category_name_en,
            'cost', sc.service_cost
          )
          ORDER BY sc.service_cost DESC
        )::text AS categories
      FROM dld_service_charges sc
      LEFT JOIN dld_projects p ON p.project_id = sc.project_id
      WHERE sc.usage_name_en = 'Residential'
        AND sc.budget_year >= 2021
        AND sc.project_name IS NOT NULL
      GROUP BY sc.project_name, sc.master_community_name_en, sc.budget_year
      HAVING SUM(sc.service_cost) > 10000
      ORDER BY sc.project_name, sc.budget_year DESC
      LIMIT 5000
    `

    return rows.map(r => {
      let categories: { category: string; cost: number }[] = []
      try {
        const parsed = JSON.parse(r.categories)
        // Sum duplicate categories
        const map = new Map<string, number>()
        for (const item of parsed) {
          if (item.category) {
            map.set(item.category, (map.get(item.category) ?? 0) + Number(item.cost))
          }
        }
        categories = Array.from(map.entries())
          .map(([category, cost]) => ({ category, cost }))
          .sort((a, b) => b.cost - a.cost)
      } catch { /* skip parse errors */ }

      return {
        project_name: r.project_name,
        master_community_name_en: r.master_community_name_en,
        budget_year: r.budget_year,
        total_cost: Number(r.total_cost),
        no_of_units: r.no_of_units !== null ? Number(r.no_of_units) : null,
        category_breakdown: categories,
      }
    })
  } catch (err: any) {
    console.error("[service-charge-estimator] fetch error:", err.message)
    return []
  }
}

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Dubai Service Charge Calculator",
  description:
    "Estimate annual service charges for any Dubai residential building. Official DLD RERA data for 45,000+ projects — search by project name, see year-over-year trends, and calculate net yield impact.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
  featureList: [
    "Search 45,000+ Dubai buildings by name",
    "Annual service charge budget 2021–2024",
    "Per-unit cost estimate",
    "AED per sqft estimate from unit size",
    "Category breakdown (security, cleaning, maintenance)",
    "Net yield impact calculator",
    "Year-over-year trend",
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a typical service charge in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Dubai service charges typically range from AED 10 to AED 35 per sqft per year for residential apartments. Budget buildings in areas like JVC or International City average AED 12–18/sqft. Premium buildings in Downtown Dubai, Dubai Marina, and DIFC average AED 25–40/sqft. Branded residences and managed hotels can exceed AED 50/sqft.",
      },
    },
    {
      "@type": "Question",
      name: "Who regulates service charges in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Service charges in Dubai are regulated by RERA (Real Estate Regulatory Authority), which is part of the Dubai Land Department (DLD). Management companies must submit annual budgets to RERA for approval. The data in this tool comes directly from DLD-registered service charge budgets.",
      },
    },
    {
      "@type": "Question",
      name: "How do service charges affect rental yield in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Service charges reduce net rental yield by 1–3 percentage points for most Dubai properties. A property with 8% gross yield and AED 20/sqft service charges on a 800 sqft unit pays AED 16,000/year in fees — reducing net yield by roughly 1.5–2% depending on purchase price. High-service-charge buildings require proportionally higher rent to maintain net returns.",
      },
    },
    {
      "@type": "Question",
      name: "Can I negotiate service charges in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Service charges are set by the building's Owners Association and management company, approved by RERA. Individual unit owners cannot negotiate their share, but can vote on the annual budget at the Annual General Meeting (AGM). The rate per unit is calculated proportionally based on unit area as a percentage of total development area.",
      },
    },
  ],
}

export default async function ServiceChargeEstimatorPage() {
  const projectData = await fetchProjectData()

  const uniqueProjects = new Set(projectData.map(r => r.project_name)).size
  const latestYear = projectData.length > 0 ? Math.max(...projectData.map(r => r.budget_year)) : 2024

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {!isCR && <Navbar />}

      <main className="min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-6 space-y-8">

          {/* Header */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
              Free Tool — No sign-up required
            </p>
            <h1 className="font-serif text-4xl font-bold tracking-tight">
              Dubai Service Charge Calculator
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Estimate annual service charges for any Dubai residential building. Official DLD RERA data.
              Enter your unit size to calculate AED/sqft and net yield impact.
            </p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-emerald-500 inline-block" />
                <span className="text-muted-foreground">{uniqueProjects.toLocaleString()} buildings tracked</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-muted-foreground/40 inline-block" />
                <span className="text-muted-foreground">Source: DLD RERA, latest {latestYear}</span>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <ServiceChargeEstimator projectData={projectData} />

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
              <p className="font-semibold">Want a full investment analysis?</p>
              <p className="text-sm text-muted-foreground">We model gross yield, net yield, service charges, and financing for specific units before you commit.</p>
            </div>
            <a
              href="/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Get a free analysis →
            </a>
          </div>

        </div>
      </main>

      {!isCR && <Footer />}
    </>
  )
}
