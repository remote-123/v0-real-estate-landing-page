/**
 * Tests for GET /api/terminal/transaction-search
 *
 * Covers: filter validation, auth gating (5 vs 50 rows),
 * successful search with row transformation, error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => {
  const sql = vi.fn()
  return { sql }
})

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/terminal-gate', () => ({
  isTerminalUnlocked: vi.fn().mockResolvedValue(false),
}))

import { GET } from '@/app/api/terminal/transaction-search/route'
import { sql } from '@/lib/db'
import { isTerminalUnlocked } from '@/lib/terminal-gate'

const mockSql = vi.mocked(sql)
const mockIsUnlocked = vi.mocked(isTerminalUnlocked)

function makeReq(params: Record<string, string> = {}) {
  const sp = new URLSearchParams(params)
  return new Request(`http://localhost/api/terminal/transaction-search?${sp}`)
}

const fakeTxnRow = {
  transaction_id: 'TXN-001',
  instance_date: '2026-01-15',
  area_name_en: 'Downtown Dubai',
  building_name_en: 'Burj Khalifa Residences',
  project_name_en: null,
  rooms_en: '2 B/R',
  property_sub_type_en: 'Flat',
  reg_type_en: 'Ready',
  actual_worth: '3500000',
  meter_sale_price: '15000',
  area_sqft: '1200',
  nearest_metro_en: 'Burj Khalifa/Dubai Mall',
  has_parking: true,
}

/**
 * Content-dispatch mock for parallel SQL calls.
 * Promise.all fires count + data queries simultaneously — mockResolvedValueOnce
 * ordering is non-deterministic. Dispatch by query content instead.
 */
function setupSqlMock({ total = '0', rows = [] as unknown[] } = {}) {
  mockSql.mockImplementation((...args: unknown[]) => {
    const parts = Array.isArray(args[0]) ? (args[0] as string[]) : [String(args[0])]
    const q = parts.join(' ')
    if (q.includes('COUNT(*)')) return Promise.resolve([{ total }])
    return Promise.resolve(rows)
  })
}

describe('GET /api/terminal/transaction-search — filter validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUnlocked.mockResolvedValue(false)
  })

  it('returns 400 when no area/building/rooms filter supplied', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/filter/i)
  })

  it('returns 400 when only price range supplied (no spatial/bedroom filter)', async () => {
    const res = await GET(makeReq({ min_price: '500000', max_price: '2000000' }))
    expect(res.status).toBe(400)
  })

  it('accepts area filter alone', async () => {
    setupSqlMock({ total: '42', rows: [fakeTxnRow] })
    const res = await GET(makeReq({ area: 'Downtown Dubai' }))
    expect(res.status).toBe(200)
  })

  it('accepts rooms filter alone', async () => {
    setupSqlMock({ total: '10', rows: [fakeTxnRow] })
    const res = await GET(makeReq({ rooms: '2 B/R' }))
    expect(res.status).toBe(200)
  })

  it('accepts building filter alone', async () => {
    setupSqlMock({ total: '5', rows: [fakeTxnRow] })
    const res = await GET(makeReq({ building: 'Burj Khalifa' }))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/terminal/transaction-search — auth gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unauthenticated response has gated=true and page_size=5', async () => {
    mockIsUnlocked.mockResolvedValue(false)
    setupSqlMock({ total: '200', rows: [fakeTxnRow] })

    const res = await GET(makeReq({ area: 'Downtown Dubai' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.gated).toBe(true)
    expect(data.page_size).toBe(5)
  })

  it('authenticated response has gated=false and page_size=50', async () => {
    mockIsUnlocked.mockResolvedValue(true)
    setupSqlMock({ total: '200', rows: [fakeTxnRow] })

    const res = await GET(makeReq({ area: 'Downtown Dubai' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.gated).toBe(false)
    expect(data.page_size).toBe(50)
  })
})

describe('GET /api/terminal/transaction-search — successful search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUnlocked.mockResolvedValue(true)
  })

  it('returns rows with numeric coercion applied', async () => {
    setupSqlMock({ total: '1', rows: [fakeTxnRow] })

    const res = await GET(makeReq({ area: 'Downtown Dubai' }))
    const data = await res.json()

    expect(data.rows).toHaveLength(1)
    const row = data.rows[0]
    // postgres.js returns NUMERIC as strings — API must coerce to numbers
    expect(typeof row.actual_worth).toBe('number')
    expect(row.actual_worth).toBe(3_500_000)
    expect(typeof row.meter_sale_price).toBe('number')
    expect(row.meter_sale_price).toBe(15_000)
    expect(typeof row.area_sqft).toBe('number')
    expect(row.area_sqft).toBe(1_200)
  })

  it('returns correct total and pagination metadata', async () => {
    setupSqlMock({ total: '127', rows: [fakeTxnRow] })

    const res = await GET(makeReq({ area: 'Downtown Dubai', page: '2' }))
    const data = await res.json()

    expect(data.total).toBe(127)
    expect(data.page).toBe(2)
    expect(data.page_size).toBe(50)
  })

  it('unauthenticated user always gets page=1 regardless of requested page', async () => {
    mockIsUnlocked.mockResolvedValue(false)
    setupSqlMock({ total: '50', rows: [fakeTxnRow] })

    const res = await GET(makeReq({ area: 'Downtown Dubai', page: '5' }))
    const data = await res.json()
    expect(data.page).toBe(1)
    expect(data.page_size).toBe(5)
    expect(data.gated).toBe(true)
  })

  it('returns empty rows array when no matches', async () => {
    setupSqlMock({ total: '0', rows: [] })

    const res = await GET(makeReq({ area: 'Nowhere Special' }))
    const data = await res.json()
    expect(data.rows).toHaveLength(0)
    expect(data.total).toBe(0)
  })
})

describe('GET /api/terminal/transaction-search — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUnlocked.mockResolvedValue(true)
  })

  it('returns 500 with error message when SQL throws', async () => {
    mockSql.mockRejectedValue(new Error('connection timeout'))

    const res = await GET(makeReq({ area: 'Downtown Dubai' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('connection timeout')
  })
})
