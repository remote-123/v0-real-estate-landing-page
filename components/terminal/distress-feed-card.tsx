"use client"

import { Badge } from "@/components/ui/badge"
import { ArrowDownRight, CalendarCheck, ExternalLink } from "lucide-react"
import { SITE_CONFIG } from "@/lib/constants"

interface DistressFeedCardProps {
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

export function DistressFeedCard({
    rank,
    title,
    location,
    type,
    bedrooms,
    sizeSqft,
    daysOnMarket,
    originalPrice,
    currentPrice,
    currency = "AED",
    externalUrl,
    psf,
    distressScore,
    distressTags,
    areaBenchmarkPsf,
    domTier,
    isOffplanDrop: _isOffplanDrop,
}: DistressFeedCardProps) {
    const priceDropValue = originalPrice - currentPrice
    const priceDropPercentage = ((priceDropValue / originalPrice) * 100).toFixed(1)

    // formatting helpers
    const formatCompact = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
        if (num >= 1000) return (num / 1000).toFixed(0) + "K"
        return num.toString()
    }

    const formatFull = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num)
    }

    return (
        <div
            onClick={() => window.open(SITE_CONFIG.calendarLink, '_blank', 'noopener,noreferrer')}
            className="group relative w-full cursor-pointer rounded-none sm:rounded-xl border-y sm:border border-border/50 bg-card p-4 sm:p-6 transition-all hover:bg-muted/50 hover:border-border overflow-hidden block"
        >
            {/* Subtle left glow effect on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">

                {/* Ranking & Core Info */}
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0 w-8 sm:w-12">
                        <span className="font-mono text-xl sm:text-3xl font-bold text-muted-foreground/30">
                            #{rank}
                        </span>
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
                            <CalendarCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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

                        {/* Tags array */}
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

                {/* Pricing / Panic Stats */}
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
    )
}
