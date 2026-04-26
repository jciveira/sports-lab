/**
 * Tournament utility functions — pure, unit-testable logic
 * for round-robin fixtures and standings calculations.
 */

/** A fixture pairing (team IDs) */
export interface Fixture {
  homeTeamId: string
  awayTeamId: string
}

/** A match result for standings calculation */
export interface MatchResult {
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
}

/** A row in the standings table */
export interface StandingsRow {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

/**
 * Generate round-robin fixtures for a group of teams.
 * For 4 teams: 6 matches (each team plays every other team once).
 * Uses the circle method for balanced scheduling.
 */
export function generateRoundRobinFixtures(teamIds: string[]): Fixture[] {
  const n = teamIds.length
  if (n < 2) return []

  const fixtures: Fixture[] = []

  // For odd number of teams, add a bye placeholder
  const teams = [...teamIds]
  if (n % 2 !== 0) teams.push('BYE')

  const half = teams.length / 2
  const rounds = teams.length - 1

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = teams[i]
      const away = teams[teams.length - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        fixtures.push({ homeTeamId: home, awayTeamId: away })
      }
    }
    // Rotate: keep first team fixed, rotate the rest
    const last = teams.pop()!
    teams.splice(1, 0, last)
  }

  return fixtures
}

/**
 * Calculate standings for a group given completed match results.
 * Points: 2 for win, 1 for draw, 0 for loss.
 * Tiebreaker: points → goal difference → goals scored.
 */
export function calculateStandings(teamIds: string[], results: MatchResult[]): StandingsRow[] {
  const map = new Map<string, StandingsRow>()

  for (const id of teamIds) {
    map.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    })
  }

  for (const r of results) {
    const home = map.get(r.homeTeamId)
    const away = map.get(r.awayTeamId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += r.homeScore
    home.goalsAgainst += r.awayScore
    away.goalsFor += r.awayScore
    away.goalsAgainst += r.homeScore

    if (r.homeScore > r.awayScore) {
      home.won++
      home.points += 2
      away.lost++
    } else if (r.homeScore < r.awayScore) {
      away.won++
      away.points += 2
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    }
  }

  // Update goal difference and sort
  const rows = Array.from(map.values())
  for (const row of rows) {
    row.goalDifference = row.goalsFor - row.goalsAgainst
  }

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    return b.goalsFor - a.goalsFor
  })

  return rows
}

/** A single knockout match pairing */
export interface KnockoutPairing {
  homeTeamId: string
  awayTeamId: string
}

/** Knockout bracket pairings from group standings (2 groups — semis) */
export interface KnockoutPairings {
  semi1: KnockoutPairing // 1st A vs 2nd B
  semi2: KnockoutPairing // 1st B vs 2nd A
}

/**
 * Generate knockout pairings from two group standings.
 * Semi 1: 1st Group A vs 2nd Group B
 * Semi 2: 1st Group B vs 2nd Group A
 *
 * @deprecated Use generateNGroupKnockoutPairings for N-group support
 */
export function generateKnockoutPairings(
  standingsA: StandingsRow[],
  standingsB: StandingsRow[],
): KnockoutPairings | null {
  if (standingsA.length < 2 || standingsB.length < 2) return null

  return {
    semi1: { homeTeamId: standingsA[0].teamId, awayTeamId: standingsB[1].teamId },
    semi2: { homeTeamId: standingsB[0].teamId, awayTeamId: standingsA[1].teamId },
  }
}

/**
 * Determine the knockout phase and pairings for N groups.
 *
 * Strategy:
 * - 2 groups: top 2 per group → 4 teams → semis (classic cross: 1A vs 2B, 1B vs 2A)
 * - 3 groups: top 1 per group + best 2nd → 4 teams → semis
 * - 4 groups: top 1 per group → 4 teams → semis (1A vs 1D, 1B vs 1C)
 * - N groups where N > 4: top 1 per group → quarters/semis as needed
 *
 * Returns the phase name ('semi' or 'quarter') and ordered pairings.
 */
export function generateNGroupKnockoutPairings(
  groupStandings: StandingsRow[][],
): { phase: 'semi' | 'quarter'; pairings: KnockoutPairing[] } | null {
  const n = groupStandings.length
  if (n < 2) return null

  // Ensure each group has at least 1 team
  if (groupStandings.some((g) => g.length === 0)) return null

  if (n === 2) {
    // Classic 2-group: top 2 per group → 4 teams → semis
    if (groupStandings[0].length < 2 || groupStandings[1].length < 2) return null
    return {
      phase: 'semi',
      pairings: [
        { homeTeamId: groupStandings[0][0].teamId, awayTeamId: groupStandings[1][1].teamId },
        { homeTeamId: groupStandings[1][0].teamId, awayTeamId: groupStandings[0][1].teamId },
      ],
    }
  }

  if (n === 3) {
    // 3 groups: top 1 per group + best runner-up → 4 teams → semis
    const winners = groupStandings.map((g) => g[0])
    const runnersUp = groupStandings
      .filter((g) => g.length >= 2)
      .map((g) => g[1])
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
        return b.goalsFor - a.goalsFor
      })
    if (runnersUp.length === 0) return null

    const qualifiers = [...winners, runnersUp[0]]
    // Sort qualifiers by standings quality for fair seeding
    qualifiers.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      return b.goalsFor - a.goalsFor
    })

    return {
      phase: 'semi',
      pairings: [
        { homeTeamId: qualifiers[0].teamId, awayTeamId: qualifiers[3].teamId },
        { homeTeamId: qualifiers[1].teamId, awayTeamId: qualifiers[2].teamId },
      ],
    }
  }

  if (n === 4) {
    // 4 groups: top 1 per group → 4 teams → semis
    // Cross-pairing: 1A vs 1D, 1B vs 1C
    const winners = groupStandings.map((g) => g[0])
    return {
      phase: 'semi',
      pairings: [
        { homeTeamId: winners[0].teamId, awayTeamId: winners[3].teamId },
        { homeTeamId: winners[1].teamId, awayTeamId: winners[2].teamId },
      ],
    }
  }

  // N > 4: top 1 per group, then take top 8 for quarters or top 4 for semis
  const winners = groupStandings.map((g) => g[0])
  winners.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    return b.goalsFor - a.goalsFor
  })

  if (winners.length >= 8) {
    // Quarters: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
    return {
      phase: 'quarter',
      pairings: [
        { homeTeamId: winners[0].teamId, awayTeamId: winners[7].teamId },
        { homeTeamId: winners[1].teamId, awayTeamId: winners[6].teamId },
        { homeTeamId: winners[2].teamId, awayTeamId: winners[5].teamId },
        { homeTeamId: winners[3].teamId, awayTeamId: winners[4].teamId },
      ],
    }
  }

  // 5-7 groups: take top 4 for semis
  if (winners.length >= 4) {
    return {
      phase: 'semi',
      pairings: [
        { homeTeamId: winners[0].teamId, awayTeamId: winners[3].teamId },
        { homeTeamId: winners[1].teamId, awayTeamId: winners[2].teamId },
      ],
    }
  }

  return null
}

/**
 * Determine the winner of a knockout match (including penalty shootout).
 * Returns the winning team ID, or null if the match isn't decided yet.
 */
export function getKnockoutWinner(match: {
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  penalty_home_score: number | null
  penalty_away_score: number | null
  status: string
}): string | null {
  if (match.status !== 'finished') return null

  if (match.home_score !== match.away_score) {
    return match.home_score > match.away_score ? match.home_team_id : match.away_team_id
  }

  // Tied in regular time — check penalties
  if (match.penalty_home_score != null && match.penalty_away_score != null) {
    if (match.penalty_home_score !== match.penalty_away_score) {
      return match.penalty_home_score > match.penalty_away_score ? match.home_team_id : match.away_team_id
    }
  }

  return null // tied and no penalty result yet
}

/**
 * Get the loser of a knockout match.
 */
export function getKnockoutLoser(match: {
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  penalty_home_score: number | null
  penalty_away_score: number | null
  status: string
}): string | null {
  const winner = getKnockoutWinner(match)
  if (!winner) return null
  return winner === match.home_team_id ? match.away_team_id : match.home_team_id
}
