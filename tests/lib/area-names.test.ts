import { describe, it, expect } from 'vitest'
import { formatAreaName, DLD_TO_BRAND } from '@/lib/area-names'

describe('formatAreaName', () => {
  it('maps known DLD admin names to brand names', () => {
    expect(formatAreaName('marsa dubai')).toBe('Dubai Marina')
    expect(formatAreaName('burj khalifa')).toBe('Downtown Dubai')
    expect(formatAreaName('hadaeq sheikh mohammed bin rashid')).toBe('Dubai Hills Estate')
    expect(formatAreaName('al barsha south fourth')).toBe('Jumeirah Village Circle')
    expect(formatAreaName('al thanyah fifth')).toBe('Jumeirah Lake Towers')
  })

  it('lookup is case-insensitive', () => {
    expect(formatAreaName('MARSA DUBAI')).toBe('Dubai Marina')
    expect(formatAreaName('Marsa Dubai')).toBe('Dubai Marina')
    expect(formatAreaName('BURJ KHALIFA')).toBe('Downtown Dubai')
  })

  it('returns original name for unknown areas', () => {
    expect(formatAreaName('Unknown Custom Area')).toBe('Unknown Custom Area')
    expect(formatAreaName('Al Furjan')).toBe('Al Furjan')
    expect(formatAreaName('Sobha Hartland')).toBe('Sobha Hartland')
  })

  it('handles empty string gracefully', () => {
    expect(formatAreaName('')).toBe('')
  })

  it('handles palm jumeirah and other well-known areas', () => {
    expect(formatAreaName('palm jumeirah')).toBe('Palm Jumeirah')
    expect(formatAreaName('business bay')).toBe('Business Bay')
  })
})

describe('DLD_TO_BRAND mapping', () => {
  it('contains known high-volume areas', () => {
    expect(DLD_TO_BRAND['marsa dubai']).toBe('Dubai Marina')
    expect(DLD_TO_BRAND['trade center first']).toBe('DIFC')
  })

  it('all keys are lowercase', () => {
    for (const key of Object.keys(DLD_TO_BRAND)) {
      expect(key).toBe(key.toLowerCase())
    }
  })

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(DLD_TO_BRAND)) {
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0, `Empty brand name for key: ${key}`)
    }
  })
})
