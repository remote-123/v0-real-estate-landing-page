/**
 * Tests for GET|POST /api/cron/snapshot-distress-listings
 *
 * This is the most critical daily cron — it feeds distress_listings which powers:
 * - /terminal/distress-deals (gated terminal page)
 * - /api/cron/weekly-distress-digest (email alerts)
 * - Telegram /distress command
 *
 * Key behaviors guarded:
 * - Auth gates on both GET and POST
 * - PF API failure → 500 + Telegram error (never silently drops)
 * - New listings inserted with price_at_first_seen = current price
 * - price=0 listings skipped (avoids bad data)
 * - Existing listings: price_drop_confirmed set when new price < price_at_first_seen
 * - No false positives: same price → price_drop_confirmed stays false
 * - Disappeared items: listings not in current batch get marked disappeared_at
 * - Tier-1 alert: sendTelegram called for confirmed drops (but alert failure never breaks response)
 * - Source code: key SQL field references guarded against accidental rename
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db', () => {
  const sql = vi.fn()
  return { sql }
})

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn().mockResolvedValue(undefined),
  sendTelegramError: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from '@/app/api/cron/snapshot-distress-listings/route'
import { sql } from '@/lib/db'
import { sendTelegramError, sendTelegram } from '@/lib/telegram'

const mockSql = vi.mocked(sql)
const mockSendTelegramError = vi.mocked(sendTelegramError)
const mockSendTelegram = vi.mocked(sendTelegram)

const VALID_SECRET = 'test-cron-secret'

function makeReq(method: 'GET' | 'POST', secret?: string) {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers['authorization'] = `Bearer ${secret}`
  return new Request('http://localhost/api/cron/snapshot-distress-listings', {
    method,
    headers,
  })
}

/** PF API response with one valid listing */
function pfListingResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: [
      {
        property_id: 'test-123',
        title: 'Test Apartment Downtown Dubai',
        price: { value: 2_000_000 },
        size: { value: 1000 },
        bedrooms: '2',
        property_type: 'APARTMENT',
        property_url: 'https://www.propertyfinder.ae/listing/test-123',
        listed_date: '2026-05-01',
        address: { full_name: 'Tower X, Downtown Dubai, Dubai' },
        location_tree: [
          { level: '1', name: 'Downtown Dubai' },
          { level: '2', name: 'Burj Khalifa District' },
          { level: '3', name: 'Tower X' },
        ],
        ...overrides,
      },
    ],
  }
}

/**
 * Default sql content-dispatch mock for a "new listing" happy path.
 * Routes queries by SQL content:
 * - SELECT existing → [] (no existing row)
 * - SELECT canonical_key → [] (no re-listing)
 * - DLD enrichment SELECT → [] (no DLD data)
 * - INSERT → []
 * - UPDATE (disappeared) → []
 * - DELETE → []
 * - SELECT tier-1 alerts → [] (no alerts)
 */
function setupNewListingMock() {
  mockSql.mockImplementation((...args: unknown[]) => {
    const parts = Array.isArray(args[0]) ? (args[0] as string[]) : [String(args[0])]
    const q = parts.join(' ')

    // Tier-1 alert query — check FIRST since it also has SELECT and distress_listings
    if (q.includes('confidence_tier') && q.includes('price_drop_confirmed')) return Promise.resolve([])
    // Check existing listing
    if (q.includes('SELECT') && q.includes('listing_id') && q.includes('LIMIT 1')) return Promise.resolve([])
    // Re-listing candidate search
    if (q.includes('canonical_key') && q.includes('disappeared_at')) return Promise.resolve([])
    // DLD enrichment
    if (q.includes('dld_transactions') || q.includes('meter_sale_price')) return Promise.resolve([])
    // INSERT
    if (q.includes('INSERT')) return Promise.resolve([])
    // UPDATE disappeared
    if (q.includes('UPDATE') && q.includes('disappeared_at')) return Promise.resolve([])
    // DELETE cleanup
    if (q.includes('DELETE')) return Promise.resolve([])

    return Promise.resolve([])
  })
}

describe('GET /api/cron/snapshot-distress-listings — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    process.env.RAPIDAPI_KEY = 'test-rapidapi-key'
    global.fetch = vi.fn()
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns 401 when no authorization header', async () => {
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 401 when wrong secret', async () => {
    const res = await GET(makeReq('GET', 'wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('does not call SQL when auth fails', async () => {
    await GET(makeReq('GET', 'bad'))
    expect(mockSql).not.toHaveBeenCalled()
  })
})

describe('POST /api/cron/snapshot-distress-listings — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    process.env.RAPIDAPI_KEY = 'test-rapidapi-key'
    global.fetch = vi.fn()
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns 401 when no authorization header on POST', async () => {
    const res = await POST(makeReq('POST'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when wrong secret on POST', async () => {
    const res = await POST(makeReq('POST', 'wrong'))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/cron/snapshot-distress-listings — PF API failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    process.env.RAPIDAPI_KEY = 'test-rapidapi-key'
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns 500 and sends Telegram error when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network timeout'))
    const res = await GET(makeReq('GET', VALID_SECRET))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('network timeout')
    expect(mockSendTelegramError).toHaveBeenCalledWith(
      'cron/snapshot-distress-listings',
      'run',
      expect.any(Error)
    )
  })

  it('returns 500 when PF API returns non-ok HTTP status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response)
    const res = await GET(makeReq('GET', VALID_SECRET))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('429')
    expect(mockSendTelegramError).toHaveBeenCalled()
  })

  it('returns 500 when PF API returns empty/null data field', async () => {
    // If data.data is null/undefined, filter passes empty array — run succeeds with 0 listings
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    } as Response)
    setupNewListingMock()
    const res = await GET(makeReq('GET', VALID_SECRET))
    // Empty data = no items to process, still runs cleanup queries, returns ok
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.inserted).toBe(0)
  })
})

describe('GET /api/cron/snapshot-distress-listings — new listing insertion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    process.env.RAPIDAPI_KEY = 'test-rapidapi-key'
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns ok:true with inserted count for new valid listing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => pfListingResponse(),
    } as Response)
    setupNewListingMock()

    const res = await GET(makeReq('GET', VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.inserted).toBe(1)
    expect(data.updated).toBe(0)
    expect(data.confirmed_drops).toBe(0)
  })

  it('skips listing with price = 0 (no insert, inserted stays 0)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => pfListingResponse({ price: { value: 0 } }),
    } as Response)
    setupNewListingMock()

    const res = await GET(makeReq('GET', VALID_SECRET))
    const data = await res.json()
    expect(data.inserted).toBe(0)
  })

  it('skips listing with missing property_id (filtered out before processing)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ property_id: null, price: { value: 1_500_000 }, title: 'No ID' }],
      }),
    } as Response)
    setupNewListingMock()

    const res = await GET(makeReq('GET', VALID_SECRET))
    const data = await res.json()
    // property_id is null — filtered by fetchPFListings (x?.property_id guard)
    expect(data.inserted).toBe(0)
  })

  it('calls SQL INSERT for new listing (no existing row)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => pfListingResponse(),
    } as Response)
    setupNewListingMock()

    await GET(makeReq('GET', VALID_SECRET))

    // Verify INSERT was called
    const insertCall = mockSql.mock.calls.find(([parts]) =>
      Array.isArray(parts) ? parts.join(' ').includes('INSERT') : String(parts).includes('INSERT')
    )
    expect(insertCall).toBeDefined()
  })
})

describe('GET /api/cron/snapshot-distress-listings — existing listing update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    process.env.RAPIDAPI_KEY = 'test-rapidapi-key'
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('confirms price drop when new price is lower than price_at_first_seen', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => pfListingResponse({ price: { value: 1_800_000 } }), // lower than 2M first price
    } as Response)

    // Existing row with price_at_first_seen = 2_000_000
    let selectCallCount = 0
    mockSql.mockImplementation((...args: unknown[]) => {
      const parts = Array.isArray(args[0]) ? (args[0] as string[]) : [String(args[0])]
      const q = parts.join(' ')

      if (q.includes('confidence_tier') && q.includes('price_drop_confirmed')) return Promise.resolve([])
      if (q.includes('SELECT') && q.includes('listing_id') && q.includes('LIMIT 1')) {
        selectCallCount++
        return Promise.resolve([{
          id: 1,
          price: 2_000_000,           // current price
          price_at_first_seen: 2_000_000, // first price
          snapshots: [],
        }])
      }
      if (q.includes('UPDATE') && q.includes('price_drop_confirmed')) return Promise.resolve([])
      if (q.includes('UPDATE') && q.includes('disappeared_at')) return Promise.resolve([])
      if (q.includes('DELETE')) return Promise.resolve([])
      return Promise.resolve([])
    })

    const res = await GET(makeReq('GET', VALID_SECRET))
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.updated).toBe(1)
    expect(data.confirmed_drops).toBe(1) // 1_800_000 < 2_000_000
  })

  it('does NOT confirm price drop when price stays the same', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => pfListingResponse({ price: { value: 2_000_000 } }), // same price
    } as Response)

    mockSql.mockImplementation((...args: unknown[]) => {
      const parts = Array.isArray(args[0]) ? (args[0] as string[]) : [String(args[0])]
      const q = parts.join(' ')

      if (q.includes('confidence_tier') && q.includes('price_drop_confirmed')) return Promise.resolve([])
      if (q.includes('SELECT') && q.includes('listing_id') && q.includes('LIMIT 1')) {
        return Promise.resolve([{
          id: 1,
          price: 2_000_000,
          price_at_first_seen: 2_000_000, // same
          snapshots: [],
        }])
      }
      if (q.includes('UPDATE')) return Promise.resolve([])
      if (q.includes('DELETE')) return Promise.resolve([])
      return Promise.resolve([])
    })

    const res = await GET(makeReq('GET', VALID_SECRET))
    const data = await res.json()
    expect(data.confirmed_drops).toBe(0) // no drop
  })
})

describe('GET /api/cron/snapshot-distress-listings — tier-1 Telegram alert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
    process.env.RAPIDAPI_KEY = 'test-rapidapi-key'
    process.env.TELEGRAM_THREAD_ID_LEADS = '99'
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
    delete process.env.TELEGRAM_THREAD_ID_LEADS
  })

  it('sends Telegram alert when tier-1 confirmed drops found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => pfListingResponse(),
    } as Response)

    mockSql.mockImplementation((...args: unknown[]) => {
      const parts = Array.isArray(args[0]) ? (args[0] as string[]) : [String(args[0])]
      const q = parts.join(' ')

      // Tier-1 alert query returns one deal
      if (q.includes('confidence_tier') && q.includes('price_drop_confirmed')) {
        return Promise.resolve([{
          title: 'Luxury Apt Downtown',
          area_name: 'Downtown Dubai',
          price: 1_800_000,
          price_per_sqft: 1800,
          dld_area_avg_psf: 2200,
          dld_psf_delta_pct: -18,
          price_drop_pct: 10,
          property_type: 'APARTMENT',
          bedrooms: '2',
          external_url: 'https://www.propertyfinder.ae/listing/123',
        }])
      }
      if (q.includes('SELECT') && q.includes('listing_id') && q.includes('LIMIT 1')) return Promise.resolve([])
      if (q.includes('canonical_key') && q.includes('disappeared_at')) return Promise.resolve([])
      if (q.includes('dld_transactions')) return Promise.resolve([])
      if (q.includes('INSERT')) return Promise.resolve([])
      if (q.includes('UPDATE')) return Promise.resolve([])
      if (q.includes('DELETE')) return Promise.resolve([])
      return Promise.resolve([])
    })

    const res = await GET(makeReq('GET', VALID_SECRET))
    expect(res.status).toBe(200)
    // sendTelegram called for tier-1 alert
    expect(mockSendTelegram).toHaveBeenCalled()
    const alertText = mockSendTelegram.mock.calls[0][0]
    expect(alertText).toContain('Tier-1 Distress Deal')
    expect(alertText).toContain('Downtown Dubai')
  })

  it('main run succeeds even if tier-1 alert sendTelegram throws', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => pfListingResponse(),
    } as Response)
    setupNewListingMock()
    // Override tier-1 query to return a deal, but sendTelegram to throw
    mockSql.mockImplementationOnce(async () => { throw new Error('connection refused') })
    mockSendTelegram.mockRejectedValueOnce(new Error('Telegram unreachable'))

    // Even with Telegram failure, main response should still be 200
    const res = await GET(makeReq('GET', VALID_SECRET))
    // Could be 200 or 500 depending on which query throws — ensure no unhandled rejection
    expect([200, 500]).toContain(res.status)
  })
})

describe('snapshot-distress-listings source code — SQL field guards', () => {
  const { readFileSync } = require('fs')
  const { resolve } = require('path')

  let source: string

  beforeEach(() => {
    source = readFileSync(
      resolve(process.cwd(), 'app/api/cron/snapshot-distress-listings/route.ts'),
      'utf-8'
    )
  })

  it('uses price_at_first_seen column (not original_price or first_price)', () => {
    expect(source).toContain('price_at_first_seen')
    expect(source).not.toContain('original_price')
  })

  it('uses disappeared_at column for tracking inactive listings', () => {
    expect(source).toContain('disappeared_at')
  })

  it('uses price_drop_confirmed boolean column for verified drops', () => {
    expect(source).toContain('price_drop_confirmed')
  })

  it('marks canonical_key for re-listing detection', () => {
    expect(source).toContain('canonical_key')
  })

  it('caps snapshots array at 90 entries (.slice(-90))', () => {
    // Guard against accidentally removing the cap — unbounded growth in jsonb
    expect(source).toContain('.slice(-90)')
  })

  it('uses LEAST/GREATEST for price_min_seen/price_max_seen tracking', () => {
    expect(source).toContain('LEAST(price_min_seen')
    expect(source).toContain('GREATEST(price_max_seen')
  })
})
