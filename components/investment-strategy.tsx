import { ShieldCheck, TrendingUp, BarChart3, Search, Zap, Building2 } from "lucide-react"

const strategyPillars = [
  {
    icon: BarChart3,
    title: "Fiscal Arbitrage: Zero Tax",
    description:
      "The UAE offers zero income and capital gains tax. We help you capitalize on this to maximize net yields and ensure 100% of your appreciation is preserved in a USD-pegged currency.",
  },
  {
    icon: Search,
    title: "The Analytical Filter",
    description:
      "We act as your strategic gatekeeper, filtering out developer 'fluff' to identify projects with low-density community layouts, high scarcity, and long-term tenant retention potential.",
  },
  {
    icon: Building2,
    title: "Institutional Scale",
    description:
      "Through our partnership with Aeon & Trisl, you gain first-access to pre-launch inventory and legal security at the exact same price as a standard broker. We are your unfair advantage.",
  },
]

export function InvestmentStrategy() {
  return (
    <section id="strategy" className="bg-background py-20 md:py-28 border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 max-w-3xl">
          <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
            Our Investment Model
          </p>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Institutional-Grade Advisory for Private Capital
          </h2>
          <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
            We bridge the gap between boutique portfolio engineering and 
            market-leading execution. Our approach is data-driven, objective, 
            and focused on capital preservation.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {strategyPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="group flex flex-col gap-6 rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <pillar.icon className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="mb-3 font-serif text-xl font-bold text-card-foreground">
                  {pillar.title}
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action Callout */}
        <div className="mt-16 overflow-hidden rounded-2xl bg-secondary p-1">
          <div className="rounded-xl border border-border bg-card px-8 py-8 md:py-10 text-center">
            <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:gap-12">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold">The One-Price Advantage</p>
                  <p className="text-sm text-muted-foreground">Premium advisory at standard brokerage costs.</p>
                </div>
              </div>
              <div className="h-px w-full bg-border md:h-12 md:w-px" />
              <p className="max-w-md text-lg font-medium text-muted-foreground">
                Gain access to off-market inventory and data-backed ROI projections before the public launch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
