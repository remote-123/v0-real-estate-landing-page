/**
 * Tests for GET /api/cron/telegram-distress-digest
 *
 * This cron fires daily (or on-demand) — fetches distress deals from
 * two RapidAPI sources (Bayut + PropertyFinder), merges top 10 by %
 * discount, and sends a Telegram HTML message.
 *
 * No DB dependency — pure fetch + Telegram mock.
 *
 * Key regression guards:
 * - Auth (401) when CRON_SECRET missing or wrong
 * - Bayut HTTP error → graceful [] (cron continues with PF only)
 * - PF HTTP error → graceful [] (cron continues with Bayut only)
 * - Both fail → 200 {message: "No deals fetched"} — no Telegram send
 * - offplan_details.original_price > current → used for discount calc
 * - No offplan price → synthetic discount from id-based formula
 * - Top 10 sorted by discountPct DESC (largest discount first)
 * - sendTelegram called once with well-formed HTML message
 * - Returns {ok: true, sent: N} on success
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn().mockResolvedValue(undefined),
  sendTelegramError: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/cron/telegram-distress-digest/route'
import { sendTelegram } from '@/lib/telegram'

const mockSendTelegram = vi.mocked(sendTelegram)

const VALID_SECRET = 'test-cron-secret'

function makeReq(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers['authorization'] = `Bearer ${secret}`
  return new Request('http://localhost/api/cron/telegram-distress-digest', {
    method: 'GET',
    headers,
  })
}

/** Minimal Bayut result item */
function bayutItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 12345,
    title: '2BR Apartment',
    price: 1_800_000,
    offplan_details: null,
    location: {
      sub_community: { name: 'Tower A' },
      community: { name: 'Dubai Marina' },
    },
    type: { sub: 'apartment' },
    details: { bedrooms: 2 },
    meta: { url: 'https://bayut.com/listing/1' },
    ...overrides,
  }
}

/** Minimal PF result item */
function pfItem(overrides: Record<string, unknown> = {}) {
  return {
    property_id: 'pf-001',
    title: 'Studio Apartment',
    price: { value: 900_000 },
    address: { full_name: 'JVC, Dubai' },
    property_type: 'APARTMENT',
    bedrooms: 0,
    property_url: 'https://propertyfinder.ae/listing/1',
    ...overrides,
  }
}

const BAYUT_URL = 'https://uae-real-estate2.p.rapidapi.com/properties_search'
const PF_URL = 'https://propertyfinder-uae-data.p.rapidapi.com/search-buy'

/** Sets up global.fetch to dispatch based on URL prefix */
function setupFetch(
  bayutResponse: unknown | 'error',
  pfResponse: unknown | 'error'
) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.startsWith(BAYUT_URL)) {
      if (bayutResponse === 'error') {
        return Promise.resolve({ ok: false, status: 429, json: async () => ({}) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => bayutResponse } as Response)
    }
    if (url.startsWith(PF_URL)) {
      if (pfResponse === 'error') {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => pfResponse } as Response)
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as Response)
  })
}

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('GET /api/cron/telegram-distress-digest — auth', () => {
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

  it('does not call fetch or sendTelegram when auth fails', async () => {
    await GET(makeReq('bad'))
    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })
})

// ── Graceful degradation ──────────────────────────────────────────────────────

describe('GET /api/cron/telegram-distress-digest — graceful degradation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('returns 200 {message} and no Telegram send when both sources fail', async () => {
    setupFetch('error', 'error')

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeDefined()
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })

  it('returns 200 {message} when both sources return empty arrays', async () => {
    setupFetch({ results: [] }, { data: [] })

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeDefined()
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })

  it('succeeds with Bayut data even when PF returns HTTP error', async () => {
    setupFetch({ results: [bayutItem()] }, 'error')

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.sent).toBeGreaterThan(0)
    expect(mockSendTelegram).toHaveBeenCalledOnce()
  })

  it('succeeds with PF data even when Bayut returns HTTP error', async () => {
    setupFetch('error', { data: [pfItem()] })

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockSendTelegram).toHaveBeenCalledOnce()
  })

  it('returns 200 {message} when Bayut returns null results field', async () => {
    setupFetch({ results: null }, { data: [] })

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeDefined()
  })

  it('returns 200 {message} when PF returns null data field', async () => {
    setupFetch({ results: [] }, { data: null })

    const res = await GET(makeReq(VALID_SECRET))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBeDefined()
  })
})

// ── Deal filtering ────────────────────────────────────────────────────────────

describe('GET /api/cron/telegram-distress-digest — deal filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('filters OUT Bayut items with price = 0', async () => {
    setupFetch({ results: [bayutItem({ price: 0 })] }, { data: [] })

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    // All filtered → no deals → message, no Telegram send
    expect(data.message).toBeDefined()
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })

  it('filters OUT Bayut items with falsy id', async () => {
    setupFetch({ results: [bayutItem({ id: null })] }, { data: [] })

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    expect(data.message).toBeDefined()
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })

  it('filters OUT PF items with missing property_id', async () => {
    setupFetch({ results: [] }, { data: [pfItem({ property_id: null })] })

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    expect(data.message).toBeDefined()
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })

  it('filters OUT PF items with price.value = 0', async () => {
    setupFetch({ results: [] }, { data: [pfItem({ price: { value: 0 } })] })

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    expect(data.message).toBeDefined()
    expect(mockSendTelegram).not.toHaveBeenCalled()
  })
})

// ── offplan_details discount logic ────────────────────────────────────────────

describe('GET /api/cron/telegram-distress-digest — offplan_details.original_price', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('uses offplan_details.original_price when it exceeds current price', async () => {
    // offplan original = 2.2M, current = 1.8M → real discount
    const item = bayutItem({
      price: 1_800_000,
      offplan_details: { original_price: 2_200_000 },
    })
    setupFetch({ results: [item] }, { data: [] })

    await GET(makeReq(VALID_SECRET))

    const [msg] = mockSendTelegram.mock.calls[0]
    // discount = (2.2M - 1.8M) / 2.2M * 100 ≈ 18.2%
    expect(msg).toContain('18.2%')
  })

  it('uses synthetic discount when offplan_details is null', async () => {
    // id=12345, dropFactor = 0.05 + (12345 % 20 / 100) = 0.05 + 0.05 = 0.10
    const item = bayutItem({ id: 12345, price: 1_000_000, offplan_details: null })
    setupFetch({ results: [item] }, { data: [] })

    await GET(makeReq(VALID_SECRET))
    // Just ensure it ran and sent message (discount formula ran without error)
    expect(mockSendTelegram).toHaveBeenCalledOnce()
    const [msg] = mockSendTelegram.mock.calls[0]
    expect(msg).toContain('%')
  })

  it('does NOT use offplan original_price when it is less than current price', async () => {
    // offplan original = 1.5M < current 2M → should use synthetic, not offplan
    const item = bayutItem({
      id: 100,
      price: 2_000_000,
      offplan_details: { original_price: 1_500_000 },
    })
    setupFetch({ results: [item] }, { data: [] })

    await GET(makeReq(VALID_SECRET))
    expect(mockSendTelegram).toHaveBeenCalledOnce()
    // Synthetic discount = 0.05 + (100 % 20 / 100) = 0.05 + 0 = 0.05 → 4.8%
    const [msg] = mockSendTelegram.mock.calls[0]
    // offplan 1.5M < 2M → synthetic path → discount ≈ 4.8% (positive)
    // id=100: dropFactor = 0.05 + (100%20/100) = 0.05, originalPrice = 2M*1.05, discountPct ≈ 4.8%
    expect(msg).toContain('4.8% off')
    expect(msg).not.toMatch(/-\d+\.\d+% off/) // no negative discount in message
  })
})

// ── Sorting and capping ───────────────────────────────────────────────────────

describe('GET /api/cron/telegram-distress-digest — top 10 sort + cap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('caps total deals at 10 when both sources have many results', async () => {
    // 8 Bayut + 8 PF = 16 items → top 10 only
    const bayutItems = Array.from({ length: 8 }, (_, i) =>
      bayutItem({ id: i + 100, price: 1_000_000 })
    )
    const pfItems = Array.from({ length: 8 }, (_, i) =>
      pfItem({ property_id: `pf-${i + 100}`, price: { value: 800_000 } })
    )
    setupFetch({ results: bayutItems }, { data: pfItems })

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    expect(data.ok).toBe(true)
    // sent should be 10 (capped)
    expect(data.sent).toBe(10)
  })

  it('returns {ok: true, sent: N} where N matches actual deal count', async () => {
    setupFetch({ results: [bayutItem(), bayutItem({ id: 99999 })] }, { data: [pfItem()] })

    const res = await GET(makeReq(VALID_SECRET))
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.sent).toBe(3)
  })
})

// ── Telegram message format ───────────────────────────────────────────────────

describe('GET /api/cron/telegram-distress-digest — Telegram message format', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = VALID_SECRET
  })

  afterEach(() => { delete process.env.CRON_SECRET })

  it('sends message containing title header and today date', async () => {
    setupFetch({ results: [bayutItem()] }, { data: [] })

    await GET(makeReq(VALID_SECRET))

    const [msg] = mockSendTelegram.mock.calls[0]
    expect(msg).toContain('DAILY DISTRESS DEALS')
    expect(msg).toContain('2026') // current year in date
  })

  it('sends message containing northcapitaldxb.com terminal link', async () => {
    setupFetch({ results: [bayutItem()] }, { data: [] })

    await GET(makeReq(VALID_SECRET))

    const [msg] = mockSendTelegram.mock.calls[0]
    expect(msg).toContain('northcapitaldxb.com/terminal')
  })

  it('message includes % off label — regression sentinel for discountPct.toFixed(1)', async () => {
    setupFetch({ results: [bayutItem()] }, { data: [] })

    await GET(makeReq(VALID_SECRET))

    const [msg] = mockSendTelegram.mock.calls[0]
    // discountPct.toFixed(1) always produces "X.X%" format
    expect(msg).toMatch(/\d+\.\d%/)
  })

  it('sendTelegram called exactly once per cron run', async () => {
    setupFetch({ results: [bayutItem(), bayutItem({ id: 99 })] }, { data: [pfItem()] })

    await GET(makeReq(VALID_SECRET))

    expect(mockSendTelegram).toHaveBeenCalledOnce()
  })
})
