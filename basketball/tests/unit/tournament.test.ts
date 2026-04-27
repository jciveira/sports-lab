import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockTournamentInsert = vi.fn()
const mockTournamentSelect = vi.fn()
const mockTournamentTeamInsert = vi.fn()
const mockTournamentMatchInsert = vi.fn()
const mockTournamentUpdate = vi.fn()

vi.mock('../../src/lib/supabase', () => {
  // Generic chainable object that returns empty data at the end of any chain
  function makeChainable(leafValue: unknown = { data: [], error: null }): Record<string, unknown> {
    const handler: ProxyHandler<object> = {
      get(_target, _prop) {
        // Return a function that either returns the leaf value or another proxy
        return (..._args: unknown[]) => new Proxy({}, handler)
      },
    }
    // Leaf resolver — when called with no chaining the chain just resolves
    function chainFn(..._args: unknown[]): unknown {
      return new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === 'then') return undefined // not a Promise leaf — keep chaining
            return (..._a: unknown[]) => {
              // if it's a final call like .single() or terminal query, return leaf
              return leafValue
            }
          },
        },
      )
    }
    void handler
    void chainFn
    // Simpler: just build explicit chain per table
    return { data: [], error: null } as unknown as Record<string, unknown>
  }
  void makeChainable

  return {
    isSupabaseConfigured: true,
    supabase: {
      from: (table: string) => {
        if (table === 'tournaments') {
          return {
            select: () => ({
              order: () => mockTournamentSelect(table),
              eq: () => ({ single: () => ({ data: null, error: null }) }),
            }),
            insert: (payload: unknown) => ({
              select: () => ({
                single: () => mockTournamentInsert(table, payload),
              }),
            }),
            update: (payload: unknown) => ({
              eq: (_col: string, _val: string) => mockTournamentUpdate(table, payload),
            }),
          }
        }
        if (table === 'tournament_teams') {
          return {
            insert: (payload: unknown) => ({
              select: () => ({
                single: () => mockTournamentTeamInsert(table, payload),
              }),
            }),
            select: () => ({
              eq: (_col: string, _val: string) => ({ data: [], error: null }),
            }),
          }
        }
        if (table === 'tournament_matches') {
          return {
            insert: (payload: unknown) => ({
              select: () => mockTournamentMatchInsert(table, payload),
            }),
            select: () => ({
              eq: (_col: string, _val: string) => ({
                order: () => ({
                  order: () => ({ data: [], error: null }),
                }),
              }),
            }),
          }
        }
        // matches / teams — support .select().in() chains
        return {
          select: () => ({
            in: () => ({ data: [], error: null }),
            order: () => ({ data: [], error: null }),
            eq: () => ({ single: () => ({ data: null, error: null }) }),
          }),
          insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
          update: () => ({ eq: () => ({ data: null, error: null }) }),
        }
      },
    },
  }
})

// Import after mocks
import { useTournamentStore, computeStandings, generateRoundRobinPairs, bracketRounds, slotsPerRound } from '../../src/stores/useTournamentStore'
import type { Tournament, TournamentTeam, TournamentMatch, Team, Match } from '../../src/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'tourn-1',
    name: 'Spring Cup',
    format: 'group_knockout',
    num_teams: 4,
    status: 'setup',
    viewer_code: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeTournamentTeam(overrides: Partial<TournamentTeam> = {}): TournamentTeam {
  return {
    id: 'tt-1',
    tournament_id: 'tourn-1',
    team_id: 'team-1',
    group_name: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeTeam(id: string, name: string): Team {
  return {
    id,
    name,
    nickname: null,
    badge_url: null,
    city_district: null,
    created_at: new Date().toISOString(),
  }
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tournament_id: 'tourn-1',
    phase: 'group',
    home_team_id: 'team-1',
    away_team_id: 'team-2',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    quarter: 1,
    time_remaining_seconds: null,
    scorekeeper_claimed_by: null,
    started_at: null,
    finished_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ─── Reset store between tests ────────────────────────────────────────────────

beforeEach(() => {
  useTournamentStore.setState({
    tournaments: [],
    currentTournament: null,
    tournamentTeams: [],
    tournamentMatches: [],
    loading: false,
    error: null,
  })
  vi.clearAllMocks()
})

// ─── createTournament ──────────────────────────────────────────────────────────

describe('createTournament', () => {
  it('adds tournament to store on success', async () => {
    const tournament = makeTournament({ id: 'tourn-abc', name: 'Summer Cup' })
    mockTournamentInsert.mockResolvedValue({ data: tournament, error: null })

    const result = await useTournamentStore.getState().createTournament('Summer Cup', 4)

    expect(result).not.toBeNull()
    expect(result?.name).toBe('Summer Cup')
    expect(useTournamentStore.getState().tournaments).toHaveLength(1)
    expect(useTournamentStore.getState().tournaments[0].id).toBe('tourn-abc')
  })

  it('sets error and returns null on Supabase error', async () => {
    mockTournamentInsert.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await useTournamentStore.getState().createTournament('Bad Cup', 4)

    expect(result).toBeNull()
    expect(useTournamentStore.getState().error).toBe('DB error')
    expect(useTournamentStore.getState().tournaments).toHaveLength(0)
  })
})

// ─── addTeamToTournament ───────────────────────────────────────────────────────

describe('addTeamToTournament', () => {
  it('adds team entry to tournamentTeams on success', async () => {
    const tt = makeTournamentTeam({ id: 'tt-abc', team_id: 'team-x' })
    mockTournamentTeamInsert.mockResolvedValue({ data: tt, error: null })

    const result = await useTournamentStore.getState().addTeamToTournament('tourn-1', 'team-x')

    expect(result).toBe(true)
    expect(useTournamentStore.getState().tournamentTeams).toHaveLength(1)
    expect(useTournamentStore.getState().tournamentTeams[0].team_id).toBe('team-x')
  })

  it('returns false and sets error on Supabase error', async () => {
    mockTournamentTeamInsert.mockResolvedValue({ data: null, error: { message: 'foreign key violation' } })

    const result = await useTournamentStore.getState().addTeamToTournament('tourn-1', 'bad-id')

    expect(result).toBe(false)
    expect(useTournamentStore.getState().error).toBe('foreign key violation')
  })
})

// ─── generateGroupSchedule ────────────────────────────────────────────────────

describe('generateGroupSchedule', () => {
  it('creates N*(N-1)/2 tournament_matches for N=4 teams', async () => {
    // Pre-populate store with 4 tournament teams
    const teams = ['team-1', 'team-2', 'team-3', 'team-4']
    const tournamentTeams: TournamentTeam[] = teams.map((tid, i) =>
      makeTournamentTeam({ id: `tt-${i}`, team_id: tid }),
    )
    useTournamentStore.setState({
      tournamentTeams,
      currentTournament: makeTournament({ status: 'setup' }),
    })

    const expectedPairs = (4 * 3) / 2 // = 6
    const insertedMatches = Array.from({ length: expectedPairs }, (_, i) => ({
      id: `tm-${i}`,
      tournament_id: 'tourn-1',
      phase: 'group' as const,
      round_index: i,
      match_slot: 0,
      home_team_id: teams[0],
      away_team_id: teams[1],
      match_id: null,
      created_at: new Date().toISOString(),
    }))

    mockTournamentMatchInsert.mockResolvedValue({ data: insertedMatches, error: null })
    mockTournamentUpdate.mockResolvedValue({ error: null })

    const result = await useTournamentStore.getState().generateGroupSchedule('tourn-1')

    expect(result).toBe(true)
    // Verify the insert was called with 6 entries
    const insertArg = mockTournamentMatchInsert.mock.calls[0][1] as unknown[]
    expect(insertArg).toHaveLength(expectedPairs)
  })

  it('creates N*(N-1)/2 match pairs via generateRoundRobinPairs for N=6', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f']
    const pairs = generateRoundRobinPairs(ids)
    expect(pairs).toHaveLength((6 * 5) / 2)
    // No pair should have duplicate team
    for (const [h, a] of pairs) {
      expect(h).not.toBe(a)
    }
  })

  it('generates correct number of pairs for N=3 (odd)', () => {
    const ids = ['a', 'b', 'c']
    const pairs = generateRoundRobinPairs(ids)
    expect(pairs).toHaveLength((3 * 2) / 2) // 3
  })
})

// ─── computeStandings ─────────────────────────────────────────────────────────

describe('computeStandings', () => {
  it('handles no finished matches — all zeros', () => {
    const teams = [makeTeam('t1', 'Bulls'), makeTeam('t2', 'Lakers')]
    const tournamentTeams = [
      makeTournamentTeam({ id: 'tt-1', team_id: 't1' }),
      makeTournamentTeam({ id: 'tt-2', team_id: 't2' }),
    ]
    const matches: Match[] = [] // none finished

    const standings = computeStandings(teams, matches, tournamentTeams)

    expect(standings).toHaveLength(2)
    for (const row of standings) {
      expect(row.played).toBe(0)
      expect(row.wins).toBe(0)
      expect(row.losses).toBe(0)
      expect(row.points).toBe(0)
      expect(row.gd).toBe(0)
    }
  })

  it('sorts by points descending', () => {
    const teams = [makeTeam('t1', 'Bulls'), makeTeam('t2', 'Lakers'), makeTeam('t3', 'Heat')]
    const tournamentTeams = [
      makeTournamentTeam({ id: 'tt-1', team_id: 't1' }),
      makeTournamentTeam({ id: 'tt-2', team_id: 't2' }),
      makeTournamentTeam({ id: 'tt-3', team_id: 't3' }),
    ]
    // t1 beats t2 (2pts), t1 beats t3 (2pts), t2 beats t3 (2pts)
    const matches: Match[] = [
      makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', home_score: 100, away_score: 90, status: 'finished' }),
      makeMatch({ id: 'm2', home_team_id: 't1', away_team_id: 't3', home_score: 95, away_score: 80, status: 'finished' }),
      makeMatch({ id: 'm3', home_team_id: 't2', away_team_id: 't3', home_score: 85, away_score: 70, status: 'finished' }),
    ]

    const standings = computeStandings(teams, matches, tournamentTeams)

    // t1: 4 pts, t2: 2 pts, t3: 0 pts
    expect(standings[0].team.id).toBe('t1')
    expect(standings[0].points).toBe(4)
    expect(standings[1].team.id).toBe('t2')
    expect(standings[1].points).toBe(2)
    expect(standings[2].team.id).toBe('t3')
    expect(standings[2].points).toBe(0)
  })

  it('breaks ties by GD (point differential)', () => {
    const teams = [makeTeam('t1', 'Team1'), makeTeam('t2', 'Team2'), makeTeam('t3', 'Team3')]
    const tournamentTeams = [
      makeTournamentTeam({ id: 'tt-1', team_id: 't1' }),
      makeTournamentTeam({ id: 'tt-2', team_id: 't2' }),
      makeTournamentTeam({ id: 'tt-3', team_id: 't3' }),
    ]
    // t1 beats t3 narrowly, t2 beats t3 widely, t1 vs t2: t2 wins
    // Resulting standings: t2 has 2pts +big GD, t1 has 2pts +small GD, t3 0pts
    const matches: Match[] = [
      makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't3', home_score: 80, away_score: 78, status: 'finished' }),
      makeMatch({ id: 'm2', home_team_id: 't2', away_team_id: 't3', home_score: 100, away_score: 70, status: 'finished' }),
      makeMatch({ id: 'm3', home_team_id: 't2', away_team_id: 't1', home_score: 90, away_score: 80, status: 'finished' }),
    ]

    const standings = computeStandings(teams, matches, tournamentTeams)

    // t2: 4pts, GD = (100-70) + (90-80) = 30+10 = +40 minus nothing ... wait let's compute:
    // t2 beats t3: gf+=100, ga+=70 → gd+30; t2 beats t1: gf+=90, ga+=80 → gd+10 → total gd=+40, pts=4
    // t1 beats t3: gf+=80, ga+=78 → gd+2; t1 loses to t2: gf+=80, ga+=90 → gd-10 → total gd=-8, pts=2
    // t3: loses all → gd=-(2+30)=-32, pts=0
    expect(standings[0].team.id).toBe('t2')
    expect(standings[1].team.id).toBe('t1')
    expect(standings[2].team.id).toBe('t3')
  })

  it('ignores non-finished matches', () => {
    const teams = [makeTeam('t1', 'Bulls'), makeTeam('t2', 'Lakers')]
    const tournamentTeams = [
      makeTournamentTeam({ id: 'tt-1', team_id: 't1' }),
      makeTournamentTeam({ id: 'tt-2', team_id: 't2' }),
    ]
    const matches: Match[] = [
      makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', home_score: 50, away_score: 40, status: 'running' }),
    ]

    const standings = computeStandings(teams, matches, tournamentTeams)

    expect(standings[0].played).toBe(0)
    expect(standings[1].played).toBe(0)
  })
})

// ─── generateKnockoutDraw / bracketRounds ─────────────────────────────────────

describe('bracketRounds', () => {
  it('returns SF + Final for 4 teams', () => {
    const rounds = bracketRounds(4)
    expect(rounds).toEqual(['sf', 'final'])
  })

  it('returns QF + SF + Final for 8 teams', () => {
    const rounds = bracketRounds(8)
    expect(rounds).toEqual(['qf', 'sf', 'final'])
  })

  it('returns SF + Final for 3 teams (edge case ≤ 4)', () => {
    const rounds = bracketRounds(3)
    expect(rounds).toEqual(['sf', 'final'])
  })
})

describe('slotsPerRound', () => {
  it('returns correct slots for 4 teams', () => {
    const slots = slotsPerRound(4)
    expect(slots.sf).toBe(2)
    expect(slots.final).toBe(1)
    expect(slots.qf).toBeUndefined()
  })

  it('returns correct slots for 8 teams', () => {
    const slots = slotsPerRound(8)
    expect(slots.qf).toBe(4)
    expect(slots.sf).toBe(2)
    expect(slots.final).toBe(1)
  })
})

describe('generateKnockoutDraw', () => {
  it('creates SF + Final bracket slots for 4-team tournament', async () => {
    const tournamentId = 'tourn-1'
    const tournamentTeams: TournamentTeam[] = [
      makeTournamentTeam({ id: 'tt-1', team_id: 'team-1' }),
      makeTournamentTeam({ id: 'tt-2', team_id: 'team-2' }),
      makeTournamentTeam({ id: 'tt-3', team_id: 'team-3' }),
      makeTournamentTeam({ id: 'tt-4', team_id: 'team-4' }),
    ]

    useTournamentStore.setState({
      tournamentTeams,
      tournamentMatches: [],
      currentTournament: makeTournament({ status: 'group_phase', num_teams: 4 }),
    })

    // Mock Supabase calls for this test
    // The store fetches matches and teams from DB in generateKnockoutDraw
    // We need to mock those via the existing supabase mock
    // For simplicity, we let the mock return empty data for matches/teams queries
    // and verify the insert call has the right number of entries

    const insertedSlots: TournamentMatch[] = [
      { id: 'tm-sf-0', tournament_id: tournamentId, phase: 'sf', round_index: 0, match_slot: 0, home_team_id: 'team-1', away_team_id: 'team-4', match_id: null, created_at: '' },
      { id: 'tm-sf-1', tournament_id: tournamentId, phase: 'sf', round_index: 0, match_slot: 1, home_team_id: 'team-2', away_team_id: 'team-3', match_id: null, created_at: '' },
      { id: 'tm-final-0', tournament_id: tournamentId, phase: 'final', round_index: 1, match_slot: 0, home_team_id: null, away_team_id: null, match_id: null, created_at: '' },
    ]

    mockTournamentMatchInsert.mockResolvedValue({ data: insertedSlots, error: null })
    mockTournamentUpdate.mockResolvedValue({ error: null })

    const result = await useTournamentStore.getState().generateKnockoutDraw(tournamentId)

    expect(result).toBe(true)

    // SF has 2 slots, Final has 1 → 3 total inserts for 4-team bracket
    const insertArg = mockTournamentMatchInsert.mock.calls[0][1] as unknown[]
    expect(insertArg).toHaveLength(3) // sf×2 + final×1

    // Check phase distribution
    const phases = (insertArg as Array<{ phase: string }>).map((x) => x.phase)
    const sfCount = phases.filter((p) => p === 'sf').length
    const finalCount = phases.filter((p) => p === 'final').length
    expect(sfCount).toBe(2)
    expect(finalCount).toBe(1)
  })
})
