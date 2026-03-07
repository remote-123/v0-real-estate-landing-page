import type { Metadata } from 'next'
import { CommunitiesTable } from '@/components/terminal/communities-table'
import { MOCK_COMMUNITIES } from '@/lib/mock-communities'

export const metadata: Metadata = {
  title: 'Community Screener | North Capital DXB',
  description: 'Institutional-grade metrics across every Dubai community — yield, price/sqft, transaction velocity, and supply pipeline.',
  alternates: {
    canonical: 'https://www.northcapitaldxb.com/terminal/communities',
  },
}

export default function CommunitiesPage() {
  const avgYield = (MOCK_COMMUNITIES.reduce((s, c) => s + c.grossYield, 0) / MOCK_COMMUNITIES.length).toFixed(1)
  const topYield = Math.max(...MOCK_COMMUNITIES.map(c => c.grossYield)).toFixed(1)
  const totalTxns = MOCK_COMMUNITIES.reduce((s, c) => s + c.transactions30d, 0)

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row shadow-sm border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
            <h1 className="font-mono text-xs tracking-widest text-muted-foreground uppercase font-bold">
              Community Screener — {MOCK_COMMUNITIES.length} Markets
            </h1>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Dubai Community Intelligence
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Yield, transaction velocity, supply pipeline, and price momentum across every major Dubai community. Sort any column. Click a row for a deep-dive.
          </p>
        </div>

        {/* Macro stats */}
        <div className="flex flex-wrap lg:flex-nowrap gap-4 lg:min-w-[440px]">
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Avg Gross Yield</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-accent">{avgYield}%</p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Top Yield</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-emerald-400">{topYield}%</p>
          </div>
          <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
            <p className="font-mono text-xs text-muted-foreground mb-1">Txns (30d)</p>
            <p className="font-mono text-xl md:text-2xl font-bold text-foreground">
              {new Intl.NumberFormat('en-US').format(totalTxns)}
            </p>
          </div>
        </div>
      </section>

      {/* Data disclaimer */}
      <p className="text-[11px] font-mono text-muted-foreground/50 px-1">
        Data sourced from DLD transactions and listing APIs. Yield calculations based on 12-month rolling averages. Updated periodically.
      </p>

      {/* Table */}
      <section>
        <CommunitiesTable data={MOCK_COMMUNITIES} />
      </section>

    </div>
  )
}
