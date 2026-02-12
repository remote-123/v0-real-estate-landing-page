import Image from "next/image"

export function FounderNote() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {/* Photo */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
            <Image
              src="/images/founder.jpg"
              alt="Founder of HorizonCapital"
              fill
              className="object-cover"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-6">
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">
              Founder&apos;s Note
            </p>

            <blockquote className="font-serif text-2xl leading-relaxed font-medium tracking-tight text-foreground md:text-3xl">
              <span className="text-balance">
                &ldquo;I built this firm because I couldn&apos;t find a Dubai
                broker who spoke my language&mdash;literally and
                financially.&rdquo;
              </span>
            </blockquote>

            <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
              <p>
                Coming from North America, I understand that you don&apos;t just
                want a property; you want a secure asset, clear contracts, and
                an exit strategy. That is exactly what we deliver.
              </p>
              <p>
                Every recommendation we make is backed by data, due diligence,
                and a fiduciary mindset. We treat your capital the way we treat
                our own&mdash;because in many cases, it is our own.
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <p className="font-semibold text-foreground">
                Managing Director
              </p>
              <p className="text-sm text-muted-foreground">
                HorizonCapital Advisory
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
