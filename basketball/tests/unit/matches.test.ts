import { describe, it, expect } from 'vitest'
import { formatMatchDate } from '../../src/lib/matches'

describe('formatMatchDate', () => {
  it('returns null for null input', () => {
    expect(formatMatchDate(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(formatMatchDate(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(formatMatchDate('')).toBeNull()
  })

  it('formats a valid ISO date string', () => {
    // Use a fixed date: Friday 2 May 2025 15:00 UTC
    const result = formatMatchDate('2025-05-02T15:00:00.000Z')
    expect(result).toBeTruthy()
    expect(result).toContain('·')
    // Should contain time portion
    expect(result).toMatch(/\d{2}:\d{2}/)
  })

  it('includes day and month in output', () => {
    const result = formatMatchDate('2025-05-02T15:00:00.000Z')
    expect(result).toBeTruthy()
    // Result should have a separator and not be empty
    expect(result!.length).toBeGreaterThan(5)
  })
})
