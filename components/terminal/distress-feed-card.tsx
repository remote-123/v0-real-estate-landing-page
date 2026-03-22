"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { ArrowDownRight, ExternalLink, X, MessageCircle, Calendar, TrendingDown, Clock, MapPin } from "lucide-react"
import { SITE_CONFIG } from "@/lib/constants"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid,
} from "recharts"

interface TrendPoint { month: string; avg_psf: number; txn_count: number }

function PsfTrendChart({ area, type, listingPsf }: { area: string; type: string; listingPsf: number }) {
  const [data, setData] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/area-psf-trend?location=${encodeURIComponent(area)}&type=${encodeURIComponent(type)}`)
      .then(r => r.json())
      .then(j => { if (Array.isArray(j.data)) setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [area, type])

  if (loading) return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">Loading trend…</div>
  if (data.length < 2) return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">Insufficient DLD data for this area</div>

  const shortMonth = (m: string) => {
    const [y, mo] = m.split("-")
    const d = new Date(Number(y), Number(mo) - 1)
    return d.toLocaleString("default", { month: "short" }).toUpperCase() + " " + y.slice(2)
  }

  const chartData = data.map(d => ({ ...d, label: shortMonth(d.month) }))

  // Expand Y-axis domain to always include the listing PSF reference line
  const allValues = [...data.map(d => d.avg_psf), ...(listingPsf > 0 ? [listingPsf] : [])]
  const yMin = Math.floor(Math.min(...allValues) * 0.93)
  const yMax = Math.ceil(Math.max(...allValues) * 1.07)

  return (
    <ResponsiveContainer width="100%" height={130}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
          interval={2}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}`}
        />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
          formatter={(val: number, name: string) => [
            `AED ${val.toLocaleString()}/sqft`,
            name === "avg_psf" ? "Area avg" : name,
          ]}
          labelFormatter={l => l}
        />
        <Line
          type="monotone"
          dataKey="avg_psf"
          stroke="#10b981"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
        {listingPsf > 0 && (
          <ReferenceLine
            y={listingPsf}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            label={{ value: `This listing ${listingPsf.toLocaleString()}`, position: "insideTopRight", fontSize: 9, fill: "#f59e0b" }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

export interface DistressFeedCardProps {
    rank: number
    title: string
    location: string
    type: string
    bedrooms: number | string
    sizeSqft: number
    daysOnMarket: number
    originalPrice: number
    currentPrice: number
    currency?: string
    externalUrl?: string
    psf: number
    distressScore: number
    distressTags: string[]
    areaBenchmarkPsf: number | null
    domTier: 'fresh' | 'aging' | 'stale' | 'overdue'
    isOffplanDrop: boolean
}

const WA_NUMBER = "971554006230"

const DOM_TIER_LABEL = {
    fresh: { label: "Fresh listing", color: "text-emerald-400 border-emerald-500/30" },
    aging: { label: "Aging — 14–30 days", color: "text-yellow-400 border-yellow-500/30" },
    stale: { label: "Stale — 30–90 days", color: "text-orange-400 border-orange-500/30" },
    overdue: { label: "Overdue — 90+ days", color: "text-red-400 border-red-500/30" },
}

function formatCompact(num: number) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(0) + "K"
    return num.toString()
}

function formatFull(num: number) {
    return new Intl.NumberFormat('en-US').format(num)
}

function ScoreMeter({ score }: { score: number }) {
    const color = score >= 60 ? "bg-red-500" : score >= 35 ? "bg-orange-400" : "bg-yellow-400"
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Distress Score</span>
                <span className={`font-mono text-sm font-bold ${score >= 60 ? "text-red-400" : score >= 35 ? "text-orange-400" : "text-yellow-400"}`}>{score}/100</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/30">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
            </div>
        </div>
    )
}

export function DealModal({ deal, onClose }: { deal: DistressFeedCardProps; onClose: () => void }) {
    const drop = deal.originalPrice - deal.currentPrice
    const dropPct = ((drop / deal.originalPrice) * 100).toFixed(1)
    const psfVsArea = deal.areaBenchmarkPsf && deal.psf > 0
        ? ((deal.psf - deal.areaBenchmarkPsf) / deal.areaBenchmarkPsf) * 100
        : null
    const domTier = DOM_TIER_LABEL[deal.domTier]

    const waMessage = encodeURIComponent(
        `Hi, I saw a distress deal on North Capital DXB terminal:\n${deal.title}\n${deal.location}\nAED ${formatFull(deal.currentPrice)} (${dropPct}% below list)\n\nCan you help me evaluate this?`
    )

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border/60 bg-card shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/40 bg-card px-5 py-4">
                    <div className="flex-1 pr-4">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                            #{deal.rank} Distress Signal
                        </p>
                        <h2 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{deal.title}</h2>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 shrink-0" /> {deal.location}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-5">
                    {/* Price analysis */}
                    <div className="rounded-lg border border-border/40 bg-background/50 p-4 space-y-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Price Analysis</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-mono text-xs text-muted-foreground line-through">
                                    AED {formatFull(deal.originalPrice)}
                                </p>
                                <p className="font-mono text-xl font-bold text-foreground">
                                    AED {formatFull(deal.currentPrice)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 rounded bg-accent/10 px-3 py-1.5 text-accent ring-1 ring-accent/20">
                                <ArrowDownRight className="h-4 w-4" />
                                <span className="font-mono text-lg font-bold">-{dropPct}%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Dropped by</span>
                            <span className="font-mono font-semibold text-accent">-AED {formatFull(drop)}</span>
                        </div>
                    </div>

                    {/* PSF trend chart */}
                    {deal.psf > 0 && (
                        <div className="rounded-lg border border-border/40 bg-background/50 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                    AED/sqft — 18-month area trend
                                </p>
                                <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
                                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-px bg-emerald-500" /> Area avg</span>
                                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-px border-t-2 border-dashed border-amber-400" /> This listing</span>
                                </div>
                            </div>
                            <PsfTrendChart area={deal.location} type={deal.type} listingPsf={deal.psf} />
                            {deal.areaBenchmarkPsf && psfVsArea !== null && (
                                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                    <span className="text-[10px] text-muted-foreground">vs 18-mo avg AED {formatFull(deal.areaBenchmarkPsf)}/sqft</span>
                                    <span className={`font-mono text-xs font-semibold ${psfVsArea < 0 ? "text-emerald-400" : "text-red-400"}`}>
                                        {psfVsArea > 0 ? "+" : ""}{psfVsArea.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                            {psfVsArea !== null && psfVsArea < -5 && (
                                <p className="text-[11px] text-emerald-400 font-medium">
                                    Priced {Math.abs(psfVsArea).toFixed(1)}% below the 18-month {deal.type.toLowerCase()} avg for this area.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Property details */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-md border border-border/30 bg-background/30 px-3 py-2">
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Type</p>
                            <p className="text-xs font-semibold text-foreground mt-0.5">{deal.type}</p>
                        </div>
                        <div className="rounded-md border border-border/30 bg-background/30 px-3 py-2">
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Beds</p>
                            <p className="text-xs font-semibold text-foreground mt-0.5">{deal.bedrooms} BR</p>
                        </div>
                        <div className="rounded-md border border-border/30 bg-background/30 px-3 py-2">
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Size</p>
                            <p className="text-xs font-semibold text-foreground mt-0.5">{formatFull(deal.sizeSqft)} sqft</p>
                        </div>
                    </div>

                    {/* Market context */}
                    <div className="rounded-lg border border-border/40 bg-background/50 p-4 space-y-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Market Context</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Days on market</span>
                            </div>
                            <span className={`font-mono text-xs font-semibold border rounded-sm px-2 py-0.5 ${domTier.color}`}>
                                {deal.daysOnMarket}d — {domTier.label}
                            </span>
                        </div>
                        {deal.distressTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {deal.distressTags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-[10px] font-mono uppercase tracking-widest text-accent border-accent/30 rounded-sm">
                                        {tag.replace(/_/g, ' ')}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        {deal.distressScore > 0 && <ScoreMeter score={deal.distressScore} />}
                    </div>

                    {/* CTAs */}
                    <div className="space-y-2 pt-1">
                        <a
                            href={`https://wa.me/${WA_NUMBER}?text=${waMessage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 text-sm font-semibold transition-colors"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Chat with an analyst on WhatsApp
                        </a>
                        <a
                            href={SITE_CONFIG.calendarLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full rounded-lg border border-border/50 hover:bg-muted/30 text-foreground px-4 py-2.5 text-sm font-medium transition-colors"
                        >
                            <Calendar className="h-4 w-4" />
                            Book a call
                        </a>
                        {deal.externalUrl && (
                            <a
                                href={deal.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full rounded-lg text-muted-foreground hover:text-foreground px-4 py-2 text-xs transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View original listing
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function DistressFeedCard(props: DistressFeedCardProps) {
    const [modalOpen, setModalOpen] = useState(false)
    const {
        rank, title, location, type, bedrooms, sizeSqft, daysOnMarket,
        originalPrice, currentPrice, currency = "AED", externalUrl,
        psf, distressScore, distressTags, areaBenchmarkPsf, domTier,
    } = props

    const priceDropValue = originalPrice - currentPrice
    const priceDropPercentage = ((priceDropValue / originalPrice) * 100).toFixed(1)

    return (
        <>
            <div
                onClick={() => setModalOpen(true)}
                className="group relative w-full cursor-pointer rounded-none sm:rounded-xl border-y sm:border border-border/50 bg-card p-4 sm:p-6 transition-all hover:bg-muted/50 hover:border-border overflow-hidden block"
            >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0 w-8 sm:w-12">
                            <span className="font-mono text-xl sm:text-3xl font-bold text-muted-foreground/30">
                                #{rank}
                            </span>
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
                                {externalUrl && (
                                    <a
                                        href={externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="View original listing"
                                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">{location}</p>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider bg-secondary rounded-sm">
                                    [{type}]
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider bg-secondary rounded-sm">
                                    [{bedrooms} BR]
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider bg-secondary rounded-sm">
                                    [{formatFull(sizeSqft)} SQFT]
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] uppercase font-mono tracking-wider border-border/50 rounded-sm ${
                                    domTier === 'overdue' ? 'text-red-500/80 border-red-500/30' :
                                    domTier === 'stale' ? 'text-orange-500/80 border-orange-500/30' :
                                    domTier === 'aging' ? 'text-yellow-500/80 border-yellow-500/30' :
                                    'text-muted-foreground'
                                }`}>
                                    [{daysOnMarket}D ON MARKET]
                                </Badge>
                                {distressTags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-accent border-accent/30 rounded-sm">
                                        {tag.replace(/_/g, ' ')}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex w-full sm:w-auto items-end sm:items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t border-border/50 sm:border-none pt-4 sm:pt-0 mt-2 sm:mt-0">
                        <div className="space-y-1 sm:text-right">
                            <div className="flex items-center gap-2 sm:justify-end">
                                <span className="font-mono text-xs text-muted-foreground line-through">
                                    {currency} {formatCompact(originalPrice)}
                                </span>
                                <span className="font-mono text-sm font-medium text-foreground">
                                    {currency} {formatCompact(currentPrice)}
                                </span>
                            </div>
                            {psf > 0 && (
                                <p className="font-mono text-[10px] text-muted-foreground">
                                    AED {psf.toLocaleString()}/sqft
                                    {areaBenchmarkPsf && (
                                        <span className={psf < areaBenchmarkPsf * 0.95 ? " text-accent" : ""}>
                                            {" "}(area avg: {areaBenchmarkPsf.toLocaleString()})
                                        </span>
                                    )}
                                </p>
                            )}
                            <div className="flex items-center gap-1 sm:justify-end text-accent">
                                <span className="text-xs font-medium">DROP</span>
                                <span className="font-mono text-lg font-bold tracking-tight">
                                    -{currency} {formatCompact(priceDropValue)}
                                </span>
                            </div>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1 rounded bg-accent/10 px-2.5 py-1 text-accent ring-1 ring-accent/20">
                                <ArrowDownRight className="h-3.5 w-3.5" />
                                <span className="font-mono text-sm font-bold">{priceDropPercentage}%</span>
                            </div>
                            {distressScore > 0 && (
                                <div className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono font-bold ring-1 ${
                                    distressScore >= 60 ? 'bg-red-500/10 text-red-400 ring-red-500/20' :
                                    distressScore >= 35 ? 'bg-orange-500/10 text-orange-400 ring-orange-500/20' :
                                    'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'
                                }`}>
                                    SCORE {distressScore}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {modalOpen && <DealModal deal={props} onClose={() => setModalOpen(false)} />}
        </>
    )
}
