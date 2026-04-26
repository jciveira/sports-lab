import { describe, it, expect } from 'vitest'
import { isDuplicateTeamName } from '../../src/lib/team-validation'
import type { DbTeam } from '../../src/lib/database.types'

function makeTeam(overrides: Partial<DbTeam> & { name: string }): DbTeam {
  return {
    id: crypto.randomUUID(),
    nickname: null,
    badge_url: null,
    city_district: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

const teams: DbTeam[] = [
  makeTeam({ id: 'team-1', name: 'Dominicos' }),
  makeTeam({ id: 'team-2', name: 'Maristas' }),
  makeTeam({ id: 'team-3', name: 'Teucro' }),
]

describe('isDuplicateTeamName', () => {
  it('detects exact match', () => {
    expect(isDuplicateTeamName('Dominicos', teams)).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isDuplicateTeamName('dominicos', teams)).toBe(true)
    expect(isDuplicateTeamName('DOMINICOS', teams)).toBe(true)
    expect(isDuplicateTeamName('DoMiNiCoS', teams)).toBe(true)
  })

  it('trims whitespace before comparing', () => {
    expect(isDuplicateTeamName('  Dominicos  ', teams)).toBe(true)
    expect(isDuplicateTeamName('Dominicos ', teams)).toBe(true)
    expect(isDuplicateTeamName(' Dominicos', teams)).toBe(true)
  })

  it('returns false for unique names', () => {
    expect(isDuplicateTeamName('Ademar', teams)).toBe(false)
    expect(isDuplicateTeamName('Barcelona', teams)).toBe(false)
  })

  it('returns false for empty/whitespace-only input', () => {
    expect(isDuplicateTeamName('', teams)).toBe(false)
    expect(isDuplicateTeamName('   ', teams)).toBe(false)
  })

  it('excludes a team by id (edit mode)', () => {
    expect(isDuplicateTeamName('Dominicos', teams, 'team-1')).toBe(false)
  })

  it('still detects duplicates when excluding a different team', () => {
    expect(isDuplicateTeamName('Dominicos', teams, 'team-2')).toBe(true)
  })

  it('handles empty teams array', () => {
    expect(isDuplicateTeamName('Dominicos', [])).toBe(false)
  })

  it('handles teams with whitespace in stored names', () => {
    const teamsWithSpaces = [makeTeam({ name: '  Dominicos  ' })]
    expect(isDuplicateTeamName('Dominicos', teamsWithSpaces)).toBe(true)
  })
})
