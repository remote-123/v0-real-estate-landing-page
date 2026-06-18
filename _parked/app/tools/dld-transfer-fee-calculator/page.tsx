/**
 * /tools/dld-transfer-fee-calculator
 *
 * Dubai property acquisition cost breakdown calculator.
 * Covers: 4% DLD transfer fee, DLD registration fee, agent commission,
 * mortgage registration fee (if financed), property valuation fee.
 *
 * Pure client-side — no DB queries needed.
 * Multi-domain: works for both northcapitaldxb.com and thecityregistry.com.
 */

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { DldFeeCalculator } from "@/components/tools/dld-fee-calculator"
import { headers } from "next/headers"
import type { Metadata } from "next"

export const revalidate = 86400 // 24h

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const isCR = (h.get("x-site") ?? "") === "cityregistry"
  const base = isCR ? "https://thecityregistry.com" : "https://www.northcapitaldxb.com"
  const siteName = isCR ? "The City Registry" : "North Capital DXB"

  return {
    title: `Dubai DLD Transfer Fee Calculator 2026 — Acquisition Cost Breakdown | ${siteName}`,
    description:
      "Calculate your total cost of buying property in Dubai: 4% DLD transfer fee, registration fee, agent commission, and mortgage registration fee. Instant breakdown, no sign-up.",
    metadataBase: new URL(base),
    alternates: { canonical: "/tools/dld-transfer-fee-calculator" },
    keywords: [
      "Dubai DLD transfer fee calculator",
      "Dubai property acquisition costs 2026",
      "DLD fee Dubai buyer",
      "Dubai land department fee 4%",
      "Dubai property buying costs",
      "DLD registration fee Dubai",
      "mortgage registration fee Dubai",
      "how much does it cost to buy property in Dubai",
      "Dubai transfer fee calculator AED",
      "Dubai real estate transaction costs",
    ],
    openGraph: {
      title: `Dubai DLD Transfer Fee Calculator 2026 | ${siteName}`,
      description:
        "Free calculator: 4% DLD fee, registration fee, agent commission, and mortgage costs for Dubai property purchases. Full acquisition cost breakdown.",
      images: [{ url: "/images/terminal-social.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Dubai DLD Transfer Fee Calculator 2026 | ${siteName}`,
      description: "Full acquisition cost breakdown for Dubai property buyers — instant, no sign-up.",
    },
  }
}

// ── JSON-LD schemas ───────────────────────────────────────────────────────────

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Dubai DLD Transfer Fee Calculator",
  description:
    "Calculate the total cost of buying property in Dubai including the 4% DLD transfer fee, flat registration fee, agent commission, and optional mortgage registration and valuation fees.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
  featureList: [
    "4% DLD transfer fee calculation",
    "DLD registration fee (flat AED 2,000–4,000)",
    "Real estate agent commission (configurable %)",
    "Mortgage registration fee (0.25% of loan)",
    "Property valuation fee",
    "Total acquisition cost with % on top of purchase price",
  ],
}

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Dubai DLD Transfer Fee Calculator",
  "alternateName": "Dubai Property Acquisition Cost Calculator",
  "description": "Free online calculator for the total cost of buying property in Dubai: mandatory 4% DLD transfer fee, flat registration fee (AED 2,000–4,000), real estate agent commission (default 2%), and optional mortgage registration fee (0.25% of loan).",
  "applicationCategory": "FinanceApplication",
  "applicationSubCategory": "RealEstateCalculator",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "AED" },
  "about": {
    "@type": "GovernmentService",
    "name": "Dubai Land Department Property Transfer",
    "provider": { "@type": "GovernmentOrganization", "name": "Dubai Land Department", "url": "https://dubailand.gov.ae" },
    "areaServed": { "@type": "Place", "name": "Dubai, United Arab Emirates" },
  },
  "keywords": ["Dubai DLD transfer fee calculator", "Dubai property acquisition cost", "4% DLD fee Dubai", "how much does it cost to buy property Dubai", "Dubai property buying costs 2026"],
}

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Calculate the Total Cost of Buying Property in Dubai",
  "description": "Step-by-step guide to calculating all fees payable when purchasing a freehold property in Dubai, including the 4% DLD transfer fee, registration fee, agent commission, and mortgage costs.",
  "totalTime": "PT2M",
  "tool": [{ "@type": "HowToTool", "name": "Dubai DLD Transfer Fee Calculator", "url": "https://thecityregistry.com/tools/dld-transfer-fee-calculator" }],
  "step": [
    { "@type": "HowToStep", "position": 1, "name": "Enter the purchase price", "text": "Input the agreed purchase price in AED. Use the price stated in the Sales and Purchase Agreement (SPA), not the bank valuation." },
    { "@type": "HowToStep", "position": 2, "name": "Calculate the DLD transfer fee", "text": "Multiply the purchase price by 4% (0.04). This is the mandatory Dubai Land Department transfer fee payable by the buyer. Example: AED 2,000,000 × 4% = AED 80,000." },
    { "@type": "HowToStep", "position": 3, "name": "Add the DLD registration fee", "text": "Add AED 4,000 if the purchase price is AED 500,000 or above, or AED 2,000 if below. This flat fee covers title deed issuance." },
    { "@type": "HowToStep", "position": 4, "name": "Add agent commission if applicable", "text": "If purchasing through an agent, add 2% of the purchase price as buyer's agent commission. Market standard in Dubai but negotiable." },
    { "@type": "HowToStep", "position": 5, "name": "Add mortgage registration fee if financing", "text": "If taking a mortgage, add 0.25% of the loan amount. For a AED 1,600,000 mortgage (80% LTV on AED 2M) this is AED 4,000, payable to DLD." },
    { "@type": "HowToStep", "position": 6, "name": "Sum all costs", "text": "Add DLD transfer fee + DLD registration fee + agent commission + mortgage registration fee + property valuation fee (AED 2,500–3,500 typical). This is your total out-of-pocket cost above the purchase price." },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Who pays the DLD transfer fee in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The buyer pays the full 4% DLD transfer fee by default. It can be split 50/50 by private agreement between buyer and seller, but without a written agreement the full liability falls on the buyer. The fee is paid at the time of transfer registration with the Dubai Land Department.",
      },
    },
    {
      "@type": "Question",
      name: "What is the DLD transfer fee rate in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The DLD transfer fee is 4% of the agreed purchase price — not the property valuation. It is set by Dubai Land Department under Law No. 37 of 2009 and applies to all freehold property transfers in Dubai, whether residential or commercial, new or resale.",
      },
    },
    {
      "@type": "Question",
      name: "What is the DLD registration fee in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The DLD registration fee is a flat charge separate from the 4% transfer fee. It is AED 4,000 for properties priced at AED 500,000 or above, and AED 2,000 for properties below AED 500,000. This fee covers the title deed issuance and registration in the DLD's property registry.",
      },
    },
    {
      "@type": "Question",
      name: "Are DLD fees payable on off-plan purchases in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The 4% DLD transfer fee applies at SPA (Sales and Purchase Agreement) signing for off-plan properties. An Oqood (preliminary registration) fee of AED 2,000–3,000 applies during construction. If the off-plan property is resold before handover, the full 4% DLD fee is charged again on the new sale price.",
      },
    },
    {
      "@type": "Question",
      name: "Is the real estate agent commission mandatory in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No, agent commission is negotiable. However, 2% of the purchase price is the market standard for Dubai residential transactions, paid by the buyer to the buyer's agent. Some developers selling directly off-plan do not charge commission. Always confirm commission terms in writing before signing any agency agreement.",
      },
    },
    {
      "@type": "Question",
      name: "What is the mortgage registration fee in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The mortgage registration fee is 0.25% of the loan amount, paid to Dubai Land Department to register the mortgage on the title deed. This applies only to financed purchases — cash buyers do not pay this fee. For example, a AED 1,600,000 mortgage (80% LTV on a AED 2M property) incurs a AED 4,000 mortgage registration fee.",
      },
    },
    {
      "@type": "Question",
      name: "Can I avoid or reduce the DLD transfer fee in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The 4% DLD transfer fee is mandatory for all freehold property transfers and cannot be waived or reduced. There are no exemptions for first-time buyers, expat residents, or off-plan units. It is among the higher transfer fees globally but is partially offset by Dubai's zero income tax and zero capital gains tax environment.",
      },
    },
  ],
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DldTransferFeeCalculatorPage() {
  const _h2 = await headers()
  const isCR = (_h2.get('x-site') ?? '') === 'cityregistry'
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      {!isCR && <Navbar />}

      <main className="min-h-screen pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-6 space-y-8">

          {/* Header */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground/70">
              Free Tool — No sign-up required
            </p>
            <h1 className="font-serif text-4xl font-bold tracking-tight">
              Dubai DLD Transfer Fee Calculator
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Calculate your full cost of buying property in Dubai — including the mandatory 4%
              DLD transfer fee, registration fee, agent commission, and optional mortgage costs.
            </p>

            {/* Quick context chips */}
            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-amber-500 inline-block" />
                <span className="text-muted-foreground">DLD transfer fee:</span>
                <span className="font-mono font-semibold text-amber-400">4% of price</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-muted-foreground/40 inline-block" />
                <span className="text-muted-foreground">DLD registration:</span>
                <span className="font-mono font-semibold">AED 2K–4K flat</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-blue-500/60 inline-block" />
                <span className="text-muted-foreground">Agent commission:</span>
                <span className="font-mono font-semibold">2% standard</span>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <DldFeeCalculator />

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
              <p className="font-semibold">Ready to buy? Get transaction support.</p>
              <p className="text-sm text-muted-foreground">
                Our team can review your acquisition cost structure and introduce you to
                UAE-licensed conveyancing and mortgage advisors.
              </p>
            </div>
            <a
              href="/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Talk to an advisor →
            </a>
          </div>

        </div>
      </main>

      {!isCR && <Footer />}
    </>
  )
}
