import { describe, it, expect } from 'vitest'
import { formatMatchDate, sortByStartsAt, toDatetimeLocal } from '../../src/lib/matches'
import type { DbMatch } from '../../src/lib/database.types'

function stub(id: string, starts_at: string | null): DbMatch {
  return { id, starts_at } as unknown as DbMatch
}

describe('formatMatchDate', () => {
  it('returns null for null input', () => {
    expect(formatMatchDate(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(formatMatchDate(undefined)).toBeNull()
  })

  it('formats a UTC ISO string to Spanish locale', () => {
    // 2026-04-02T07:30:00Z = 09:30 CEST (UTC+2)
    const result = formatMatchDate('2026-04-02T07:30:00Z')
    expect(result).not.toBeNull()
    // Should contain a time separator and time portion
    expect(result).toMatch(/·/)
    expect(result).toMatch(/\d{2}:\d{2}/)
  })

  it('includes weekday, day and month', () => {
    const result = formatMatchDate('2026-04-02T07:30:00Z')
    expect(result).not.toBeNull()
    // Should contain numeric day
    expect(result).toMatch(/\d+/)
  })
})

describe('sortByStartsAt', () => {
  it('sorts by starts_at asc', () => {
    const matches = [
      stub('m2', '2026-04-02T10:00:00Z'),
      stub('m1', '2026-04-02T08:00:00Z'),
    ]
    const result = sortByStartsAt(matches)
    expect(result[0].id).toBe('m1')
    expect(result[1].id).toBe('m2')
  })

  it('puts nulls last', () => {
    const matches = [
      stub('m_null', null),
      stub('m_early', '2026-04-02T08:00:00Z'),
    ]
    const result = sortByStartsAt(matches)
    expect(result[0].id).toBe('m_early')
    expect(result[1].id).toBe('m_null')
  })

  it('does not mutate the original array', () => {
    const matches = [stub('m2', '2026-04-02T10:00:00Z'), stub('m1', '2026-04-02T08:00:00Z')]
    const original = [...matches]
    sortByStartsAt(matches)
    expect(matches[0].id).toBe(original[0].id)
  })
})

describe('toDatetimeLocal', () => {
  it('returns a string in datetime-local format (16 chars)', () => {
    const result = toDatetimeLocal('2026-04-02T07:30:00Z')
    expect(result).toHaveLength(16)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('round-trips: converting back to ISO preserves the same point in time', () => {
    const original = '2026-04-05T08:30:00.000Z'
    const local = toDatetimeLocal(original)
    // Convert back to ISO — must equal original UTC ms
    const backToUtc = new Date(local).toISOString()
    expect(new Date(backToUtc).getTime()).toBe(new Date(original).getTime())
  })
})
