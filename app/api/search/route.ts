import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { formatAreaName } from "@/lib/area-names"

export const runtime = "nodejs"
export const revalidate = 0

type ResultType = "area" | "page"

interface SearchResult {
  type: ResultType
  title: string
  description: string
  url: string
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// Static terminal pages — title + description for text matching
const TERMINAL_PAGES: SearchResult[] = [
  {
    type: "page",
    title: "Distress Deals",
    description: "Live property distress signals — confirmed price drops, below-market PSF, and high DOM listings from PropertyFinder.",
    url: "/terminal/distress-deals",
  },
  {
    type: "page",
    title: "Community Screener",
    description: "Screen all Dubai communities by average PSF, MoM price trend, and off-plan supply pipeline.",
    url: "/terminal/communities",
  },
  {
    type: "page",
    title: "Transaction Pulse",
    description: "Monthly DLD sales, mortgage, and gift transaction volume with 12-month trend charts.",
    url: "/terminal/transaction-pulse",
  },
  {
    type: "page",
    title: "Area Momentum",
    description: "Momentum scores for Dubai communities — price delta and volume combined into a breakout signal.",
    url: "/terminal/area-momentum",
  },
  {
    type: "page",
    title: "Floor Plan Pricer",
    description: "P10–P90 price distribution by area and bedroom count. Understand where a deal sits in the market.",
    url: "/terminal/floor-plan-pricer",
  },
  {
    type: "page",
    title: "Yield Map",
    description: "Price per sqft by bedroom type across all Dubai areas. Spot yield opportunities at a glance.",
    url: "/terminal/yield-map",
  },
  {
    type: "page",
    title: "Building Comparator",
    description: "Compare two Dubai buildings side by side — PSF trend, service charges, and transaction history.",
    url: "/terminal/building-comparator",
  },
  {
    type: "page",
    title: "Area Comparison",
    description: "Compare two Dubai areas — PSF trend chart, average price, 12-month high/low, and momentum winner.",
    url: "/terminal/compare",
  },
  {
    type: "page",
    title: "Price Index",
    description: "Dubai residential price index from DLD — long-term AED/sqm trends across all property types.",
    url: "/terminal/price-index",
  },
  {
    type: "page",
    title: "Supply Pipeline",
    description: "Off-plan and under-construction project supply by area — understand future inventory pressure.",
    url: "/terminal/supply-pipeline",
  },
  {
    type: "page",
    title: "Service Charges",
    description: "RERA-registered service charge rates by building and area. Annual AED/sqft benchmarks.",
    url: "/terminal/service-charges",
  },
  {
    type: "page",
    title: "Developer Track Record",
    description: "Track developer delivery history, project counts, and off-plan unit pipeline.",
    url: "/terminal/developer-track",
  },
  {
    type: "page",
    title: "Off-Plan Pipeline",
    description: "Upcoming off-plan launches and active pre-sale projects in Dubai by area and developer.",
    url: "/terminal/off-plan-pipeline",
  },
  {
    type: "page",
    title: "Market Briefing",
    description: "AI-generated weekly Dubai real estate market briefing — macro conditions, deal signals, and outlook.",
    url: "/terminal/market-briefing",
  },
  {
    type: "page",
    title: "Mortgage Calculator",
    description: "Calculate monthly payments, total interest, and LTV for Dubai property purchases.",
    url: "/terminal/mortgage-calculator",
  },
  {
    type: "page",
    title: "Rental Yield Calculator",
    description: "Estimate gross and net rental yield for Dubai areas by bedroom type and service charge.",
    url: "/terminal/rental-yield",
  },
  {
    type: "page",
    title: "ROI Engine",
    description: "Full return-on-investment calculator including capital appreciation, rental yield, and exit costs.",
    url: "/terminal/roi-engine",
  },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()

  if (q.length < 2) {
    return NextResponse.json([])
  }

  const lower = q.toLowerCase()

  // Page results — title + description match
  const pageResults = TERMINAL_PAGES.filter(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
  ).slice(0, 6)

  // Area results — DLD DB query
  let areaResults: SearchResult[] = []
  try {
    const rows = await sql<{ area_name_en: string }[]>`
      SELECT DISTINCT area_name_en
      FROM dld_transactions
      WHERE area_name_en ILIKE ${"%" + q + "%"}
        AND area_name_en IS NOT NULL
      ORDER BY area_name_en
      LIMIT 10
    `
    areaResults = rows.map((r) => {
      const display = formatAreaName(r.area_name_en)
      return {
        type: "area" as const,
        title: display,
        description: `${r.area_name_en} — property prices, PSF trend, off-plan pipeline`,
        url: `/terminal/areas/${toSlug(r.area_name_en)}`,
      }
    })
  } catch {
    // DB unavailable — skip area results gracefully
  }

  // Combine: pages first, then areas; cap at 15
  const combined = [...pageResults, ...areaResults].slice(0, 15)
  return NextResponse.json(combined)
}
