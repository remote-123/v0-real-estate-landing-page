/**
 * Tests for GET /api/cron/weekly-distress-digest
 *
 * This is the most complex cron — sends HTML emails to all active leads.
 * Covers: auth, no-deals path, email delivery (with/without RESEND_API_KEY),
 * Telegram notification, and source code regression sentinels.
 *
 * Regression guards (Cycle 24):
 *   - UPDATE query uses `unsubscribed_at` (not `created_at`) for the WHERE clause
 *   - `esc()` escapes HTML special chars correctly
 *   - `textToHtml()` includes unsubscribe link
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

vi.mock('@/lib/db', () => {
  const sql = vi.fn()
  return { sql }
})

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn().mockResolvedValue(undefined),
}))

// Mock Gemini — use class syntax so `new GoogleGenerativeAI()` works correctly
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: async () => ({
            response: { text: () => 'Mock weekly digest analysis text.' },
          }),
        }
      }
    },
  }
})

// Mock Resend — use class syntax + mock-prefixed var (hoisted by vitest alongside vi.mock)
const mockEmailSend = vi.fn().mockResolvedValue({ id: 'resend-test-id' })
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockEmailSend }
  },
}))

import { GET } from '@/app/api/cron/weekly-distress-digest/route'
import { sql } from '@/lib/db'
import { sendTelegram } from '@/lib/telegram'

const mockSql = vi.mocked(sql)
const mockSendTelegram = vi.mocked(sendTelegram)

const CRON_SECRET = 'digest-cron-secret'

function makeReq(auth?: string) {
  return new Request('http://localhost/api/cron/weekly-distress-digest', {
    headers: auth ? { authorization: auth } : {},
  })
}

/**
 * SQL dispatch helper — resolves mock based on query content.
 * Required because fetchTopDeals() and getActiveLeadCount() run in Promise.all,
 * making mockResolvedValueOnce ordering non-deterministic.
 */
function setupSqlMock({
  confirmedDeals = [] as unknown[],
  fallbackDeals = [] as unknown[],
  leadCount = 0,
  leads = [] as unknown[],
} = {}) {
  mockSql.mockImplementation((...args: unknown[]) => {
    const parts = Array.isArray(args[0]) ? (args[0] as string[]) : [String(args[0])]
    const q = parts.join(' ')

    if (q.includes('price_drop_confirmed = true')) return Promise.resolve(confirmedDeals)
    if (q.includes('first_seen_at >= now()')) return Promise.resolve(fallbackDeals)
    if (q.includes('COUNT(*)') && q.includes('email_leads')) return Promise.resolve([{ cnt: String(leadCount) }])
    if (q.includes('SELECT id, email') && q.includes('email_leads')) return Promise.resolve(leads)
    // UPDATE send stats, bayut_ingest_log, etc.
    return Promise.resolve([])
  })
}

const fakeDeal = {
  title: 'Luxury Apartment - Downtown Dubai',
  location: 'Downtown Dubai',
  current_price: 2500000,
  psf: 1400,
  dld_area_avg_psf: 1800,
  distress_score: 72,
  confidence_tier: 1,
  days_on_market: 45,
  bedrooms: 2,
  size_sqft: 1200,
  type: 'Apartment',
}

describe('GET /api/cron/weekly-distress-digest — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEmailSend.mockClear()
    process.env.CRON_SECRET = CRON_SECRET
    delete process.env.RESEND_API_KEY
  })

  it('returns 401 when no auth header', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 401 when wrong secret', async () => {
    const res = await GET(makeReq('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/cron/weekly-distress-digest — no deals path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEmailSend.mockClear()
    process.env.CRON_SECRET = CRON_SECRET
    delete process.env.RESEND_API_KEY
  })

  it('skips digest when no deals available, returns descriptive message', async () => {
    setupSqlMock({ confirmedDeals: [], fallbackDeals: [], leadCount: 5, leads: [] })

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.message).toMatch(/skipped/i)
  })
})

describe('GET /api/cron/weekly-distress-digest — email delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEmailSend.mockClear()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('skips email sending when RESEND_API_KEY not set', async () => {
    delete process.env.RESEND_API_KEY

    setupSqlMock({
      confirmedDeals: [fakeDeal, fakeDeal, fakeDeal],
      leadCount: 2,
      leads: [{ id: 1, email: 'a@test.com' }, { id: 2, email: 'b@test.com' }],
    })

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.resendActive).toBe(false)
    // No Resend calls
    expect(mockEmailSend).not.toHaveBeenCalled()
    // But Telegram preview should fire
    expect(mockSendTelegram).toHaveBeenCalled()
  })

  it('sends emails via Resend when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test-resend-key'

    setupSqlMock({
      confirmedDeals: [fakeDeal, fakeDeal, fakeDeal],
      leadCount: 2,
      leads: [{ id: 1, email: 'investor@example.com' }, { id: 2, email: 'fund@example.com' }],
    })

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.resendActive).toBe(true)
    expect(data.sent).toBe(2)
    // Resend called once per lead
    expect(mockEmailSend).toHaveBeenCalledTimes(2)

    // Verify email structure
    const firstCall = mockEmailSend.mock.calls[0][0]
    expect(firstCall.to).toBe('investor@example.com')
    expect(firstCall.from).toContain('northcapitaldxb.com')
    expect(firstCall.subject).toContain('Distress Deals')
    expect(firstCall.html).toBeDefined()
  })

  it('HTML email contains unsubscribe link for each recipient', async () => {
    process.env.RESEND_API_KEY = 'test-resend-key'

    setupSqlMock({
      confirmedDeals: [fakeDeal, fakeDeal, fakeDeal],
      leadCount: 1,
      leads: [{ id: 1, email: 'test@example.com' }],
    })

    await GET(makeReq(`Bearer ${CRON_SECRET}`))

    const htmlSent = mockEmailSend.mock.calls[0][0].html as string
    expect(htmlSent).toContain('/api/leads/unsubscribe')
    // Unsubscribe token is base64url of the email
    const expectedToken = Buffer.from('test@example.com').toString('base64url')
    expect(htmlSent).toContain(expectedToken)
  })

  it('HTML email contains deal cards for confirmed deals', async () => {
    process.env.RESEND_API_KEY = 'test-resend-key'

    setupSqlMock({
      confirmedDeals: [fakeDeal, fakeDeal, fakeDeal],
      leadCount: 1,
      leads: [{ id: 1, email: 'test@example.com' }],
    })

    await GET(makeReq(`Bearer ${CRON_SECRET}`))

    const htmlSent = mockEmailSend.mock.calls[0][0].html as string
    // Deal title appears in cards
    expect(htmlSent).toContain('Luxury Apartment')
    // Confidence tier 1 badge
    expect(htmlSent).toContain('CONFIRMED DROP')
  })

  it('updates lead stats after sending', async () => {
    process.env.RESEND_API_KEY = 'test-resend-key'
    const updateCalls: string[] = []

    // Track UPDATE calls specifically
    mockSql.mockImplementation((...args: unknown[]) => {
      const parts = Array.isArray(args[0]) ? (args[0] as string[]) : [String(args[0])]
      const q = parts.join(' ')
      if (q.includes('last_sent_at')) updateCalls.push(q)
      if (q.includes('price_drop_confirmed = true')) return Promise.resolve([fakeDeal, fakeDeal, fakeDeal])
      if (q.includes('first_seen_at >= now()')) return Promise.resolve([])
      if (q.includes('COUNT(*)') && q.includes('email_leads')) return Promise.resolve([{ cnt: '1' }])
      if (q.includes('SELECT id, email') && q.includes('email_leads')) return Promise.resolve([{ id: 1, email: 'test@example.com' }])
      return Promise.resolve([])
    })

    await GET(makeReq(`Bearer ${CRON_SECRET}`))

    expect(updateCalls.length).toBeGreaterThan(0)
    expect(updateCalls[0]).toContain('last_sent_at')
    expect(updateCalls[0]).toContain('send_count')
  })

  it('sends Telegram preview regardless of email delivery status', async () => {
    delete process.env.RESEND_API_KEY

    setupSqlMock({
      confirmedDeals: [fakeDeal, fakeDeal, fakeDeal],
      leadCount: 3,
      leads: [{ id: 1, email: 'test@example.com' }],
    })

    await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(mockSendTelegram).toHaveBeenCalled()

    const [msg] = mockSendTelegram.mock.calls[0]
    expect(msg).toContain('Weekly Distress Digest')
    expect(msg).toContain('Deals surfaced')
  })
})

describe('GET /api/cron/weekly-distress-digest — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEmailSend.mockClear()
    process.env.CRON_SECRET = CRON_SECRET
    delete process.env.RESEND_API_KEY
  })

  it('returns 500 and sends Telegram error when SQL throws', async () => {
    mockSql.mockRejectedValue(new Error('DB connection failed'))


    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('DB connection failed')

    expect(mockSendTelegram).toHaveBeenCalled()
    const [msg] = mockSendTelegram.mock.calls[0]
    expect(msg).toContain('CRON ERROR')
    expect(msg).toContain('weekly-distress-digest')
  })
})

describe('weekly-distress-digest source code — regression sentinels', () => {
  /**
   * Guard SQL patterns that have caused production bugs.
   * Reading the source file directly prevents regressions at the code level.
   */

  let source: string

  beforeEach(() => {
    source = readFileSync(
      resolve(process.cwd(), 'app/api/cron/weekly-distress-digest/route.ts'),
      'utf-8'
    )
  })

  it('UPDATE query uses unsubscribed_at IS NULL (not created_at) for active lead filter', () => {
    // The UPDATE block sets send stats for active leads
    const updateBlock = source.slice(
      source.indexOf('UPDATE email_leads'),
      source.indexOf('UPDATE email_leads') + 300
    )
    expect(updateBlock).toContain('unsubscribed_at IS NULL')
    expect(updateBlock).not.toContain('created_at IS NULL')
  })

  it('esc() function escapes all four HTML special characters', () => {
    // esc() must handle &, <, >, " — these appear in user-supplied property titles
    expect(source).toContain("replace(/&/g, '&amp;')")
    expect(source).toContain("replace(/</g, '&lt;')")
    expect(source).toContain("replace(/>/g, '&gt;')")
    expect(source).toContain("replace(/\"/g, '&quot;')")
  })

  it('buildDealCardsHtml uses confidence_tier for badge labeling', () => {
    // Tier 1 = CONFIRMED DROP, tier 2 = BELOW DLD AVG, else = DOM SIGNAL
    expect(source).toContain('CONFIRMED DROP')
    expect(source).toContain('BELOW DLD AVG')
    expect(source).toContain('DOM SIGNAL')
    expect(source).toContain('confidence_tier === 1')
    expect(source).toContain('confidence_tier === 2')
  })

  it('textToHtml includes unsubscribe URL built from token parameter', () => {
    // The unsubscribe link must use the token — plain-text email addresses in URLs are a privacy risk
    const fnBlock = source.slice(
      source.indexOf('function textToHtml'),
      source.indexOf('function textToHtml') + 500
    )
    expect(fnBlock).toContain('/api/leads/unsubscribe')
    expect(fnBlock).toContain('unsubToken')
  })

  it('Gemini prompt includes explicit "Not financial advice" signal or CTA to distress-deals page', () => {
    // Gemini prompt should direct to the terminal, not give financial advice
    expect(source).toContain('distress-deals')
  })
})
