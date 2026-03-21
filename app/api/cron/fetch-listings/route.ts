import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

async function fetchBayut(): Promise<any[]> {
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
    cache: "no-store",
  })
  if (!res.ok) { console.error(`[Cron/Bayut] HTTP ${res.status}`); return [] }
  const data = await res.json()
  return Array.isArray(data?.results) ? data.results : []
}

async function fetchPF(): Promise<any[]> {
  const res = await fetch("https://propertyfinder-uae-data.p.rapidapi.com/search-rent?location_id=1&sort=newest&page=1", {
    headers: {
      "x-rapidapi-host": "propertyfinder-uae-data.p.rapidapi.com",
      "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
    },
    cache: "no-store",
  })
  if (!res.ok) { console.error(`[Cron/PF] HTTP ${res.status}`); return [] }
  const data = await res.json()
  return Array.isArray(data?.data) ? data.data : []
}

function mapBayut(item: any) {
  const annualPrice = item.price ?? 0
  const sizeSqft = Math.round(item.area?.built_up || 0)
  const dateStr = item.meta?.reactivated_at || item.meta?.created_at || ""
  const listedAt = dateStr
    ? new Date(dateStr.replace(" ", "T")).toISOString()
    : new Date().toISOString()
  return {
    id: `bayut-${item.id}`,
    source: "bayut",
    title: item.title || "",
    cluster: item.location?.cluster?.name || item.location?.sub_community?.name || "",
    area: item.location?.community?.name || "Dubai",
    type: item.type?.sub?.toUpperCase() || "PROPERTY",
    bedrooms: String(item.details?.bedrooms ?? "Studio"),
    size_sqft: sizeSqft,
    annual_price: annualPrice,
    monthly_price: Math.round(annualPrice / 12),
    price_per_sqft: sizeSqft > 0 ? annualPrice / sizeSqft : 0,
    external_url: item.meta?.url || "",
    listed_at: listedAt,
    raw: item,
  }
}

function mapPF(item: any) {
  const annualPrice = item.price?.value ?? 0
  const sizeSqft = Math.round(item.size?.value || 0)
  const listedAt = item.listed_date
    ? new Date(item.listed_date).toISOString()
    : new Date().toISOString()
  return {
    id: `pf-${item.property_id}`,
    source: "pf",
    title: item.title || "",
    cluster: item.location_tree?.find((l: any) => l.level === "3")?.name
          || item.location_tree?.find((l: any) => l.level === "2")?.name || "",
    area: item.location_tree?.find((l: any) => l.level === "1")?.name || "Dubai",
    type: item.property_type?.toUpperCase() || "PROPERTY",
    bedrooms: String(item.bedrooms ?? "Studio"),
    size_sqft: sizeSqft,
    annual_price: annualPrice,
    monthly_price: Math.round(annualPrice / 12),
    price_per_sqft: sizeSqft > 0 ? annualPrice / sizeSqft : 0,
    external_url: item.property_url || "",
    listed_at: listedAt,
    raw: item,
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET2}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [bayutRaw, pfRaw] = await Promise.all([fetchBayut(), fetchPF()])
    console.log(`[Cron] Bayut raw: ${bayutRaw.length} | PF raw: ${pfRaw.length}`)

    const bayutRows = bayutRaw
      .filter((i: any) => i?.id && i.price > 0)
      .map(mapBayut)

    const pfRows = pfRaw
      .filter((i: any) => i?.property_id && (i.price?.value || 0) > 0 && !i.is_direct_from_developer)
      .map(mapPF)

    const rows = [...bayutRows, ...pfRows]
    console.log(`[Cron] Mapped rows: ${rows.length}`)

    if (!rows.length) {
      return NextResponse.json({ message: "No listings fetched" })
    }

    for (const row of rows) {
      await sql`
        INSERT INTO rental_listings
          (id, source, title, cluster, area, type, bedrooms, size_sqft,
           annual_price, monthly_price, price_per_sqft, external_url, listed_at, raw)
        VALUES
          (${row.id}, ${row.source}, ${row.title}, ${row.cluster}, ${row.area},
           ${row.type}, ${row.bedrooms}, ${row.size_sqft}, ${row.annual_price},
           ${row.monthly_price}, ${row.price_per_sqft}, ${row.external_url},
           ${row.listed_at}, ${sql.json(row.raw)})
        ON CONFLICT (id) DO UPDATE SET
          source = EXCLUDED.source, title = EXCLUDED.title, cluster = EXCLUDED.cluster,
          area = EXCLUDED.area, type = EXCLUDED.type, bedrooms = EXCLUDED.bedrooms,
          size_sqft = EXCLUDED.size_sqft, annual_price = EXCLUDED.annual_price,
          monthly_price = EXCLUDED.monthly_price, price_per_sqft = EXCLUDED.price_per_sqft,
          external_url = EXCLUDED.external_url, listed_at = EXCLUDED.listed_at,
          raw = EXCLUDED.raw
      `
    }

    return NextResponse.json({ ok: true, bayut: bayutRows.length, pf: pfRows.length, total: rows.length })
  } catch (e: any) {
    console.error("[Cron] Error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
