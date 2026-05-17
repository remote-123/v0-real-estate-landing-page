#!/usr/bin/env npx tsx
/**
 * Property Hunter — personal real estate research tool
 *
 * Pulls ACTUAL sold prices from DLD (Dubai Land Dept) data in Neon DB,
 * then generates pre-configured browser links for PropertyFinder & Bayut.
 *
 * Run:
 *   npx tsx --env-file=.env.local scripts/property-hunter.ts
 *   npx tsx --env-file=.env.local scripts/property-hunter.ts --area=dso
 *   npx tsx --env-file=.env.local scripts/property-hunter.ts --area=d2
 *   npx tsx --env-file=.env.local scripts/property-hunter.ts --area=ajman
 *   npx tsx --env-file=.env.local scripts/property-hunter.ts --area=sharjah
 *   npx tsx --env-file=.env.local scripts/property-hunter.ts --months=6
 *   npx tsx --env-file=.env.local scripts/property-hunter.ts --area=d2 --history
 */

// postgres is dynamically imported — script works offline without it installed.
type SqlClient = ReturnType<typeof import("postgres")>

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
function getArg(prefix: string) {
  const f = argv.find(a => a.startsWith(prefix))
  return f ? f.slice(prefix.length) : null
}

const AREA_FILTER  = getArg("--area=") ?? "all"
const MONTHS       = parseInt(getArg("--months=") ?? "12", 10)
const READY_ONLY   = argv.includes("--ready-only")
const HISTORY      = argv.includes("--history")
const TARGET_PRICE = parseInt(getArg("--target=") ?? "0", 10)

// ── Area definitions ──────────────────────────────────────────────────────────

interface AreaDef {
  key:           string
  label:         string
  dldName:       string | null   // null = not in DLD (Ajman/Sharjah)
  propertyTypes: string[]
  bedsFilter:    number | null   // null = any
  minAED:        number
  maxAED:        number
  pfSlug:        string          // PropertyFinder area slug
  pfType:        string          // PropertyFinder type slug
  pfBeds:        string          // "" | "1-bedroom-" | etc.
  notes:         string
}

const AREAS: AreaDef[] = [
  {
    key:           "dso",
    label:         "Dubai Silicon Oasis (DSO) — 1BR Apartment",
    dldName:       "Nadd Hessa",
    propertyTypes: ["Apartment"],
    bedsFilter:    1,
    minAED:        700_000,
    maxAED:        1_200_000,
    pfSlug:        "dubai-silicon-oasis",
    pfType:        "apartments",
    pfBeds:        "1-bedroom-",
    notes:         "Tech hub, consistent demand from families & expats. Rental yield 6-7%.",
  },
  {
    key:           "d2",
    label:         "DAMAC Hills 2 — Townhouse",
    dldName:       "Al Hebiah Second",
    propertyTypes: ["Townhouse", "Villa"],
    bedsFilter:    null,
    minAED:        1_200_000,
    maxAED:        1_500_000,
    pfSlug:        "damac-hills-2",
    pfType:        "townhouses",
    pfBeds:        "",
    notes:         "Ready townhouses, freehold. Good for live-in + rental. Lower liquidity vs DSO.",
  },
  {
    key:           "ajman",
    label:         "Ajman / Al Helio 2 — Villa",
    dldName:       null,                        // Not in DLD (Ajman Land Dept)
    propertyTypes: ["Villa"],
    bedsFilter:    null,
    minAED:        900_000,
    maxAED:        1_500_000,
    pfSlug:        "ajman",
    pfType:        "villas",
    pfBeds:        "",
    notes:         "Affordable villas, close to sister. Low liquidity. Best if holding 5+ years.",
  },
  {
    key:           "sharjah",
    label:         "Sharjah — Villa (freehold zones)",
    dldName:       null,                        // Not in DLD (Sharjah Land Dept)
    propertyTypes: ["Villa"],
    bedsFilter:    null,
    minAED:        900_000,
    maxAED:        1_500_000,
    pfSlug:        "sharjah",
    pfType:        "villas",
    pfBeds:        "",
    notes:         "Check freehold vs usufruct carefully. Lower appreciation than Dubai.",
  },
]

const activeAreas = AREA_FILTER === "all"
  ? AREAS
  : AREAS.filter(a => a.key === AREA_FILTER)

// ── Neon DB client ────────────────────────────────────────────────────────────

async function makeDb(): Promise<SqlClient | null> {
  const pooled = process.env.DATABASE_URL
  if (!pooled) return null
  try {
    const { default: postgres } = await import("postgres")
    const direct = pooled.replace("-pooler.", ".")
    return postgres(direct, { ssl: "require", max: 1, idle_timeout: 30, connect_timeout: 20 })
  } catch {
    return null
  }
}

// ── DLD query result ──────────────────────────────────────────────────────────

interface DldStats {
  propertyType: string
  rooms:        string
  count:        number
  avgPrice:     number
  minPrice:     number
  maxPrice:     number
  avgPriceSqm:  number           // AED/sqm (÷10.764 → AED/sqft)
  latestSale:   string
}

async function queryDld(db: SqlClient, area: AreaDef): Promise<DldStats[]> {
  if (!area.dldName) return []

  const typesList = area.propertyTypes.map(t => `'${t}'`).join(", ")
  const bedsClause = area.bedsFilter != null
    ? `AND rooms_en IN ('${area.bedsFilter} B/R', '${area.bedsFilter} BR', '${area.bedsFilter}BR')`
    : ""

  const rows = await db<DldStats[]>`
    SELECT
      property_type_en                             AS "propertyType",
      rooms_en                                     AS "rooms",
      COUNT(*)::int                                AS "count",
      ROUND(AVG(actual_worth))::int                AS "avgPrice",
      ROUND(MIN(actual_worth))::int                AS "minPrice",
      ROUND(MAX(actual_worth))::int                AS "maxPrice",
      ROUND(AVG(meter_sale_price))::int            AS "avgPriceSqm",
      MAX(instance_date)::text                     AS "latestSale"
    FROM dld_transactions
    WHERE area_name_en         ILIKE ${area.dldName}
      AND trans_group_en       = 'Sales'
      AND property_type_en     IN ${db(area.propertyTypes)}
      AND actual_worth         BETWEEN ${area.minAED * 0.7} AND ${area.maxAED * 1.5}
      AND actual_worth         > 0
      AND instance_date        >= NOW() - (${MONTHS} || ' months')::interval
    GROUP BY property_type_en, rooms_en
    ORDER BY "count" DESC
    LIMIT 20
  `

  return rows
}

// ── Historical price query ────────────────────────────────────────────────────

interface YearlyStats {
  year:        number
  count:       number
  avgPrice:    number
  minPrice:    number
  maxPrice:    number
  avgPriceSqm: number
}

async function queryHistory(db: SqlClient, area: AreaDef): Promise<YearlyStats[]> {
  if (!area.dldName) return []

  const rows = await db<YearlyStats[]>`
    SELECT
      EXTRACT(YEAR FROM instance_date)::int   AS "year",
      COUNT(*)::int                           AS "count",
      ROUND(AVG(actual_worth))::int           AS "avgPrice",
      ROUND(MIN(actual_worth))::int           AS "minPrice",
      ROUND(MAX(actual_worth))::int           AS "maxPrice",
      ROUND(AVG(meter_sale_price))::int       AS "avgPriceSqm"
    FROM dld_transactions
    WHERE area_name_en     ILIKE ${area.dldName}
      AND trans_group_en   = 'Sales'
      AND property_type_en IN ${db(area.propertyTypes)}
      AND actual_worth     > 100000
      AND instance_date    >= '2015-01-01'
      ${area.bedsFilter != null
        ? db`AND rooms_en ILIKE ${'%' + area.bedsFilter + '%'}`
        : db``}
    GROUP BY "year"
    ORDER BY "year" ASC
  `

  return rows
}

function printHistory(area: AreaDef, rows: YearlyStats[], targetAED: number) {
  if (rows.length === 0) {
    console.log(c("yellow", `  No historical DLD data found for "${area.dldName}".`))
    return
  }

  const minRow  = rows.reduce((a, b) => a.avgPrice < b.avgPrice ? a : b)
  const maxRow  = rows.reduce((a, b) => a.avgPrice > b.avgPrice ? a : b)
  const latest  = rows[rows.length - 1]

  console.log(c("cyan", `\n  Year-by-Year DLD Prices — "${area.dldName}" (${area.propertyTypes.join("/")})\n`))
  console.log(c("dim", `  ${pad("Year", 6)}  ${pad("Deals", 6)}  ${pad("Avg Price", 14)}  ${pad("Min", 12)}  ${pad("Max", 12)}  ${pad("Avg/sqft", 10)}  vs Target`))
  console.log(c("dim", `  ${"─".repeat(80)}`))

  for (const r of rows) {
    const isMin       = r.year === minRow.year
    const isMax       = r.year === maxRow.year
    const isCurr      = r.year === latest.year
    const aboveTarget = r.avgPrice > targetAED
    const pctVsTarget = r.avgPrice > 0
      ? ((r.avgPrice - targetAED) / targetAED * 100).toFixed(0)
      : null

    const badge    = isMin ? " FLOOR" : isMax ? " PEAK " : isCurr ? " NOW  " : "      "
    const yearCol  = isMin ? "green" : isMax ? "red" : isCurr ? "cyan" : "dim"
    const priceCol = aboveTarget ? "yellow" : "green"
    const vsStr    = pctVsTarget
      ? (aboveTarget ? `+${pctVsTarget}% above` : `${pctVsTarget}% below`)
      : "—"
    const vsCol    = aboveTarget ? "yellow" : "green"

    console.log(
      `  ${c(yearCol, `${r.year}${badge}`)}  ` +
      `${c("dim", pad(String(r.count), 6))}  ` +
      `${c(priceCol, pad(fmtAed(r.avgPrice), 14))}  ` +
      `${pad(fmtAed(r.minPrice), 12)}  ${pad(fmtAed(r.maxPrice), 12)}  ` +
      `${c("dim", pad(fmtSqft(r.avgPriceSqm), 10))}  ${c(vsCol, vsStr)}`
    )
  }

  const fromFloor  = ((latest.avgPrice - minRow.avgPrice) / minRow.avgPrice * 100).toFixed(0)
  const fromTarget = ((latest.avgPrice - targetAED)       / targetAED       * 100).toFixed(0)
  const dropNeeded = ((latest.avgPrice - targetAED)       / latest.avgPrice * 100).toFixed(0)

  console.log()
  console.log(c("bold",   `  Price History Summary:`))
  console.log(c("green",  `  Floor (${minRow.year}):  AED ${fmtAed(minRow.avgPrice)}`))
  console.log(c("red",    `  Peak  (${maxRow.year}):  AED ${fmtAed(maxRow.avgPrice)}`))
  console.log(c("cyan",   `  Now   (${latest.year}):  AED ${fmtAed(latest.avgPrice)}  (+${fromFloor}% above floor)`))
  console.log()
  console.log(c("bold",   `  Your target: AED ${fmtAed(targetAED)}`))
  if (latest.avgPrice > targetAED) {
    console.log(c("yellow", `  Market needs to drop ${dropNeeded}% from current to hit your target.`))
    console.log(c("dim",    `  That would bring prices back to ~${minRow.year} levels.`))
  } else {
    console.log(c("green",  `  ✓ Current avg is ALREADY at or below your target.`))
  }
}

// ── Browser URL builder ───────────────────────────────────────────────────────

function pfUrl(area: AreaDef): string {
  // PropertyFinder canonical buy URL
  return (
    `https://www.propertyfinder.ae/en/buy/${area.pfSlug}/` +
    `${area.pfBeds}${area.pfType}-for-sale.html` +
    `?pf=${area.minAED}&pt=${area.maxAED}` +
    (READY_ONLY ? "&rp=y" : "")
  )
}

function bayutUrl(area: AreaDef): string {
  const typeMap: Record<string, string> = {
    apartments: "apartments",
    townhouses:  "townhouses",
    villas:      "villas",
  }
  const beds = area.bedsFilter ? `?beds=${area.bedsFilter}` : ""
  const price = `${beds ? "&" : "?"}price_min=${area.minAED}&price_max=${area.maxAED}`
  const ready = READY_ONLY ? "&completion_status=ready" : ""
  return (
    `https://www.bayut.com/for-sale/${typeMap[area.pfType] ?? area.pfType}/` +
    `${area.pfSlug}/${beds}${price}${ready}`
  )
}

// ── Display ───────────────────────────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  red:    "\x1b[31m",
  blue:   "\x1b[34m",
  white:  "\x1b[37m",
  magenta:"\x1b[35m",
}

const c = (col: keyof typeof C, s: string) => `${C[col]}${s}${C.reset}`
const pad = (s: string, n: number) => (s ?? "").slice(0, n).padEnd(n)
const fmtAed = (n: number) => n >= 1_000_000
  ? `${(n / 1_000_000).toFixed(2)}M`
  : `${(n / 1_000).toFixed(0)}k`
const fmtSqft = (sqm: number) => sqm ? `${Math.round(sqm / 10.764).toLocaleString()} psf` : "—"
const HR = "─".repeat(100)

function printHeader() {
  console.log()
  console.log(c("bold",    "  ╔══════════════════════════════════════════════════════╗"))
  console.log(c("bold",    "  ║      Property Hunter — Personal Research Tool        ║"))
  console.log(c("bold",    "  ╚══════════════════════════════════════════════════════╝"))
  console.log(c("dim",     `  DLD transaction data (last ${MONTHS} months)  |  Your budget: AED 700k – 1.5M`))
  console.log(c("dim",     `  Date: ${new Date().toLocaleDateString("en-AE", { timeZone: "Asia/Dubai", dateStyle: "full" })}`))
  console.log()
}

function printDldSection(area: AreaDef, stats: DldStats[], dbAvail: boolean) {
  console.log(`\n${c("bold", HR)}`)
  console.log(`  ${c("bold", area.label)}`)
  console.log(`  ${c("dim", area.notes)}`)
  console.log(c("dim", HR))

  if (!dbAvail) {
    console.log(c("yellow", "  [!] DATABASE_URL not set — skipping DLD market data."))
    console.log(c("dim",    "      Run with --env-file=.env.local to enable."))
  } else if (area.dldName === null) {
    console.log(c("dim", `  DLD market data: not available (${area.key === "ajman" ? "Ajman" : "Sharjah"} has its own Land Dept — DLD covers Dubai only).`))
    console.log(c("dim",  "  Tip: Check Ajman Real Estate Regulatory Agency (ARRA) or Sharjah Real Estate Registration Dept."))
  } else if (stats.length === 0) {
    console.log(c("yellow", `  No DLD transactions found in "${area.dldName}" for the last ${MONTHS} months within budget.`))
    console.log(c("dim",    "  Try: --months=24 to look further back."))
  } else {
    console.log(c("cyan", `\n  DLD Actual Sold Prices — "${area.dldName}" (last ${MONTHS} months)\n`))
    console.log(c("dim", `  ${pad("Type", 12)}  ${pad("Beds", 8)}  ${pad("Deals", 6)}  ${pad("Avg Price", 12)}  ${pad("Min", 12)}  ${pad("Max", 12)}  ${pad("Avg/sqft", 10)}  Latest Sale`))
    console.log(c("dim", `  ${"─".repeat(95)}`))

    for (const r of stats) {
      const inBudget = r.avgPrice >= area.minAED && r.avgPrice <= area.maxAED
      const priceTxt = fmtAed(r.avgPrice)
      const minTxt   = fmtAed(r.minPrice)
      const maxTxt   = fmtAed(r.maxPrice)

      console.log(
        `  ${pad(r.propertyType, 12)}  ${pad(r.rooms ?? "—", 8)}  ` +
        `${c("dim", pad(String(r.count), 6))}  ` +
        `${inBudget ? c("green", pad(priceTxt, 12)) : c("yellow", pad(priceTxt, 12))}  ` +
        `${pad(minTxt, 12)}  ${pad(maxTxt, 12)}  ` +
        `${c("dim", pad(fmtSqft(r.avgPriceSqm), 10))}  ` +
        `${c("dim", r.latestSale ?? "—")}`
      )
    }

    // Summary insight
    const relevant = stats.filter(r => r.avgPrice >= area.minAED && r.avgPrice <= area.maxAED)
    if (relevant.length > 0) {
      const cheapest = relevant.reduce((a, b) => a.avgPrice < b.avgPrice ? a : b)
      console.log()
      console.log(c("green", `  ✓ Within budget: ${cheapest.propertyType} (${cheapest.rooms ?? "any beds"}) at avg AED ${fmtAed(cheapest.avgPrice)}, based on ${cheapest.count} recent deal(s).`))
    } else {
      console.log()
      console.log(c("yellow", `  ⚠ Avg prices in "${area.dldName}" are outside your budget range. Consider expanding range.`))
    }
  }
}

function printLinks(area: AreaDef) {
  console.log()
  console.log(c("cyan", "  Open in browser (live listings):"))
  console.log(`  ${c("bold", "PropertyFinder:")}  ${pfUrl(area)}`)
  console.log(`  ${c("bold", "Bayut:")}           ${bayutUrl(area)}`)
}

function printSummary(areas: AreaDef[], stats: Map<string, DldStats[]>, dbAvail: boolean) {
  console.log(`\n${c("bold", "═".repeat(100))}`)
  console.log(c("bold", "  VERDICT SUMMARY"))
  console.log(c("dim", "═".repeat(100)))
  console.log()

  const rows = [
    { area: "DSO 1BR",         verdict: "Safe, boring, smart. Best liquidity. 6-7% yield.", tag: "✓ RECOMMENDED" },
    { area: "DAMAC Hills 2",   verdict: "Good if ready & freehold. Lower liquidity. Lifestyle play.", tag: "✓ CONSIDER" },
    { area: "Ajman Villa",     verdict: "Hold 5+ yrs only. Low capital appreciation. Good for family.", tag: "⚠ CAUTION"  },
    { area: "Sharjah Villa",   verdict: "Check freehold status! Usufruct = no true ownership.", tag: "⚠ CAUTION"  },
  ]

  for (const row of rows) {
    const tag = row.tag.startsWith("✓") ? c("green", row.tag) : c("yellow", row.tag)
    console.log(`  ${tag.padEnd(20)}  ${c("bold", row.area.padEnd(18))}  ${c("dim", row.verdict)}`)
  }

  console.log()
  console.log(c("dim", "  Reminder: Keep $120k USDT reserved for City Walk payments (200k AED May + 200k AED Sep)."))
  console.log(c("dim", "  Do NOT sell BTC/SOL for property payments."))
  console.log()
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  printHeader()

  if (activeAreas.length === 0) {
    console.log(c("red", `  Unknown area '${AREA_FILTER}'. Use: dso | d2 | ajman | sharjah | all`))
    process.exit(1)
  }

  const db      = await makeDb()
  const dbAvail = db !== null
  const statsMap   = new Map<string, DldStats[]>()
  const historyMap = new Map<string, YearlyStats[]>()

  if (dbAvail) {
    for (const area of activeAreas.filter(a => a.dldName)) {
      try {
        const stats = await queryDld(db!, area)
        statsMap.set(area.key, stats)
        if (HISTORY) {
          const hist = await queryHistory(db!, area)
          historyMap.set(area.key, hist)
        }
      } catch (e: any) {
        console.log(c("red", `  [DB error for ${area.key}] ${e.message}`))
        statsMap.set(area.key, [])
      }
    }
  }

  // Print each area
  for (const area of activeAreas) {
    const stats = statsMap.get(area.key) ?? []
    printDldSection(area, stats, dbAvail)

    if (HISTORY && dbAvail && area.dldName) {
      const hist   = historyMap.get(area.key) ?? []
      const target = TARGET_PRICE || area.minAED
      printHistory(area, hist, target)
    }

    printLinks(area)
  }

  // Summary (only shown when running all areas)
  if (AREA_FILTER === "all") {
    printSummary(activeAreas, statsMap, dbAvail)
  }

  if (db) await db.end()
}

main().catch(e => {
  console.error(c("red", `\n  Fatal: ${e.message}`))
  process.exit(1)
})
