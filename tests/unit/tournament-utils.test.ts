import { describe, it, expect } from 'vitest'
import {
  generateRoundRobinFixtures,
  calculateStandings,
  generateKnockoutPairings,
  generateNGroupKnockoutPairings,
  getKnockoutWinner,
  getKnockoutLoser,
} from '../../src/lib/tournament-utils'
import type { MatchResult, StandingsRow } from '../../src/lib/tournament-utils'

describe('generateRoundRobinFixtures', () => {
  it('returns empty for fewer than 2 teams', () => {
    expect(generateRoundRobinFixtures([])).toEqual([])
    expect(generateRoundRobinFixtures(['A'])).toEqual([])
  })

  it('generates 1 fixture for 2 teams', () => {
    const fixtures = generateRoundRobinFixtures(['A', 'B'])
    expect(fixtures).toHaveLength(1)
    expect(fixtures[0]).toEqual({ homeTeamId: 'A', awayTeamId: 'B' })
  })

  it('generates 3 fixtures for 3 teams (with BYE handling)', () => {
    const fixtures = generateRoundRobinFixtures(['A', 'B', 'C'])
    expect(fixtures).toHaveLength(3)
    // Each team plays each other exactly once
    const pairs = fixtures.map((f) => [f.homeTeamId, f.awayTeamId].sort().join('-'))
    expect(new Set(pairs).size).toBe(3) // all unique
  })

  it('generates 6 fixtures for 4 teams (standard group)', () => {
    const teams = ['T1', 'T2', 'T3', 'T4']
    const fixtures = generateRoundRobinFixtures(teams)
    expect(fixtures).toHaveLength(6)

    // Each pair appears exactly once
    const pairs = fixtures.map((f) => [f.homeTeamId, f.awayTeamId].sort().join('-'))
    expect(new Set(pairs).size).toBe(6)

    // Each team plays exactly 3 matches
    for (const t of teams) {
      const count = fixtures.filter((f) => f.homeTeamId === t || f.awayTeamId === t).length
      expect(count).toBe(3)
    }
  })

  it('does not include BYE in any fixture', () => {
    const fixtures = generateRoundRobinFixtures(['A', 'B', 'C'])
    for (const f of fixtures) {
      expect(f.homeTeamId).not.toBe('BYE')
      expect(f.awayTeamId).not.toBe('BYE')
    }
  })
})

describe('calculateStandings', () => {
  const teams = ['T1', 'T2', 'T3', 'T4']

  it('returns zero stats when no results', () => {
    const standings = calculateStandings(teams, [])
    expect(standings).toHaveLength(4)
    for (const row of standings) {
      expect(row.played).toBe(0)
      expect(row.points).toBe(0)
    }
  })

  it('awards 2 points for a win', () => {
    const results: MatchResult[] = [{ homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 3, awayScore: 1 }]
    const standings = calculateStandings(teams, results)
    const t1 = standings.find((r) => r.teamId === 'T1')!
    const t2 = standings.find((r) => r.teamId === 'T2')!
    expect(t1.points).toBe(2)
    expect(t1.won).toBe(1)
    expect(t2.points).toBe(0)
    expect(t2.lost).toBe(1)
  })

  it('awards 1 point each for a draw', () => {
    const results: MatchResult[] = [{ homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 2, awayScore: 2 }]
    const standings = calculateStandings(teams, results)
    const t1 = standings.find((r) => r.teamId === 'T1')!
    const t2 = standings.find((r) => r.teamId === 'T2')!
    expect(t1.points).toBe(1)
    expect(t1.drawn).toBe(1)
    expect(t2.points).toBe(1)
    expect(t2.drawn).toBe(1)
  })

  it('calculates goal difference correctly', () => {
    const results: MatchResult[] = [
      { homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 5, awayScore: 1 },
      { homeTeamId: 'T1', awayTeamId: 'T3', homeScore: 3, awayScore: 2 },
    ]
    const standings = calculateStandings(teams, results)
    const t1 = standings.find((r) => r.teamId === 'T1')!
    expect(t1.goalsFor).toBe(8)
    expect(t1.goalsAgainst).toBe(3)
    expect(t1.goalDifference).toBe(5)
  })

  it('sorts by points first', () => {
    const results: MatchResult[] = [
      { homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 1, awayScore: 0 },
      { homeTeamId: 'T3', awayTeamId: 'T4', homeScore: 1, awayScore: 0 },
      { homeTeamId: 'T1', awayTeamId: 'T3', homeScore: 1, awayScore: 0 },
    ]
    const standings = calculateStandings(teams, results)
    expect(standings[0].teamId).toBe('T1') // 4 pts
    expect(standings[1].teamId).toBe('T3') // 2 pts
  })

  it('uses goal difference as tiebreaker', () => {
    const results: MatchResult[] = [
      { homeTeamId: 'T1', awayTeamId: 'T3', homeScore: 5, awayScore: 0 }, // T1: +5 GD
      { homeTeamId: 'T2', awayTeamId: 'T4', homeScore: 1, awayScore: 0 }, // T2: +1 GD
    ]
    const standings = calculateStandings(teams, results)
    // Both T1 and T2 have 2 points, T1 has better GD
    expect(standings[0].teamId).toBe('T1')
    expect(standings[1].teamId).toBe('T2')
  })

  it('uses goals scored as final tiebreaker', () => {
    const results: MatchResult[] = [
      { homeTeamId: 'T1', awayTeamId: 'T3', homeScore: 3, awayScore: 1 }, // T1: GD +2, GF 3
      { homeTeamId: 'T2', awayTeamId: 'T4', homeScore: 4, awayScore: 2 }, // T2: GD +2, GF 4
    ]
    const standings = calculateStandings(teams, results)
    // Same points and GD, T2 has more goals scored
    expect(standings[0].teamId).toBe('T2')
    expect(standings[1].teamId).toBe('T1')
  })

  it('handles a complete group stage', () => {
    // Full round-robin: 6 matches for 4 teams
    const results: MatchResult[] = [
      { homeTeamId: 'T1', awayTeamId: 'T2', homeScore: 2, awayScore: 1 },
      { homeTeamId: 'T1', awayTeamId: 'T3', homeScore: 3, awayScore: 0 },
      { homeTeamId: 'T1', awayTeamId: 'T4', homeScore: 1, awayScore: 1 },
      { homeTeamId: 'T2', awayTeamId: 'T3', homeScore: 2, awayScore: 2 },
      { homeTeamId: 'T2', awayTeamId: 'T4', homeScore: 0, awayScore: 3 },
      { homeTeamId: 'T3', awayTeamId: 'T4', homeScore: 1, awayScore: 2 },
    ]
    const standings = calculateStandings(teams, results)

    // T1: 2W 1D 0L = 5pts, GF 6 GA 2 GD +4
    const t1 = standings.find((r) => r.teamId === 'T1')!
    expect(t1.played).toBe(3)
    expect(t1.won).toBe(2)
    expect(t1.drawn).toBe(1)
    expect(t1.lost).toBe(0)
    expect(t1.points).toBe(5)

    // T4: 2W 1D 0L = 5pts (beat T2 3-0, drew T1 1-1, beat T3 2-1)
    // Wait — let me recalculate:
    // T4 vs T1: away in T1vsT4 1-1 → draw
    // T4 vs T2: away in T2vsT4 0-3 → T4 wins
    // T4 vs T3: away in T3vsT4 1-2 → T4 wins
    // T4: 2W 1D 0L = 5pts, GF 6 GA 2
    const t4 = standings.find((r) => r.teamId === 'T4')!
    expect(t4.won).toBe(2)
    expect(t4.drawn).toBe(1)
    expect(t4.lost).toBe(0)
    expect(t4.points).toBe(5)

    // T1 should be 1st
    expect(standings[0].teamId).toBe('T1')
  })

  it('ignores results for teams not in the group', () => {
    const results: MatchResult[] = [
      { homeTeamId: 'T1', awayTeamId: 'X', homeScore: 10, awayScore: 0 },
    ]
    const standings = calculateStandings(['T1', 'T2'], results)
    // T1 vs X: X is not in group, so home/away lookup returns undefined → skipped
    const t1 = standings.find((r) => r.teamId === 'T1')!
    expect(t1.played).toBe(0)
  })
})

describe('generateKnockoutPairings', () => {
  const makeStandings = (ids: string[]): StandingsRow[] =>
    ids.map((id) => ({
      teamId: id,
      played: 3,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }))

  it('returns null when group has fewer than 2 teams', () => {
    expect(generateKnockoutPairings(makeStandings(['A']), makeStandings(['C', 'D']))).toBeNull()
    expect(generateKnockoutPairings(makeStandings(['A', 'B']), makeStandings(['C']))).toBeNull()
  })

  it('pairs 1st A vs 2nd B and 1st B vs 2nd A', () => {
    const groupA = makeStandings(['A1', 'A2', 'A3', 'A4'])
    const groupB = makeStandings(['B1', 'B2', 'B3', 'B4'])
    const pairings = generateKnockoutPairings(groupA, groupB)!

    expect(pairings.semi1).toEqual({ homeTeamId: 'A1', awayTeamId: 'B2' })
    expect(pairings.semi2).toEqual({ homeTeamId: 'B1', awayTeamId: 'A2' })
  })
})

describe('getKnockoutWinner', () => {
  const baseMatch = {
    home_team_id: 'H',
    away_team_id: 'A',
    home_score: 0,
    away_score: 0,
    penalty_home_score: null as number | null,
    penalty_away_score: null as number | null,
    status: 'finished',
  }

  it('returns null for non-finished match', () => {
    expect(getKnockoutWinner({ ...baseMatch, status: 'running' })).toBeNull()
  })

  it('returns home team when home wins in regulation', () => {
    expect(getKnockoutWinner({ ...baseMatch, home_score: 3, away_score: 1 })).toBe('H')
  })

  it('returns away team when away wins in regulation', () => {
    expect(getKnockoutWinner({ ...baseMatch, home_score: 1, away_score: 4 })).toBe('A')
  })

  it('returns null when tied with no penalties', () => {
    expect(getKnockoutWinner({ ...baseMatch, home_score: 2, away_score: 2 })).toBeNull()
  })

  it('returns home team when home wins on penalties', () => {
    expect(
      getKnockoutWinner({
        ...baseMatch,
        home_score: 2,
        away_score: 2,
        penalty_home_score: 4,
        penalty_away_score: 3,
      }),
    ).toBe('H')
  })

  it('returns away team when away wins on penalties', () => {
    expect(
      getKnockoutWinner({
        ...baseMatch,
        home_score: 2,
        away_score: 2,
        penalty_home_score: 2,
        penalty_away_score: 3,
      }),
    ).toBe('A')
  })

  it('returns null when penalties are also tied', () => {
    expect(
      getKnockoutWinner({
        ...baseMatch,
        home_score: 2,
        away_score: 2,
        penalty_home_score: 3,
        penalty_away_score: 3,
      }),
    ).toBeNull()
  })
})

describe('getKnockoutLoser', () => {
  const baseMatch = {
    home_team_id: 'H',
    away_team_id: 'A',
    home_score: 0,
    away_score: 0,
    penalty_home_score: null as number | null,
    penalty_away_score: null as number | null,
    status: 'finished',
  }

  it('returns null when no winner', () => {
    expect(getKnockoutLoser({ ...baseMatch, status: 'running' })).toBeNull()
  })

  it('returns away team when home wins', () => {
    expect(getKnockoutLoser({ ...baseMatch, home_score: 3, away_score: 1 })).toBe('A')
  })

  it('returns home team when away wins', () => {
    expect(getKnockoutLoser({ ...baseMatch, home_score: 1, away_score: 4 })).toBe('H')
  })

  it('returns loser via penalties', () => {
    expect(
      getKnockoutLoser({
        ...baseMatch,
        home_score: 2,
        away_score: 2,
        penalty_home_score: 4,
        penalty_away_score: 3,
      }),
    ).toBe('A')
  })
})

describe('generateNGroupKnockoutPairings', () => {
  const makeStandings = (ids: string[], points?: number[]): StandingsRow[] =>
    ids.map((id, i) => ({
      teamId: id,
      played: 3,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 10 - i,
      goalsAgainst: i,
      goalDifference: 10 - 2 * i,
      points: points ? points[i] : 6 - i * 2,
    }))

  it('returns null for fewer than 2 groups', () => {
    expect(generateNGroupKnockoutPairings([])).toBeNull()
    expect(generateNGroupKnockoutPairings([makeStandings(['A1', 'A2'])])).toBeNull()
  })

  it('returns null when any group is empty', () => {
    expect(generateNGroupKnockoutPairings([makeStandings(['A1', 'A2']), []])).toBeNull()
  })

  it('generates semis for 2 groups (backwards compatible)', () => {
    const groupA = makeStandings(['A1', 'A2', 'A3', 'A4'])
    const groupB = makeStandings(['B1', 'B2', 'B3', 'B4'])
    const result = generateNGroupKnockoutPairings([groupA, groupB])!

    expect(result.phase).toBe('semi')
    expect(result.pairings).toHaveLength(2)
    // 1st A vs 2nd B, 1st B vs 2nd A
    expect(result.pairings[0]).toEqual({ homeTeamId: 'A1', awayTeamId: 'B2' })
    expect(result.pairings[1]).toEqual({ homeTeamId: 'B1', awayTeamId: 'A2' })
  })

  it('generates semis for 3 groups (3 winners + best runner-up)', () => {
    const groupA = makeStandings(['A1', 'A2', 'A3'], [6, 4, 0])
    const groupB = makeStandings(['B1', 'B2', 'B3'], [6, 2, 0])
    const groupC = makeStandings(['C1', 'C2', 'C3'], [6, 3, 0])
    const result = generateNGroupKnockoutPairings([groupA, groupB, groupC])!

    expect(result.phase).toBe('semi')
    expect(result.pairings).toHaveLength(2)
    // 4 qualifiers: A1, B1, C1 (winners) + A2 (best runner-up with 4 pts)
    // Seeded by points/GD: A1, B1, C1, A2 or similar
    // Semi 1: best vs worst, Semi 2: 2nd vs 3rd
    expect(result.pairings[0].homeTeamId).toBeDefined()
    expect(result.pairings[0].awayTeamId).toBeDefined()
    expect(result.pairings[1].homeTeamId).toBeDefined()
    expect(result.pairings[1].awayTeamId).toBeDefined()
    // All 4 qualifiers should be different teams
    const allTeams = result.pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId])
    expect(new Set(allTeams).size).toBe(4)
  })

  it('generates semis for 4 groups (1 winner per group)', () => {
    const groupA = makeStandings(['A1', 'A2', 'A3', 'A4'])
    const groupB = makeStandings(['B1', 'B2', 'B3', 'B4'])
    const groupC = makeStandings(['C1', 'C2', 'C3', 'C4'])
    const groupD = makeStandings(['D1', 'D2', 'D3', 'D4'])
    const result = generateNGroupKnockoutPairings([groupA, groupB, groupC, groupD])!

    expect(result.phase).toBe('semi')
    expect(result.pairings).toHaveLength(2)
    // Cross-pairing: 1A vs 1D, 1B vs 1C
    expect(result.pairings[0]).toEqual({ homeTeamId: 'A1', awayTeamId: 'D1' })
    expect(result.pairings[1]).toEqual({ homeTeamId: 'B1', awayTeamId: 'C1' })
  })

  it('generates quarters for 8 groups', () => {
    const groups = Array.from({ length: 8 }, (_, i) => {
      const letter = String.fromCharCode(65 + i)
      return makeStandings([`${letter}1`, `${letter}2`, `${letter}3`])
    })
    const result = generateNGroupKnockoutPairings(groups)!

    expect(result.phase).toBe('quarter')
    expect(result.pairings).toHaveLength(4)
    // All 8 team IDs should be unique
    const allTeams = result.pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId])
    expect(new Set(allTeams).size).toBe(8)
  })

  it('returns null for 2 groups when either has fewer than 2 teams', () => {
    const groupA = makeStandings(['A1'])
    const groupB = makeStandings(['B1', 'B2'])
    expect(generateNGroupKnockoutPairings([groupA, groupB])).toBeNull()
  })

  it('returns null for 3 groups when no runners-up available', () => {
    // Each group has only 1 team — no runner-up
    const groupA = makeStandings(['A1'])
    const groupB = makeStandings(['B1'])
    const groupC = makeStandings(['C1'])
    expect(generateNGroupKnockoutPairings([groupA, groupB, groupC])).toBeNull()
  })

  it('seeds 3-group qualifiers by standings quality', () => {
    // A2 has best runner-up stats (4pts), so A1+B1+C1+A2 qualify
    const groupA = makeStandings(['A1', 'A2', 'A3'], [6, 4, 0])
    const groupB = makeStandings(['B1', 'B2', 'B3'], [6, 1, 0])
    const groupC = makeStandings(['C1', 'C2', 'C3'], [6, 2, 0])
    const result = generateNGroupKnockoutPairings([groupA, groupB, groupC])!

    expect(result.phase).toBe('semi')
    // Best runner-up should be A2 (4 pts vs C2=2 vs B2=1)
    const allTeams = result.pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId])
    expect(allTeams).toContain('A2')
    expect(allTeams).not.toContain('B2')
    expect(allTeams).not.toContain('C2')
  })

  it('generates semis for 6 groups (top 4 winners by standings)', () => {
    const groups = Array.from({ length: 6 }, (_, i) => {
      const letter = String.fromCharCode(65 + i)
      return makeStandings([`${letter}1`, `${letter}2`], [6 - i, 0])
    })
    const result = generateNGroupKnockoutPairings(groups)!

    expect(result.phase).toBe('semi')
    expect(result.pairings).toHaveLength(2)
    // Top 4 winners should be A1(6pts), B1(5pts), C1(4pts), D1(3pts)
    const allTeams = result.pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId])
    expect(allTeams).toContain('A1')
    expect(allTeams).toContain('B1')
    expect(allTeams).toContain('C1')
    expect(allTeams).toContain('D1')
    expect(allTeams).not.toContain('E1')
    expect(allTeams).not.toContain('F1')
  })

  it('generates semis for 5-7 groups (top 4 winners)', () => {
    const groups = Array.from({ length: 5 }, (_, i) => {
      const letter = String.fromCharCode(65 + i)
      return makeStandings([`${letter}1`, `${letter}2`])
    })
    const result = generateNGroupKnockoutPairings(groups)!

    expect(result.phase).toBe('semi')
    expect(result.pairings).toHaveLength(2)
    const allTeams = result.pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId])
    expect(new Set(allTeams).size).toBe(4)
  })
})
