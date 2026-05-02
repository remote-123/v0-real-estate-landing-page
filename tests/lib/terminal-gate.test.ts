/**
 * Tests for lib/terminal-gate.ts
 *
 * isTerminalUnlocked() is the server-side gate used by every terminal API route.
 * It grants access when:
 *   1. A session is present (auth'd user), OR
 *   2. The terminal_email_unlocked=1 cookie is set (email-gated user)
 *
 * Regression guards:
 * - Session check is truthy, not strict equality (null, undefined, false → false)
 * - Cookie value must be exactly "1" — not "true", "yes", etc.
 * - cookies() throwing (static gen context) returns false, never throws
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers before importing the module under test
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

import { isTerminalUnlocked, GATE_COOKIE } from '@/lib/terminal-gate'
import { cookies } from 'next/headers'

const mockCookies = vi.mocked(cookies)
// mockGet is configured per-test in beforeEach via mockCookies.mockResolvedValue
const mockGet = vi.fn()

describe('isTerminalUnlocked — session check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCookies.mockResolvedValue({ get: mockGet } as any)
    mockGet.mockReturnValue(undefined)
  })

  it('returns true when session is a non-null object', async () => {
    const result = await isTerminalUnlocked({ user: { id: 'u1' } })
    expect(result).toBe(true)
    // Session present — cookies() should never be called
    expect(mockCookies).not.toHaveBeenCalled()
  })

  it('returns true when session is any truthy value', async () => {
    expect(await isTerminalUnlocked('session-string')).toBe(true)
    expect(await isTerminalUnlocked(1)).toBe(true)
    expect(await isTerminalUnlocked(true)).toBe(true)
  })

  it('returns false when session is null', async () => {
    mockGet.mockReturnValue(undefined)
    const result = await isTerminalUnlocked(null)
    expect(result).toBe(false)
  })

  it('returns false when session is undefined', async () => {
    mockGet.mockReturnValue(undefined)
    const result = await isTerminalUnlocked(undefined)
    expect(result).toBe(false)
  })

  it('returns false when session is false', async () => {
    mockGet.mockReturnValue(undefined)
    const result = await isTerminalUnlocked(false)
    expect(result).toBe(false)
  })
})

describe('isTerminalUnlocked — cookie check (no session)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCookies.mockResolvedValue({ get: mockGet } as any)
  })

  it('returns true when terminal_email_unlocked cookie is "1"', async () => {
    mockGet.mockReturnValue({ value: '1' })
    const result = await isTerminalUnlocked(null)
    expect(result).toBe(true)
    expect(mockGet).toHaveBeenCalledWith(GATE_COOKIE)
  })

  it('returns false when cookie value is "true" (not exactly "1")', async () => {
    mockGet.mockReturnValue({ value: 'true' })
    const result = await isTerminalUnlocked(null)
    expect(result).toBe(false)
  })

  it('returns false when cookie value is "yes"', async () => {
    mockGet.mockReturnValue({ value: 'yes' })
    const result = await isTerminalUnlocked(null)
    expect(result).toBe(false)
  })

  it('returns false when cookie value is "0"', async () => {
    mockGet.mockReturnValue({ value: '0' })
    const result = await isTerminalUnlocked(null)
    expect(result).toBe(false)
  })

  it('returns false when cookie is absent', async () => {
    mockGet.mockReturnValue(undefined)
    const result = await isTerminalUnlocked(null)
    expect(result).toBe(false)
  })

  it('uses the correct cookie name (GATE_COOKIE constant)', () => {
    // Guard against accidental renaming of the cookie key
    expect(GATE_COOKIE).toBe('terminal_email_unlocked')
  })
})

describe('isTerminalUnlocked — cookies() throws (static gen / edge case)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false (does not throw) when cookies() throws', async () => {
    mockCookies.mockRejectedValue(new Error('cookies() called outside request context'))
    await expect(isTerminalUnlocked(null)).resolves.toBe(false)
  })

  it('returns false when cookies() rejects with any error type', async () => {
    mockCookies.mockRejectedValue('string error')
    await expect(isTerminalUnlocked(null)).resolves.toBe(false)
  })
})
