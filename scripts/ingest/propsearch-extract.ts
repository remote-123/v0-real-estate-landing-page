/**
 * propsearch-extract.ts
 * Parses propsearch.ae building detail HTML into structured data.
 * All sections are section-aware: finds the relevant block in the page
 * then applies targeted patterns rather than scanning the full page.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TransportData {
  dubai_mall_min: number | null
  palm_min: number | null
  burj_al_arab_min: number | null
  jbr_min: number | null
  dxb_min: number | null
  dwc_min: number | null
}

export interface MilestonesData {
  first_trace?: string
  estimated_start?: string
  construction_started?: string
  construction_finished?: string
  estimated_completion?: string
}

export interface PoiEntry {
  name: string
  type: string
  venue: string
  distance_km: number
}

export type NearbyPois = {
  supermarkets?: PoiEntry[]
  restaurants?: PoiEntry[]
  pharmacies?: PoiEntry[]
  salons?: PoiEntry[]
  services?: PoiEntry[]
  gyms?: PoiEntry[]
}

export interface SchoolEntry {
  name: string
  distance_km: number
  area: string
  fee_aed: number | null
  curriculum: string | null
}

export interface HotelEntry {
  name: string
  distance_km: number
  outlets: { name: string; type: string }[]
}

export interface NeighbourhoodEntry {
  name: string
  distance_km: number
  description: string | null
}

export interface PaymentPlan {
  deposit_pct: number
  construction_pct: number
  handover_pct: number
}

export interface BuildingDetail {
  building_slug: string
  area_slug: string
  // Core
  name: string | null
  developer: string | null
  master_developer: string | null
  architect: string | null
  contractor: string | null
  building_type: string | null
  status: string | null
  completion_year: number | null
  construction_start: string | null
  total_floors: number | null
  total_units: number | null
  property_types: string | null
  amenities: string | null
  is_freehold: boolean | null
  service_charge_psf: number | null
  project_value_aed: bigint | null
  launch_price_aed: bigint | null
  description: string | null
  // Location intelligence
  transport: TransportData | null
  milestones: MilestonesData | null
  nearby_pois: NearbyPois | null
  nearby_schools: SchoolEntry[] | null
  nearby_hotels: HotelEntry[] | null
  nearby_neighbourhoods: NeighbourhoodEntry[] | null
  // Off-plan
  payment_plan: PaymentPlan | null
}

// ── HTML → structured text ────────────────────────────────────────────────────

/**
 * Strips HTML to plain text while preserving newlines at block boundaries.
 * Produces a newline-delimited string where each logical "item" is on its
 * own line — matching the structure seen in the browser's text extraction.
 */
export function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|section|article|tr|td|th|dt|dd|span)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── Section extractor helper ──────────────────────────────────────────────────

/** Slice text between two section markers (case-insensitive). */
function section(text: string, start: RegExp, ends: RegExp[]): string {
  const si = text.search(start)
  if (si === -1) return ''
  let ei = text.length
  for (const end of ends) {
    const found = text.slice(si + 1).search(end)
    if (found !== -1 && si + 1 + found < ei) ei = si + 1 + found
  }
  return text.slice(si, ei)
}

// ── Core field extractors ─────────────────────────────────────────────────────

function extractName(html: string): string | null {
  const m = html.match(/<h1[^>]*>\s*([^<]{3,120})\s*<\/h1>/i)
  return m ? m[1].trim() : null
}

function extractDeveloper(text: string): string | null {
  const m = text.match(/The project (?:is|was) a development by ([A-Z][^.\n]{3,120})\./i)
  if (!m) return null
  // Strip "through its subsidiary X" suffix to get primary developer
  return m[1].replace(/\s+through\s+its\s+subsidiary.*/i, '').trim()
}

function extractMasterDeveloper(text: string): string | null {
  const m = text.match(/Master\s+Developer[:\s]+([A-Z][^\n.]{2,80})/i)
  return m ? m[1].trim() : null
}

function extractArchitect(text: string): string | null {
  const m = text.match(/The architectural consultant (?:is|was) ([^.\n]{3,100})\./i)
  return m ? m[1].trim() : null
}

function extractContractor(text: string): string | null {
  const m = text.match(/The main building work (?:is being|was) done by ([^.\n]{3,100})\./i)
  return m ? m[1].trim() : null
}

function extractBuildingType(text: string): string | null {
  // "Residential building (Skyscraper)" — grab both parts
  const m = text.match(/Building type\s*\n\s*([^\n(]{3,60})(?:\s*\n\s*\(([^)]{2,40})\))?/i)
  if (!m) return null
  return m[2] ? `${m[1].trim()} (${m[2].trim()})` : m[1].trim()
}

function extractStatus(text: string): string | null {
  const m = text.match(/\bStatus\s*\n\s*([^\n]{3,40})/i)
  if (!m) return null
  const raw = m[1].trim().toLowerCase()
  if (raw.includes('complete')) return 'complete'
  if (raw.includes('under development') || raw.includes('under construction')) return 'under_construction'
  if (raw.includes('planned') || raw.includes('envisioned')) return 'planned'
  if (raw.includes('cancelled') || raw.includes('canceled')) return 'cancelled'
  return raw
}

function extractFloors(text: string): number | null {
  for (const re of [
    /Storeys?\s*\n\s*(\d+)\s*storey/i,
    /apartment\s*\n\s*Storeys?\s*\n\s*(\d+)/i,
    /(\d+)\s*storeys?\s*\+\s*\d+\s*storey/i,   // "17 storeys + 19 storeys" → take first
    /(\d+)\s*(?:floors?|storey|storeys?|levels?)/i,
    /G\+(\d+)/i,
  ]) {
    const m = text.match(re)
    if (m) return parseInt(m[1], 10)
  }
  return null
}

function extractUnits(text: string): number | null {
  // Specific structured sentence — avoids spurious matches
  for (const re of [
    /The development (?:contains?|will contain) (?:a total of |an estimated )?(\d[\d,]+) units/i,
    /total of (\d[\d,]+) units/i,
    /Units\s*\n\s*The development (?:contains?|will contain)[^.]*?(\d[\d,]+) units/i,
  ]) {
    const m = text.match(re)
    if (m) return parseInt(m[1].replace(/,/g, ''), 10)
  }
  return null
}

function extractPropertyTypes(text: string): string | null {
  // Only look in the "Unit layouts" section to avoid noise
  const layoutSection = section(text, /Unit layouts?\s*\n/i, [
    /\n[A-Z]{4,}/,  // next ALL-CAPS section
    /\nBUILDING SPECIFICATIONS/i,
    /\nLATEST TRANSACTIONS/i,
  ])
  if (!layoutSection) return null

  const typeKeywords: [RegExp, string][] = [
    [/\bstudio\b/i, 'Studio'],
    [/\b1\s*(?:br|bed|bedroom)\b/i, '1BR'],
    [/\b2\s*(?:br|bed|bedroom)\b/i, '2BR'],
    [/\b3\s*(?:br|bed|bedroom)\b/i, '3BR'],
    [/\b4\s*(?:br|bed|bedroom)\b/i, '4BR'],
    [/\b5\+?\s*(?:br|bed|bedroom)\b/i, '5BR+'],
    [/\bpenthouse\b/i, 'Penthouse'],
    [/\btownhouse\b/i, 'Townhouse'],
    [/\bvilla\b/i, 'Villa'],
    [/\bduplex\b/i, 'Duplex'],
  ]
  const found = typeKeywords.filter(([re]) => re.test(layoutSection)).map(([, l]) => l)
  return found.length ? found.join(', ') : null
}

function extractAmenities(text: string): string | null {
  // Grab the full amenities sentence — much richer than keyword matching
  const m = text.match(/Amenities (?:include|will include)[^.]{10,600}\./i)
  if (m) return m[0].replace(/^Amenities (?:include|will include)\s*/i, '').replace(/\.$/, '').trim()
  return null
}

function extractCompletionYear(text: string): number | null {
  // Prefer "completed in" over estimated handover
  for (const re of [
    /The project was completed in (?:[A-Za-z]+ )?(\d{4})/i,
    /completed by (?:[A-Za-z]+ )?(\d{4})/i,
    /Construction Finished\s*\n\s*(?:[A-Za-z]+ )?(\d{4})/i,
    /Estimated Completion\s*\n\s*(?:[A-Za-z]+ )?(\d{4})/i,
    /(?:handover|completion) date (?:is|was) (?:[A-Za-z]+ )?(\d{4})/i,
  ]) {
    const m = text.match(re)
    if (m) return parseInt(m[1], 10)
  }
  return null
}

function extractConstructionStart(text: string): string | null {
  const m = text.match(/Construction began in ([A-Za-z]+ \d{4})/i)
  return m ? m[1] : null
}

function extractFreehold(text: string): boolean | null {
  if (/\bfreehold\b/i.test(text)) return true
  if (/\bleasehold\b/i.test(text)) return false
  return null
}

function extractServiceCharge(text: string): number | null {
  const m = text.match(/service\s*charges?\s*[:\s]+(?:AED\s*)?([\d.,]+)\s*(?:\/\s*sqft|per\s*sqft|psf)/i)
  if (!m) return null
  const v = parseFloat(m[1].replace(/,/g, ''))
  return v > 0 && v < 100 ? v : null
}

function extractProjectValue(text: string): bigint | null {
  const m = text.match(/project is valued at AED ([\d,]+(?:\.\d+)?)\s*(million|billion|m|b)?\s*\(/i)
    || text.match(/valued at AED ([\d,]+(?:\.\d+)?)\s*(million|billion|m\b|b\b)/i)
  if (!m) return null
  const num = parseFloat(m[1].replace(/,/g, ''))
  const mult = /billion|b\b/i.test(m[2] ?? '') ? 1_000_000_000n
    : /million|m\b/i.test(m[2] ?? '') ? 1_000_000n : 1n
  try { return BigInt(Math.round(num)) * mult } catch { return null }
}

function extractLaunchPrice(text: string): bigint | null {
  const m = text.match(/units were priced from AED ([\d,]+)/i)
  if (!m) return null
  try { return BigInt(parseInt(m[1].replace(/,/g, ''), 10)) } catch { return null }
}

function extractDescription(html: string): string | null {
  const paraRe = /<p[^>]*>\s*([^<]{80,600})\s*<\/p>/g
  let pm: RegExpExecArray | null
  while ((pm = paraRe.exec(html)) !== null) {
    const c = pm[1].replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (/cookie|privacy|copyright|subscribe|newsletter|terms|propsearch/i.test(c)) continue
    if (c.length >= 80) return c.slice(0, 400)
  }
  return null
}

// ── Section: Transport ────────────────────────────────────────────────────────

function extractTransport(text: string): TransportData | null {
  const commuteM = text.match(
    /roughly (\d+) minutes?.*?Dubai Mall.*?(\d+) minutes?.*?Palm Jumeirah.*?(\d+) minutes?.*?Burj Al Arab.*?(\d+) minutes?.*?(?:The Walk JBR|JBR\b)/is
  )
  const dxbM  = text.match(/DXB\)?[^.]*?roughly (\d+) minutes/i)
  const dwcM  = text.match(/Al Maktoum International Airport[^.]*?roughly (\d+) minutes/i)

  if (!commuteM && !dxbM) return null

  return {
    dubai_mall_min:    commuteM ? parseInt(commuteM[1]) : null,
    palm_min:          commuteM ? parseInt(commuteM[2]) : null,
    burj_al_arab_min:  commuteM ? parseInt(commuteM[3]) : null,
    jbr_min:           commuteM ? parseInt(commuteM[4]) : null,
    dxb_min:           dxbM ? parseInt(dxbM[1]) : null,
    dwc_min:           dwcM ? parseInt(dwcM[1]) : null,
  }
}

// ── Section: Milestones ───────────────────────────────────────────────────────

function extractMilestones(text: string): MilestonesData | null {
  const sec = section(text, /\bMILESTONES\b/, [
    /\bCONSTRUCTION\b/, /\bDESIGN STAGE\b/, /\bTRANSPORT\b/,
    /\bPROPERTIES ON\b/, /\bADVERTISEMENT\b/,
  ])
  if (!sec) return null

  const result: MilestonesData = {}
  const keys: [keyof MilestonesData, RegExp][] = [
    ['first_trace',           /First Trace\s*\n\s*([^\n]+)/],
    ['estimated_start',       /Estimated Start\s*\n\s*([^\n]+)/],
    ['construction_started',  /Construction Started\s*\n\s*([^\n]+)/],
    ['construction_finished', /Construction Finished\s*\n\s*([^\n]+)/],
    ['estimated_completion',  /Estimated Completion\s*\n\s*([^\n]+)/],
  ]
  for (const [key, re] of keys) {
    const m = sec.match(re)
    if (m) result[key] = m[1].trim()
  }
  return Object.keys(result).length > 0 ? result : null
}

// ── Section: Payment Plan (off-plan only) ─────────────────────────────────────

function extractPaymentPlan(text: string): PaymentPlan | null {
  const m = text.match(
    /Down payment\s*\n\s*(\d+)%\s*\n\s*Construction\s*\n\s*(\d+)%\s*\n\s*Handover\s*\n\s*(\d+)%/i
  ) || text.match(
    /Down payment.*?(\d+)%.*?Construction.*?(\d+)%.*?Handover.*?(\d+)%/is
  )
  if (!m) return null
  return {
    deposit_pct:      parseInt(m[1]),
    construction_pct: parseInt(m[2]),
    handover_pct:     parseInt(m[3]),
  }
}

// ── Section: Nearby Shops & Outlets ──────────────────────────────────────────

type PoiCategoryKey = keyof NearbyPois

const CATEGORY_MATCHERS: [RegExp, PoiCategoryKey][] = [
  [/SUPERMARKETS?|MINI\s*MART/i,    'supermarkets'],
  [/RESTAURANTS?|BARS?/i,            'restaurants'],
  [/CLINICS?|PHARMACIES?/i,          'pharmacies'],
  [/SALONS?|SPAS?/i,                 'salons'],
  [/\bSERVICES\b/i,                  'services'],
  [/GYMS?|FITNESS/i,                 'gyms'],
]

function extractNearbyPois(text: string): NearbyPois | null {
  const sec = section(text, /NEARBY SHOPS AND OUTLETS/i, [
    /NEARBY HOTELS/i, /LOCAL SCHOOLS/i, /THINGS TO DO/i,
  ])
  if (!sec) return null

  const lines = sec.split('\n').map(l => l.trim()).filter(Boolean)
  const result: NearbyPois = {}
  let currentCat: PoiCategoryKey | null = null

  // Pattern: "Type, Venue (N.N km)"
  const venueRe = /^([^,(]{2,40}),\s*([^\n(]{2,60}?)\s*\(([\d.]+)\s*km\)$/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for category header
    for (const [re, cat] of CATEGORY_MATCHERS) {
      if (re.test(line) && line === line.toUpperCase().trim()) {
        currentCat = cat
        break
      }
    }

    if (!currentCat) continue

    // Check if next line is a venue entry
    const next = lines[i + 1] || ''
    const m = next.match(venueRe)
    if (m && line.length > 2 && line.length < 70 && !line.match(/^(For a full|There are|We've|In addition)/i)) {
      if (!result[currentCat]) result[currentCat] = []
      if (result[currentCat]!.length < 5) {
        result[currentCat]!.push({
          name: line,
          type: m[1].trim(),
          venue: m[2].trim(),
          distance_km: parseFloat(m[3]),
        })
      }
      i++ // consume the venue line
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

// ── Section: Schools ─────────────────────────────────────────────────────────

function extractSchools(text: string): SchoolEntry[] | null {
  const sec = section(text, /LOCAL SCHOOLS\b/i, [
    /THINGS TO DO/i, /NEARBY HOTELS/i, /NEARBY NEIGHBOURHOODS/i,
  ])
  if (!sec) return null

  const lines = sec.split('\n').map(l => l.trim()).filter(Boolean)
  const schools: SchoolEntry[] = []

  // Pattern:
  //   Name
  //   N.N km, Area
  //   AED fee  •  curriculum   (optional)
  const distRe = /^([\d.]+)\s*km,\s*(.+)$/
  const feeRe  = /^AED\s*([\d,]+)\s*[•·]\s*(.+)$/

  for (let i = 0; i + 1 < lines.length; i++) {
    const distM = lines[i + 1].match(distRe)
    if (!distM) continue

    const name = lines[i]
    if (name.length < 4 || name.length > 90) continue
    if (/^(LOCAL SCHOOLS|has many|see all|in terms|there are|\d)/i.test(name)) continue

    const school: SchoolEntry = {
      name,
      distance_km: parseFloat(distM[1]),
      area: distM[2].trim(),
      fee_aed: null,
      curriculum: null,
    }

    const nextLine = lines[i + 2]?.trim() || ''
    const feeM = nextLine.match(feeRe)
    if (feeM) {
      school.fee_aed = parseInt(feeM[1].replace(/,/g, ''), 10)
      school.curriculum = feeM[2].trim()
      i += 2
    } else if (nextLine && nextLine.length < 60 && !/^[\d.]|^AED|^See|^In/.test(nextLine)) {
      school.curriculum = nextLine
      i += 2
    } else {
      i += 1
    }

    schools.push(school)
    if (schools.length >= 8) break
  }

  return schools.length > 0 ? schools : null
}

// ── Section: Nearby Hotels ────────────────────────────────────────────────────

function extractHotels(text: string): HotelEntry[] | null {
  const sec = section(text, /NEARBY HOTELS\b/i, [
    /LOCAL SCHOOLS/i, /THINGS TO DO/i, /NEARBY SHOPS/i,
    /NEARBY NEIGHBOURHOODS/i,
  ])
  if (!sec) return null

  const lines = sec.split('\n').map(l => l.trim()).filter(Boolean)
  const hotels: HotelEntry[] = []

  // Pattern: hotel name, then "N.N km. Outlets include"
  const distRe = /^([\d.]+)\s*km\.\s+Outlets include$/i

  for (let i = 1; i < lines.length; i++) {
    const distM = lines[i].match(distRe)
    if (!distM) continue

    const name = lines[i - 1]
    if (name.length < 3 || name.length > 100) continue
    if (/^(NEARBY HOTELS|There are|Below|For a full)/i.test(name)) continue

    const hotel: HotelEntry = {
      name,
      distance_km: parseFloat(distM[1]),
      outlets: [],
    }

    // Collect outlet pairs: name + type (2 lines each)
    let j = i + 1
    while (j + 1 < lines.length && hotel.outlets.length < 4) {
      const outletName = lines[j]
      const outletType = lines[j + 1]
      // outlet types are short single words/phrases
      if (outletType && outletType.length < 25 && !outletType.match(/^\d|^For a/)) {
        hotel.outlets.push({ name: outletName, type: outletType })
        j += 2
      } else {
        break
      }
    }

    hotels.push(hotel)
    i = j - 1
    if (hotels.length >= 5) break
  }

  return hotels.length > 0 ? hotels : null
}

// ── Section: Nearby Neighbourhoods ───────────────────────────────────────────

function extractNeighbourhoods(text: string): NeighbourhoodEntry[] | null {
  const sec = section(text, /NEARBY NEIGHBOURHOODS\b/i, [
    /ABOUT PROPSEARCH/i, /ON THIS PAGE/i,
  ])
  if (!sec) return null

  const lines = sec.split('\n').map(l => l.trim()).filter(Boolean)
  const result: NeighbourhoodEntry[] = []

  // Pattern: "Name (N.N km)" then optional description then "Read more"
  const headerRe = /^(.+?)\s*\(([\d.]+)\s*km\)$/

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headerRe)
    if (!m) continue
    const name = m[1].trim()
    if (name.length < 2 || /^(NEARBY|Explore)/i.test(name)) continue

    const distKm = parseFloat(m[2])
    if (distKm <= 0 || distKm > 30) continue

    let description: string | null = null
    if (lines[i + 1] && !/^Read more$/i.test(lines[i + 1]) && lines[i + 1].length > 20) {
      description = lines[i + 1]
      i++ // consume description line
    }

    result.push({ name, distance_km: distKm, description })
    if (result.length >= 8) break
  }

  return result.length > 0 ? result : null
}

// ── Main extractor ────────────────────────────────────────────────────────────

export function extractDetail(html: string, slug: string, areaSlug: string): BuildingDetail {
  const text = toText(html)

  return {
    building_slug: slug,
    area_slug:     areaSlug,

    name:               extractName(html),
    developer:          extractDeveloper(text),
    master_developer:   extractMasterDeveloper(text),
    architect:          extractArchitect(text),
    contractor:         extractContractor(text),
    building_type:      extractBuildingType(text),
    status:             extractStatus(text),
    completion_year:    extractCompletionYear(text),
    construction_start: extractConstructionStart(text),
    total_floors:       extractFloors(text),
    total_units:        extractUnits(text),
    property_types:     extractPropertyTypes(text),
    amenities:          extractAmenities(text),
    is_freehold:        extractFreehold(text),
    service_charge_psf: extractServiceCharge(text),
    project_value_aed:  extractProjectValue(text),
    launch_price_aed:   extractLaunchPrice(text),
    description:        extractDescription(html),

    transport:              extractTransport(text),
    milestones:             extractMilestones(text),
    nearby_pois:            extractNearbyPois(text),
    nearby_schools:         extractSchools(text),
    nearby_hotels:          extractHotels(text),
    nearby_neighbourhoods:  extractNeighbourhoods(text),
    payment_plan:           extractPaymentPlan(text),
  }
}
