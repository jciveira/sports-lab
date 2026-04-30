import { describe, it, expect } from 'vitest'
import { formatMatchDate, sortByScheduledAt, toDatetimeLocal } from '../../src/lib/matches'

describe('formatMatchDate', () => {
  it('returns null for null input', () => {
    expect(formatMatchDate(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(formatMatchDate(undefined)).toBeNull()
  })

  it('formats a UTC ISO string in es-ES locale', () => {
    const result = formatMatchDate('2026-05-01T13:00:00+00:00')
    expect(result).toMatch(/·/)
    expect(result).toMatch(/\d{2}:\d{2}/)
    expect(result).not.toBeNull()
  })

  it('includes day-of-week, date, and time parts', () => {
    const result = formatMatchDate('2026-05-01T13:00:00+00:00')
    // Should have at minimum 2 segments separated by ·
    const parts = result!.split('·')
    expect(parts).toHaveLength(2)
    expect(parts[0].trim()).toBeTruthy()
    expect(parts[1].trim()).toBeTruthy()
  })
})

describe('sortByScheduledAt', () => {
  it('sorts matches ascending by scheduled_at', () => {
    const matches = [
      { id: 'b', scheduled_at: '2026-05-01T15:00:00Z' },
      { id: 'a', scheduled_at: '2026-05-01T13:00:00Z' },
      { id: 'c', scheduled_at: '2026-05-02T09:00:00Z' },
    ]
    const sorted = sortByScheduledAt(matches)
    expect(sorted.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('places nulls last', () => {
    const matches = [
      { id: 'b', scheduled_at: '2026-05-01T15:00:00Z' },
      { id: 'a', scheduled_at: null },
    ]
    const sorted = sortByScheduledAt(matches)
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('a')
  })

  it('handles all-null scheduled_at', () => {
    const matches = [
      { id: 'a', scheduled_at: null },
      { id: 'b', scheduled_at: null },
    ]
    const sorted = sortByScheduledAt(matches)
    expect(sorted).toHaveLength(2)
  })

  it('does not mutate the original array', () => {
    const matches = [
      { id: 'b', scheduled_at: '2026-05-01T15:00:00Z' },
      { id: 'a', scheduled_at: '2026-05-01T13:00:00Z' },
    ]
    sortByScheduledAt(matches)
    expect(matches[0].id).toBe('b')
  })
})

describe('toDatetimeLocal', () => {
  it('returns a 16-char datetime-local string', () => {
    const result = toDatetimeLocal('2026-05-01T13:00:00Z')
    expect(result).toHaveLength(16)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('adjusts for local timezone offset', () => {
    const iso = '2026-05-01T00:00:00Z'
    const result = toDatetimeLocal(iso)
    // The result must be a valid datetime-local string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})
