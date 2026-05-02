/**
 * Tests for GET /api/cron/fetch-rental-listings
 *
 * This cron feeds the `rental_listings` table (1,168 rows live) which powers:
 * - /tools/rental-yield-calculator (live benchmarks)
 * - /terminal/rental-drops (gated terminal page)
 *
 * Key regression guards:
 * - area extracted from location_tree level="1" (NOT address.community.name — that field doesn't exist in PF API)
 * - is_direct_from_developer listings filtered OUT (developer spam pollutes rental data)
 * - price=0 listings filtered OUT
 * - price_per_sqft = 0 when size_sqft = 0 (no divide-by-zero)
 * - monthly_price = Math.round(annualPrice / 12)
 * - PF API HTTP error is graceful (returns [], not 500) — cron swallows PF failures
 * - SQL error → 500 + Telegram error (unrecoverable, notify)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db', () => {
  // sql.json must be a callable function (used as sql.json(row.raw) in template literal)
  const sql = Object.assign(vi.fn(), { json: vi.fn((v: unknown) => v) })
  return { sql }
})

vi.mock('@/lib/telegram', () => ({
  sendTelegramError: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/cron/fetch-rental-listings/route'
import { sql } from '@/lib/db'
import { sendTelegramError } from '@/lib/telegram'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSql = vi.mocked(sql) as any
const mockSendTelegramError = vi.mocked(sendTelegramError)

const VALID_SECRET = 'test-cron-secret'

function makeReq(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers['authorization'] = `Bearer ${secret}`
  return new Request('http://localhost/api/cron/fetch-rental-listings', { method: 'GET', headers })
}

/** Minimal PF listing object */
function pfListing(overrides: Record<string, unknown> = {}) {
  return {
    property_id: 'pf-001',
    title: 'Test Apartment',
    price: { value: 120_000 },       // annual AED 120K
    size: { value: 1000 },           // 1000 sqft
    bedrooms: 2,
    property_type: 'APARTMENT',
    property_url: 'https://www.propertyfinder.ae/listing/001',
    listed_date: '2026-05-01',
    is_direct_from_developer: false,
    location_tree: [
      { level: '1', name: 'Downtown Dubai' },
      { level: '2', name: 'Burj Khalifa District' },
      { level: '3', name: 'Tower X' },
    ],
    ...overrides,
  }
}

describe('GET /api/cron/fetch-rental-listings — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    global.fetch = vi.fn()
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('returns 401 when no Authorization header', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 401 when wrong Bearer secret', async () => {
    const res = await GET(makeReq('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('does not call SQL when auth fails', async () => {
    await GET(makeReq('bad'))
    expect(mockSql).not.toHaveBeenCalled()
  })
})

describe('GET /api/cron/fetch-rental-listings — fetchPF behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    mockSql.mockResolvedValue([])
    mockSql.json = vi.fn((v: unknown) => v)
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('returns 200 with {ok, pf} count when API responds ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [pfListing()] }),
    } as Response)

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.pf).toBe(1)
  })

  it('returns 200 {message} (not 500) when PF API returns HTTP error — graceful degradation', async () => {
    // fetch-rental-listings swallows PF 4xx/5xx gracefully (returns [] not throw)
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response)

    const res = await GET(makeReq(VALID_SECRET))
    // No SQL upsert called — no listings to insert
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeDefined()
    expect(mockSql).not.toHaveBeenCalled()
  })

  it('returns 200 {message} when PF API returns non-array data.data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    } as Response)

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeDefined()
  })
})

describe('GET /api/cron/fetch-rental-listings — mapPF + filter regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    mockSql.mockResolvedValue([])
    mockSql.json = vi.fn((v: unknown) => v)
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('extracts area from location_tree level="1" (not address.community.name)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [pfListing({
          location_tree: [{ level: '1', name: 'Dubai Marina' }],
          // Deliberately no address.community — PF API doesn't have that field
        })],
      }),
    } as Response)

    await GET(makeReq(VALID_SECRET))

    // Find the sql upsert call and verify area = 'Dubai Marina' was passed
    const insertCall = mockSql.mock.calls.find(([parts]: [unknown]) =>
      Array.isArray(parts) && (parts as string[]).join(' ').includes('INSERT')
    )
    expect(insertCall).toBeDefined()
    // The args after the template parts are the interpolated values
    // area is the 5th positional arg (id, source, title, cluster, area, ...)
    const callArgs = insertCall as unknown[]
    expect(callArgs).toContain('Dubai Marina')
  })

  it('filters OUT is_direct_from_developer=true listings', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [pfListing({ is_direct_from_developer: true })],
      }),
    } as Response)

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    // All filtered → "No listings fetched" message, no upsert
    expect(data.message).toBeDefined()
    expect(mockSql).not.toHaveBeenCalled()
  })

  it('filters OUT price=0 listings', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [pfListing({ price: { value: 0 } })],
      }),
    } as Response)

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    expect(data.message).toBeDefined()
    expect(mockSql).not.toHaveBeenCalled()
  })

  it('filters OUT listings with null property_id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [pfListing({ property_id: null })],
      }),
    } as Response)

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    expect(data.message).toBeDefined()
    expect(mockSql).not.toHaveBeenCalled()
  })

  it('sets price_per_sqft = 0 when size_sqft = 0 (no divide-by-zero)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [pfListing({ size: { value: 0 } })],
      }),
    } as Response)

    await GET(makeReq(VALID_SECRET))

    const insertCall = mockSql.mock.calls.find(([parts]: [unknown]) =>
      Array.isArray(parts) && (parts as string[]).join(' ').includes('INSERT')
    )
    expect(insertCall).toBeDefined()
    // price_per_sqft = 0 when size_sqft = 0
    expect(insertCall).toContain(0) // price_per_sqft value
  })

  it('calculates monthly_price as Math.round(annual / 12)', async () => {
    // annual = 120_000 → monthly = 10_000
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [pfListing({ price: { value: 120_000 } })],
      }),
    } as Response)

    await GET(makeReq(VALID_SECRET))

    const insertCall = mockSql.mock.calls.find(([parts]: [unknown]) =>
      Array.isArray(parts) && (parts as string[]).join(' ').includes('INSERT')
    )
    expect(insertCall).toBeDefined()
    expect(insertCall).toContain(10_000) // monthly_price
  })
})

describe('GET /api/cron/fetch-rental-listings — SQL upsert + error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('calls sql upsert once per valid row and returns {ok:true, pf: N}', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [pfListing(), pfListing({ property_id: 'pf-002' })] }),
    } as Response)
    mockSql.mockResolvedValue([])
    mockSql.json = vi.fn((v: unknown) => v)

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.pf).toBe(2)
    // Called once per row for the upsert
    expect(mockSql).toHaveBeenCalledTimes(2)
  })

  it('calls sendTelegramError and returns 500 when SQL throws', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [pfListing()] }),
    } as Response)
    mockSql.mockRejectedValue(new Error('connection pool exhausted'))
    mockSql.json = vi.fn((v: unknown) => v)

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('connection pool exhausted')
    expect(mockSendTelegramError).toHaveBeenCalledWith(
      'cron/fetch-rental-listings',
      'ingest',
      expect.any(Error)
    )
  })
})
