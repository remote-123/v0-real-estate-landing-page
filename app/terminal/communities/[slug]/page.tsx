import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Building2, TrendingUp, TrendingDown, BarChart3, Layers } from 'lucide-react'
import Link from 'next/link'
import {
  MOCK_COMMUNITIES,
  getCommunityBySlug,
  getMockPriceHistory,
  getMockTransactions,
} from '@/lib/mock-communities'
import { CommunityCharts } from '@/components/terminal/community-charts'
import { cn } from '@/lib/utils'

export async function generateStaticParams() {
  return MOCK_COMMUNITIES.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const community = getCommunityBySlug(slug)
  if (!community) return {}
  return {
    title: `${community.name} — Community Intelligence | North Capital DXB`,
    description: `Yield, price/sqft, transaction volume, and supply pipeline for ${community.name}, Dubai.`,
  }
}

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const community = getCommunityBySlug(slug)
  if (!community) notFound()

  const priceHistory = getMockPriceHistory(community)
  const transactions = getMockTransactions(community)
  const aptPct = Math.round((community.apartments / community.totalUnits) * 100)
  const villaPct = 100 - aptPct

  const formatPrice = (n: number) => {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
    return `AED ${n}`
  }

  const yieldColor =
    community.grossYield >= 7 ? 'text-emerald-400' :
    community.grossYield >= 5.5 ? 'text-yellow-400' :
    'text-red-400'

  const momColor = community.momChange >= 0 ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">

      {/* Back */}
      <Link
        href="/terminal/communities"
        className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors px-4 sm:px-0"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Community Screener
      </Link>

      {/* Header */}
      <section className="border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">{community.area}</span>
              {!community.isFreehold && (
                <span className="font-mono text-[10px] text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5 rounded">Leasehold</span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">{community.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('font-mono text-2xl font-bold', yieldColor)}>
              {community.grossYield.toFixed(1)}% yield
            </span>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'AED / sqft', value: new Intl.NumberFormat('en-US').format(community.avgPricePerSqft) },
            { label: 'Median Price', value: formatPrice(community.medianPrice) },
            { label: 'Total Units', value: new Intl.NumberFormat('en-US').format(community.totalUnits) },
            { label: 'Gross Yield', value: `${community.grossYield.toFixed(1)}%`, className: yieldColor },
            { label: 'Txns (30d)', value: community.transactions30d.toString() },
            { label: 'MoM Change', value: `${community.momChange >= 0 ? '+' : ''}${community.momChange.toFixed(1)}%`, className: momColor },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-lg bg-background border border-border/50 p-3">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className={cn('font-mono text-base font-bold text-foreground leading-tight', kpi.className)}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Charts — client component */}
      <CommunityCharts priceHistory={priceHistory} />

      {/* Unit breakdown + Supply */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Unit mix */}
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Unit Mix</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground font-medium">Apartments</span>
                <span className="font-mono text-muted-foreground">{new Intl.NumberFormat('en-US').format(community.apartments)} ({aptPct}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${aptPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground font-medium">Villas / Townhouses</span>
                <span className="font-mono text-muted-foreground">{new Intl.NumberFormat('en-US').format(community.villas)} ({villaPct}%)</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: `${villaPct}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* Supply pipeline */}
        <section className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Supply Pipeline</h3>
          </div>
          {community.upcomingSupply > 0 ? (
            <div className="space-y-2">
              <p className="font-mono text-2xl font-bold text-yellow-400">
                +{new Intl.NumberFormat('en-US').format(community.upcomingSupply)}
              </p>
              <p className="text-sm text-muted-foreground">units expected within 24 months</p>
              <p className="text-xs text-muted-foreground/60 font-mono">
                Supply ratio: {((community.upcomingSupply / community.totalUnits) * 100).toFixed(1)}% of existing stock
              </p>
              {community.upcomingSupply / community.totalUnits > 0.15 && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 mt-2">
                  <span className="text-yellow-400 text-xs font-mono">⚠</span>
                  <p className="text-xs text-yellow-400/80">High supply incoming — monitor for yield compression risk.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="font-mono text-2xl font-bold text-emerald-400">0</p>
              <p className="text-sm text-muted-foreground">No units in the pipeline</p>
              <p className="text-xs text-muted-foreground/60 font-mono mt-1">Constrained supply supports price stability.</p>
            </div>
          )}
        </section>
      </div>

      {/* Recent transactions */}
      <section className="border border-border/50 rounded-xl bg-card overflow-hidden">
        <div className="flex items-center gap-2 p-5 border-b border-border/50">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">Recent Transactions</h3>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">Mock data — DLD integration coming</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                {['Date', 'Type', 'Beds', 'Sqft', 'AED/sqft', 'Total Price'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-right first:text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={t.id} className={cn('border-b border-border/20 last:border-0', i % 2 === 0 ? 'bg-card' : 'bg-muted/10')}>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{t.date}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{t.type}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{t.bedrooms} BR</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{new Intl.NumberFormat('en-US').format(t.sqft)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{new Intl.NumberFormat('en-US').format(t.pricePerSqft)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-foreground">
                    {t.totalPrice >= 1_000_000
                      ? `${(t.totalPrice / 1_000_000).toFixed(2)}M`
                      : `${(t.totalPrice / 1_000).toFixed(0)}K`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
