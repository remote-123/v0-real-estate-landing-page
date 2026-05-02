/**
 * Tests for GET /api/leads/unsubscribe
 *
 * Critical: GDPR unsubscribe endpoint — linked from every digest email.
 * If broken, users cannot opt out (legal requirement).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DB before any route imports
vi.mock('@/lib/db', () => {
  const sql = vi.fn()
  return { sql }
})

import { GET } from '@/app/api/leads/unsubscribe/route'
import { sql } from '@/lib/db'

const mockSql = vi.mocked(sql)

function makeToken(email: string) {
  return Buffer.from(email).toString('base64url')
}

describe('GET /api/leads/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when token param is missing', async () => {
    const req = new Request('http://localhost/api/leads/unsubscribe')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toContain('Missing unsubscribe token')
  })

  it('returns 400 when decoded token is not a valid email', async () => {
    // base64url of a non-email string
    const badToken = Buffer.from('not-an-email').toString('base64url')
    const req = new Request(`http://localhost/api/leads/unsubscribe?token=${badToken}`)
    const res = await GET(req)
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(text).toContain('Invalid unsubscribe token')
  })

  it('successfully unsubscribes a valid email', async () => {
    const email = 'investor@example.com'
    mockSql.mockResolvedValueOnce([{ id: 42 }]) // UPDATE returns 1 row
    const req = new Request(`http://localhost/api/leads/unsubscribe?token=${makeToken(email)}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('investor@example.com')
    expect(text).toContain('has been unsubscribed')
  })

  it('returns 200 for already-unsubscribed email (idempotent)', async () => {
    const email = 'already@example.com'
    mockSql.mockResolvedValueOnce([]) // UPDATE returns 0 rows
    const req = new Request(`http://localhost/api/leads/unsubscribe?token=${makeToken(email)}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('already@example.com')
  })

  it('calls DB UPDATE with lowercased email', async () => {
    const email = 'UPPER@EXAMPLE.COM'
    mockSql.mockResolvedValueOnce([{ id: 1 }])
    const req = new Request(`http://localhost/api/leads/unsubscribe?token=${makeToken(email)}`)
    await GET(req)

    // Verify sql was called (DB update was attempted)
    expect(mockSql).toHaveBeenCalledOnce()
    // The first argument to a tagged template is the template strings array
    const [strings] = mockSql.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
    const queryText = strings.join('?')
    expect(queryText.toLowerCase()).toContain('update email_leads')
    expect(queryText.toLowerCase()).toContain('unsubscribed_at')
  })

  it('returns HTML content-type', async () => {
    const email = 'html@example.com'
    mockSql.mockResolvedValueOnce([{ id: 1 }])
    const req = new Request(`http://localhost/api/leads/unsubscribe?token=${makeToken(email)}`)
    const res = await GET(req)
    expect(res.headers.get('content-type')).toContain('text/html')
  })

  it('handles DB errors gracefully — returns 500', async () => {
    const email = 'error@example.com'
    mockSql.mockRejectedValueOnce(new Error('connection timeout'))
    const req = new Request(`http://localhost/api/leads/unsubscribe?token=${makeToken(email)}`)
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})
