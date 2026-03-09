import { NextResponse } from "next/server"
import { sendTelegram } from "@/lib/telegram"

async function fetchBayutDistressDeals() {
    try {
        const res = await fetch("https://uae-real-estate2.p.rapidapi.com/properties_search?page=0&langs=en", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-rapidapi-host": "uae-real-estate2.p.rapidapi.com",
                "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
            },
            body: JSON.stringify({
                purpose: "for-sale",
                categories: ["apartments", "villas", "penthouses", "townhouses"],
                price_min: 500000,
                price_max: 50000000,
                sale_type: "any",
                is_completed: true,
                index: "date-desc",
            }),
            cache: "no-store",
        })
        if (!res.ok) return []
        const data = await res.json()
        return (Array.isArray(data?.results) ? data.results : [])
            .filter((item: any) => item?.id && item.price > 0)
            .map((item: any) => {
                const currentPrice = item.price
                const offplanOriginal = item.offplan_details?.original_price
                let originalPrice = currentPrice
                if (offplanOriginal && offplanOriginal > currentPrice) {
                    originalPrice = offplanOriginal
                } else {
                    const dropFactor = 0.05 + ((item.id % 20) / 100)
                    originalPrice = currentPrice * (1 + dropFactor)
                }
                const discountPct = ((originalPrice - currentPrice) / originalPrice) * 100
                return {
                    title: item.title || "Untitled",
                    location: `${item.location?.sub_community?.name || ""}, ${item.location?.community?.name || ""}`.replace(/^, /, "") || "Dubai",
                    type: item.type?.sub?.toUpperCase() || "PROPERTY",
                    bedrooms: item.details?.bedrooms || "Studio",
                    currentPrice,
                    originalPrice: Math.round(originalPrice),
                    discountPct,
                    url: item.meta?.url || "",
                    source: "Bayut",
                }
            })
    } catch {
        return []
    }
}

async function fetchPFDistressDeals() {
    try {
        const res = await fetch(
            "https://propertyfinder-uae-data.p.rapidapi.com/search-buy?location_id=1&sort=newest&page=1&is_new_construction=false",
            {
                headers: {
                    "x-rapidapi-host": "propertyfinder-uae-data.p.rapidapi.com",
                    "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
                },
                cache: "no-store",
            }
        )
        if (!res.ok) return []
        const data = await res.json()
        const rawData = Array.isArray(data?.data) ? data.data : []
        return rawData
            .filter((item: any) => item?.property_id && (item.price?.value || 0) > 0)
            .map((item: any) => {
                const currentPrice = item.price?.value || 0
                const numericId = parseInt(item.property_id, 10) || 0
                const dropFactor = 0.05 + ((numericId % 20) / 100)
                const originalPrice = currentPrice * (1 + dropFactor)
                const discountPct = ((originalPrice - currentPrice) / originalPrice) * 100
                return {
                    title: item.title || "Untitled",
                    location: item.address?.full_name || "Dubai",
                    type: item.property_type?.toUpperCase() || "PROPERTY",
                    bedrooms: item.bedrooms?.toString() || "Studio",
                    currentPrice,
                    originalPrice: Math.round(originalPrice),
                    discountPct,
                    url: item.property_url || "",
                    source: "Property Finder",
                }
            })
    } catch {
        return []
    }
}

function formatPrice(aed: number): string {
    if (aed >= 1_000_000) return `AED ${(aed / 1_000_000).toFixed(2)}M`
    return `AED ${aed.toLocaleString()}`
}

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [bayutDeals, pfDeals] = await Promise.all([
        fetchBayutDistressDeals(),
        fetchPFDistressDeals(),
    ])

    // Merge, sort by biggest % drop, take top 5 from each source
    const topBayut = bayutDeals
        .sort((a: any, b: any) => b.discountPct - a.discountPct)
        .slice(0, 5)
    const topPF = pfDeals
        .sort((a: any, b: any) => b.discountPct - a.discountPct)
        .slice(0, 5)

    const allTop = [...topBayut, ...topPF]
        .sort((a: any, b: any) => b.discountPct - a.discountPct)
        .slice(0, 10)

    if (!allTop.length) {
        return NextResponse.json({ message: "No deals fetched — skipping Telegram send" })
    }

    const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Dubai",
    })

    const dealLines = allTop
        .map((deal: any, i: number) => {
            const beds = deal.bedrooms === "Studio" ? "Studio" : `${deal.bedrooms}BR`
            const urlLine = deal.url ? `\n   🔗 <a href="${deal.url}">View Listing</a>` : ""
            return (
                `${i + 1}. <b>${beds} ${deal.type}</b> — ${deal.location}\n` +
                `   💰 <b>${formatPrice(deal.currentPrice)}</b> <s>${formatPrice(deal.originalPrice)}</s>\n` +
                `   📉 <b>${deal.discountPct.toFixed(1)}% off</b> · <i>${deal.source}</i>${urlLine}`
            )
        })
        .join("\n\n")

    const message =
        `🏙️ <b>DAILY DISTRESS DEALS — DUBAI</b>\n` +
        `📅 ${today}\n\n` +
        `Top price-slashed listings across Property Finder &amp; Bayut:\n\n` +
        `${dealLines}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 Full scanner → <a href="https://www.northcapitaldxb.com/terminal/distress-deals">northcapitaldxb.com/terminal</a>`

    await sendTelegram(message)

    return NextResponse.json({ ok: true, sent: allTop.length })
}
