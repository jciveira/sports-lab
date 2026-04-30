import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Supabase ────────────────────────────────────────────────────────────
// We mock the entire module before importing the stores.

const mockInsertTeam = vi.fn()
const mockInsertMatch = vi.fn()
const mockSelectTeams = vi.fn()
const mockSelectMatches = vi.fn()
const mockUpdateMatch = vi.fn()
const mockInsertVenue = vi.fn()
const mockSelectVenues = vi.fn()
const mockDeleteVenue = vi.fn()
const mockDeleteTournament = vi.fn()
const mockUpdateTournament = vi.fn()

vi.mock('../../src/lib/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: (table: string) => {
        if (table === 'teams') {
          return {
            select: () => ({ order: () => mockSelectTeams(table) }),
            insert: (payload: unknown) => ({ select: () => ({ single: () => mockInsertTeam(table, payload) }) }),
          }
        }
        if (table === 'venues') {
          return {
            select: () => ({ order: () => mockSelectVenues(table) }),
            insert: (payload: unknown) => ({ select: () => ({ single: () => mockInsertVenue(table, payload) }) }),
            delete: () => ({ eq: () => mockDeleteVenue(table) }),
          }
        }
        if (table === 'tournaments') {
          return {
            delete: () => ({ eq: () => mockDeleteTournament(table) }),
            update: (patch: unknown) => ({ eq: () => mockUpdateTournament(table, patch) }),
          }
        }
        // matches
        return {
          select: () => ({ order: () => mockSelectMatches(table) }),
          insert: (payload: unknown) => ({ select: () => ({ single: () => mockInsertMatch(table, payload) }) }),
          update: (patch: unknown) => ({ eq: () => mockUpdateMatch(table, patch) }),
        }
      },
    },
  }
})

// Import stores AFTER mocks are set up
import { useTeamsStore } from '../../src/stores/useTeamsStore'
import { useMatchesStore } from '../../src/stores/useMatchesStore'
import { useTournamentStore } from '../../src/stores/useTournamentStore'
import type { Team, Match, Venue } from '../../src/types'

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
    venue_id: null,
    scheduled_at: null,
    not_played: false,
    ...overrides,
  }
}

// ─── Reset store state between tests ─────────────────────────────────────────

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 'venue-1',
    tournament_id: 'tournament-1',
    name: 'Pabellón Central',
    address: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  useTeamsStore.setState({ teams: [], loading: false, error: null })
  useMatchesStore.setState({ matches: [], loading: false, error: null })
  useTournamentStore.setState({ tournaments: [], currentTournament: null, tournamentTeams: [], tournamentMatches: [], venues: [], loading: false, error: null })
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

  it('updateMatch patches the match in local state', async () => {
    const existing = makeMatch({ id: 'match-upd', home_score: 0, away_score: 0 })
    useMatchesStore.setState({ matches: [{ ...existing, quarter_duration: 8 }] })
    mockUpdateMatch.mockResolvedValue({ error: null })

    const ok = await useMatchesStore.getState().updateMatch('match-upd', { home_score: 5, away_score: 3 })

    expect(ok).toBe(true)
    expect(useMatchesStore.getState().matches[0].home_score).toBe(5)
    expect(useMatchesStore.getState().matches[0].away_score).toBe(3)
  })

  it('updateMatch sets not_played flag', async () => {
    const existing = makeMatch({ id: 'match-np', not_played: false })
    useMatchesStore.setState({ matches: [{ ...existing, quarter_duration: 8 }] })
    mockUpdateMatch.mockResolvedValue({ error: null })

    await useMatchesStore.getState().updateMatch('match-np', { not_played: true })

    expect(useMatchesStore.getState().matches[0].not_played).toBe(true)
  })

  it('updateMatch sets error and returns false on Supabase error', async () => {
    const existing = makeMatch({ id: 'match-err' })
    useMatchesStore.setState({ matches: [{ ...existing, quarter_duration: 8 }] })
    mockUpdateMatch.mockResolvedValue({ error: { message: 'update failed' } })

    const ok = await useMatchesStore.getState().updateMatch('match-err', { home_score: 10 })

    expect(ok).toBe(false)
    expect(useMatchesStore.getState().error).toBe('update failed')
  })
})

// ─── Venue actions ────────────────────────────────────────────────────────────

describe('useTournamentStore — venues', () => {
  it('addVenue inserts and appends to store', async () => {
    const venue = makeVenue({ id: 'v-1', name: 'Pabellón Ponent' })
    mockInsertVenue.mockResolvedValue({ data: venue, error: null })

    const result = await useTournamentStore.getState().addVenue('tournament-1', 'Pabellón Ponent')

    expect(result).not.toBeNull()
    expect(result?.name).toBe('Pabellón Ponent')
    expect(useTournamentStore.getState().venues).toHaveLength(1)
  })

  it('addVenue with address passes it to Supabase', async () => {
    const venue = makeVenue({ address: 'Calle Mayor 1' })
    mockInsertVenue.mockResolvedValue({ data: venue, error: null })

    await useTournamentStore.getState().addVenue('tournament-1', 'Pabellón', 'Calle Mayor 1')

    const payload = mockInsertVenue.mock.calls[0][1] as { address: string }
    expect(payload.address).toBe('Calle Mayor 1')
  })

  it('removeVenue removes from store state', async () => {
    useTournamentStore.setState({ venues: [makeVenue({ id: 'v-del' })] })
    mockDeleteVenue.mockResolvedValue({ error: null })

    await useTournamentStore.getState().removeVenue('v-del')

    expect(useTournamentStore.getState().venues).toHaveLength(0)
  })

  it('addVenue sets error and returns null on Supabase error', async () => {
    mockInsertVenue.mockResolvedValue({ data: null, error: { message: 'venue error' } })

    const result = await useTournamentStore.getState().addVenue('t-1', 'Bad')

    expect(result).toBeNull()
    expect(useTournamentStore.getState().error).toBe('venue error')
  })
})

// ─── Tournament lifecycle actions ─────────────────────────────────────────────

import type { Tournament } from '../../src/types'

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return { id: 'tourn-1', name: 'Spring Cup', format: 'group_knockout', num_teams: 4, status: 'setup', viewer_code: null, created_at: new Date().toISOString(), ...overrides }
}

describe('useTournamentStore — deleteTournament', () => {
  it('removes tournament from store on success', async () => {
    useTournamentStore.setState({ tournaments: [makeTournament({ id: 't-del' })], currentTournament: null })
    mockDeleteTournament.mockResolvedValue({ error: null })

    const ok = await useTournamentStore.getState().deleteTournament('t-del')

    expect(ok).toBe(true)
    expect(useTournamentStore.getState().tournaments).toHaveLength(0)
  })

  it('clears currentTournament if deleted tournament is current', async () => {
    const t = makeTournament({ id: 't-del' })
    useTournamentStore.setState({ tournaments: [t], currentTournament: t })
    mockDeleteTournament.mockResolvedValue({ error: null })

    await useTournamentStore.getState().deleteTournament('t-del')

    expect(useTournamentStore.getState().currentTournament).toBeNull()
  })

  it('returns false and sets error on Supabase error', async () => {
    useTournamentStore.setState({ tournaments: [makeTournament({ id: 't-1' })] })
    mockDeleteTournament.mockResolvedValue({ error: { message: 'delete failed' } })

    const ok = await useTournamentStore.getState().deleteTournament('t-1')

    expect(ok).toBe(false)
    expect(useTournamentStore.getState().error).toBe('delete failed')
  })
})

describe('useTournamentStore — updateTournamentStatus', () => {
  it('updates status in tournaments list and currentTournament', async () => {
    const t = makeTournament({ id: 't-1', status: 'knockout' })
    useTournamentStore.setState({ tournaments: [t], currentTournament: t })
    mockUpdateTournament.mockResolvedValue({ error: null })

    const ok = await useTournamentStore.getState().updateTournamentStatus('t-1', 'finished')

    expect(ok).toBe(true)
    expect(useTournamentStore.getState().tournaments[0].status).toBe('finished')
    expect(useTournamentStore.getState().currentTournament?.status).toBe('finished')
  })

  it('returns false and sets error on Supabase error', async () => {
    useTournamentStore.setState({ tournaments: [makeTournament({ id: 't-1' })] })
    mockUpdateTournament.mockResolvedValue({ error: { message: 'update failed' } })

    const ok = await useTournamentStore.getState().updateTournamentStatus('t-1', 'finished')

    expect(ok).toBe(false)
    expect(useTournamentStore.getState().error).toBe('update failed')
  })
})
