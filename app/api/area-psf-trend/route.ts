import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const runtime = "nodejs"
export const revalidate = 86400 // 24h

/**
 * GET /api/area-psf-trend?location=Marina+Gate+1,+Dubai+Marina,+Dubai&type=APARTMENT
 *
 * Resolution order:
 *   1. Building-level: token[0] (raw, pre-translation) matched against building_name_en
 *      — requires ≥3 distinct months of data over 36 months
 *   2. Area-level: remaining tokens (brand-name translated) matched against area_name_en
 *      — requires ≥2 months of data over 18 months
 *
 * Response includes `resolution: "building" | "area" | null` and `matched_name`.
 * meter_sale_price is AED/sqm — divide by 10.764 to get AED/sqft.
 */
// PF/Bayut use marketing brand names; DLD uses Arabic administrative names.
// This map translates the most common brand names to their DLD area_name_en equivalents.
const BRAND_TO_DLD: Record<string, string> = {
  "dubai marina":                         "Marsa Dubai",
  "marsa dubai":                          "Marsa Dubai",
  "jumeirah village circle":              "Al Barsha South Fourth",
  "jvc":                                  "Al Barsha South Fourth",
  "jumeirah lake towers":                 "Al Thanyah Fifth",
  "jlt":                                  "Al Thanyah Fifth",
  "downtown dubai":                       "Burj Khalifa",
  "dubai hills estate":                   "Hadaeq Sheikh Mohammed Bin Rashid",
  "dubai hills":                          "Hadaeq Sheikh Mohammed Bin Rashid",
  "difc":                                 "Trade Center First",
  "jumeirah beach residence":             "Al Safouh Second",
  "jbr":                                  "Al Safouh Second",
  "al safouh":                            "Al Safouh Second",
  "arabian ranches":                      "Al Hebiah Third",
  "motor city":                           "Al Hebiah Fourth",
  "sports city":                          "Al Hebiah First",
  "dubai sports city":                    "Al Hebiah First",
  "discovery gardens":                    "Jabal Ali First",
  "al furjan":                            "Jabal Ali First",
  "international city":                   "Warsan Fourth",
  "silicon oasis":                        "Nadd Hessa",
  "dubai silicon oasis":                  "Nadd Hessa",
  "dso":                                  "Nadd Hessa",
  "town square":                          "Al Hebiah Sixth",
  "jumeirah village triangle":            "Al Barsha South Fifth",
  "jvt":                                  "Al Barsha South Fifth",
  "dubai investment park":                "Dubai Investment Park Second",
  "dip":                                  "Dubai Investment Park Second",
  "meydan":                               "Nad Al Shiba First",
  "nad al sheba":                         "Nad Al Shiba First",
  "al jaddaf":                            "Al Jadaf",
  "culture village":                      "Al Jadaf",
  "jumeirah":                             "Jumeirah First",
  "business bay":                         "Business Bay",
  "palm jumeirah":                        "Palm Jumeirah",
  "mirdif":                               "Mirdif",
  "al barsha":                            "Al Barsha First",
  "arjan":                                "Al Barsha South Third",
  "dubai miracle garden":                 "Al Barsha South Third",
  "miracle garden":                       "Al Barsha South Third",
  "city walk":                            "Al Wasl",
  "la mer":                               "Jumeirah First",
  "bluewaters":                           "Bluewaters Island",
  "bluewaters island":                    "Bluewaters Island",
  "creek harbour":                        "Ras Al Khor",
  "dubai creek harbour":                  "Ras Al Khor",
  "emaar beachfront":                     "Al Safouh Second",
  "dubai harbour":                        "Al Safouh Second",
  "port de la mer":                       "Jumeirah First",
  "jumeirah islands":                     "Al Thanyah Fourth",
  "jumeirah park":                        "Al Thanyah Fourth",
  "the springs":                          "Al Thanyah Third",
  "the meadows":                          "Al Thanyah Third",
  "the lakes":                            "Al Thanyah Fourth",
  "the views":                            "Al Thanyah Second",
  "the greens":                           "Al Thanyah Second",
  "emirates hills":                       "Emirates Hills First",
  "mudon":                                "Al Hebiah Second",
  "serena":                               "Al Hebiah Second",
  "damac hills":                          "Al Hebiah Fifth",
  "damac hills 2":                        "Al Hebiah Fifth",
  "akoya":                                "Al Hebiah Fifth",
  "sobha hartland":                       "Mohammed Bin Rashid City",
  "meydan one":                           "Nad Al Shiba First",
  "creek views":                          "Al Jadaf",
  "dubai design district":               "Al Jadaf",
  "d3":                                   "Al Jadaf",
}

function translateToDld(token: string): string {
  return BRAND_TO_DLD[token.toLowerCase()] ?? token
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const location = searchParams.get("location")?.trim() || searchParams.get("area")?.trim() || ""
  const type = searchParams.get("type")?.trim().toUpperCase() || "APARTMENT"

  if (!location) return NextResponse.json({ error: "location required" }, { status: 400 })

  const typeFilter =
    type.includes("VILLA")
      ? ["Villa", "Villa Compound"]
      : type.includes("TOWN")
      ? ["Townhouse"]
      : ["Flat", "Hotel Apartment", "Penthouse"]

  const SKIP = new Set(["dubai", "uae", "abu dhabi", "sharjah", "ajman"])

  // Raw tokens (pre-translation) — token[0] is the building candidate
  const rawTokens = location
    .split(",")
    .map(t => t.trim())
    .filter(t => t.length > 3 && !SKIP.has(t.toLowerCase()))

  // Area tokens: translated brand names, reversed (community-first)
  const areaTokens = rawTokens
    .map(t => translateToDld(t))
    .reverse()

  const mapRow = (r: { month: string; avg_psf: number; txn_count: number }) => ({
    month: r.month,
    avg_psf: Number(r.avg_psf),
    txn_count: Number(r.txn_count),
  })

  try {
    // 1. Building-level: use raw token[0], query building_name_en over 36 months
    //    Requires ≥3 distinct months (not just raw count) for a meaningful trend line
    const buildingCandidate = rawTokens[0]
    if (buildingCandidate) {
      const buildingRows = await sql<{ month: string; avg_psf: number; txn_count: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', instance_date), 'YYYY-MM') AS month,
          ROUND(AVG(meter_sale_price / 10.764)::numeric, 0)::integer AS avg_psf,
          COUNT(*)::integer                                           AS txn_count
        FROM dld_transactions
        WHERE trans_group_en = 'Sales'
          AND building_name_en ILIKE ${`%${buildingCandidate}%`}
          AND property_sub_type_en = ANY(${typeFilter})
          AND meter_sale_price BETWEEN 500 AND 150000
          AND instance_date >= (SELECT MAX(instance_date) FROM dld_transactions) - INTERVAL '36 months'
        GROUP BY DATE_TRUNC('month', instance_date)
        ORDER BY DATE_TRUNC('month', instance_date)
      `

      if (buildingRows.length >= 3) {
        return NextResponse.json({
          matched_name: buildingCandidate,
          resolution: "building",
          type,
          data: buildingRows.map(mapRow),
        })
      }
    }

    // 2. Area-level: translated tokens, community-first, over 18 months
    for (const token of areaTokens) {
      const areaRows = await sql<{ month: string; avg_psf: number; txn_count: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', instance_date), 'YYYY-MM') AS month,
          ROUND(AVG(meter_sale_price / 10.764)::numeric, 0)::integer AS avg_psf,
          COUNT(*)::integer                                           AS txn_count
        FROM dld_transactions
        WHERE trans_group_en = 'Sales'
          AND area_name_en ILIKE ${`%${token}%`}
          AND property_sub_type_en = ANY(${typeFilter})
          AND meter_sale_price BETWEEN 500 AND 150000
          AND instance_date >= (SELECT MAX(instance_date) FROM dld_transactions) - INTERVAL '18 months'
        GROUP BY DATE_TRUNC('month', instance_date)
        ORDER BY DATE_TRUNC('month', instance_date)
      `

      if (areaRows.length >= 2) {
        return NextResponse.json({
          matched_name: token,
          resolution: "area",
          type,
          data: areaRows.map(mapRow),
        })
      }
    }

    // Nothing matched
    return NextResponse.json({ matched_name: null, resolution: null, type, data: [] })
  } catch (err: any) {
    console.error("[area-psf-trend]", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
