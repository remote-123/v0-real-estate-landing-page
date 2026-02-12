import Image from "next/image"
import { Badge } from "@/components/ui/badge"

const caseStudies = [
  {
    title: "Beachfront Vista",
    developer: "Emaar Beachfront",
    strategy: "Off-Plan Flip",
    image: "/images/case-beachfront.jpg",
    data: {
      purchaseYear: "2021",
      entryPrice: "AED 2,100,000",
      currentValue: "AED 3,800,000",
      appreciation: "81%",
    },
    note: "Client entered early stage off-plan. Sold upon handover. Zero renovation required.",
  },
  {
    title: "Marina Gate",
    developer: "Dubai Marina",
    strategy: "Buy-to-Let (Short Term)",
    image: "/images/case-marina-gate.jpg",
    data: {
      purchaseYear: "2022",
      entryPrice: "AED 1,600,000",
      currentValue: "AED 185,000 / yr",
      appreciation: "9.2% Net Yield",
    },
    note: "Optimized for holiday rentals. Outperforms standard long-term leases by 3.5%.",
  },
  {
    title: "District One Villas",
    developer: "Meydan",
    strategy: "Value Add (Renovation)",
    image: "/images/case-district-one.jpg",
    data: {
      purchaseYear: "2022",
      entryPrice: "AED 12,500,000",
      currentValue: "AED 19,000,000",
      appreciation: "AED 5,000,000+ Net",
    },
    note: "Acquired distressed unit. Modernized interior. Sold to end-user in 14 months.",
  },
]

export function TrackRecord() {
  return (
    <section id="projects" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Performance Track Record
            </p>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              <span className="text-balance">
                Real results from real investments
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            Representative case studies from our advisory portfolio over the
            last three years.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {caseStudies.map((cs) => (
            <article
              key={cs.title}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
            >
              {/* Image with badge */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={cs.image}
                  alt={`${cs.title} - ${cs.developer}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <Badge className="absolute top-4 right-4 bg-foreground text-background">
                  SOLD & MANAGED
                </Badge>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div>
                  <h3 className="font-serif text-lg font-bold text-card-foreground">
                    {cs.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {cs.developer}
                  </p>
                </div>

                <Badge
                  variant="secondary"
                  className="w-fit bg-accent/10 text-accent"
                >
                  {cs.strategy}
                </Badge>

                {/* Data table */}
                <div className="rounded-lg border border-border bg-secondary/50">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Purchase Year
                    </span>
                    <span className="text-sm font-semibold text-card-foreground">
                      {cs.data.purchaseYear}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Entry Price
                    </span>
                    <span className="text-sm font-semibold text-card-foreground">
                      {cs.data.entryPrice}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Current Value
                    </span>
                    <span className="text-sm font-semibold text-card-foreground">
                      {cs.data.currentValue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Net Capital Appreciation
                    </span>
                    <span className="text-sm font-bold text-accent">
                      {cs.data.appreciation}
                    </span>
                  </div>
                </div>

                {/* Consultant note */}
                <p className="mt-auto border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground italic">
                  &ldquo;{cs.note}&rdquo;
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
