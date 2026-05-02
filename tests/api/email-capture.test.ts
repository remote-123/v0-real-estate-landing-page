/**
 * Tests for POST /api/leads/email-capture
 *
 * Primary lead-gen endpoint — called from the email gate overlay on every
 * terminal page. Handles: email validation, rate limiting, DB insert, Telegram notify.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => {
  const sql = vi.fn()
  return { sql }
})

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn().mockResolvedValue(undefined),
  sendTelegramError: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/leads/email-capture/route'
import { sql } from '@/lib/db'
import { sendTelegram } from '@/lib/telegram'

const mockSql = vi.mocked(sql)
const mockTelegram = vi.mocked(sendTelegram)

// Use a unique IP per test to avoid rate-limit store bleed-through
let ipCounter = 0
function makeReq(body: unknown, ip?: string) {
  const clientIp = ip ?? `10.0.${Math.floor(++ipCounter / 255)}.${ipCounter % 255}`
  return new Request('http://localhost/api/leads/email-capture', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': clientIp,
    },
  })
}

describe('POST /api/leads/email-capture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  it('accepts a valid email and returns ok:true', async () => {
    mockSql.mockResolvedValueOnce([{ id: 1 }]) // INSERT success → new subscriber
    const res = await POST(makeReq({ email: 'investor@example.com', source: 'terminal' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.already_subscribed).toBe(false)
  })

  it('rejects missing email with 400', async () => {
    const res = await POST(makeReq({ source: 'terminal' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid email/i)
  })

  it('rejects non-string email with 400', async () => {
    const res = await POST(makeReq({ email: 12345, source: 'terminal' }))
    expect(res.status).toBe(400)
  })

  it('rejects email without @ with 400', async () => {
    const res = await POST(makeReq({ email: 'notanemail', source: 'terminal' }))
    expect(res.status).toBe(400)
  })

  it('rejects email without domain with 400', async () => {
    const res = await POST(makeReq({ email: 'user@', source: 'terminal' }))
    expect(res.status).toBe(400)
  })

  it('rejects malformed JSON body with 400', async () => {
    const req = new Request('http://localhost/api/leads/email-capture', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.1.1.1' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ── Already subscribed ──────────────────────────────────────────────────────

  it('returns already_subscribed:true when email already in DB', async () => {
    mockSql.mockResolvedValueOnce([]) // ON CONFLICT DO NOTHING → 0 rows returned
    const res = await POST(makeReq({ email: 'existing@example.com', source: 'terminal' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.already_subscribed).toBe(true)
  })

  it('does NOT send Telegram notification for existing subscribers', async () => {
    mockSql.mockResolvedValueOnce([]) // existing subscriber
    await POST(makeReq({ email: 'dup@example.com', source: 'terminal' }))
    expect(mockTelegram).not.toHaveBeenCalled()
  })

  // ── New subscriber ──────────────────────────────────────────────────────────

  it('sends Telegram notification for new subscribers', async () => {
    mockSql.mockResolvedValueOnce([{ id: 99 }]) // new subscriber
    await POST(makeReq({ email: 'new@example.com', source: 'distress-deals' }))
    expect(mockTelegram).toHaveBeenCalledOnce()
    const [msg] = mockTelegram.mock.calls[0]
    expect(msg).toContain('new@example.com')
    expect(msg).toContain('distress-deals')
  })

  it('lowercases email before inserting', async () => {
    mockSql.mockResolvedValueOnce([{ id: 1 }])
    await POST(makeReq({ email: 'UPPER@EXAMPLE.COM', source: 'terminal' }))
    // The sql call interpolates the lowercased email as the 2nd template arg
    const [, cleanEmail] = mockSql.mock.calls[0] as [TemplateStringsArray, string, ...unknown[]]
    expect(cleanEmail).toBe('upper@example.com')
  })

  // ── Rate limiting ───────────────────────────────────────────────────────────

  it('rate-limits the same IP after 5 submissions', async () => {
    const ip = `10.99.99.${++ipCounter}` // dedicated unique IP
    mockSql.mockResolvedValue([{ id: 1 }])

    // 5 allowed
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeReq({ email: `user${i}@example.com`, source: 'terminal' }, ip))
      expect(res.status).toBe(200)
    }

    // 6th blocked
    const blocked = await POST(makeReq({ email: 'extra@example.com', source: 'terminal' }, ip))
    expect(blocked.status).toBe(429)
    const data = await blocked.json()
    expect(data.error).toMatch(/too many/i)
  })

  // ── DB error handling ───────────────────────────────────────────────────────

  it('returns 500 on DB error', async () => {
    mockSql.mockRejectedValueOnce(new Error('DB connection refused'))
    const res = await POST(makeReq({ email: 'dberr@example.com', source: 'terminal' }))
    expect(res.status).toBe(500)
  })
})
