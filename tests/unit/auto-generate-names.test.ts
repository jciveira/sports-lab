import { describe, it, expect } from 'vitest'

/**
 * Tests the auto-generate naming algorithm used in CreateTournamentPage.
 * The logic is inline in the component, so we replicate it here to verify correctness.
 */
function generateTeamNames(existingNames: string[], count: number): string[] {
  const nameSet = new Set(existingNames.map((n) => n.toLowerCase()))
  const totalExisting = existingNames.length
  const generated: string[] = []
  for (let i = 0; i < count; i++) {
    let num = totalExisting + i + 1
    while (nameSet.has(`team ${num}`)) num++
    const name = `Team ${num}`
    nameSet.add(name.toLowerCase())
    generated.push(name)
  }
  return generated
}

describe('auto-generate team names', () => {
  it('generates sequential names when no teams exist', () => {
    expect(generateTeamNames([], 3)).toEqual(['Team 1', 'Team 2', 'Team 3'])
  })

  it('generates names starting after existing team count', () => {
    const existing = ['Dominicos', 'Maristas', 'Teucro']
    expect(generateTeamNames(existing, 2)).toEqual(['Team 4', 'Team 5'])
  })

  it('skips names that collide with existing teams', () => {
    const existing = ['Team 1', 'Team 2', 'Dominicos']
    // With 3 existing, starts at 4, no collisions
    expect(generateTeamNames(existing, 2)).toEqual(['Team 4', 'Team 5'])
  })

  it('skips names that collide case-insensitively', () => {
    const existing = ['team 4', 'TEAM 5', 'Dominicos']
    // With 3 existing, starts at 4 → collision, 5 → collision, 6 → ok
    expect(generateTeamNames(existing, 2)).toEqual(['Team 6', 'Team 7'])
  })

  it('handles collision at the expected starting number', () => {
    // 2 existing teams, so first generated tries "Team 3"
    const existing = ['Dominicos', 'Team 3']
    expect(generateTeamNames(existing, 2)).toEqual(['Team 4', 'Team 5'])
  })

  it('generates 8 teams for a full category', () => {
    const names = generateTeamNames([], 8)
    expect(names).toHaveLength(8)
    expect(names[0]).toBe('Team 1')
    expect(names[7]).toBe('Team 8')
    // All unique
    expect(new Set(names).size).toBe(8)
  })

  it('avoids collisions between generated names', () => {
    // Edge case: existing has "Team 2" which could collide mid-generation
    const existing = ['Team 2']
    const names = generateTeamNames(existing, 3)
    // With 1 existing, tries: Team 2 (collision) → Team 3, Team 4, Team 5? No.
    // Actually: i=0, num=1+0+1=2, collision → num=3, "Team 3"; i=1, num=1+1+1=3, collision → num=4, "Team 4"; i=2, num=1+2+1=4, collision → num=5, "Team 5"
    expect(names).toEqual(['Team 3', 'Team 4', 'Team 5'])
    expect(new Set(names).size).toBe(3)
  })

  it('handles generating zero teams', () => {
    expect(generateTeamNames(['Dominicos'], 0)).toEqual([])
  })
})
