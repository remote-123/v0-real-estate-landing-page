import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const runtime = "nodejs"
export const revalidate = 86400 // 24h

/**
 * GET /api/area-psf-trend?location=Marina+Gate+1,+Dubai+Marina,+Dubai&type=APARTMENT
 *
 * PF location strings are "Building, Community, Emirate".
 * We try each comma-separated token against DLD area_name_en (community level),
 * using the first token that returns data.
 *
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

  // Split "Marina Gate 1, Dubai Marina, Dubai" → try community first, then others
  // Translate brand names (Dubai Marina → Marsa Dubai) before querying DLD
  const SKIP = new Set(["dubai", "uae", "abu dhabi", "sharjah", "ajman"])
  const tokens = location
    .split(",")
    .map(t => translateToDld(t.trim()))
    .filter(t => t.length > 3 && !SKIP.has(t.toLowerCase()))

  // Reorder: try from the end (community/emirate) toward the start (building)
  // PF format is usually "Building, Community, Emirate" — community is index 1 from end after stripping Dubai
  const ordered = [...tokens].reverse()

  try {
    for (const token of ordered) {
      const rows = await sql<{ month: string; avg_psf: number; txn_count: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', instance_date), 'YYYY-MM') AS month,
          ROUND(AVG(meter_sale_price / 10.764)::numeric, 0)::integer AS avg_psf,
          COUNT(*)::integer                                           AS txn_count
        FROM dld_transactions
        WHERE trans_group_en = 'Sales'
          AND area_name_en ILIKE ${`%${token}%`}
          AND property_sub_type_en = ANY(${typeFilter})
          AND meter_sale_price BETWEEN 500 AND 150000
          AND instance_date >= NOW() - INTERVAL '18 months'
        GROUP BY DATE_TRUNC('month', instance_date)
        ORDER BY DATE_TRUNC('month', instance_date)
      `

      if (rows.length >= 2) {
        return NextResponse.json({
          matched_area: token,
          type,
          data: rows.map(r => ({
            month: r.month,
            avg_psf: Number(r.avg_psf),
            txn_count: Number(r.txn_count),
          })),
        })
      }
    }

    // Nothing matched — return empty
    return NextResponse.json({ matched_area: null, type, data: [] })
  } catch (err: any) {
    console.error("[area-psf-trend]", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
