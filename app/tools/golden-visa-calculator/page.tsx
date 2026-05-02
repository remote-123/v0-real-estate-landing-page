/**
 * /tools/golden-visa-calculator
 *
 * Dubai Golden Visa property threshold calculator.
 * Checks if a property price meets AED 2M (10-yr Golden Visa) or
 * AED 750K (2-yr Investor Visa) thresholds, shows surplus/shortfall.
 *
 * Pure client-side — no DB queries needed.
 * Multi-domain: northcapitaldxb.com and thecityregistry.com.
 */

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { GoldenVisaCalculator } from "@/components/tools/golden-visa-calculator"
import { headers } from "next/headers"
import type { Metadata } from "next"

export const revalidate = 86400 // 24h

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const isCR = (h.get("x-site") ?? "") === "cityregistry"
  const base = isCR ? "https://thecityregistry.com" : "https://www.northcapitaldxb.com"
  const siteName = isCR ? "The City Registry" : "North Capital DXB"

  return {
    title: `Dubai Golden Visa Property Calculator 2026 — AED Threshold Checker | ${siteName}`,
    description:
      "Check if your Dubai property investment qualifies for the 10-year Golden Visa (AED 2M+) or 2-year Investor Visa (AED 750K+). Instant AED threshold calculator, no sign-up required.",
    metadataBase: new URL(base),
    alternates: { canonical: "/tools/golden-visa-calculator" },
    keywords: [
      "Dubai Golden Visa property requirement 2026",
      "AED 2 million property visa Dubai",
      "Dubai investor visa property threshold",
      "how much property for Dubai Golden Visa",
      "Dubai Golden Visa calculator",
      "ICP property visa Dubai AED 2M",
      "Dubai 10 year visa property investment",
      "Dubai property residency visa 2026",
      "golden visa UAE real estate minimum",
    ],
    openGraph: {
      title: `Dubai Golden Visa Property Calculator 2026 | ${siteName}`,
      description:
        "Check AED 2M Golden Visa and AED 750K Investor Visa eligibility for Dubai property purchases. Instant surplus/shortfall calculator, no sign-up.",
      images: [{ url: "/images/terminal-social.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Dubai Golden Visa Property Calculator 2026 | ${siteName}`,
      description:
        "Instant Dubai Golden Visa property threshold checker — AED 2M (10-yr) and AED 750K (2-yr Investor Visa). No sign-up.",
    },
  }
}

// ── JSON-LD schemas ───────────────────────────────────────────────────────────

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Dubai Golden Visa Property Calculator",
  description:
    "Check whether a Dubai property investment meets the AED 2,000,000 threshold for the 10-year Golden Visa or AED 750,000 for the 2-year Investor Visa. Shows surplus or shortfall amount.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
  featureList: [
    "10-year Golden Visa threshold check (AED 2,000,000)",
    "2-year Investor Visa threshold check (AED 750,000)",
    "Surplus above threshold calculation",
    "Shortfall to next visa tier",
    "Off-plan vs completed property advisory",
    "Golden Visa upgrade nudge for borderline investments",
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the minimum property value for a Dubai Golden Visa in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AED 2,000,000 (two million dirhams). This threshold applies to the total property purchase price, not the financed portion. The property must be fully completed and registered in your name with Dubai Land Department (DLD). This threshold is set by UAE Federal Law and administered by the Federal Authority for Identity, Citizenship, Customs and Port Security (ICP).",
      },
    },
    {
      "@type": "Question",
      name: "Can I get a Dubai Golden Visa with an off-plan property?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, but with conditions. The off-plan developer must be on the ICP-approved developer list. The property price must still meet or exceed AED 2,000,000. Mortgage financing is generally not eligible for the Golden Visa threshold — the qualifying value is typically the equity paid, not the total price. Buyers should confirm eligibility directly with ICP or a UAE immigration specialist before purchasing with visa eligibility as the primary objective.",
      },
    },
    {
      "@type": "Question",
      name: "What is the 2-year Dubai Investor Visa and how does it differ from the Golden Visa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The 2-year Investor Visa requires a property investment of at least AED 750,000. It grants a renewable 2-year UAE residency permit but does not extend to family members as broadly as the Golden Visa. The 10-year Golden Visa (AED 2M+) is self-sponsored, renewable, and covers spouse and children, making it the preferred option for long-term residents and families.",
      },
    },
    {
      "@type": "Question",
      name: "Does a mortgaged Dubai property qualify for the Golden Visa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Generally, only the equity portion — the amount paid, not financed — counts toward the AED 2M Golden Visa threshold. If you purchase a property for AED 2,500,000 with a AED 1,500,000 mortgage, only the paid equity of AED 1,000,000 counts, meaning you would not yet qualify. Full cash purchases or properties where the mortgage has been substantially paid down are typically the safest path. Always verify current rules with ICP.",
      },
    },
    {
      "@type": "Question",
      name: "Can I combine multiple Dubai properties to reach the AED 2M Golden Visa threshold?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Multiple properties registered in the same individual's name can be aggregated to reach the AED 2,000,000 threshold, provided each is a completed freehold property. Off-plan units and mortgaged portions are subject to the same restrictions as single-property applications. ICP and DLD verify total registered equity across all properties held in the applicant's name.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to get a Dubai Golden Visa through property investment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Once the property is fully registered and the title deed is issued by DLD, the ICP application process typically takes 2–6 weeks. This includes a medical fitness test, Emirates ID biometric registration, and ICP approval. Some applicants use a real estate agency or immigration specialist to handle the filing, which can reduce delays. The visa is issued for 10 years and is renewable.",
      },
    },
    {
      "@type": "Question",
      name: "Does the AED 2M Golden Visa threshold include the 4% DLD transfer fee?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The AED 2,000,000 threshold refers to the registered property value (purchase price) only — not the total acquisition cost. A property priced at exactly AED 2,000,000 qualifies, even though your total acquisition cost including the 4% DLD fee, agent commission, and registration charges will be approximately AED 2,140,000–2,160,000. The DLD transfer fee and other transaction costs are additional expenses on top of the qualifying threshold.",
      },
    },
  ],
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GoldenVisaCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Navbar />

      <main className="min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-6 space-y-8">

          {/* Header */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
              Free Tool — No sign-up required
            </p>
            <h1 className="font-serif text-4xl font-bold tracking-tight">
              Dubai Golden Visa Property Calculator
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Check whether your property investment meets the AED 2,000,000 threshold for the
              10-year UAE Golden Visa or AED 750,000 for the 2-year Investor Visa. Instant
              surplus and shortfall calculation.
            </p>

            {/* Quick context chips */}
            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-amber-400 inline-block" />
                <span className="text-muted-foreground">Golden Visa threshold:</span>
                <span className="font-mono font-semibold text-amber-400">AED 2,000,000</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-blue-400 inline-block" />
                <span className="text-muted-foreground">Investor Visa threshold:</span>
                <span className="font-mono font-semibold text-blue-400">AED 750,000</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-muted-foreground/40 inline-block" />
                <span className="text-muted-foreground">Visa duration:</span>
                <span className="font-mono font-semibold">10-yr / 2-yr</span>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <GoldenVisaCalculator />

          {/* FAQ */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqSchema.mainEntity.map((faq, i) => (
                <div key={i} className="space-y-1.5">
                  <h3 className="font-medium text-sm">{faq.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.acceptedAnswer.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-xl border border-border/40 bg-card/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold">Buying to qualify for residency?</p>
              <p className="text-sm text-muted-foreground">
                Our advisors can guide your property selection with visa eligibility, developer
                track record, and area resale data in mind.
              </p>
            </div>
            <a
              href="/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Speak to an advisor →
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
