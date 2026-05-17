/**
 * PropertyFinder UAE RapidAPI client
 * Provider: happyendpoint (same developer as bayut14)
 * Host: propertyfinder-uae-data.p.rapidapi.com
 * Key:  BAYUT_RAPIDAPI_KEY (shared key across happyendpoint APIs)
 *
 * Endpoints used:
 *   GET /autocomplete-location?query=AREA_NAME  → get location IDs
 *   GET /search-buy?location_ids=ID&...          → live for-sale listings
 */

const HOST = "propertyfinder-uae-data.p.rapidapi.com"
const BASE = `https://${HOST}`

function headers(): Record<string, string> {
  const key = process.env.BAYUT_RAPIDAPI_KEY
  if (!key) throw new Error("BAYUT_RAPIDAPI_KEY is not set")
  return {
    "x-rapidapi-host": HOST,
    "x-rapidapi-key":  key,
  }
}

// ── Location autocomplete ─────────────────────────────────────────────────────

export interface PfLocation {
  id:       string | number
  name:     string
  slug?:    string
  level?:   number
  emirate?: string
}

export async function autocompleteLocation(query: string): Promise<PfLocation[]> {
  const url = `${BASE}/autocomplete-location?query=${encodeURIComponent(query)}&lang=en`
  const res = await fetch(url, { headers: headers(), cache: "no-store" })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`PF autocomplete HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const json = await res.json()

  // Handle multiple possible response shapes
  const items: any[] =
    json?.data?.locations ??
    json?.data?.results  ??
    json?.locations      ??
    json?.results        ??
    (Array.isArray(json?.data) ? json.data : null) ??
    (Array.isArray(json)       ? json      : [])

  return items.map((loc: any) => ({
    id:      loc.id      ?? loc.externalId ?? loc.location_id ?? "",
    name:    loc.name    ?? loc.fullName   ?? loc.text        ?? "",
    slug:    loc.slug    ?? loc.urlPath    ?? undefined,
    level:   loc.level   ?? loc.type       ?? undefined,
    emirate: loc.emirate ?? loc.city       ?? undefined,
  }))
}

// ── Property listing search ───────────────────────────────────────────────────

export interface PfListing {
  id:           string
  title:        string
  price:        number
  beds:         number | null
  baths:        number | null
  sqft:         number | null
  location:     string
  subLocation:  string
  propertyType: string
  ready:        boolean
  furnished:    boolean
  agentName:    string
  url:          string
  listedAt:     string
}

export interface PfSearchResult {
  listings:   PfListing[]
  totalCount: number
  page:       number
  totalPages: number
}

export interface PfSearchParams {
  locationIds:   Array<string | number>
  minPrice?:     number
  maxPrice?:     number
  beds?:         number          // null = any
  propertyType?: "apartment" | "villa" | "townhouse" | "penthouse"
  readyOnly?:    boolean
  page?:         number          // 1-based
}

export async function searchBuy(params: PfSearchParams): Promise<PfSearchResult> {
  const p = new URLSearchParams()

  p.set("location_ids", params.locationIds.join(","))
  p.set("lang",         "en")
  p.set("page",         String(params.page ?? 1))

  if (params.minPrice)     p.set("price_min",     String(params.minPrice))
  if (params.maxPrice)     p.set("price_max",     String(params.maxPrice))
  if (params.beds != null) p.set("rooms",         String(params.beds))
  if (params.propertyType) p.set("property_type", params.propertyType)
  if (params.readyOnly)    p.set("completion",    "ready")

  const url = `${BASE}/search-buy?${p}`
  const res  = await fetch(url, { headers: headers(), cache: "no-store" })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`PF search-buy HTTP ${res.status}: ${body.slice(0, 300)}`)
  }

  const json = await res.json()

  // Walk common response shapes
  const rawListings: any[] =
    json?.data?.listings     ??
    json?.data?.properties   ??
    json?.data?.hits         ??
    json?.listings           ??
    json?.properties         ??
    json?.results            ??
    (Array.isArray(json?.data) ? json.data : [])

  const totalCount: number =
    json?.data?.totalCount ??
    json?.data?.nbHits     ??
    json?.totalCount       ??
    json?.count            ??
    rawListings.length

  const totalPages: number =
    json?.data?.totalPages ??
    json?.data?.nbPages    ??
    json?.totalPages       ??
    Math.ceil(totalCount / 25)

  return {
    listings:   rawListings.map(normaliseListing).filter(Boolean) as PfListing[],
    totalCount,
    page:       params.page ?? 1,
    totalPages,
  }
}

function normaliseListing(raw: any): PfListing | null {
  if (!raw) return null

  const price =
    raw.price?.value ??
    (typeof raw.price === "number" ? raw.price : null) ??
    raw.Price ??
    raw.asking_price ??
    0

  if (!price) return null

  const sqm  = raw.area?.value ?? raw.area ?? raw.size ?? raw.builtup_area_sqm ?? null
  const sqft = sqm ? Math.round(sqm / 0.0929) : null          // sqm → sqft
  const sqftDirect = raw.area_sqft ?? raw.size_sqft ?? null

  const url = raw.url
    ? (raw.url.startsWith("http") ? raw.url : `https://www.propertyfinder.ae${raw.url}`)
    : ""

  const status = (raw.completionStatus ?? raw.completion_status ?? raw.status ?? "").toLowerCase()

  return {
    id:           String(raw.id ?? raw.reference ?? raw.slug ?? Math.random()),
    title:        raw.title ?? raw.name ?? "Untitled",
    price,
    beds:         raw.bedrooms?.value ?? raw.bedrooms ?? raw.beds ?? null,
    baths:        raw.bathrooms?.value ?? raw.bathrooms ?? raw.baths ?? null,
    sqft:         sqftDirect ?? sqft,
    location:     raw.location?.text ?? raw.community ?? raw.locationText ?? "—",
    subLocation:  raw.location?.subText ?? raw.subCommunity ?? "",
    propertyType: raw.propertyType ?? raw.property_type ?? "—",
    ready:        status.includes("ready") || raw.isReady === true || raw.ready === true,
    furnished:    (raw.furnishingStatus ?? raw.furnished ?? "").toLowerCase().includes("furnished"),
    agentName:    raw.agent?.name ?? raw.agentName ?? raw.broker_name ?? "—",
    url,
    listedAt:     raw.listedAt ?? raw.listed_at ?? raw.createdAt ?? "—",
  }
}
