import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LeadForm } from "@/components/lead-form"
import {
  TrendingUp,
  BarChart3,
  Globe,
  Shield,
  CheckCircle2,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Asset Structuring & Advisory | North Capital DXB",
  description:
    "Institutional-grade real estate advisory, yield optimization, and portfolio structuring for global capital in Dubai.",
  openGraph: {
    title: "Asset Structuring & Advisory | North Capital DXB",
    description:
      "Institutional-grade real estate advisory, yield optimization, and portfolio structuring for global capital in Dubai.",
    type: "website",
  },
}

const steps = [
  {
    number: "01",
    icon: TrendingUp,
    title: "Strategic Pre-Launch Allocation",
    description:
      "Retail buyers purchase at market value. Institutional capital purchases before the market dictates the price. We leverage our developer relationships to secure off-market, pre-launch inventory in highly undersupplied sectors. This allows our clients to capture immediate equity upon the public launch.",
    deliverables: [
      "Off-market developer briefings",
      "Priority unit & floorplate selection",
      "Pre-public pricing access",
    ],
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Yield Optimization & Portfolio Structuring",
    description:
      "High gross returns mean nothing if service charges and low tenant retention erode your net yield. We analyze price per square foot, historical rental data, and payment plan leverage to construct portfolios optimized for consistent, tax-free cash flow.",
    deliverables: [
      "Granular net ROI projections",
      "Service charge & operational cost analysis",
      "Tenant demographic & retention modeling",
    ],
  },
  {
    number: "03",
    icon: Globe,
    title: "Liquidity & Exit Strategy Planning",
    description:
      "An asset is only as good as your ability to exit it. Before we recommend an acquisition, we define the optimal exit horizon. We track market cycles, infrastructure shifts, and secondary market demand to ensure you can liquidate your asset efficiently at peak valuation.",
    deliverables: [
      "Market cycle & supply forecasting",
      "Secondary market liquidity analysis",
      "Capital gains optimization",
    ],
  },
  {
    number: "04",
    icon: Shield,
    title: "UAE Golden Visa & Capital Hedging",
    description:
      "Dubai real estate is a globally recognized vehicle for currency hedging due to the USD-pegged AED. We guide high-net-worth expats through the acquisition thresholds required to secure the 10-Year UAE Golden Visa, ensuring your capital is protected within a zero-tax jurisdiction.",
    deliverables: [
      "AED/USD peg arbitrage advisory",
      "Golden Visa processing & compliance",
      "Zero-tax jurisdictional structuring",
    ],
  },
]

const expectations = [
  "Direct access to Senior Investment Strategists",
  "Data-backed quantitative property analysis",
  "Strictly confidential portfolio structuring",
  "Objective, zero-fluff market appraisals",
  "Priority access to heavily undersupplied sectors",
  "End-to-end legal and banking facilitation",
]

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="bg-primary pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Institutional Advisory
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              <span className="text-balance">
                Data-Driven Asset Structuring
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              We do not participate in generic market speculation. Our advisory team operates strictly on quantitative data, identifying arbitrage opportunities in undervalued zones and securing pre-launch allocations for our clients. Whether your objective is immediate rental yield or long-term capital appreciation, our services are designed to protect and compound your wealth.
            </p>
          </div>
        </section>

        {/* Process Steps */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col gap-0">
              {steps.map((step, i) => (
                <div
                  key={step.number}
                  className="grid items-start gap-8 border-b border-border py-12 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-12 md:gap-12"
                >
                  <div className="md:col-span-1">
                    <span className="font-serif text-3xl font-bold text-accent/40">
                      {step.number}
                    </span>
                  </div>
                  <div className="md:col-span-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <step.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="font-serif text-xl font-bold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <p className="leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  <div className="md:col-span-6 lg:col-span-5 lg:col-start-8">
                    <p className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Deliverables
                    </p>
                    <ul className="flex flex-col gap-3 border-l-2 border-accent/20 pl-4">
                      {step.deliverables.map((d) => (
                        <li
                          key={d}
                          className="flex items-center gap-2.5 text-foreground font-medium"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                          <span className="text-sm">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What to Expect */}
        <section className="bg-secondary py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
                  Our Mandate
                </p>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  <span className="text-balance">
                    What to expect from our advisory team
                  </span>
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  When you allocate capital through North Capital DXB, you receive institutional-grade guidance built on quantitative metrics and macro-economic forecasting.
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {expectations.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-lg bg-background p-4 shadow-sm">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Conversion CTA Engine */}
        <section className="bg-background pt-20 border-t border-border">
          <div className="mx-auto max-w-3xl px-6 text-center mb-12">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Discuss Your Investment Thesis
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Connect with our advisory team to review current supply gaps and run ROI projections tailored to your capital deployment strategy.
            </p>
          </div>
          
          {/* Replaced static button with your dynamic Lead Form */}
          <LeadForm projectName="Services Page: Strategy Session" />
        </section>
      </main>
      <Footer />
    </>
  )
}