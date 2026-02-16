import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "James Hartley",
    role: "Property Investor, London",
    quote:
      "NorthCapitalDXB made my first Dubai investment seamless. From property selection to legal paperwork, their team handled everything. I'm now earning 9% net yield on my Marina apartment.",
    rating: 5,
  },
  {
    name: "Ananya Sharma",
    role: "Tech Entrepreneur, Singapore",
    quote:
      "I was skeptical about investing abroad, but the team's transparency and market knowledge won me over. Two years in, my portfolio has appreciated 22% and I've never had a vacancy.",
    rating: 5,
  },
  {
    name: "Robert Muller",
    role: "Retired Executive, Zurich",
    quote:
      "What sets NorthCapitalDXB apart is their ongoing support. Property management, tenant sourcing, maintenance - they truly offer end-to-end service for international investors.",
    rating: 5,
  },
]

export function TrustSignals() {
  return (
    <section id="testimonials" className="bg-primary py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold tracking-wide uppercase text-primary-foreground/60">
            Testimonials
          </p>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
            <span className="text-balance">
              Trusted by investors worldwide
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/70">
            Backed by a licensed Dubai brokerage partnership and a growing
            community of satisfied investors across 30+ countries.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col gap-5 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-8 backdrop-blur-sm"
            >
              <Quote className="h-8 w-8 text-accent" />

              <p className="flex-1 leading-relaxed text-primary-foreground/80">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-accent text-accent"
                  />
                ))}
              </div>

              <div className="border-t border-primary-foreground/10 pt-4">
                <p className="font-semibold text-primary-foreground">
                  {t.name}
                </p>
                <p className="text-sm text-primary-foreground/60">{t.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-12 border-t border-primary-foreground/10 pt-12">
          <div className="text-center">
            <p className="font-serif text-2xl font-bold text-primary-foreground">
              RERA Licensed
            </p>
            <p className="text-xs text-primary-foreground/50 uppercase">
              Dubai Brokerage
            </p>
          </div>
          <div className="h-8 w-px bg-primary-foreground/20" />
          <div className="text-center">
            <p className="font-serif text-2xl font-bold text-primary-foreground">
              DLD Registered
            </p>
            <p className="text-xs text-primary-foreground/50 uppercase">
              Dubai Land Dept.
            </p>
          </div>
          <div className="h-8 w-px bg-primary-foreground/20" />
          <div className="text-center">
            <p className="font-serif text-2xl font-bold text-primary-foreground">
              30+ Countries
            </p>
            <p className="text-xs text-primary-foreground/50 uppercase">
              Global Investors
            </p>
          </div>
          <div className="hidden h-8 w-px bg-primary-foreground/20 md:block" />
          <div className="text-center">
            <p className="font-serif text-2xl font-bold text-primary-foreground">
              5-Star Rated
            </p>
            <p className="text-xs text-primary-foreground/50 uppercase">
              Google Reviews
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
