'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SaleTx, RentalListing, PreBoomLow } from '@/app/terminal/building-listings/page'

const BEDROOMS = ['All', 'Studio', '1BR', '2BR', '3BR', '4BR', '5BR+']

function fmt(n: number) {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${Math.round(n / 1_000)}K`
  return `AED ${Math.round(n).toLocaleString()}`
}

function pct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

interface Props {
  building: string | null
  initialSales: SaleTx[]
  initialRentals: RentalListing[]
  preBoomLow: PreBoomLow
}

export function BuildingListingsClient({ building, initialSales, initialRentals, preBoomLow }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState(building ?? '')
  const [suggestions, setSuggestions] = useState<{ name: string; source: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [bedroom, setBedroom] = useState<string>('All')
  const [sqftMin, setSqftMin] = useState('')
  const [sqftMax, setSqftMax] = useState('')
  const [scPsf, setScPsf] = useState('15')

  // Autocomplete fetch
  useEffect(() => {
    if (query.length < 2 || query === building) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/building-listings-suggest?q=${encodeURIComponent(query)}`)
        if (res.ok) setSuggestions(await res.json())
      } catch { /* noop */ }
    }, 280)
    return () => clearTimeout(t)
  }, [query, building])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectBuilding(name: string) {
    setQuery(name)
    setShowSuggestions(false)
    setBedroom('All')
    setSqftMin('')
    setSqftMax('')
    router.push('/terminal/building-listings?building=' + encodeURIComponent(name))
  }

  // Filtered data
  const minSqft = sqftMin ? parseInt(sqftMin, 10) : 0
  const maxSqft = sqftMax ? parseInt(sqftMax, 10) : Infinity

  const filteredSales = useMemo(() => {
    return initialSales.filter(s => {
      if (bedroom !== 'All' && s.bedrooms !== bedroom) return false
      if (s.sqft < minSqft || s.sqft > maxSqft) return false
      return true
    })
  }, [initialSales, bedroom, minSqft, maxSqft])

  const filteredRentals = useMemo(() => {
    return initialRentals.filter(r => {
      if (bedroom !== 'All' && r.bedrooms !== bedroom) return false
      if (r.sqft < minSqft || r.sqft > maxSqft) return false
      return true
    })
  }, [initialRentals, bedroom, minSqft, maxSqft])

  // Yield calc
  const yieldCalc = useMemo(() => {
    const cheapestSale = filteredSales.reduce<SaleTx | null>((min, s) =>
      !min || s.price < min.price ? s : min, null)
    const cheapestRent = filteredRentals.reduce<RentalListing | null>((min, r) =>
      !min || r.annual_price < min.annual_price ? r : min, null)
    if (!cheapestSale || !cheapestRent) return null

    const sc = Number(scPsf) || 15
    const annualSC = sc * cheapestRent.sqft
    const annualRent = cheapestRent.annual_price
    const salePrice = cheapestSale.price
    const netYield = ((annualRent - annualSC) / salePrice) * 100
    const grossYield = (annualRent / salePrice) * 100

    return {
      salePrice,
      annualRent,
      annualSC,
      netYield,
      grossYield,
      scSqft: cheapestRent.sqft,
    }
  }, [filteredSales, filteredRentals, scPsf])

  // Pre-boom capital appreciation (filtered bedroom if possible)
  const preBoomFiltered = useMemo(() => {
    if (!preBoomLow) return null
    if (bedroom !== 'All' && preBoomLow.bedrooms !== bedroom) return null
    return preBoomLow
  }, [preBoomLow, bedroom])

  const hasData = initialSales.length > 0 || initialRentals.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase font-bold">
            Building Listings
          </p>
        </div>
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            {building ? building : 'Search Any Building'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            {building
              ? `${initialSales.length} recent sales · ${initialRentals.length} active rentals`
              : 'DLD sale transactions + active Bayut rental listings for any Dubai building'}
          </p>
        </div>

        {/* Search box */}
        <div className="relative max-w-xl" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim().length > 1) selectBuilding(query.trim())
              }}
              placeholder="e.g. Marina Gate, Burj Khalifa, Creek Beach..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-card border border-border/60 rounded-lg shadow-xl overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s.name}
                  onMouseDown={() => selectBuilding(s.name)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="truncate">{s.name}</span>
                  <span className={cn(
                    'ml-2 shrink-0 font-mono text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-widest',
                    s.source === 'sale'
                      ? 'bg-blue-500/15 text-blue-400'
                      : s.source === 'rent'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-accent/15 text-accent'
                  )}>
                    {s.source}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      {hasData && (
        <div className="flex flex-wrap items-center gap-3 px-1">
          {/* Bedroom chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {BEDROOMS.map(b => (
              <button
                key={b}
                onClick={() => setBedroom(b)}
                className={cn(
                  'px-3 py-1.5 rounded-full font-mono text-xs font-semibold transition-colors border',
                  bedroom === b
                    ? 'bg-accent text-black border-accent'
                    : 'bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-accent/40'
                )}
              >
                {b}
              </button>
            ))}
          </div>
          {/* Sqft range */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="font-mono text-xs text-muted-foreground">sqft</span>
            <input
              value={sqftMin}
              onChange={e => setSqftMin(e.target.value)}
              placeholder="min"
              className="w-20 px-2 py-1 text-xs bg-card border border-border/50 rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50"
            />
            <span className="text-muted-foreground/40">–</span>
            <input
              value={sqftMax}
              onChange={e => setSqftMax(e.target.value)}
              placeholder="max"
              className="w-20 px-2 py-1 text-xs bg-card border border-border/50 rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>
      )}

      {/* Yield banner + capital appreciation */}
      {hasData && (
        <section className="rounded-xl border border-accent/20 bg-accent/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-accent">
              Yield Estimate
            </p>
          </div>

          {yieldCalc ? (
            <div className="space-y-3">
              {/* Main yield numbers */}
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">Net Yield</p>
                  <p className={cn(
                    'font-mono text-3xl font-bold',
                    yieldCalc.netYield >= 7 ? 'text-emerald-400' : yieldCalc.netYield >= 5 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {yieldCalc.netYield.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">Gross Yield</p>
                  <p className="font-mono text-xl font-bold text-foreground/60">{yieldCalc.grossYield.toFixed(2)}%</p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Sale Price (cheapest)', value: fmt(yieldCalc.salePrice) },
                  { label: 'Annual Rent (cheapest)', value: fmt(yieldCalc.annualRent) },
                  { label: `Service Charge (${Number(scPsf) || 15} AED/sqft × ${yieldCalc.scSqft.toLocaleString()} sqft)`, value: fmt(yieldCalc.annualSC) },
                  { label: 'Net Annual Income', value: fmt(yieldCalc.annualRent - yieldCalc.annualSC) },
                ].map(item => (
                  <div key={item.label} className="space-y-0.5">
                    <p className="font-mono text-[9px] text-muted-foreground/70 uppercase tracking-wide leading-tight">{item.label}</p>
                    <p className="font-mono text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Service charge input */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                <span className="font-mono text-[10px] text-muted-foreground">Override service charge AED/sqft:</span>
                <input
                  type="number"
                  value={scPsf}
                  onChange={e => setScPsf(e.target.value)}
                  className="w-16 px-2 py-0.5 text-xs bg-background border border-border/50 rounded text-foreground focus:outline-none focus:border-accent/50 font-mono"
                  min="1" max="100"
                />
                <span className="font-mono text-[10px] text-muted-foreground/50">default: 15 (Dubai avg)</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {filteredSales.length === 0 && filteredRentals.length === 0
                ? 'No data matching current filters.'
                : filteredSales.length === 0
                  ? 'No sale transactions found — yield needs a sale price.'
                  : 'No active rental listings found — yield needs a rent price.'}
            </p>
          )}

          {/* Capital appreciation */}
          {preBoomFiltered && yieldCalc && (
            <div className="pt-3 border-t border-border/30 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-blue-400" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Capital Appreciation Monitor
                </p>
              </div>
              <div className="flex flex-wrap gap-6 items-end">
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground/70 uppercase tracking-wide">Pre-Boom Low ({preBoomFiltered.date.slice(0,7)})</p>
                  <p className="font-mono text-sm font-semibold text-foreground/60">{fmt(preBoomFiltered.price)}</p>
                  <p className="font-mono text-[9px] text-muted-foreground/50">{preBoomFiltered.bedrooms} · {preBoomFiltered.sqft.toLocaleString()} sqft</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground/70 uppercase tracking-wide">Current Cheapest Sale</p>
                  <p className="font-mono text-sm font-semibold text-foreground">{fmt(yieldCalc.salePrice)}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-muted-foreground/70 uppercase tracking-wide">Appreciation</p>
                  <p className={cn(
                    'font-mono text-2xl font-bold',
                    ((yieldCalc.salePrice - preBoomFiltered.price) / preBoomFiltered.price) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {pct(((yieldCalc.salePrice - preBoomFiltered.price) / preBoomFiltered.price) * 100)}
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground/50">since pre-2022 boom</p>
                </div>
              </div>
            </div>
          )}
          {preBoomLow && !preBoomFiltered && bedroom !== 'All' && (
            <p className="font-mono text-[10px] text-muted-foreground/50 pt-1 border-t border-border/30">
              Pre-boom data exists for this building but not for {bedroom} — select All or another bedroom type.
            </p>
          )}
        </section>
      )}

      {/* Two-column listings */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales column */}
          <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">Recent Sales</p>
                <p className="font-mono text-[10px] text-muted-foreground">DLD transactions · last 3 years</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{filteredSales.length.toLocaleString()}</span>
            </div>
            {filteredSales.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No sales match filters.</div>
            ) : (
              <div className="divide-y divide-border/30 max-h-[520px] overflow-y-auto">
                {filteredSales.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">{fmt(s.price)}</span>
                        {s.psm > 0 && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            {Math.round(s.psm).toLocaleString()} AED/sqm
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BedroomBadge bedroom={s.bedrooms} />
                        {s.sqft > 0 && <span className="font-mono text-[10px]">{s.sqft.toLocaleString()} sqft</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-mono text-[10px] text-muted-foreground">{s.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rentals column */}
          <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">Active Rentals</p>
                <p className="font-mono text-[10px] text-muted-foreground">Live listings · Bayut / PF</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{filteredRentals.length.toLocaleString()}</span>
            </div>
            {filteredRentals.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No rentals match filters.</div>
            ) : (
              <div className="divide-y divide-border/30 max-h-[520px] overflow-y-auto">
                {filteredRentals.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">{fmt(r.annual_price)}<span className="text-muted-foreground font-normal">/yr</span></span>
                        <span className="font-mono text-[10px] text-muted-foreground/60">{fmt(r.monthly_price)}/mo</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BedroomBadge bedroom={r.bedrooms} />
                        {r.sqft > 0 && <span className="font-mono text-[10px]">{r.sqft.toLocaleString()} sqft</span>}
                      </div>
                    </div>
                    {r.url && (
                      <Link
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 shrink-0 text-muted-foreground hover:text-accent transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {!hasData && building && (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center space-y-2">
          <p className="text-sm text-foreground">No data found for "{building}"</p>
          <p className="text-xs text-muted-foreground">Try a different building name or a shorter fragment (e.g. "Creek Beach" instead of the full name)</p>
        </div>
      )}

      {!building && (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center space-y-2">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">Search for a building above to see listings and yield analysis</p>
        </div>
      )}

      <p className="text-[11px] font-mono text-muted-foreground/40 px-1">
        Sales: DLD transaction data · Rentals: Bayut/PropertyFinder live listings · Yield is indicative only
      </p>
    </div>
  )
}

function BedroomBadge({ bedroom }: { bedroom: string }) {
  const colors: Record<string, string> = {
    Studio: 'bg-purple-500/15 text-purple-400',
    '1BR': 'bg-blue-500/15 text-blue-400',
    '2BR': 'bg-cyan-500/15 text-cyan-400',
    '3BR': 'bg-emerald-500/15 text-emerald-400',
    '4BR': 'bg-yellow-500/15 text-yellow-400',
    '5BR+': 'bg-red-500/15 text-red-400',
  }
  return (
    <span className={cn(
      'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold border-transparent',
      colors[bedroom] ?? 'bg-muted/30 text-muted-foreground'
    )}>
      {bedroom}
    </span>
  )
}
