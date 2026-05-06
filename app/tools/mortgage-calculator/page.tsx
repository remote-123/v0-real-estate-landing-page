import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MortgageCalculatorClient } from "@/components/terminal/mortgage-calculator-client"
import { headers } from "next/headers"
import type { Metadata } from "next"

export const revalidate = 86400 // 24h

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const isCR = (h.get("x-site") ?? "") === "cityregistry"
  const base = isCR ? "https://thecityregistry.com" : "https://www.northcapitaldxb.com"
  const siteName = isCR ? "The City Registry" : "North Capital DXB"

  return {
    title: `Dubai Mortgage Calculator 2026 — Monthly Repayments | ${siteName}`,
    description:
      "Calculate monthly mortgage repayments, total interest, and cost of ownership for Dubai property. Includes UAE bank rate guidance for expats and non-residents.",
    metadataBase: new URL(base),
    alternates: { canonical: "/tools/mortgage-calculator" },
    keywords: [
      "Dubai mortgage calculator",
      "UAE mortgage calculator",
      "Dubai property mortgage repayment",
      "expat mortgage Dubai 2026",
      "Dubai home loan calculator",
      "UAE bank mortgage rates",
      "Dubai property monthly payment",
    ],
    openGraph: {
      title: `Dubai Mortgage Calculator 2026 | ${siteName}`,
      description: "Free calculator: monthly repayments, total interest, and full cost of ownership for Dubai real estate. UAE bank rate guidance included.",
      url: `${base}/tools/mortgage-calculator`,
      siteName,
      images: [{ url: "/images/terminal-social.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Dubai Mortgage Calculator 2026 | ${siteName}`,
      description: "Free calculator for Dubai mortgage repayments with UAE bank rate guidance.",
    },
  }
}

const schema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Dubai Mortgage Calculator",
  description:
    "Calculate monthly mortgage repayments, total interest over the loan term, and full cost of ownership for Dubai property purchases. Includes UAE bank rate guidance for expat and non-resident buyers.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
  featureList: [
    "Monthly repayment calculation",
    "Total interest over loan term",
    "Principal vs interest breakdown",
    "Down payment requirement",
    "Total cost of ownership",
    "UAE bank rate guidance for expats",
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the minimum down payment for a mortgage in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The minimum down payment is 20% for expat residents on properties priced under AED 5M, and 30% for properties above AED 5M. UAE nationals qualify for a lower 15% minimum. Non-resident investors typically face 40–50% down payment requirements depending on the lender. These limits are set by the UAE Central Bank.",
      },
    },
    {
      "@type": "Question",
      name: "What mortgage interest rates can expats get in Dubai in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most UAE banks offer fixed-rate introductory periods of 1–5 years between 3.5% and 5.5% for qualifying expat residents, after which the rate switches to variable (EIBOR + bank margin). Non-residents typically see rates of 4.5–6.5%. Rates vary by credit profile, employment type (salaried vs self-employed), and loan-to-value ratio.",
      },
    },
    {
      "@type": "Question",
      name: "What is the maximum LTV (loan-to-value) ratio in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For expat residents: 80% LTV on properties up to AED 5M, 70% LTV on properties above AED 5M. UAE nationals can borrow up to 85% LTV on properties under AED 5M. Off-plan properties are subject to tighter LTVs of 50–70% depending on the developer and bank. All limits are governed by UAE Central Bank mortgage regulation.",
      },
    },
    {
      "@type": "Question",
      name: "Can non-residents get a mortgage in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Several UAE banks — including ADCB, Emirates NBD, Mashreq, and HSBC — offer mortgages to non-resident foreigners. Expect a higher down payment (40–50%), higher interest rates, and stricter income documentation. Maximum loan term is typically 15–20 years for non-residents versus 25 years for UAE residents.",
      },
    },
    {
      "@type": "Question",
      name: "What fees should I budget for when buying with a mortgage in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Beyond your down payment, budget for: 4% DLD transfer fee on the purchase price, 2% real estate agent commission, 0.25% mortgage registration fee to DLD, bank arrangement fee (0.5–1% of loan amount), property valuation fee (AED 2,500–3,500), and buildings insurance. Total acquisition costs typically add 6–7% on top of the purchase price.",
      },
    },
    {
      "@type": "Question",
      name: "What is the maximum mortgage term in Dubai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The maximum term is 25 years for expat residents, with the condition that the loan must be fully repaid before the borrower reaches age 65 (salaried) or 70 (self-employed). UAE nationals face the same 25-year cap. Non-residents are typically limited to 15–20 years. A longer term reduces monthly payments but significantly increases total interest paid.",
      },
    },
    {
      "@type": "Question",
      name: "Is it better to fix or go variable rate on a Dubai mortgage?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most Dubai mortgages offer a fixed introductory rate (1–5 years), then revert to variable linked to EIBOR (Emirates Interbank Offered Rate) plus a bank margin. Fixed rates provide payment certainty — useful when EIBOR is rising. Variable rates benefit borrowers when EIBOR falls. Many buyers fix for 3 years then refinance. Always compare total cost of ownership across the full term, not just the introductory rate.",
      },
    },
  ],
}

export default async function MortgageCalculatorPage() {
  const _h2 = await headers()
  const isCR = (_h2.get('x-site') ?? '') === 'cityregistry'
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
              Dubai Mortgage Calculator
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Estimate monthly repayments, total interest, and full cost of ownership for a Dubai
              property purchase. All calculations are client-side using UAE bank rate defaults.
            </p>

            {/* Quick context stats */}
            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-emerald-500 inline-block" />
                <span className="text-muted-foreground">Min. down payment (expat):</span>
                <span className="font-mono font-semibold text-emerald-400">20%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-muted-foreground/40 inline-block" />
                <span className="text-muted-foreground">Typical fixed rate:</span>
                <span className="font-mono font-semibold">3.5–5.5%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full w-2 h-2 bg-muted-foreground/40 inline-block" />
                <span className="text-muted-foreground">Max term (expat resident):</span>
                <span className="font-mono font-semibold">25 years</span>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <MortgageCalculatorClient />

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
              <p className="font-semibold">Planning a purchase? Get mortgage guidance.</p>
              <p className="text-sm text-muted-foreground">
                Our team works with UAE-licensed brokers to help expat buyers secure competitive rates
                — whether you&apos;re buying your first Dubai property or refinancing.
              </p>
            </div>
            <a
              href="/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Speak to a mortgage advisor →
            </a>
          </div>

        </div>
      </main>

      {!isCR && <Footer />}
    </>
  )
}
