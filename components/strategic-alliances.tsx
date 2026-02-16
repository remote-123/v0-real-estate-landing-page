export function StrategicAlliances() {
  // Balanced rows for a clean North American aesthetic
  const topRowDevelopers = ["Emaar", "Omniyat", "Meraas", "Binghatti"];
  const bottomRowDevelopers = ["Aldar", "Ellington", "Sobha", "DAMAC"];

  return (
    <section className="border-b border-border bg-card py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-10 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          We don&apos;t just sell property |
          
            <span className=" font-semibold tracking-widest text-accent uppercase">
                | we engineer data driven portfolios
            </span>
        </p>

        <div className="flex flex-col items-center gap-10 md:gap-12">
          {/* Top Row: Development Partners */}
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-20">
            {topRowDevelopers.map((dev) => (
              <div key={dev} className="flex flex-col items-center gap-2">
                <span className="font-serif text-xl font-bold tracking-tight text-foreground/40 md:text-2xl">
                  {dev}
                </span>
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Development Partner
                </span>
              </div>
            ))}
          </div>

          {/* Central Highlight: Aeon & Trisl as the Bridge */}
          <div className="relative flex w-full items-center justify-center py-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex flex-col items-center gap-2 bg-card px-8 md:px-12">
              <span className="font-serif text-2xl font-bold tracking-tight text-foreground/60 md:text-3xl">
                Aeon & Trisl
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-accent uppercase">
                Execution Partner
              </span>
            </div>
          </div>

          {/* Bottom Row: Development Partners */}
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-20">
            {bottomRowDevelopers.map((dev) => (
              <div key={dev} className="flex flex-col items-center gap-2">
                <span className="font-serif text-xl font-bold tracking-tight text-foreground/40 md:text-2xl">
                  {dev}
                </span>
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Development Partner
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}