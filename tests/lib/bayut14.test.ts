/**
 * Tests for lib/bayut14.ts
 *
 * bayut14.ts is the client for the Bayut14 RapidAPI (900 req/month).
 * It feeds `bayut_transactions` via the daily cron and `mv_txn_monthly_unified`
 * (the materialized view used by ALL terminal pages).
 *
 * Pure functions can be tested without mocks:
 *   bedsToRoomsEn()     — maps bed count → DLD rooms_en label
 *   transformBayutHit() — maps raw API hit → DB row shape
 *
 * fetchBayutPage() requires fetch mock + env var control.
 *
 * Key regression guards:
 * - null/0/negative beds → "Studio" (Dubai convention: 0 beds = studio)
 * - missing hash_id → transformBayutHit returns null (upstream callers filter(Boolean))
 * - missing date → transformBayutHit returns null
 * - "Rent" category maps correctly (else branch defaults to "Sales")
 * - date sliced to YYYY-MM-DD (ISO dates include time component)
 * - BAYUT_RAPIDAPI_KEY missing → throws descriptive error
 * - HTTP error → throws with status code in message
 * - malformed response → throws
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { bedsToRoomsEn, transformBayutHit, fetchBayutPage } from '@/lib/bayut14'
import type { BayutHit } from '@/lib/bayut14'

// ── bedsToRoomsEn ─────────────────────────────────────────────────────────────

describe('bedsToRoomsEn — Dubai studio conventions', () => {
  it('maps null to "Studio"', () => {
    expect(bedsToRoomsEn(null)).toBe('Studio')
  })

  it('maps undefined to "Studio"', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(bedsToRoomsEn(undefined as any)).toBe('Studio')
  })

  it('maps 0 to "Studio" (Dubai convention: 0 bedrooms = studio unit)', () => {
    expect(bedsToRoomsEn(0)).toBe('Studio')
  })

  it('maps negative number to "Studio" (invalid input treated as no bedrooms)', () => {
    expect(bedsToRoomsEn(-1)).toBe('Studio')
    expect(bedsToRoomsEn(-5)).toBe('Studio')
  })
})

describe('bedsToRoomsEn — bedroom label mapping', () => {
  it('maps 1 to "1 B/R"', () => {
    expect(bedsToRoomsEn(1)).toBe('1 B/R')
  })

  it('maps 2 to "2 B/R"', () => {
    expect(bedsToRoomsEn(2)).toBe('2 B/R')
  })

  it('maps 3 to "3 B/R"', () => {
    expect(bedsToRoomsEn(3)).toBe('3 B/R')
  })

  it('maps 4 to "4 B/R"', () => {
    expect(bedsToRoomsEn(4)).toBe('4 B/R')
  })

  it('maps 5 to "5 B/R"', () => {
    expect(bedsToRoomsEn(5)).toBe('5 B/R')
  })

  it('maps 6 to "6 B/R"', () => {
    expect(bedsToRoomsEn(6)).toBe('6 B/R')
  })

  it('maps 7+ to "6 B/R" (capped at 6)', () => {
    expect(bedsToRoomsEn(7)).toBe('6 B/R')
    expect(bedsToRoomsEn(10)).toBe('6 B/R')
  })
})

// ── transformBayutHit ─────────────────────────────────────────────────────────

function makeHit(overrides: Partial<BayutHit> = {}): BayutHit {
  return {
    transaction_hash_id: 'hash-abc-123',
    date_transaction_nk: '2026-04-15T00:00:00.000Z',
    transaction_amount: 1_800_000,
    transaction_per_sqm_amount: 18_000,
    builtup_area_sqm: 100,
    beds: 2,
    bayut_location_l3_name_en: 'Downtown Dubai',
    bayut_location_l4_name_en: null,
    transaction_category_l1_name: 'Sales',
    contract_monthly_amount: null,
    rent_contract_duration_months: null,
    property_completion_status_sk: 'ready',
    sale_market_name: 'Secondary',
    latitude: 25.1972,
    longitude: 55.2744,
    ...overrides,
  }
}

describe('transformBayutHit — null guards (returns null → filtered by upstream callers)', () => {
  it('returns null when transaction_hash_id is falsy empty string', () => {
    expect(transformBayutHit(makeHit({ transaction_hash_id: '' }))).toBeNull()
  })

  it('returns null when transaction_hash_id is null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(transformBayutHit(makeHit({ transaction_hash_id: null as any }))).toBeNull()
  })

  it('returns null when date_transaction_nk is empty', () => {
    expect(transformBayutHit(makeHit({ date_transaction_nk: '' }))).toBeNull()
  })

  it('returns null when date_transaction_nk is null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(transformBayutHit(makeHit({ date_transaction_nk: null as any }))).toBeNull()
  })

  it('returns non-null for a valid hit', () => {
    expect(transformBayutHit(makeHit())).not.toBeNull()
  })
})

describe('transformBayutHit — category mapping', () => {
  it('maps transaction_category_l1_name="Rent" → trans_group_en="Rent"', () => {
    const row = transformBayutHit(makeHit({ transaction_category_l1_name: 'Rent' }))
    expect(row?.trans_group_en).toBe('Rent')
  })

  it('maps transaction_category_l1_name="Sales" → trans_group_en="Sales"', () => {
    const row = transformBayutHit(makeHit({ transaction_category_l1_name: 'Sales' }))
    expect(row?.trans_group_en).toBe('Sales')
  })

  it('maps null category → trans_group_en="Sales" (else branch default)', () => {
    const row = transformBayutHit(makeHit({ transaction_category_l1_name: null }))
    expect(row?.trans_group_en).toBe('Sales')
  })

  it('maps unrecognized category → trans_group_en="Sales"', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = transformBayutHit(makeHit({ transaction_category_l1_name: 'Gift' as any }))
    expect(row?.trans_group_en).toBe('Sales')
  })
})

describe('transformBayutHit — date handling', () => {
  it('slices ISO datetime to YYYY-MM-DD', () => {
    const row = transformBayutHit(makeHit({ date_transaction_nk: '2026-04-15T12:30:00.000Z' }))
    expect(row?.instance_date).toBe('2026-04-15')
  })

  it('preserves plain YYYY-MM-DD date unchanged', () => {
    const row = transformBayutHit(makeHit({ date_transaction_nk: '2026-03-22' }))
    expect(row?.instance_date).toBe('2026-03-22')
  })
})

describe('transformBayutHit — field mapping', () => {
  it('maps beds to rooms_en via bedsToRoomsEn', () => {
    expect(transformBayutHit(makeHit({ beds: null }))?.rooms_en).toBe('Studio')
    expect(transformBayutHit(makeHit({ beds: 2 }))?.rooms_en).toBe('2 B/R')
  })

  it('maps contract_monthly_amount to rent_value', () => {
    const row = transformBayutHit(makeHit({ contract_monthly_amount: 15_000 }))
    expect(row?.rent_value).toBe(15_000)
  })

  it('maps null contract_monthly_amount → rent_value=null', () => {
    const row = transformBayutHit(makeHit({ contract_monthly_amount: null }))
    expect(row?.rent_value).toBeNull()
  })

  it('preserves transaction_hash_id as-is', () => {
    const row = transformBayutHit(makeHit({ transaction_hash_id: 'txn-xyz-789' }))
    expect(row?.transaction_hash_id).toBe('txn-xyz-789')
  })
})

// ── fetchBayutPage ────────────────────────────────────────────────────────────

describe('fetchBayutPage — missing API key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.BAYUT_RAPIDAPI_KEY
  })

  afterEach(() => {
    delete process.env.BAYUT_RAPIDAPI_KEY
  })

  it('throws descriptive error when BAYUT_RAPIDAPI_KEY is not set', async () => {
    global.fetch = vi.fn()
    await expect(fetchBayutPage('for-sale', 1)).rejects.toThrow('BAYUT_RAPIDAPI_KEY is not set')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('fetchBayutPage — HTTP errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BAYUT_RAPIDAPI_KEY = 'test-bayut-key'
  })

  afterEach(() => {
    delete process.env.BAYUT_RAPIDAPI_KEY
  })

  it('throws with HTTP status when API returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests',
    } as Response)
    await expect(fetchBayutPage('for-sale', 1)).rejects.toThrow('429')
  })

  it('throws when json.success is false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, data: null }),
    } as Response)
    await expect(fetchBayutPage('for-sale', 1)).rejects.toThrow(/unexpected response shape/i)
  })

  it('throws when json.data is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: null }),
    } as Response)
    await expect(fetchBayutPage('for-sale', 1)).rejects.toThrow(/unexpected response shape/i)
  })
})

describe('fetchBayutPage — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BAYUT_RAPIDAPI_KEY = 'test-bayut-key'
  })

  afterEach(() => {
    delete process.env.BAYUT_RAPIDAPI_KEY
  })

  it('returns hits, nbHits, nbPages on successful response', async () => {
    const fakeHit: BayutHit = {
      transaction_hash_id: 'abc',
      date_transaction_nk: '2026-04-01',
      transaction_amount: 1_500_000,
      transaction_per_sqm_amount: 15_000,
      builtup_area_sqm: 100,
      beds: 2,
      bayut_location_l3_name_en: 'Dubai Marina',
      bayut_location_l4_name_en: null,
      transaction_category_l1_name: 'Sales',
      contract_monthly_amount: null,
      rent_contract_duration_months: null,
      property_completion_status_sk: 'ready',
      sale_market_name: 'Secondary',
      latitude: 25.0,
      longitude: 55.0,
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { hits: [fakeHit], nbHits: 1, nbPages: 5 },
      }),
    } as Response)

    const result = await fetchBayutPage('for-sale', 1)
    expect(result.hits).toHaveLength(1)
    expect(result.nbHits).toBe(1)
    expect(result.nbPages).toBe(5)
  })

  it('returns empty hits array when data.hits is null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { hits: null, nbHits: 0, nbPages: 0 },
      }),
    } as Response)

    const result = await fetchBayutPage('for-rent', 1)
    expect(result.hits).toEqual([])
    expect(result.nbHits).toBe(0)
  })

  it('sends correct purpose in URL query string', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { hits: [], nbHits: 0, nbPages: 0 },
      }),
    } as Response)

    await fetchBayutPage('for-rent', 3)
    const [calledUrl] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(calledUrl).toContain('purpose=for-rent')
    expect(calledUrl).toContain('page=3')
  })
})
