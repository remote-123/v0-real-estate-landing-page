/**
 * Tests for GET /api/cron/fetch-bayut-transactions
 *
 * Critical path: auth guard, budget circuit breaker, successful ingest,
 * error handling + Telegram notification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => {
  const sql = vi.fn()
  return { sql }
})

vi.mock('@/lib/bayut14', () => ({
  fetchBayutPage: vi.fn(),
  transformBayutHit: vi.fn(),
}))

vi.mock('@/lib/telegram', () => ({
  sendTelegramError: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/cron/fetch-bayut-transactions/route'
import { sql } from '@/lib/db'
import { fetchBayutPage, transformBayutHit } from '@/lib/bayut14'
import { sendTelegramError } from '@/lib/telegram'

const mockSql = vi.mocked(sql)
const mockFetchBayutPage = vi.mocked(fetchBayutPage)
const mockTransformBayutHit = vi.mocked(transformBayutHit)
const mockSendTelegramError = vi.mocked(sendTelegramError)

const CRON_SECRET = 'bayut-cron-secret'

function makeReq(auth?: string) {
  return new Request('http://localhost/api/cron/fetch-bayut-transactions', {
    headers: auth ? { authorization: auth } : {},
  })
}

describe('GET /api/cron/fetch-bayut-transactions — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('returns 401 when no auth header', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 401 when wrong secret', async () => {
    const res = await GET(makeReq('Bearer wrong'))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })
})

describe('GET /api/cron/fetch-bayut-transactions — budget circuit breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('skips when monthly budget limit reached', async () => {
    // First SQL call = budget check → return 800 (at limit)
    mockSql.mockResolvedValueOnce([{ cnt: '800' }])

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.skipped).toBe(true)
    expect(data.reason).toBe('budget_limit')
    expect(data.used).toBe(800)

    // Bayut API should NOT have been called
    expect(mockFetchBayutPage).not.toHaveBeenCalled()
  })

  it('proceeds when budget headroom exists (< 800 used)', async () => {
    // Budget check → 100 used (under limit)
    mockSql.mockResolvedValueOnce([{ cnt: '100' }])
    // Bayut API calls — for-sale page 1
    mockFetchBayutPage.mockResolvedValue({ hits: [], nbPages: 1 } as any)
    // All subsequent SQL calls (upsert, refresh, log) resolve OK
    mockSql.mockResolvedValue([])

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    expect(mockFetchBayutPage).toHaveBeenCalled()
  })
})

describe('GET /api/cron/fetch-bayut-transactions — successful ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('transforms hits, upserts rows, refreshes mat view, logs success', async () => {
    const fakeHit = { id: '1', price: 1000000 }
    const fakeRow = {
      transaction_hash_id: 'abc123',
      instance_date: '2026-05-01',
      actual_worth: 1000000,
      meter_sale_price: 1200,
      procedure_area: 100,
      rooms_en: '2 B/R',
      bayut_location_l3_name_en: 'Downtown Dubai',
      bayut_location_l4_name_en: null,
      trans_group_en: 'Sales',
      rent_value: null,
      property_completion_status: 'ready',
      sale_market_name: 'Secondary',
      latitude: 25.2,
      longitude: 55.3,
    }

    // Budget check → 50 used
    mockSql.mockResolvedValueOnce([{ cnt: '50' }])

    // Bayut API: return one hit for-sale page 1, nothing else
    mockFetchBayutPage
      .mockResolvedValueOnce({ hits: [fakeHit], nbPages: 1 } as any) // for-sale page 1
      .mockResolvedValue({ hits: [], nbPages: 1 } as any)            // all remaining pages

    // Transform mock — always return fakeRow for any call
    mockTransformBayutHit.mockReturnValue(fakeRow as any)

    // Remaining SQL calls: upsert × 1, refresh, log insert
    mockSql.mockResolvedValue([])

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.rows_upserted).toBeGreaterThanOrEqual(1)

    // Verify transformBayutHit was called — .map() passes (element, index, array),
    // so check it was called at least once and first arg matches the hit
    expect(mockTransformBayutHit).toHaveBeenCalled()
    const firstArg = mockTransformBayutHit.mock.calls[0][0]
    expect(firstArg).toEqual(fakeHit)

    // Verify mat view refresh was called (contains the refresh function call)
    const sqlCalls = mockSql.mock.calls.map((call) =>
      Array.isArray(call[0]) ? (call[0] as string[]).join('') : String(call[0])
    )
    const refreshCall = sqlCalls.find((s) => s.includes('refresh_mv_txn_monthly_unified'))
    expect(refreshCall).toBeDefined()
  })

  it('filters out null rows from transformBayutHit', async () => {
    // Budget check → 0 used
    mockSql.mockResolvedValueOnce([{ cnt: '0' }])

    // Bayut API: 2 hits
    mockFetchBayutPage.mockResolvedValue({ hits: [{ id: '1' }, { id: '2' }], nbPages: 1 } as any)

    // Transform: always return null — all hits filtered out
    // Using mockReturnValue (not Once) covers all calls regardless of how many pages return hits
    mockTransformBayutHit.mockReturnValue(null)

    // SQL calls: budget check + no upserts + refresh + log
    mockSql.mockResolvedValue([])

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const data = await res.json()
    // 0 rows upserted because all hits were filtered (null fails the r !== null check)
    expect(data.rows_upserted).toBe(0)
  })
})

describe('GET /api/cron/fetch-bayut-transactions — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('returns 500, logs to bayut_ingest_log, and sends Telegram error on Bayut API failure', async () => {
    // Budget check passes
    mockSql.mockResolvedValueOnce([{ cnt: '10' }])

    // Bayut API throws
    mockFetchBayutPage.mockRejectedValue(new Error('RapidAPI 429 rate limit'))

    // SQL for error log insert
    mockSql.mockResolvedValue([])

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('RapidAPI 429')

    // Telegram error notification sent
    expect(mockSendTelegramError).toHaveBeenCalledOnce()
    const [route, stage, err] = mockSendTelegramError.mock.calls[0]
    expect(route).toBe('cron/fetch-bayut-transactions')
    expect(stage).toBe('ingest')
    expect((err as Error).message).toContain('RapidAPI 429')
  })
})
