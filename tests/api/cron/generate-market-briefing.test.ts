/**
 * Tests for GET /api/cron/generate-market-briefing
 *
 * This cron is a thin proxy — it validates auth, calls the internal
 * /api/market-briefing/generate endpoint, and sends a Telegram error on failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/cron/generate-market-briefing/route'
import { sendTelegram } from '@/lib/telegram'

const mockSendTelegram = vi.mocked(sendTelegram)

const CRON_SECRET = 'test-cron-secret'

function makeReq(auth?: string) {
  return new Request('http://localhost/api/cron/generate-market-briefing', {
    headers: auth ? { Authorization: auth } : {},
  })
}

describe('GET /api/cron/generate-market-briefing — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.northcapitaldxb.com'
    global.fetch = vi.fn()
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

  it('returns 401 for malformed bearer token', async () => {
    const res = await GET(makeReq(CRON_SECRET)) // missing "Bearer " prefix
    expect(res.status).toBe(401)
  })
})

describe('GET /api/cron/generate-market-briefing — proxy behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.northcapitaldxb.com'
  })

  it('proxies to internal endpoint with correct auth header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, briefing_id: 42 }),
    })
    global.fetch = mockFetch

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(200)

    // Verify fetch was called with the internal endpoint
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/market-briefing/generate')
    expect(opts?.method).toBe('POST')
    expect(opts?.headers?.Authorization).toBe(`Bearer ${CRON_SECRET}`)
  })

  it('proxies response body from downstream', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, briefing_id: 99 }),
    })

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    const data = await res.json()
    expect(data.briefing_id).toBe(99)
  })

  it('sends Telegram error when downstream returns error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Gemini quota exceeded' }),
    })

    await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(mockSendTelegram).toHaveBeenCalledOnce()
    const [msg] = mockSendTelegram.mock.calls[0]
    expect(msg).toContain('CRON ERROR')
    expect(msg).toContain('generate-market-briefing')
  })

  it('returns 500 and sends Telegram when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'))

    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('Network timeout')
    expect(mockSendTelegram).toHaveBeenCalledOnce()
    const [msg] = mockSendTelegram.mock.calls[0]
    expect(msg).toContain('Network timeout')
  })
})
