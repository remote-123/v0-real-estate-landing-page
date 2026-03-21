import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { sql } from "@/lib/db"

// UAE Central Bank Base Rate — updated manually when CBUAE changes rates.
// Current: 4.40% (effective Sept 2024 — matching Fed cut cycle).
const UAE_BASE_RATE = {
    value: "4.40%",
    label: "UAE Central Bank Base Rate",
    previousValue: "4.65%",
    trendDir: "down" as const,
    changeLabel: "−0.25% since Sept 2024",
    updatedAt: "Sep 2024",
    note: "Mirrors US Federal Reserve benchmark",
}

async function fetchDubaiResiPrice() {
    try {
        const cgId = process.env.DUBAIRESI_COINGECKO_ID
        if (!cgId) return null
        const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`,
            { next: { revalidate: 300 } }
        )
        if (!res.ok) return null
        const data = await res.json()
        const token = data[cgId]
        if (!token) return null
        return {
            price: token.usd as number,
            change24h: token.usd_24h_change as number,
        }
    } catch {
        return null
    }
}

async function fetchDfmIndex() {
    try {
        const rows = await sql`
            SELECT value, previous_value FROM market_indicators
            WHERE key = 'dfm-real-estate'
            LIMIT 1
        `
        const data = rows[0]
        if (!data) return null

        const change = data.value - data.previous_value
        const pctChange = data.previous_value ? (change / data.previous_value) * 100 : 0
        return {
            value: data.value,
            changePct: pctChange
        }
    } catch {
        return null
    }
}

function TrendIcon({ dir }: { dir: "up" | "down" | "neutral" }) {
    if (dir === "up") return <ArrowUpRight className="h-3.5 w-3.5" />
    if (dir === "down") return <ArrowDownRight className="h-3.5 w-3.5" />
    return <Minus className="h-3.5 w-3.5" />
}

export async function TerminalTickerCards() {
    const resiData = await fetchDubaiResiPrice()
    const dfmData = await fetchDfmIndex()

    const resiTrendDir: "up" | "down" | "neutral" = resiData
        ? resiData.change24h > 0 ? "up" : resiData.change24h < 0 ? "down" : "neutral"
        : "neutral"

    const dfmTrendDir: "up" | "down" | "neutral" = dfmData
        ? dfmData.changePct > 0 ? "up" : dfmData.changePct < 0 ? "down" : "neutral"
        : "neutral"

    return (
        <div className="flex flex-wrap gap-3">
            {/* DUBAIRESI Token Card */}
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/60 px-4 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">DUBAIRESI</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold font-mono text-foreground">
                        {resiData ? `$${resiData.price.toFixed(4)}` : "—"}
                    </span>
                    {resiData && (
                        <span className={cn(
                            "flex items-center gap-0.5 text-[10px] font-semibold",
                            resiTrendDir === "up" ? "text-emerald-500" : resiTrendDir === "down" ? "text-red-500" : "text-muted-foreground"
                        )}>
                            <TrendIcon dir={resiTrendDir} />
                            {resiData.change24h > 0 ? "+" : ""}{resiData.change24h.toFixed(2)}%
                        </span>
                    )}
                    {!resiData && (
                        <span className="text-[10px] text-muted-foreground/50">Price unavailable</span>
                    )}
                </div>
            </div>

            {/* DFM Real Estate Index Card */}
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/60 px-4 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">DFM Real Estate Index</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold font-mono text-foreground">
                        {dfmData ? dfmData.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                    </span>
                    {dfmData && (
                        <span className={cn(
                            "flex items-center gap-0.5 text-[10px] font-semibold",
                            dfmTrendDir === "up" ? "text-emerald-500" : dfmTrendDir === "down" ? "text-red-500" : "text-muted-foreground"
                        )}>
                            <TrendIcon dir={dfmTrendDir} />
                            {dfmData.changePct > 0 ? "+" : ""}{dfmData.changePct.toFixed(2)}%
                        </span>
                    )}
                    {!dfmData && (
                        <span className="text-[10px] text-muted-foreground/50">Unavailable</span>
                    )}
                </div>
            </div>

            {/* UAE Central Bank Rate Card */}
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/60 px-4 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">UAE Base Rate</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold font-mono text-foreground">{UAE_BASE_RATE.value}</span>
                    <span className={cn(
                        "flex items-center gap-0.5 text-[10px] font-semibold",
                        UAE_BASE_RATE.trendDir === "down" ? "text-emerald-500" : "text-red-500"
                    )}>
                        <TrendIcon dir={UAE_BASE_RATE.trendDir} />
                        {UAE_BASE_RATE.changeLabel}
                    </span>
                </div>
                <span className="text-[9px] text-muted-foreground/40 hidden sm:inline">as of {UAE_BASE_RATE.updatedAt}</span>
            </div>
        </div>
    )
}
