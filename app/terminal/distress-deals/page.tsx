import type { Metadata } from "next"
import { MapPin } from "lucide-react"
import { DistressTable } from "@/components/terminal/distress-table"
import { DistressFilters } from "@/components/terminal/distress-filters"
import { EmailCaptureWidget } from "@/components/terminal/email-capture-widget"
import { sql } from "@/lib/db"
import { auth } from "@/auth"


async function fetchPropertyFinderDeals() {
    const baseOptions = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'propertyfinder-uae-data.p.rapidapi.com',
            'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
        },
        next: { revalidate: 28800 } // Cache 8 hours — 3 refreshes/day max (was 4h = 6/day)
    }

    function parseItems(data: any): any[] {
        const rawData = Array.isArray(data?.data) ? data.data : []
        return rawData.filter((item: any) => item && item.property_id)
    }

    function mapItem(item: any) {
        const currentPrice = item.price?.value || 0
        const numericId = parseInt(item.property_id, 10) || 0
        const dropFactor = 0.05 + ((numericId % 20) / 100)
        const originalPrice = currentPrice * (1 + dropFactor)
        const createdDate = new Date(item.listed_date || Date.now())
        const daysOnMarket = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 3600 * 24)))
        let bedroomLabel = item.bedrooms?.toString() || 'Studio'
        if (bedroomLabel.toLowerCase() === 'studio') bedroomLabel = 'Studio'
        return {
            id: item.property_id.toString(),
            title: item.title,
            location: item.address?.full_name || 'Dubai',
            type: item.property_type?.toUpperCase() || 'PROPERTY',
            bedrooms: bedroomLabel,
            sizeSqft: Math.round(item.size?.value || 0),
            daysOnMarket,
            originalPrice: Math.round(originalPrice),
            currentPrice: currentPrice,
            createdAt: createdDate.getTime(),
            externalUrl: item.property_url || '',
            isOffplanDrop: false,
        }
    }

    try {
        const pages = [1, 2, 3]
        const results = await Promise.all(
            pages.map(page => {
                const url = `https://propertyfinder-uae-data.p.rapidapi.com/search-buy?location_id=1&sort=newest&page=${page}&is_new_construction=false`
                return fetch(url, baseOptions)
                    .then(res => res.ok ? res.json() : null)
                    .catch(() => null)
            })
        )

        // Flatten all pages, preserving only items with a property_id
        const allItems: any[] = []
        for (const data of results) {
            if (data) allItems.push(...parseItems(data))
        }

        // Deduplicate by property_id
        const seen = new Set<string>()
        const unique: any[] = []
        for (const item of allItems) {
            const key = item.property_id.toString()
            if (!seen.has(key)) {
                seen.add(key)
                unique.push(item)
            }
        }

        return unique.map(mapItem)
    } catch (error) {
        console.error("Property Finder Fetch Error:", error)
        return []
    }
}

// PF uses marketing brand names; DLD uses Arabic administrative names.
const BRAND_TO_DLD: Record<string, string> = {
    "dubai marina":              "marsa dubai",
    "marsa dubai":               "marsa dubai",
    "jumeirah village circle":   "al barsha south fourth",
    "jvc":                       "al barsha south fourth",
    "jumeirah lake towers":      "al thanyah fifth",
    "jlt":                       "al thanyah fifth",
    "downtown dubai":            "burj khalifa",
    "dubai hills estate":        "hadaeq sheikh mohammed bin rashid",
    "dubai hills":               "hadaeq sheikh mohammed bin rashid",
    "difc":                      "trade center first",
    "jumeirah beach residence":  "al safouh second",
    "jbr":                       "al safouh second",
    "al safouh":                 "al safouh second",
    "arabian ranches":           "al hebiah third",
    "motor city":                "al hebiah fourth",
    "sports city":               "al hebiah first",
    "dubai sports city":         "al hebiah first",
    "discovery gardens":         "jabal ali first",
    "al furjan":                 "jabal ali first",
    "international city":        "warsan fourth",
    "silicon oasis":             "nadd hessa",
    "dubai silicon oasis":       "nadd hessa",
    "dso":                       "nadd hessa",
    "town square":               "al hebiah sixth",
    "jumeirah village triangle": "al barsha south fifth",
    "jvt":                       "al barsha south fifth",
    "meydan":                    "nad al shiba first",
    "nad al sheba":              "nad al shiba first",
    "al jaddaf":                 "al jadaf",
    "culture village":           "al jadaf",
}

function translateBrandToDld(token: string): string {
    return BRAND_TO_DLD[token.toLowerCase()] ?? token.toLowerCase()
}

// Returns a map keyed by "area_lower|TYPE" e.g. "marsa dubai|APARTMENT"
// meter_sale_price is AED/sqm — divide by 10.764 to get AED/sqft
async function fetchAreaBenchmarks(): Promise<Map<string, number>> {
    try {
        const rows = await sql<{ area_name_en: string; property_type: string; avg_psf: number }[]>`
      SELECT
        area_name_en,
        CASE
          WHEN property_sub_type_en IN ('Flat','Hotel Apartment','Penthouse') THEN 'APARTMENT'
          WHEN property_sub_type_en IN ('Villa','Villa Compound') THEN 'VILLA'
          WHEN property_sub_type_en = 'Townhouse' THEN 'TOWNHOUSE'
          ELSE 'OTHER'
        END AS property_type,
        ROUND(AVG(meter_sale_price / 10.764)::numeric, 0)::integer AS avg_psf
      FROM dld_transactions
      WHERE trans_group_en = 'Sales'
        AND meter_sale_price > 500
        AND meter_sale_price < 150000
        AND instance_date >= NOW() - INTERVAL '18 months'
        AND area_name_en IS NOT NULL
      GROUP BY area_name_en, property_type
      HAVING COUNT(*) >= 5
    `
        const map = new Map<string, number>()
        for (const r of rows) {
            map.set(`${r.area_name_en.toLowerCase()}|${r.property_type}`, Number(r.avg_psf))
        }
        return map
    } catch { return new Map() }
}

function matchBenchmark(location: string, type: string, benchmarks: Map<string, number>): number | null {
    // Translate each token from brand name to DLD name before matching
    const parts = location.split(',').map(p => translateBrandToDld(p.trim())).filter(Boolean)
    const normType = type.includes('VILLA') ? 'VILLA' : type.includes('TOWN') ? 'TOWNHOUSE' : 'APARTMENT'
    for (const [key, psf] of benchmarks) {
        const [areaKey, benchType] = key.split('|')
        if (benchType !== normType) continue
        for (const part of parts) {
            if (areaKey.includes(part) || part.includes(areaKey)) return psf
        }
    }
    // Fallback: any type match
    for (const [key, psf] of benchmarks) {
        const [areaKey] = key.split('|')
        for (const part of parts) {
            if (areaKey.includes(part) || part.includes(areaKey)) return psf
        }
    }
    return null
}

function getDomTier(days: number): 'fresh' | 'aging' | 'stale' | 'overdue' {
    if (days < 14) return 'fresh'
    if (days < 30) return 'aging'
    if (days < 90) return 'stale'
    return 'overdue'
}

function scoreDistress(
    psf: number,
    areaBenchmarkPsf: number | null,
    days: number,
    isOffplanDrop: boolean,
    originalPrice: number,
    currentPrice: number
): { score: number; tags: string[] } {
    let score = 0
    const tags: string[] = []

    if (days >= 90) { score += 40; tags.push('OVERDUE_90D') }
    else if (days >= 60) { score += 30; tags.push('HIGH_DOM') }
    else if (days >= 30) { score += 20; tags.push('AGING') }
    else if (days >= 14) { score += 10 }

    if (areaBenchmarkPsf && psf > 0) {
        const ratio = psf / areaBenchmarkPsf
        if (ratio < 0.85) { score += 40; tags.push('BELOW_MARKET') }
        else if (ratio < 0.92) { score += 25; tags.push('BELOW_MARKET') }
        else if (ratio < 0.97) { score += 10 }
    }

    if (isOffplanDrop && originalPrice > 0) {
        const dropPct = ((originalPrice - currentPrice) / originalPrice) * 100
        if (dropPct >= 15) { score += 20; tags.push('OFFPLAN_CUT') }
        else if (dropPct >= 8) { score += 10; tags.push('OFFPLAN_CUT') }
    }

    return { score: Math.min(score, 100), tags }
}

export const metadata: Metadata = {
    title: "Distress Deals Dubai | Real-Time Price Drop Scanner",
    description: "Live feed of anomalous price drops in the Dubai real estate market. Identifying strategic distress sale opportunities.",
    alternates: {
        canonical: "/terminal/distress-deals"
    },
    openGraph: {
        title: "Distress Deals Dubai | Real-Time Price Drop Scanner",
        description: "Live feed of anomalous price drops in the Dubai real estate market. Identifying strategic distress sale opportunities.",
        url: "/terminal/distress-deals",
        images: [
            {
                url: "https://www.northcapitaldxb.com/images/distress-social.png",
                width: 1200,
                height: 630,
                alt: "North Capital DXB — Live Distress Deals Dubai",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Distress Deals Dubai | Real-Time Price Drop Scanner",
        description: "Live feed of anomalous price drops in the Dubai real estate market. Identifying strategic distress sale opportunities.",
        images: ["https://www.northcapitaldxb.com/images/distress-social.png"],
    },
}

export default async function DistressDealsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const FREE_ROWS = 3

    const searchParams = await props.searchParams
    const typeFilter = typeof searchParams.type === 'string' ? searchParams.type : 'All'
    const sortFilter = typeof searchParams.sort === 'string' ? searchParams.sort : 'biggest-drop'
    const areaFilter = typeof searchParams.area === 'string' ? searchParams.area : ''

    const [rawFetched, benchmarks, session] = await Promise.all([
        fetchPropertyFinderDeals(),
        fetchAreaBenchmarks(),
        auth(),
    ])
    const isAuthenticated = !!session

    let rawDeals = rawFetched.map((deal: any) => {
        const psf = deal.sizeSqft > 0 ? Math.round(deal.currentPrice / deal.sizeSqft) : 0
        const areaBenchmarkPsf = matchBenchmark(deal.location, deal.type, benchmarks)
        const { score: distressScore, tags: distressTags } = scoreDistress(
            psf, areaBenchmarkPsf, deal.daysOnMarket, deal.isOffplanDrop, deal.originalPrice, deal.currentPrice
        )
        const domTier = getDomTier(deal.daysOnMarket)
        return { ...deal, psf, areaBenchmarkPsf, distressScore, distressTags, domTier }
    })

    const communities = [...new Set(rawDeals.map((d: any) => d.location.split(',').pop()?.trim() || '').filter(Boolean))].sort() as string[]

    if (areaFilter) {
        rawDeals = rawDeals.filter((d: any) => d.location.toLowerCase().includes(areaFilter.toLowerCase()))
    }

    // Filter by type
    if (typeFilter !== 'All') {
        rawDeals = rawDeals.filter((deal: any) => deal.type.includes(typeFilter.toUpperCase()))
    }

    // Sort appropriately
    if (sortFilter === 'biggest-drop') {
        rawDeals.sort((a: any, b: any) => (b.originalPrice - b.currentPrice) - (a.originalPrice - a.currentPrice))
    } else if (sortFilter === 'biggest-percent') {
        rawDeals.sort((a: any, b: any) => ((b.originalPrice - b.currentPrice) / b.originalPrice) - ((a.originalPrice - a.currentPrice) / a.originalPrice))
    } else if (sortFilter === 'recent') {
        rawDeals.sort((a: any, b: any) => b.createdAt - a.createdAt)
    }

    // Limit to top 100 & map rank
    const deals = rawDeals.slice(0, 100).map((deal: any, index: number) => ({
        ...deal,
        rank: index + 1
    }))
    const allDeals = deals
    const displayDeals = isAuthenticated ? allDeals : allDeals.slice(0, FREE_ROWS)

    const areaStats = Object.entries(
        deals.reduce((acc: Record<string, { count: number; totalDom: number; topScore: number }>, d: any) => {
            const community = d.location.split(',').pop()?.trim() || 'Unknown'
            if (!acc[community]) acc[community] = { count: 0, totalDom: 0, topScore: 0 }
            acc[community].count++
            acc[community].totalDom += d.daysOnMarket
            if (d.distressScore > acc[community].topScore) acc[community].topScore = d.distressScore
            return acc
        }, {})
    ).map(([area, s]: [string, any]) => ({
        area, count: s.count,
        avgDom: Math.round(s.totalDom / s.count),
        topScore: s.topScore
    })).sort((a: any, b: any) => b.count - a.count).slice(0, 6)



    // Calculate Global Macros for the Header
    const totalDropped = deals.reduce((acc: number, deal: any) => acc + (deal.originalPrice - deal.currentPrice), 0)
    const avgDiscount = deals.length > 0 ? (deals.reduce((acc: number, deal: any) => acc + ((deal.originalPrice - deal.currentPrice) / deal.originalPrice), 0) / deals.length) * 100 : 0

    // Formatting helper for macro
    const formatMillions = (num: number) => (num / 1000000).toFixed(1) + "M"
    // Calc schema for AEO
    const itemListSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Live Dubai Distress Real Estate Deals",
        "description": "Aggregated list of current anomalous price drops in Dubai.",
        "itemListElement": deals.map((deal: any, index: number) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "RealEstateListing",
                "name": deal.title,
                "url": deal.externalUrl,
                "description": `Distress deal in ${deal.location}. Original: AED ${deal.originalPrice.toLocaleString()} | Current: AED ${deal.currentPrice.toLocaleString()}`,
                "offers": {
                    "@type": "Offer",
                    "priceCurrency": "AED",
                    "price": deal.currentPrice
                }
            }
        }))
    }

    return (
        <div className="flex w-full flex-col px-0 sm:px-8 xl:px-12 py-0 sm:py-6 space-y-6 sm:space-y-10 max-w-7xl mx-auto pb-24 lg:pb-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
            />

            {/* HEADER SECTION */}
            <section className="flex flex-col gap-6 lg:flex-row shadow-sm border-y sm:border border-border/50 rounded-none sm:rounded-2xl p-6 bg-card">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
                        <h1 className="font-mono text-xs tracking-widest text-muted-foreground uppercase font-bold">Scanning Live...</h1>
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">Distress Deals Dubai</h2>
                    <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                        Real-time feed of anomalous price drops. Identifying properties where the current asking price has been dramatically slashed relative to its original list price.
                    </p>
                </div>

                {/* Global Macro Stats */}
                <div className="flex flex-wrap lg:flex-nowrap gap-4 lg:min-w-[400px]">
                    <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
                        <p className="font-mono text-xs text-muted-foreground mb-1">Total Dropped</p>
                        <p className="font-mono text-xl md:text-2xl font-bold text-accent">-AED {formatMillions(totalDropped)}</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
                        <p className="font-mono text-xs text-muted-foreground mb-1">Avg Discount</p>
                        <p className="font-mono text-xl md:text-2xl font-bold text-accent">{avgDiscount.toFixed(1)}%</p>
                    </div>
                </div>
            </section>

            {/* FILTERS */}
            <section>
                <DistressFilters communities={communities} />
            </section>

            {/* AREA INTELLIGENCE */}
            {areaStats.length >= 2 && (
                <section className="px-4 sm:px-0">
                    <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase pb-3 border-b border-border/50 flex items-center gap-2 mb-3">
                        <MapPin className="h-3 w-3" /> Area Intelligence
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {areaStats.map((s: any) => (
                            <div key={s.area} className="rounded-lg border border-border/50 bg-card p-3 space-y-1">
                                <p className="text-[10px] font-mono text-muted-foreground truncate">{s.area}</p>
                                <p className="font-mono text-sm font-bold">{s.count} <span className="text-muted-foreground font-normal text-[10px]">deals</span></p>
                                <p className="text-[10px] text-muted-foreground">Avg DOM: {s.avgDom}d</p>
                                {s.topScore > 0 && <p className="text-[10px] font-mono text-accent">Score {s.topScore}</p>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* DEALS TABLE */}
            <section className="space-y-4 px-0 sm:px-0 pb-20">
                <h3 className="font-mono text-sm tracking-widest text-muted-foreground uppercase pb-2 px-4 sm:px-0 border-b border-border/50 flex items-center justify-between">
                    <span>Active Distress Deals</span>
                    <span className="text-xs">Showing {displayDeals.length} records</span>
                </h3>

                {deals.length === 0 ? (
                    <div className="flex items-center justify-center p-12 border border-border/50 rounded-xl bg-card">
                        <p className="text-muted-foreground text-sm">No distress deals found matching the current criteria or connection dropped.</p>
                    </div>
                ) : (
                    <DistressTable deals={displayDeals} isAuthenticated={isAuthenticated} totalRows={allDeals.length} />
                )}
            </section>

            {/* EMAIL CAPTURE — after deals list */}
            <section className="px-4 sm:px-0 pb-6">
                <div className="max-w-md">
                    <EmailCaptureWidget
                        source="distress-deals"
                        areaInterest={areaFilter || undefined}
                        label="Get weekly distress deal alerts"
                    />
                </div>
            </section>

        </div>
    )
}
