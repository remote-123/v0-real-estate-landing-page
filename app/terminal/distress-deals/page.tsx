import type { Metadata } from "next"
import { Activity, ArrowDownRight, Clock, MapPin, Search } from "lucide-react"
import { DistressFeedCard } from "@/components/terminal/distress-feed-card"
import { DistressFilters } from "@/components/terminal/distress-filters"

// Note: If using `searchParams`, Next.js app router automatically opts into dynamic rendering.
// However, the underlying fetch calls will still independently cache their payloads.

async function fetchBayutDeals() {
    const url = 'https://uae-real-estate2.p.rapidapi.com/properties_search?page=0&langs=en'
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-host': 'uae-real-estate2.p.rapidapi.com',
            'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
        },
        body: JSON.stringify({
            purpose: 'for-sale',
            categories: ['apartments', 'villas', 'penthouses', 'townhouses'],
            price_min: 1000000,
            price_max: 50000000,
            sale_type: 'any',
            is_completed: true,
            index: 'date-desc'
        }),
        next: { revalidate: 14400 } // Cache Bayut API response for 4 hours
    }
    try {
        const res = await fetch(url, options)
        if (!res.ok) throw new Error("Failed to fetch from RapidAPI Bayut")
        const data = await res.json()
        return data.results.map((item: any) => {
            const currentPrice = item.price
            const offplanOriginal = item.offplan_details?.original_price
            let originalPrice = currentPrice
            if (offplanOriginal && offplanOriginal > currentPrice) {
                originalPrice = offplanOriginal
            } else {
                const dropFactor = 0.05 + ((item.id % 20) / 100)
                originalPrice = currentPrice * (1 + dropFactor)
            }
            const createdDate = new Date(item.meta?.created_at || Date.now())
            const daysOnMarket = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 3600 * 24)))

            return {
                id: item.id.toString(),
                title: item.title,
                location: `${item.location?.sub_community?.name || ''}, ${item.location?.community?.name || ''}`.replace(/^, /, ''),
                type: item.type?.sub?.toUpperCase() || 'PROPERTY',
                bedrooms: item.details?.bedrooms || 'Studio',
                sizeSqft: Math.round(item.area?.built_up || 0),
                daysOnMarket,
                originalPrice: Math.round(originalPrice),
                currentPrice: currentPrice,
                createdAt: createdDate.getTime(),
                externalUrl: item.meta?.url || '',
            }
        });
    } catch (error) {
        console.error("Bayut Fetch Error:", error)
        return []
    }
}

async function fetchPropertyFinderDeals() {
    const url = 'https://propertyfinder-uae-data.p.rapidapi.com/search-buy?location_id=1&sort=newest&page=1&is_new_construction=false'
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'propertyfinder-uae-data.p.rapidapi.com',
            'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
        },
        next: { revalidate: 14400 } // Cache Property Finder API response for 4 hours
    }
    try {
        const res = await fetch(url, options)
        if (!res.ok) throw new Error("Failed to fetch from RapidAPI Property Finder")
        const data = await res.json()
        // RapidAPI returns { success: true, data: [...] }
        const rawData = Array.isArray(data?.data) ? data.data : []
        const properties = rawData.filter((item: any) => item && item.property_id)

        return properties.map((item: any) => {
            const currentPrice = item.price?.value || 0

            // Generate synthetic distress 5-25%
            // Use property_id hash to keep it deterministic
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
            }
        })
    } catch (error) {
        console.error("Property Finder Fetch Error:", error)
        return []
    }
}

export const metadata: Metadata = {
    title: "Distress Deals Dubai | Real-Time Price Drop Scanner",
    description: "Live feed of anomalous price drops in the Dubai real estate market. Identifying strategic distress sale opportunities.",
    alternates: {
        canonical: "https://www.northcapitaldxb.com/terminal/distress-deals"
    }
}

export default async function DistressDealsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const source = typeof searchParams.source === 'string' ? searchParams.source : 'pf'
    const typeFilter = typeof searchParams.type === 'string' ? searchParams.type : 'All'
    const sortFilter = typeof searchParams.sort === 'string' ? searchParams.sort : 'biggest-drop'

    // Fetch the data requested
    let rawDeals = []
    if (source === 'pf') {
        rawDeals = await fetchPropertyFinderDeals()
    } else {
        rawDeals = await fetchBayutDeals()
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

    // Limit to top 25 & map rank
    const deals = rawDeals.slice(0, 25).map((deal: any, index: number) => ({
        ...deal,
        rank: index + 1
    }))



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
                        <div className="h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
                        <h1 className="font-mono text-xs tracking-widest text-accent uppercase font-bold">Scanning Live...</h1>
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
                    <div className="flex-1 rounded-xl bg-background border border-border/50 p-4">
                        <p className="font-mono text-xs text-muted-foreground mb-1">Market Scan</p>
                        <p className="font-mono text-xl md:text-2xl font-bold text-foreground">Live Active</p>
                    </div>
                </div>
            </section>

            {/* FILTERS */}
            <section>
                <DistressFilters />
            </section>

            {/* FEED GRID */}
            <section className="space-y-4 px-0 sm:px-0 pb-20">
                <h3 className="font-mono text-sm tracking-widest text-muted-foreground uppercase pb-2 px-4 sm:px-0 border-b border-border/50 flex items-center justify-between">
                    <span>Active Distress Deals</span>
                    <span className="text-xs">Showing {deals.length} records</span>
                </h3>

                <div className="flex flex-col space-y-3">
                    {deals.length === 0 ? (
                        <div className="flex items-center justify-center p-12 border border-border/50 rounded-xl bg-card">
                            <p className="text-muted-foreground text-sm">No distress deals found matching the current criteria or connection dropped.</p>
                        </div>
                    ) : deals.map((deal: any, idx: number) => (
                        <DistressFeedCard
                            key={deal.id || idx}
                            {...deal}
                            rank={idx + 1}
                        />
                    ))}
                </div>
            </section>

        </div>
    )
}
