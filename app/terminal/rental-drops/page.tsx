import { terminalPageMeta } from "@/lib/terminal-metadata"
import { RentalTable, type RentalListing } from "@/components/terminal/rental-table"
import { sql } from "@/lib/db"
import { auth } from "@/auth"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return terminalPageMeta({
    title: "Rental Drops Dubai",
    description: "Aggregated rental listings from Bayut and PropertyFinder. Monthly pricing computed. Newest listings first — no tab-switching required.",
    path: "/terminal/rental-drops",
  })
}

async function fetchListingsFromDB(): Promise<RentalListing[]> {
    const cutoff = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()

    try {
        const data = await sql`
            SELECT * FROM rental_listings
            WHERE listed_at >= ${cutoff}
            ORDER BY listed_at DESC
            LIMIT 60
        `
        return data.map((row: any): RentalListing => ({
            id: row.id,
            title: row.title ?? "",
            cluster: row.cluster ?? "",
            area: row.area ?? "Dubai",
            type: row.type ?? "PROPERTY",
            bedrooms: row.bedrooms ?? "Studio",
            sizeSqft: Number(row.size_sqft ?? 0),
            annualPrice: Number(row.annual_price ?? 0),
            monthlyPrice: Number(row.monthly_price ?? 0),
            pricePerSqft: Number(row.price_per_sqft ?? 0),
            listedAt: new Date(row.listed_at).getTime(),
            source: row.source as "bayut" | "pf",
            externalUrl: row.external_url ?? "",
        }))
    } catch { return [] }
}

async function enrichWithBuildingAge(listings: RentalListing[]): Promise<RentalListing[]> {
    let data: any[] = []
    try {
        data = await sql`
            SELECT community_name, construction_year FROM buildings
            WHERE construction_year IS NOT NULL
        `
    } catch { return listings }

    if (data.length === 0) return listings

    const yearsByComm = new Map<string, number[]>()
    for (const row of data) {
        if (!row.community_name || !row.construction_year) continue
        const key = row.community_name.toLowerCase().trim()
        if (!yearsByComm.has(key)) yearsByComm.set(key, [])
        yearsByComm.get(key)!.push(row.construction_year)
    }
    const avgMap = new Map<string, number>()
    for (const [key, years] of yearsByComm) {
        avgMap.set(key, Math.round(years.reduce((a, b) => a + b, 0) / years.length))
    }

    return listings.map(l => {
        const searchTerm = (l.area || "").toLowerCase().trim()
        if (!searchTerm) return l
        let bestKey: string | undefined
        for (const dmKey of avgMap.keys()) {
            if (dmKey.includes(searchTerm) || searchTerm.includes(dmKey)) {
                bestKey = dmKey
                break
            }
        }
        return { ...l, buildingAge: bestKey ? avgMap.get(bestKey) ?? null : null }
    })
}

const FREE_ROWS = 3

export default async function RentalDropsPage() {
    const [session, raw] = await Promise.all([auth(), fetchListingsFromDB()])
    const allListings = await enrichWithBuildingAge(raw)
    const isAuthenticated = !!session
    const listings = isAuthenticated ? allListings : allListings.slice(0, FREE_ROWS)

    const bayutCount = allListings.filter(l => l.source === "bayut").length
    const pfCount = allListings.filter(l => l.source === "pf").length
    const avgMonthly = allListings.length > 0
        ? Math.round(allListings.reduce((s, l) => s + l.monthlyPrice, 0) / allListings.length)
        : 0

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24 lg:pb-10 px-4 sm:px-0">
            <header className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Daily · Dubai · Rentals
                    </span>
                </div>
                <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">Rental Drops</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Aggregated listings from Bayut and PropertyFinder. Refreshed daily. Monthly and annual pricing computed — no tab-switching required.
                </p>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total Listings</p>
                    <p className="font-mono text-xl font-bold text-foreground mt-0.5">{listings.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">From Bayut</p>
                    <p className="font-mono text-xl font-bold text-foreground mt-0.5">{bayutCount}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">From PF</p>
                    <p className="font-mono text-xl font-bold text-foreground mt-0.5">{pfCount}</p>
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
                    <p className="text-sm text-muted-foreground">No listings yet. Trigger the cron to populate: <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/cron/fetch-rental-listings</code></p>
                </div>
            ) : (
                <RentalTable listings={listings} isAuthenticated={isAuthenticated} totalRows={allListings.length} />
            )}
        </div>
    )
}
