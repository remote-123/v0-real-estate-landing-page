import { describe, it, expect } from 'vitest'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Use unique keys per test to avoid store bleed-through between tests
// (the store is module-level, persists for the process lifetime)
let keyCounter = 0
function uniqueKey(label: string) {
  return `test-${label}-${Date.now()}-${++keyCounter}`
}

describe('checkRateLimit', () => {
  it('allows first request and tracks remaining', () => {
    const key = uniqueKey('first')
    const result = checkRateLimit(key, { limit: 5, windowMs: 10_000 })
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('allows requests up to the limit', () => {
    const key = uniqueKey('up-to-limit')
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit(key, { limit: 3, windowMs: 10_000 })
      expect(r.ok).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const key = uniqueKey('exceed')
    checkRateLimit(key, { limit: 3, windowMs: 10_000 })
    checkRateLimit(key, { limit: 3, windowMs: 10_000 })
    checkRateLimit(key, { limit: 3, windowMs: 10_000 })
    const over = checkRateLimit(key, { limit: 3, windowMs: 10_000 })
    expect(over.ok).toBe(false)
    expect(over.remaining).toBe(0)
  })

  it('returns remaining count decreasing correctly', () => {
    const key = uniqueKey('remaining')
    const r1 = checkRateLimit(key, { limit: 5, windowMs: 10_000 })
    const r2 = checkRateLimit(key, { limit: 5, windowMs: 10_000 })
    const r3 = checkRateLimit(key, { limit: 5, windowMs: 10_000 })
    expect(r1.remaining).toBe(4)
    expect(r2.remaining).toBe(3)
    expect(r3.remaining).toBe(2)
  })

  it('allows requests after window expires', async () => {
    const key = uniqueKey('window-expiry')
    checkRateLimit(key, { limit: 1, windowMs: 5 }) // 5ms window — fills on first call
    // Wait for the window to expire
    await new Promise((r) => setTimeout(r, 20))
    const result = checkRateLimit(key, { limit: 1, windowMs: 5 })
    expect(result.ok).toBe(true)
  })

  it('provides resetAt timestamp in the future', () => {
    const key = uniqueKey('reset-at')
    const now = Date.now()
    const result = checkRateLimit(key, { limit: 5, windowMs: 10_000 })
    expect(result.resetAt).toBeGreaterThan(now)
  })

  it('different keys are independent', () => {
    const key1 = uniqueKey('ind-a')
    const key2 = uniqueKey('ind-b')
    // Fill key1
    for (let i = 0; i < 3; i++) checkRateLimit(key1, { limit: 3, windowMs: 10_000 })
    const r1 = checkRateLimit(key1, { limit: 3, windowMs: 10_000 })
    expect(r1.ok).toBe(false)
    // key2 is unaffected
    const r2 = checkRateLimit(key2, { limit: 3, windowMs: 10_000 })
    expect(r2.ok).toBe(true)
  })
})

describe('getClientIp', () => {
  it('extracts first IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
    })
    expect(getClientIp(req)).toBe('203.0.113.1')
  })

  it('returns single IP when no proxy chain', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '198.51.100.42' },
    })
    expect(getClientIp(req)).toBe('198.51.100.42')
  })

  it('returns "unknown" when no x-forwarded-for header present', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })

  it('trims whitespace around IP from forwarded header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.2' },
    })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })
})
