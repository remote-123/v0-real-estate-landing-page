/**
 * POST /api/cron/snapshot-distress-listings
 *
 * Daily snapshot of PropertyFinder sale listings into distress_listings.
 * - Inserts new listings with price_at_first_seen
 * - Updates existing listings: price tracking, confirmed drops, snapshots
 * - Marks listings no longer returned by API as disappeared
 * - Enriches with DLD avg PSF for same area+type+bedrooms
 * - Detects probable re-listings via canonical_key matching
 *
 * Called by: cron-job.org daily ~6AM UTC
 * Auth: Bearer CRON_SECRET
 */

import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { sendTelegram } from "@/lib/telegram"

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return run()
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return run()
}

// ── PF API fetch ──────────────────────────────────────────────────────────────

async function fetchPFListings(): Promise<any[]> {
  const url = "https://propertyfinder-uae-data.p.rapidapi.com/search-buy?location_id=1&sort=newest&page=1&is_new_construction=false"
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": "propertyfinder-uae-data.p.rapidapi.com",
      "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
    },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`PF API HTTP ${res.status}`)
  const data = await res.json()
  return Array.isArray(data?.data) ? data.data.filter((x: any) => x?.property_id) : []
}

// ── Location extraction ───────────────────────────────────────────────────────
// address.community.name / address.building.name do NOT exist in the PF API.
// address only has { full_name, coordinates }.
// location_tree is the reliable source: level 1=community, 2=sub-community, 3=building.

function extractLocation(item: any): { area: string | null; building: string | null } {
  const tree: any[] = Array.isArray(item.location_tree) ? item.location_tree : []
  const community    = tree.find((t: any) => t.level === "1")?.name ?? null
  const subCommunity = tree.find((t: any) => t.level === "2")?.name ?? null
  const buildingNode = tree.find((t: any) => t.level === "3")?.name ?? null

  // Fallback: parse full_name "Building, Community, Dubai" — community is second-to-last token
  const fullParts = item.address?.full_name
    ? item.address.full_name.split(",").map((s: string) => s.trim()).filter(Boolean)
    : []
  const fallbackArea     = fullParts.length >= 2 ? fullParts[fullParts.length - 2] : (fullParts[0] ?? null)
  const fallbackBuilding = fullParts.length >= 3 ? fullParts[0] : null

  return {
    area:     community    ?? fallbackArea,
    building: buildingNode ?? subCommunity ?? fallbackBuilding,
  }
}

// ── Canonical key for re-listing detection ────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(tower|residence|residences|building|by|the|at|in)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function roundToNearest50(n: number): number {
  return Math.round(n / 50) * 50
}

function buildCanonicalKey(item: any): string | null {
  const { area, building } = extractLocation(item)
  const beds = item.bedrooms?.toString() || ""
  const size = item.size?.value ? roundToNearest50(Math.round(item.size.value)) : 0
  const type = item.property_type?.toUpperCase() || ""

  if (!area && !building) return null
  const base = normalize(building || area || "")
  return `${base}|${beds}|${size}|${type}`
}

// ── DLD enrichment ────────────────────────────────────────────────────────────

async function getDldAvgPsf(
  area: string,
  type: string,
  beds: string
): Promise<{ avg_psf: number; count: number } | null> {
  try {
    // Map PF type to DLD property_sub_type_en
    const typeFilter = type === "APARTMENT" ? "Flat" : type === "VILLA" ? "Villa" : null
    if (!typeFilter) return null

    // Map beds string to DLD rooms_en pattern
    const bedsNum = beds === "Studio" ? "Studio" : `${beds} B/R`

    const rows = await sql<{ avg_psf: number; cnt: number }[]>`
      SELECT
        ROUND(AVG(meter_sale_price / 10.764)::numeric, 0)::integer AS avg_psf,
        COUNT(*)::integer AS cnt
      FROM dld_transactions
      WHERE trans_group_en = 'Sales'
        AND area_name_en ILIKE ${`%${area}%`}
        AND property_sub_type_en = ${typeFilter}
        AND rooms_en = ${bedsNum}
        AND meter_sale_price BETWEEN 500 AND 150000
        AND instance_date >= NOW() - INTERVAL '12 months'
      HAVING COUNT(*) >= 5
    `
    if (!rows[0]) return null
    return { avg_psf: Number(rows[0].avg_psf), count: Number(rows[0].cnt) }
  } catch {
    return null
  }
}

// ── Main run ──────────────────────────────────────────────────────────────────

async function run() {
  const now = new Date().toISOString()
  let inserted = 0, updated = 0, dropped = 0, disappeared = 0

  try {
    const raw = await fetchPFListings()
    const seenIds = new Set<string>()

    for (const item of raw) {
      const listingId = `pf-${item.property_id}`
      seenIds.add(listingId)

      const price = Number(item.price?.value || 0)
      if (!price) continue

      const sizeVal = Math.round(item.size?.value || 0)
      const psf = sizeVal > 0 ? Math.round(price / sizeVal) : null
      const { area, building } = extractLocation(item)
      const type = item.property_type?.toUpperCase() || null
      const beds = item.bedrooms?.toString() || null
      const listedDate = item.listed_date ? item.listed_date.slice(0, 10) : null
      const canonicalKey = buildCanonicalKey(item)

      const snapshotEntry = JSON.stringify({ ts: now, price, psf })

      // Check existing row
      const existing = await sql<{ id: number; price: number; price_at_first_seen: number; snapshots: any }[]>`
        SELECT id, price, price_at_first_seen, snapshots
        FROM distress_listings
        WHERE listing_id = ${listingId}
        LIMIT 1
      `

      if (existing.length === 0) {
        // New listing — check for re-listing match
        let relistingOf: string | null = null
        let relistingConfidence: number | null = null

        if (canonicalKey) {
          const candidates = await sql<{ listing_id: string; price_at_first_seen: number; area_name: string }[]>`
            SELECT listing_id, price_at_first_seen, area_name
            FROM distress_listings
            WHERE canonical_key = ${canonicalKey}
              AND disappeared_at IS NOT NULL
              AND disappeared_at > NOW() - INTERVAL '90 days'
            ORDER BY disappeared_at DESC
            LIMIT 1
          `
          if (candidates.length > 0) {
            const cand = candidates[0]
            let score = 0.5 // canonical key match is already strong
            if (area && cand.area_name && normalize(area) === normalize(cand.area_name)) score += 0.3
            if (price <= cand.price_at_first_seen) score += 0.2 // cheaper than previous = re-list down
            relistingOf = cand.listing_id
            relistingConfidence = Math.min(score, 1.0)
          }
        }

        // Get DLD enrichment
        const dld = area && type && beds ? await getDldAvgPsf(area, type, beds) : null
        const dldDelta = dld && psf ? ((psf - dld.avg_psf) / dld.avg_psf) * 100 : null
        const tier = dld && dldDelta !== null && dldDelta < -10 ? 2 : 3

        await sql`
          INSERT INTO distress_listings (
            listing_id, source, external_url, title, address_full, area_name, building_name,
            property_type, bedrooms, size_sqft, price, price_per_sqft, listed_date,
            price_at_first_seen, price_min_seen, price_max_seen, snapshots,
            canonical_key, relisting_of, relisting_confidence,
            dld_area_avg_psf, dld_sample_count, dld_psf_delta_pct, confidence_tier
          ) VALUES (
            ${listingId}, 'pf', ${item.property_url || null}, ${item.title || null},
            ${item.address?.full_name || null}, ${area}, ${building}, ${type}, ${beds},
            ${sizeVal || null}, ${price}, ${psf}, ${listedDate},
            ${price}, ${price}, ${price},
            ${JSON.stringify([{ ts: now, price, psf }])}::jsonb,
            ${canonicalKey}, ${relistingOf}, ${relistingConfidence},
            ${dld?.avg_psf ?? null}, ${dld?.count ?? null},
            ${dldDelta !== null ? Math.round(dldDelta * 100) / 100 : null},
            ${tier}
          )
          ON CONFLICT (listing_id) DO NOTHING
        `
        inserted++
      } else {
        // Existing listing — update price tracking
        const prev = existing[0]
        const prevPrice = Number(prev.price)
        const firstPrice = Number(prev.price_at_first_seen)
        const prevSnapshots = Array.isArray(prev.snapshots) ? prev.snapshots : []

        const priceDropConfirmed = price < firstPrice
        const priceDropPct = priceDropConfirmed
          ? Number(((firstPrice - price) / firstPrice * 100).toFixed(2))
          : null
        const priceChanged = price !== prevPrice
        const newSnapshots = [...prevSnapshots, { ts: now, price, psf }]
          .slice(-90) // cap at 90 snapshots

        if (priceDropConfirmed) dropped++

        await sql`
          UPDATE distress_listings SET
            price               = ${price},
            price_per_sqft      = ${psf},
            last_seen_at        = ${now},
            last_checked_at     = ${now},
            disappeared_at      = NULL,
            price_min_seen      = LEAST(price_min_seen, ${price}),
            price_max_seen      = GREATEST(price_max_seen, ${price}),
            price_change_count  = price_change_count + ${priceChanged ? 1 : 0},
            snapshots           = ${JSON.stringify(newSnapshots)}::jsonb,
            price_drop_confirmed = ${priceDropConfirmed},
            price_drop_pct      = ${priceDropPct},
            confidence_tier     = CASE
              WHEN ${priceDropConfirmed} THEN 1
              WHEN confidence_tier <= 2 THEN confidence_tier
              ELSE 3
            END
          WHERE listing_id = ${listingId}
        `
        updated++
      }
    }

    // Mark disappeared listings (not returned this run, still active)
    if (seenIds.size > 0) {
      const seenArr = Array.from(seenIds)
      await sql`
        UPDATE distress_listings
        SET disappeared_at = ${now}
        WHERE source = 'pf'
          AND disappeared_at IS NULL
          AND listing_id != ALL(${seenArr})
          AND last_checked_at < NOW() - INTERVAL '23 hours'
      `
      disappeared++ // approximate
    }

    // Clean up old retained rows
    await sql`
      DELETE FROM distress_listings
      WHERE retained_until < CURRENT_DATE
        AND disappeared_at IS NOT NULL
    `

    // ── Tier-1 Telegram alerts ────────────────────────────────────────────────
    // Alert on listings that just confirmed a price drop today (became tier 1 within last 25h)
    try {
      const newTier1 = await sql<{
        title: string
        area_name: string
        price: number
        price_per_sqft: number | null
        dld_area_avg_psf: number | null
        dld_psf_delta_pct: number | null
        price_drop_pct: number | null
        property_type: string | null
        bedrooms: string | null
        external_url: string | null
      }[]>`
        SELECT
          title,
          area_name,
          price,
          price_per_sqft,
          dld_area_avg_psf,
          dld_psf_delta_pct,
          price_drop_pct,
          property_type,
          bedrooms,
          external_url
        FROM distress_listings
        WHERE price_drop_confirmed = true
          AND confidence_tier = 1
          AND disappeared_at IS NULL
          AND last_checked_at > NOW() - INTERVAL '25 hours'
          AND last_seen_at::date = CURRENT_DATE
        LIMIT 5
      `

      for (const deal of newTier1) {
        const price = Math.round(Number(deal.price)).toLocaleString("en-US")
        const psf = deal.price_per_sqft ? Math.round(Number(deal.price_per_sqft)) : null
        const areaAvg = deal.dld_area_avg_psf ? Math.round(Number(deal.dld_area_avg_psf)) : null
        const dropPct = deal.price_drop_pct ? Number(deal.price_drop_pct).toFixed(1) : null
        const deltaLabel =
          psf && areaAvg && areaAvg > 0
            ? ` — ${(((areaAvg - psf) / areaAvg) * 100).toFixed(1)}% below area avg`
            : ""

        const beds = deal.bedrooms ? `${deal.bedrooms}BR ` : ""
        const type = deal.property_type ?? "Property"
        const location = deal.area_name ?? "Dubai"

        const msg = [
          `🔴 <b>Tier-1 Distress Deal</b>`,
          `<b>${deal.title ?? `${beds}${type}`}</b>`,
          `📍 ${location}`,
          `💰 AED ${price}${dropPct ? ` (↓${dropPct}% from listing)` : ""}`,
          psf ? `📐 AED ${psf}/sqft${deltaLabel}` : null,
          deal.external_url ? `🔗 <a href="${deal.external_url}">View listing</a>` : null,
          `\n<a href="https://www.northcapitaldxb.com/terminal/distress-deals">All distress deals →</a>`,
        ]
          .filter(Boolean)
          .join("\n")

        await sendTelegram(msg, process.env.TELEGRAM_THREAD_ID_LEADS)
      }
    } catch (alertErr: any) {
      // Never let alert failure break the main cron response
      console.error("[snapshot-distress] Telegram alert error:", alertErr.message)
    }

    console.log(`[snapshot-distress] inserted=${inserted} updated=${updated} confirmed_drops=${dropped}`)
    return NextResponse.json({ ok: true, inserted, updated, confirmed_drops: dropped })
  } catch (err: any) {
    console.error("[snapshot-distress] error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
