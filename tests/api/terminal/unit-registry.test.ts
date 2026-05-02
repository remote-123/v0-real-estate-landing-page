/**
 * Tests for GET /api/terminal/unit-registry
 *
 * Covers: filter validation (at least one required), auth gating (5 vs 50 rows),
 * successful search with numeric coercion, error handling.
 *
 * Key regression guards:
 * - actual_area_sqft and actual_area_sqm coerced from string (postgres.js NUMERIC → string)
 * - Unauthenticated users always get page=1 regardless of requested page
 * - Missing filter returns 400, not 500
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

import { GET } from '@/app/api/terminal/unit-registry/route'
import { sql } from '@/lib/db'
import { isTerminalUnlocked } from '@/lib/terminal-gate'

const mockSql = vi.mocked(sql)
const mockIsUnlocked = vi.mocked(isTerminalUnlocked)

function makeReq(params: Record<string, string> = {}) {
  const sp = new URLSearchParams(params)
  return new Request(`http://localhost/api/terminal/unit-registry?${sp}`)
}

const fakeUnitRow = {
  property_id: 'PROP-001',
  unit_number: '2501',
  building_number: 'T1',
  floor: 25,
  rooms_en: '2 B/R',
  actual_area_sqft: '1320',    // NUMERIC comes back as string from postgres.js
  actual_area_sqm: '122.6',    // NUMERIC comes back as string from postgres.js
  property_sub_type_en: 'Flat',
  unit_parking_number: 'P-101',
  is_free_hold: true,
  is_lease_hold: false,
  project_name_en: 'Marina Gate',
  master_project_en: 'Dubai Marina',
  area_name_en: 'Dubai Marina',
}

/**
 * Content-dispatch SQL mock for parallel COUNT + data queries.
 */
function setupSqlMock({ total = '0', rows = [] as unknown[] } = {}) {
  mockSql.mockImplementation((...args: unknown[]) => {
    const parts = Array.isArray(args[0]) ? (args[0] as string[]) : [String(args[0])]
    const q = parts.join(' ')
    if (q.includes('COUNT(*)')) return Promise.resolve([{ total }])
    return Promise.resolve(rows)
  })
}

describe('GET /api/terminal/unit-registry — filter validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUnlocked.mockResolvedValue(false)
  })

  it('returns 400 when no filter supplied', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/filter/i)
  })

  it('returns 400 when only floor range supplied (no project/area/rooms)', async () => {
    const res = await GET(makeReq({ min_floor: '10', max_floor: '30' }))
    expect(res.status).toBe(400)
  })

  it('accepts project filter alone', async () => {
    setupSqlMock({ total: '50', rows: [fakeUnitRow] })
    const res = await GET(makeReq({ project: 'Marina Gate' }))
    expect(res.status).toBe(200)
  })

  it('accepts area filter alone', async () => {
    setupSqlMock({ total: '200', rows: [fakeUnitRow] })
    const res = await GET(makeReq({ area: 'Dubai Marina' }))
    expect(res.status).toBe(200)
  })

  it('accepts rooms filter alone', async () => {
    setupSqlMock({ total: '100', rows: [fakeUnitRow] })
    const res = await GET(makeReq({ rooms: '2 B/R' }))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/terminal/unit-registry — auth gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unauthenticated: gated=true, page_size=5', async () => {
    mockIsUnlocked.mockResolvedValue(false)
    setupSqlMock({ total: '500', rows: [fakeUnitRow] })

    const res = await GET(makeReq({ area: 'Dubai Marina' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.gated).toBe(true)
    expect(data.page_size).toBe(5)
  })

  it('authenticated: gated=false, page_size=50', async () => {
    mockIsUnlocked.mockResolvedValue(true)
    setupSqlMock({ total: '500', rows: [fakeUnitRow] })

    const res = await GET(makeReq({ area: 'Dubai Marina' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.gated).toBe(false)
    expect(data.page_size).toBe(50)
  })
})

describe('GET /api/terminal/unit-registry — successful search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUnlocked.mockResolvedValue(true)
  })

  it('coerces NUMERIC area fields from string to number', async () => {
    setupSqlMock({ total: '1', rows: [fakeUnitRow] })

    const res = await GET(makeReq({ project: 'Marina Gate' }))
    const data = await res.json()

    expect(data.rows).toHaveLength(1)
    const row = data.rows[0]
    // postgres.js returns NUMERIC as string — API must coerce
    expect(typeof row.actual_area_sqft).toBe('number')
    expect(row.actual_area_sqft).toBe(1320)
    expect(typeof row.actual_area_sqm).toBe('number')
    expect(row.actual_area_sqm).toBe(122.6)
  })

  it('preserves non-numeric fields correctly', async () => {
    setupSqlMock({ total: '1', rows: [fakeUnitRow] })

    const res = await GET(makeReq({ project: 'Marina Gate' }))
    const data = await res.json()
    const row = data.rows[0]

    expect(row.property_id).toBe('PROP-001')
    expect(row.floor).toBe(25)          // integer — postgres.js returns as number
    expect(row.is_free_hold).toBe(true) // boolean preserved
    expect(row.unit_number).toBe('2501')
  })

  it('returns correct total and pagination metadata', async () => {
    setupSqlMock({ total: '300', rows: [fakeUnitRow] })

    const res = await GET(makeReq({ area: 'Dubai Marina', page: '3' }))
    const data = await res.json()

    expect(data.total).toBe(300)
    expect(data.page).toBe(3)
    expect(data.page_size).toBe(50)
  })

  it('unauthenticated always gets page=1', async () => {
    mockIsUnlocked.mockResolvedValue(false)
    setupSqlMock({ total: '100', rows: [fakeUnitRow] })

    const res = await GET(makeReq({ area: 'Dubai Marina', page: '5' }))
    const data = await res.json()
    expect(data.page).toBe(1)
    expect(data.gated).toBe(true)
  })

  it('returns empty rows when no units match', async () => {
    setupSqlMock({ total: '0', rows: [] })

    const res = await GET(makeReq({ project: 'Nonexistent Tower' }))
    const data = await res.json()
    expect(data.rows).toHaveLength(0)
    expect(data.total).toBe(0)
  })
})

describe('GET /api/terminal/unit-registry — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsUnlocked.mockResolvedValue(true)
  })

  it('returns 500 with error message when SQL throws', async () => {
    mockSql.mockRejectedValue(new Error('connection pool exhausted'))

    const res = await GET(makeReq({ area: 'Dubai Marina' }))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('connection pool exhausted')
  })
})
