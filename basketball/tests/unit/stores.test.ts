import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Supabase ────────────────────────────────────────────────────────────
// We mock the entire module before importing the stores.

const mockInsertTeam = vi.fn()
const mockInsertMatch = vi.fn()
const mockSelectTeams = vi.fn()
const mockSelectMatches = vi.fn()

vi.mock('../../src/lib/supabase', () => {
  const makeChain = (mockFn: ReturnType<typeof vi.fn>) => ({
    from: (table: string) => ({
      select: () => ({
        order: () => mockFn(table),
      }),
      insert: (payload: unknown) => ({
        select: () => ({
          single: () => mockFn(table, payload),
        }),
      }),
    }),
  })

  return {
    isSupabaseConfigured: true,
    supabase: {
      from: (table: string) => {
        if (table === 'teams') {
          return {
            select: () => ({
              order: () => mockSelectTeams(table),
            }),
            insert: (payload: unknown) => ({
              select: () => ({
                single: () => mockInsertTeam(table, payload),
              }),
            }),
          }
        }
        // matches
        return {
          select: () => ({
            order: () => mockSelectMatches(table),
          }),
          insert: (payload: unknown) => ({
            select: () => ({
              single: () => mockInsertMatch(table, payload),
            }),
          }),
        }
      },
    },
  }
})

// Import stores AFTER mocks are set up
import { useTeamsStore } from '../../src/stores/useTeamsStore'
import { useMatchesStore } from '../../src/stores/useMatchesStore'
import type { Team, Match } from '../../src/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Bulls',
    nickname: 'B',
    badge_url: null,
    city_district: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tournament_id: null,
    phase: null,
    home_team_id: 'team-1',
    away_team_id: 'team-2',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    quarter: 1,
    scorekeeper_claimed_by: null,
    started_at: null,
    finished_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ─── Reset store state between tests ─────────────────────────────────────────

beforeEach(() => {
  useTeamsStore.setState({ teams: [], loading: false, error: null })
  useMatchesStore.setState({ matches: [], loading: false, error: null })
  vi.clearAllMocks()
})

// ─── Teams store ──────────────────────────────────────────────────────────────

describe('useTeamsStore', () => {
  it('createTeam adds a new team to the store', async () => {
    const newTeam = makeTeam({ id: 'team-abc', name: 'Lakers' })
    mockInsertTeam.mockResolvedValue({ data: newTeam, error: null })

    const result = await useTeamsStore.getState().createTeam('Lakers', 'LAL', undefined)

    expect(result).not.toBeNull()
    expect(result?.name).toBe('Lakers')
    expect(useTeamsStore.getState().teams).toHaveLength(1)
    expect(useTeamsStore.getState().teams[0].id).toBe('team-abc')
  })

  it('createTeam with nickname and badge_url passes them to Supabase', async () => {
    const newTeam = makeTeam({ name: 'Heat', nickname: 'MIA', badge_url: 'https://example.com/heat.png' })
    mockInsertTeam.mockResolvedValue({ data: newTeam, error: null })

    await useTeamsStore.getState().createTeam('Heat', 'MIA', 'https://example.com/heat.png')

    const insertedPayload = mockInsertTeam.mock.calls[0][1] as { name: string; nickname: string | null; badge_url: string | null }
    expect(insertedPayload.name).toBe('Heat')
    expect(insertedPayload.nickname).toBe('MIA')
    expect(insertedPayload.badge_url).toBe('https://example.com/heat.png')
  })

  it('createTeam sets error and returns null on Supabase error', async () => {
    mockInsertTeam.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const result = await useTeamsStore.getState().createTeam('Broken')

    expect(result).toBeNull()
    expect(useTeamsStore.getState().error).toBe('DB error')
    expect(useTeamsStore.getState().teams).toHaveLength(0)
  })

  it('fetchTeams populates teams array', async () => {
    const teamsFromDb = [makeTeam({ id: 'a', name: 'Bulls' }), makeTeam({ id: 'b', name: 'Celtics' })]
    mockSelectTeams.mockResolvedValue({ data: teamsFromDb, error: null })

    await useTeamsStore.getState().fetchTeams()

    expect(useTeamsStore.getState().teams).toHaveLength(2)
    expect(useTeamsStore.getState().teams[0].name).toBe('Bulls')
  })

  it('fetchTeams handles empty results', async () => {
    mockSelectTeams.mockResolvedValue({ data: [], error: null })

    await useTeamsStore.getState().fetchTeams()

    expect(useTeamsStore.getState().teams).toHaveLength(0)
    expect(useTeamsStore.getState().error).toBeNull()
  })

  it('fetchTeams handles null data gracefully', async () => {
    mockSelectTeams.mockResolvedValue({ data: null, error: null })

    await useTeamsStore.getState().fetchTeams()

    expect(useTeamsStore.getState().teams).toHaveLength(0)
  })
})

// ─── Matches store ────────────────────────────────────────────────────────────

describe('useMatchesStore', () => {
  it('createMatch adds a match with status scheduled', async () => {
    const newMatch = makeMatch({ id: 'match-abc' })
    mockInsertMatch.mockResolvedValue({ data: newMatch, error: null })

    const result = await useMatchesStore.getState().createMatch('team-1', 'team-2', 8)

    expect(result).not.toBeNull()
    expect(result?.status).toBe('scheduled')
    expect(useMatchesStore.getState().matches).toHaveLength(1)
  })

  it('createMatch sets quarter to 1 and scores to 0', async () => {
    const newMatch = makeMatch({ id: 'match-def', quarter: 1, home_score: 0, away_score: 0 })
    mockInsertMatch.mockResolvedValue({ data: newMatch, error: null })

    const result = await useMatchesStore.getState().createMatch('team-1', 'team-2', 10)

    expect(result?.quarter).toBe(1)
    expect(result?.home_score).toBe(0)
    expect(result?.away_score).toBe(0)
  })

  it('createMatch carries quarter_duration in local state', async () => {
    const newMatch = makeMatch({ id: 'match-qdur' })
    mockInsertMatch.mockResolvedValue({ data: newMatch, error: null })

    const result = await useMatchesStore.getState().createMatch('team-1', 'team-2', 10)

    expect((result as Match & { quarter_duration?: number })?.quarter_duration).toBe(10)
  })

  it('createMatch inserts with correct team IDs', async () => {
    const newMatch = makeMatch({ home_team_id: 'home-id', away_team_id: 'away-id' })
    mockInsertMatch.mockResolvedValue({ data: newMatch, error: null })

    await useMatchesStore.getState().createMatch('home-id', 'away-id', 8)

    const insertedPayload = mockInsertMatch.mock.calls[0][1] as { home_team_id: string; away_team_id: string }
    expect(insertedPayload.home_team_id).toBe('home-id')
    expect(insertedPayload.away_team_id).toBe('away-id')
  })

  it('createMatch sets error and returns null on Supabase error', async () => {
    mockInsertMatch.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const result = await useMatchesStore.getState().createMatch('a', 'b', 8)

    expect(result).toBeNull()
    expect(useMatchesStore.getState().error).toBe('insert failed')
  })

  it('fetchMatches populates matches array', async () => {
    const matchesFromDb = [makeMatch({ id: 'x' }), makeMatch({ id: 'y' })]
    mockSelectMatches.mockResolvedValue({ data: matchesFromDb, error: null })

    await useMatchesStore.getState().fetchMatches()

    expect(useMatchesStore.getState().matches).toHaveLength(2)
  })

  it('fetchMatches handles empty results', async () => {
    mockSelectMatches.mockResolvedValue({ data: [], error: null })

    await useMatchesStore.getState().fetchMatches()

    expect(useMatchesStore.getState().matches).toHaveLength(0)
    expect(useMatchesStore.getState().error).toBeNull()
  })

  it('fetchMatches handles null data gracefully', async () => {
    mockSelectMatches.mockResolvedValue({ data: null, error: null })

    await useMatchesStore.getState().fetchMatches()

    expect(useMatchesStore.getState().matches).toHaveLength(0)
  })
})
