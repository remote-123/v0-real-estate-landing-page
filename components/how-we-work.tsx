import { ShieldCheck, UserCheck, Zap } from "lucide-react"

export function HowWeWork() {
  return (
    <section className="bg-background py-20 md:py-28 border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            The Best of Both Worlds
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            We bridge the gap between personalized portfolio engineering and 
            market-leading execution.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Boutique Strategy */}
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <UserCheck className="h-6 w-6" />
            </div>
            <h3 className="mb-4 font-serif text-2xl font-bold">Boutique Strategy</h3>
            <p className="leading-relaxed text-muted-foreground">
              You work directly with a senior consultant, who, acts as your strategic filter, providing ideas that are <strong>backed by data</strong> and 
              due diligence. 
            </p>
          </div>

          {/* Institutional Execution */}
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mb-4 font-serif text-2xl font-bold">Institutional Execution</h3>
            <p className="leading-relaxed text-muted-foreground">
              Through our partnership with <strong>Aeon & Trisl</strong> & relationships with top developers, you gain 
              legal security, RERA-regulated contracts, and &quot;first-access&quot; 
              to units that only a market leader can provide.
            </p>
          </div>
        </div>

        {/* One Price Callout */}
        <div className="mt-12 overflow-hidden rounded-2xl bg-accent p-1 text-accent-foreground">
          <div className="rounded-xl border border-accent-foreground/10 bg-accent px-8 py-6 text-center">
            <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-foreground/10">
                <Zap className="h-5 w-5" />
              </div>
              <p className="text-xl font-medium italic">
                <strong>One Price:</strong> You receive specialized portfolio engineering at 
                the exact same price as a standard broker. 
                <span className="ml-2 font-bold underline decoration-accent-foreground/30">
                  We are your unfair advantage.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}