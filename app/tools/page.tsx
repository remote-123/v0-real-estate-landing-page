/**
 * /tools — Dubai Property Calculator Tools hub page
 *
 * Index page for all free financial calculators.
 * Pure static — no DB queries, no client state.
 * Multi-domain: northcapitaldxb.com and thecityregistry.com.
 */

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { headers } from "next/headers"
import type { Metadata } from "next"
import Link from "next/link"
import {
  Calculator,
  TrendingUp,
  Building2,
  Receipt,
  CalendarDays,
  ShieldCheck,
} from "lucide-react"

export const revalidate = 86400 // 24h

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const isCR = (h.get("x-site") ?? "") === "cityregistry"
  const base = isCR ? "https://thecityregistry.com" : "https://www.northcapitaldxb.com"
  const siteName = isCR ? "The City Registry" : "North Capital DXB"

  return {
    title: `Dubai Property Calculator Tools — Free Financial Tools | ${siteName}`,
    description:
      "Free Dubai property calculators: mortgage repayments, rental yield, service charge, DLD transfer fee, off-plan payment schedule, and Golden Visa threshold. No sign-up required.",
    metadataBase: new URL(base),
    alternates: { canonical: "/tools" },
    keywords: [
      "Dubai property calculator tools",
      "Dubai real estate calculators 2026",
      "free Dubai property tools",
      "Dubai mortgage calculator",
      "Dubai rental yield calculator",
      "Dubai DLD fee calculator",
      "Dubai Golden Visa calculator",
    ],
    openGraph: {
      title: `Dubai Property Calculator Tools | ${siteName}`,
      description:
        "Free Dubai property calculators — mortgage, rental yield, service charge, DLD transfer fee, off-plan payment plan, and Golden Visa threshold. Instant, no sign-up.",
      images: [{ url: "/images/terminal-social.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Dubai Property Calculator Tools | ${siteName}`,
      description:
        "6 free Dubai property calculators. Mortgage, yield, DLD fees, off-plan payments, Golden Visa threshold. Instant.",
    },
  }
}

// ── JSON-LD ───────────────────────────────────────────────────────────────────

const tools = [
  {
    name: "Dubai Mortgage Calculator",
    slug: "/tools/mortgage-calculator",
    description:
      "Estimate monthly repayments, total interest, and full cost of ownership. UAE bank rate guidance for expats and non-residents.",
    icon: Calculator,
  },
  {
    name: "Rental Yield Calculator",
    slug: "/tools/rental-yield-calculator",
    description:
      "Gross yield, net yield, and cash-on-cash return. Live DLD benchmarks across 80+ Dubai communities.",
    icon: TrendingUp,
  },
  {
    name: "Service Charge Estimator",
    slug: "/tools/service-charge-estimator",
    description:
      "Lookup official DLD service charge rates for 45,000+ Dubai buildings and estimate annual holding cost.",
    icon: Building2,
  },
  {
    name: "DLD Transfer Fee Calculator",
    slug: "/tools/dld-transfer-fee-calculator",
    description:
      "Full acquisition cost breakdown: 4% DLD fee, registration, agent commission, and optional mortgage costs.",
    icon: Receipt,
  },
  {
    name: "Off-Plan Payment Calculator",
    slug: "/tools/off-plan-payment-calculator",
    description:
      "Generate a full instalment schedule for any off-plan payment plan — 20/80, 40/60, post-handover, or custom.",
    icon: CalendarDays,
  },
  {
    name: "Golden Visa Calculator",
    slug: "/tools/golden-visa-calculator",
    description:
      "Check if your investment meets the AED 2M Golden Visa or AED 750K Investor Visa property threshold.",
    icon: ShieldCheck,
  },
]

function buildItemListSchema(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dubai Property Calculator Tools",
    description:
      "Free financial calculators for Dubai real estate buyers and investors.",
    url: `${baseUrl}/tools`,
    numberOfItems: tools.length,
    itemListElement: tools.map((tool, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: tool.name,
      description: tool.description,
      url: `${baseUrl}${tool.slug}`,
    })),
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ToolsIndexPage() {
  const h = await headers()
  const isCR = (h.get("x-site") ?? "") === "cityregistry"
  const base = isCR ? "https://thecityregistry.com" : "https://www.northcapitaldxb.com"

  const itemListSchema = buildItemListSchema(base)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <Navbar />

      <main className="min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-6 space-y-8">

          {/* Header */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
              Free Tools — No sign-up required
            </p>
            <h1 className="font-serif text-4xl font-bold tracking-tight">
              Dubai Property Calculator Tools
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Free financial calculators for Dubai real estate buyers and investors. Instant
              results, no account needed. Data sourced from Dubai Land Department and live
              market benchmarks.
            </p>
          </div>

          {/* Tool cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link
                  key={tool.slug}
                  href={tool.slug}
                  className="group rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 transition-colors p-5 space-y-3 flex flex-col"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-border/40 bg-background/60 p-2">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <h2 className="font-medium text-sm leading-snug">{tool.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {tool.description}
                  </p>
                  <p className="font-mono text-xs text-accent group-hover:underline">
                    Open calculator →
                  </p>
                </Link>
              )
            })}
          </div>

          {/* Footer context */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold">Need personalised analysis?</p>
              <p className="text-sm text-muted-foreground">
                These tools provide indicative figures. For transaction-specific advice on
                financing, visa eligibility, or acquisition costs, our advisors are available.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Talk to an advisor →
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
