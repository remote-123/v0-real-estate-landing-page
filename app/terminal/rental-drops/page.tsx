import type { Metadata } from "next"
import { RentalTable, type RentalListing } from "@/components/terminal/rental-table"
import { CACHE_TTL } from "@/lib/api-budget"


export const metadata: Metadata = {
    title: "Rental Drops Dubai | North Capital DXB",
    description: "Aggregated rental listings from Bayut and PropertyFinder. Monthly pricing computed. Newest listings first — no tab-switching required.",
    alternates: {
        canonical: "https://www.northcapitaldxb.com/terminal/rental-drops"
    },
}

async function fetchBayutRentals(): Promise<RentalListing[]> {
    try {
        const res = await fetch("https://uae-real-estate2.p.rapidapi.com/properties_search?page=0&langs=en", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-rapidapi-host": "uae-real-estate2.p.rapidapi.com",
                "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
            },
            body: JSON.stringify({
                purpose: "for-rent",
                categories: ["apartments", "villas", "penthouses", "townhouses"],
                index: "date-desc",
            }),
            next: { revalidate: CACHE_TTL.rentalDrops },
        })
        if (!res.ok) return []
        const data = await res.json()
        const rawData = Array.isArray(data?.results) ? data.results : []

        return rawData
            .filter((item: any) => item && item.id && item.price > 0)
            .map((item: any): RentalListing => {
                const annualPrice = item.price
                const sizeSqft = Math.round(item.area?.built_up || 0)
                const listedAt = new Date(item.meta?.created_at || Date.now()).getTime()
                return {
                    id: `bayut-${item.id}`,
                    title: item.title || "",
                    cluster: item.location?.cluster?.name || item.location?.sub_community?.name || "",
                    area: item.location?.community?.name || "Dubai",
                    type: item.type?.sub?.toUpperCase() || "PROPERTY",
                    bedrooms: item.details?.bedrooms?.toString() || "Studio",
                    sizeSqft,
                    annualPrice,
                    monthlyPrice: Math.round(annualPrice / 12),
                    pricePerSqft: sizeSqft > 0 ? annualPrice / sizeSqft : 0,
                    listedAt,
                    source: "bayut",
                    externalUrl: item.meta?.url || "",
                }
            })
    } catch {
        return []
    }
}

async function fetchPFRentals(): Promise<RentalListing[]> {
    try {
        const res = await fetch("https://propertyfinder-uae-data.p.rapidapi.com/search-rent?location_id=1&sort=newest&page=1", {
            method: "GET",
            headers: {
                "x-rapidapi-host": "propertyfinder-uae-data.p.rapidapi.com",
                "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
            },
            next: { revalidate: CACHE_TTL.rentalDrops },
        })
        if (!res.ok) return []
        const data = await res.json()
        const rawData = Array.isArray(data?.data) ? data.data : []

        return rawData
            .filter((item: any) => item && item.property_id && (item.price?.value || 0) > 0 && !item.is_direct_from_developer)
            .map((item: any): RentalListing => {
                const annualPrice = item.price?.value || 0
                const sizeSqft = Math.round(item.size?.value || 0)
                const listedAt = new Date(item.listed_date || Date.now()).getTime()
                return {
                    id: `pf-${item.property_id}`,
                    title: item.title || "",
                    cluster: item.location_tree?.find((l: any) => l.level === '3')?.name
                          || item.location_tree?.find((l: any) => l.level === '2')?.name
                          || "",
                    area: item.location_tree?.find((l: any) => l.level === '1')?.name || "",
                    type: item.property_type?.toUpperCase() || "PROPERTY",
                    bedrooms: item.bedrooms?.toString() || "Studio",
                    sizeSqft,
                    annualPrice,
                    monthlyPrice: Math.round(annualPrice / 12),
                    pricePerSqft: sizeSqft > 0 ? annualPrice / sizeSqft : 0,
                    listedAt,
                    source: "pf",
                    externalUrl: item.property_url || "",
                }
            })
    } catch {
        return []
    }
}

export default async function RentalDropsPage() {
    const [bayutListings, pfListings] = await Promise.all([
        fetchBayutRentals(),
        fetchPFRentals(),
    ])

    const listings = [...bayutListings, ...pfListings]
        .sort((a, b) => b.listedAt - a.listedAt)
        .slice(0, 60)

    const avgMonthly = listings.length > 0
        ? Math.round(listings.reduce((s, l) => s + l.monthlyPrice, 0) / listings.length)
        : 0

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24 lg:pb-10 px-4 sm:px-0">

            <header className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Live · Dubai · Rentals
                    </span>
                </div>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">Rental Drops</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Aggregated listings from Bayut and PropertyFinder. Sorted by newest. Monthly and annual pricing computed — no tab-switching required.
                </p>
            </header>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total Listings</p>
                    <p className="font-mono text-xl font-bold text-foreground mt-0.5">{listings.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">From Bayut</p>
                    <p className="font-mono text-xl font-bold text-foreground mt-0.5">{bayutListings.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">From PF</p>
                    <p className="font-mono text-xl font-bold text-foreground mt-0.5">{pfListings.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Avg Monthly</p>
                    <p className="font-mono text-xl font-bold text-foreground mt-0.5">
                        {avgMonthly > 0 ? `AED ${avgMonthly.toLocaleString()}` : "—"}
                    </p>
                </div>
            </div>

            {listings.length === 0 ? (
                <div className="flex items-center justify-center p-12 rounded-xl border border-border/50 bg-card">
                    <p className="text-sm text-muted-foreground">No listings fetched. Check API connection or RapidAPI quota.</p>
                </div>
            ) : (
                <RentalTable listings={listings} />
            )}
        </div>
    )
}
