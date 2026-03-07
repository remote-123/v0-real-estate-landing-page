import Image from "next/image"

export function FounderNote() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {/* Photo */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
            <Image
              src="/images/founder.png"
              alt="Founder of NorthCapitalDXB"
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
                &ldquo;I came from fintech. I understood yield curves, capital
                efficiency, and data. When I looked at real estate agencies,
                I couldn&apos;t believe how few of them did.&rdquo;
              </span>
            </blockquote>

            <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
              <p>
                Most agencies operate the same way: show properties, close
                deals, move on. Coming from a fintech background, where every
                decision is stress-tested against market data and economic
                signals, that model never sat right with me. Dubai&apos;s real
                estate market deserved better analysis&mdash;and its investors
                deserved an advisor who thought like one.
              </p>
              <p>
                NorthCapitalDXB was built on a different premise. We model the
                yield, stress-test the exit, and stay with you long after the
                handover keys are signed. As a boutique firm, our reputation
                is the business. We measure success in long-term client
                relationships, not transaction volume.
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <p className="font-semibold text-foreground">
                Managing Director
              </p>
              <p className="text-sm text-muted-foreground">
                Hassan Aizen Latif
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
