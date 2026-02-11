import { ShieldCheck, TrendingUp, Users } from "lucide-react"

const propositions = [
  {
    icon: ShieldCheck,
    title: "Tax-Free Returns",
    description:
      "The UAE offers zero income tax, zero capital gains tax, and zero property tax for investors. Keep 100% of your rental income and appreciation profits.",
  },
  {
    icon: TrendingUp,
    title: "Booming Market",
    description:
      "Dubai's real estate market recorded over $142 billion in transactions in 2024. Strong population growth and infrastructure development continue to drive demand.",
  },
  {
    icon: Users,
    title: "A-Z Personal Guidance",
    description:
      "From selecting the right masterplan to financing, legal setup, and property management, our team handles every step so you can invest with confidence.",
  },
]

export function ValueProps() {
  return (
    <section id="why-dubai" className="bg-secondary py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
            Why Dubai
          </p>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            <span className="text-balance">
              The world&apos;s most compelling investment destination
            </span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Dubai combines political stability, world-class infrastructure, and
            investor-friendly policies that make it the top choice for global
            real estate investors.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {propositions.map((prop) => (
            <div
              key={prop.title}
              className="group flex flex-col gap-5 rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <prop.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-serif text-xl font-bold text-card-foreground">
                {prop.title}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
