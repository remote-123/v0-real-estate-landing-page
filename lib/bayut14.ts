/**
 * Bayut14 RapidAPI client
 *
 * Endpoint: GET /transactions?purpose=for-sale|for-rent&page=N
 * Budget: 900 req/month → 25 pages/day max (750/mo) + buffer
 * Key: BAYUT_RAPIDAPI_KEY
 */

const HOST = "bayut14.p.rapidapi.com"
const BASE = `https://${HOST}`

export type BayutPurpose = "for-sale" | "for-rent"

export interface BayutHit {
  transaction_hash_id: string
  date_transaction_nk: string         // ISO date string
  transaction_amount: number | null
  transaction_per_sqm_amount: number | null
  builtup_area_sqm: number | null
  beds: number | null
  bayut_location_l3_name_en: string | null
  bayut_location_l4_name_en: string | null
  transaction_category_l1_name: string | null  // "Sales" | "Rent"
  contract_monthly_amount: number | null
  rent_contract_duration_months: number | null
  property_completion_status_sk: string | null
  sale_market_name: string | null
  latitude: number | null
  longitude: number | null
}

export interface BayutPageResult {
  hits: BayutHit[]
  nbHits: number
  nbPages: number
}

/** Fetch one page (20 records) from the Bayut14 API */
export async function fetchBayutPage(purpose: BayutPurpose, page: number): Promise<BayutPageResult> {
  const key = process.env.BAYUT_RAPIDAPI_KEY
  if (!key) throw new Error("BAYUT_RAPIDAPI_KEY is not set")

  const url = `${BASE}/transactions?purpose=${purpose}&page=${page}`
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": HOST,
      "x-rapidapi-key": key,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Bayut14 HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const json = await res.json()
  if (!json?.success || !json?.data) {
    throw new Error(`Bayut14 unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`)
  }

  return {
    hits: json.data.hits ?? [],
    nbHits: json.data.nbHits ?? 0,
    nbPages: json.data.nbPages ?? 0,
  }
}

/** Map Bayut bed count → DLD rooms_en label */
export function bedsToRoomsEn(beds: number | null): string {
  if (beds === null || beds === undefined) return "Studio"
  if (beds <= 0) return "Studio"
  if (beds === 1) return "1 B/R"
  if (beds === 2) return "2 B/R"
  if (beds === 3) return "3 B/R"
  if (beds === 4) return "4 B/R"
  if (beds === 5) return "5 B/R"
  return "6 B/R"
}

/** DB row shape for INSERT into bayut_transactions */
export interface BayutTxnRow {
  transaction_hash_id: string
  instance_date: string             // YYYY-MM-DD
  actual_worth: number | null
  meter_sale_price: number | null
  procedure_area: number | null
  rooms_en: string
  bayut_location_l3_name_en: string | null
  bayut_location_l4_name_en: string | null
  trans_group_en: string            // 'Sales' | 'Rent'
  rent_value: number | null         // monthly rent (contract_monthly_amount)
  property_completion_status: string | null
  sale_market_name: string | null
  latitude: number | null
  longitude: number | null
}

/** Transform a raw Bayut hit into a DB row */
export function transformBayutHit(hit: BayutHit): BayutTxnRow | null {
  if (!hit.transaction_hash_id) return null
  if (!hit.date_transaction_nk) return null

  const transGroup = hit.transaction_category_l1_name === "Rent" ? "Rent" : "Sales"

  // Parse date (ISO string from API)
  const instanceDate = hit.date_transaction_nk.slice(0, 10) // YYYY-MM-DD

  return {
    transaction_hash_id: hit.transaction_hash_id,
    instance_date: instanceDate,
    actual_worth: hit.transaction_amount ?? null,
    meter_sale_price: hit.transaction_per_sqm_amount ?? null,
    procedure_area: hit.builtup_area_sqm ?? null,
    rooms_en: bedsToRoomsEn(hit.beds),
    bayut_location_l3_name_en: hit.bayut_location_l3_name_en ?? null,
    bayut_location_l4_name_en: hit.bayut_location_l4_name_en ?? null,
    trans_group_en: transGroup,
    rent_value: hit.contract_monthly_amount ?? null,
    property_completion_status: hit.property_completion_status_sk ?? null,
    sale_market_name: hit.sale_market_name ?? null,
    latitude: hit.latitude ?? null,
    longitude: hit.longitude ?? null,
  }
}
