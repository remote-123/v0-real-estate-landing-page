/**
 * Tests for lib/terminal-gate.ts
 *
 * Auth gating is currently disabled — isTerminalUnlocked() always returns true.
 * Tests updated to reflect open-access state.
 * Re-enable cookie/session tests when auth is re-introduced.
 */

import { describe, it, expect } from 'vitest'
import { isTerminalUnlocked, GATE_COOKIE } from '@/lib/terminal-gate'

describe('isTerminalUnlocked — gating disabled (always open)', () => {
  it('returns true when session is present', async () => {
    expect(await isTerminalUnlocked({ user: { id: 'u1' } })).toBe(true)
  })

  it('returns true when session is null', async () => {
    expect(await isTerminalUnlocked(null)).toBe(true)
  })

  it('returns true when session is undefined', async () => {
    expect(await isTerminalUnlocked(undefined)).toBe(true)
  })

  it('returns true when session is false', async () => {
    expect(await isTerminalUnlocked(false)).toBe(true)
  })

  it('GATE_COOKIE constant still exported for future use', () => {
    expect(GATE_COOKIE).toBe('terminal_email_unlocked')
  })
})
