/**
 * /tools/off-plan-payment-calculator
 *
 * Dubai off-plan payment plan calculator — shows instalment schedule across
 * construction period and optional post-handover phase. Supports 20/80, 40/60,
 * 60/40, 30/30/40 presets plus fully configurable custom plans.
 *
 * Pure client-side — no DB queries needed.
 * Multi-domain: northcapitaldxb.com and thecityregistry.com.
 */

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { OffPlanPaymentCalculator } from "@/components/tools/off-plan-payment-calculator"
import { headers } from "next/headers"
import type { Metadata } from "next"

export const revalidate = 86400 // 24h

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const isCR = (h.get("x-site") ?? "") === "cityregistry"
  const base = isCR ? "https://thecityregistry.com" : "https://www.northcapitaldxb.com"
  const siteName = isCR ? "The City Registry" : "North Capital DXB"

  return {
    title: `Dubai Off-Plan Payment Plan Calculator 2026 — Instalment Schedule | ${siteName}`,
    description:
      "Calculate your Dubai off-plan property payment schedule — booking, construction milestones, handover, and post-handover instalments. Supports 20/80, 40/60, 60/40 and custom developer payment plans.",
    metadataBase: new URL(base),
    alternates: { canonical: "/tools/off-plan-payment-calculator" },
    keywords: [
      "Dubai off-plan payment plan calculator 2026",
      "developer payment schedule Dubai",
      "off-plan installment calculator UAE",
      "Dubai property payment plan breakdown",
      "off plan property Dubai payment schedule",
      "Dubai payment plan AED breakdown",
      "Emaar payment plan calculator",
      "DAMAC payment schedule Dubai",
      "20/80 payment plan Dubai",
      "40/60 payment plan Dubai",
      "post handover payment plan Dubai",
    ],
    openGraph: {
      title: `Dubai Off-Plan Payment Plan Calculator 2026 | ${siteName}`,
      description:
        "Free calculator: 20/80, 40/60, 60/40, post-handover, and custom payment plans for Dubai off-plan properties. Full instalment schedule with estimated dates.",
      images: [{ url: "/images/terminal-social.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Dubai Off-Plan Payment Plan Calculator 2026 | ${siteName}`,
      description:
        "Full payment schedule for Dubai off-plan buyers — booking, construction, handover, and post-handover. Instant, no sign-up.",
    },
  }
}

// ── JSON-LD schemas ───────────────────────────────────────────────────────────

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Dubai Off-Plan Payment Plan Calculator",
  description:
    "Calculate the full payment schedule for an off-plan property purchase in Dubai including booking deposit, construction milestone payments, handover payment, and optional post-handover instalments.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
  featureList: [
    "20/80 payment plan (80% on handover)",
    "40/60 payment plan (40% during construction)",
    "60/40 payment plan (60% during construction)",
    "30/30/40 post-handover payment plan",
    "Custom configurable payment plan",
    "Construction milestone payment schedule",
    "Estimated instalment dates by handover year",
    "Cumulative payment tracking",
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is an off-plan payment plan in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An off-plan payment plan is a structured instalment schedule set by the developer that lets buyers pay for a property in stages during construction rather than all at once. Payments are typically split between a booking deposit at SPA signing, construction milestone payments tied to build progress, the handover payment on key handover, and sometimes a post-handover phase spread over 1–3 years after completion.",
      },
    },
    {
      "@type": "Question",
      name: "What is a 40/60 payment plan in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A 40/60 plan requires the buyer to pay 40% of the property price during the construction period — starting with a booking deposit and then in instalments tied to build milestones — and the remaining 60% upon handover. It is one of the most common structures offered by Dubai developers and is typically used for properties with a 2–3 year build timeline.",
      },
    },
    {
      "@type": "Question",
      name: "What is a 20/80 payment plan in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A 20/80 plan requires only 20% during construction, with the remaining 80% due at handover. This structure minimises capital committed during the build phase but requires a significant lump-sum payment or mortgage drawdown at handover. It is common with premium developers for high-value units and suits investors who plan to finance with a UAE bank mortgage at completion.",
      },
    },
    {
      "@type": "Question",
      name: "What is a post-handover payment plan in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A post-handover plan — commonly structured as 30/30/40 — allows buyers to continue paying instalments after receiving the keys, typically spread over 1–3 years. The post-handover portion is interest-free and paid directly to the developer, making it an alternative to a bank mortgage for buyers who cannot access UAE bank financing or want to spread capital commitment across the construction and occupancy period.",
      },
    },
    {
      "@type": "Question",
      name: "Do you pay DLD fees on off-plan purchases in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The mandatory 4% DLD transfer fee is payable at SPA signing, calculated on the agreed purchase price. An Oqood (pre-registration) fee of AED 2,000–3,000 also applies at signing. These fees are due upfront regardless of the instalment plan structure and are in addition to the payment schedule shown in this calculator.",
      },
    },
    {
      "@type": "Question",
      name: "Can the payment plan change after signing the SPA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Once the Sales and Purchase Agreement (SPA) is signed, the payment plan terms are contractually fixed. Buyers should carefully review the milestone schedule, grace periods, and penalty clauses — typically 1% per month on overdue amounts — before signing. Developers may offer plan modifications in limited circumstances but are not obligated to do so.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if I miss a payment instalment on an off-plan property in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Missing a payment instalment triggers late payment penalties, typically 1% per month of the overdue amount. Persistent default allows developers to terminate the SPA under RERA regulations. If construction is more than 80% complete at the time of termination, the developer may retain up to 40% of the purchase price. Buyers facing payment difficulty should contact the developer immediately — rescheduling is common before legal escalation.",
      },
    },
  ],
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OffPlanPaymentCalculatorPage() {
  const _h2 = await headers()
  const isCR = (_h2.get('x-site') ?? '') === 'cityregistry'
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
      {!isCR && <Navbar />}

      <main className="min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-6 space-y-8">

          {/* Header */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
              Free Tool — No sign-up required
            </p>
            <h1 className="font-serif text-4xl font-bold tracking-tight">
              Dubai Off-Plan Payment Plan Calculator
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              See your full payment schedule across construction milestones and handover.
              Supports all common Dubai developer plans — 20/80, 40/60, 60/40, post-handover,
              and fully custom structures.
            </p>

            {/* Quick context chips */}
            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-foreground/60 inline-block" />
                <span className="text-muted-foreground">Most common plan:</span>
                <span className="font-mono font-semibold">40/60</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-amber-500 inline-block" />
                <span className="text-muted-foreground">DLD fee on off-plan:</span>
                <span className="font-mono font-semibold text-amber-400">4% at SPA</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-muted-foreground/40 inline-block" />
                <span className="text-muted-foreground">Oqood registration:</span>
                <span className="font-mono font-semibold">AED 2K–3K</span>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <OffPlanPaymentCalculator />

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
              <p className="font-semibold">Browse available off-plan projects.</p>
              <p className="text-sm text-muted-foreground">
                Explore curated off-plan developments with verified payment plan details,
                developer track records, and area supply risk scores.
              </p>
            </div>
            <a
              href="/projects"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              View projects →
            </a>
          </div>

        </div>
      </main>

      {!isCR && <Footer />}
    </>
  )
}
