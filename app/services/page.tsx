import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Search,
  BarChart3,
  FileText,
  Building,
  Key,
  Headphones,
  CheckCircle2,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Our Services | HorizonCapital Investment Process",
  description:
    "From initial consultation to property handover and beyond, HorizonCapital guides you through every step of investing in Dubai real estate.",
  openGraph: {
    title: "Our Services | HorizonCapital Investment Process",
    description:
      "From initial consultation to property handover and beyond, HorizonCapital guides you through every step of investing in Dubai real estate.",
    type: "website",
  },
}

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Free Consultation",
    description:
      "We begin with a one-on-one discovery session to understand your investment goals, budget, timeline, and risk appetite. This call is free and comes with no obligations.",
    deliverables: [
      "Investment profile assessment",
      "Market overview presentation",
      "Preliminary strategy recommendation",
    ],
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Market Analysis & Shortlist",
    description:
      "Our research team curates a shortlist of properties matched to your criteria, including ROI projections, developer track records, and area growth forecasts.",
    deliverables: [
      "Customized property shortlist",
      "ROI and yield projections",
      "Developer credibility reports",
    ],
  },
  {
    number: "03",
    icon: FileText,
    title: "Legal & Financial Setup",
    description:
      "We coordinate with trusted legal partners to handle all documentation, including sales agreements, power of attorney (if needed), and escrow account setup.",
    deliverables: [
      "Sales Purchase Agreement (SPA)",
      "Escrow account registration",
      "Payment plan structuring",
    ],
  },
  {
    number: "04",
    icon: Building,
    title: "Property Selection & Reservation",
    description:
      "Once you have chosen your investment, we manage the reservation process, negotiate the best terms, and secure your unit with the developer.",
    deliverables: [
      "Unit reservation and booking",
      "Price negotiation support",
      "Virtual or in-person property tours",
    ],
  },
  {
    number: "05",
    icon: Key,
    title: "Purchase & Handover",
    description:
      "We guide you through the DLD registration, title deed issuance, and final handover. Every milestone is tracked and communicated clearly.",
    deliverables: [
      "DLD registration and title deed",
      "Snagging and inspection support",
      "Key handover coordination",
    ],
  },
  {
    number: "06",
    icon: Headphones,
    title: "Ongoing Management",
    description:
      "After handover, our partnership continues. We offer property management, tenant sourcing, and portfolio advisory services to maximize your returns.",
    deliverables: [
      "Tenant sourcing and leasing",
      "Property maintenance coordination",
      "Annual portfolio performance review",
    ],
  },
]

const expectations = [
  "Dedicated advisor assigned to your account",
  "Regular progress updates at every stage",
  "No hidden fees or surprise costs",
  "Full transparency on pricing and commissions",
  "Access to off-market and pre-launch deals",
  "Post-purchase support and property management",
]

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-primary pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Our Services
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              <span className="text-balance">
                Your A-Z investment journey, handled with care
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              We take care of everything so you can invest with confidence. Here
              is exactly what to expect at each stage of your Dubai real estate
              investment.
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
                  <div className="md:col-span-6">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      What you get
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {step.deliverables.map((d) => (
                        <li
                          key={d}
                          className="flex items-center gap-2.5 text-foreground"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                          <span className="text-sm">{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:col-span-1 md:block" />
                  )}
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
                  Our Promise
                </p>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  <span className="text-balance">
                    What you can expect working with us
                  </span>
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  When you partner with HorizonCapital, you get more than a
                  transaction. You get a dedicated team invested in your success.
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {expectations.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-accent py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-accent-foreground md:text-4xl">
              <span className="text-balance">
                Ready to start your investment journey?
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-accent-foreground/80">
              Your first step is a free consultation. Let us understand your
              goals and create a tailored investment plan.
            </p>
            <Button
              size="lg"
              className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link href="/contact">
                Get Started Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
