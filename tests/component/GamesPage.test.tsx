import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GamesPage } from '../../src/pages/GamesPage'
import type { MatchWithTeams } from '../../src/lib/matches'

const mockListMatchesWithTeams = vi.fn<() => Promise<MatchWithTeams[]>>()

vi.mock('../../src/lib/matches', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/matches')>()
  return {
    ...actual,
    listMatchesWithTeams: (...args: unknown[]) => mockListMatchesWithTeams(...args as []),
    autoActivateMatches: () => Promise.resolve(0),
    formatMatchDate: (startsAt: string | null | undefined) => startsAt ? 'mié 01 abr · 10:00' : null,
  }
})

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: vi.fn(),
  },
}))

function makeMatch(overrides: Partial<MatchWithTeams> & { id: string }): MatchWithTeams {
  return {
    tournament_id: null,
    phase: null,
    group_label: null,
    home_team_id: 'h1',
    away_team_id: 'a1',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    current_half: 1,
    clock_seconds: 0,
    config_halves: 2,
    config_half_duration_minutes: 25,
    config_timeouts_per_half: 1,
    config_exclusion_duration_seconds: 120,
    scorekeeper_code: 'SK1',
    stat_tracker_code: 'ST1',
    viewer_code: 'VW1',
    scorekeeper_claimed_by: null,
    stat_tracker_claimed_by: null,
    home_timeouts_left: 1,
    away_timeouts_left: 1,
    source: 'live',
    tournament_group_id: null,
    tournament_category_id: null,
    penalty_home_score: null,
    penalty_away_score: null,
    started_at: null,
    finished_at: null,
    created_at: new Date().toISOString(),
    starts_at: null,
    venue_id: null,
    homeTeamName: 'Dominicos',
    awayTeamName: 'Maristas',
    homeTeamLogo: null,
    awayTeamLogo: null,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/games']}>
      <GamesPage />
    </MemoryRouter>,
  )
}

describe('GamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('match cards link to /match/:id for direct viewer access', async () => {
    mockListMatchesWithTeams.mockResolvedValue([
      makeMatch({ id: 'match-abc', status: 'running', home_score: 1, away_score: 0 }),
    ])
    renderPage()
    await screen.findByText('Dominicos')
    const link = screen.getByText('Dominicos').closest('a')
    expect(link).toHaveAttribute('href', '/match/match-abc')
  })

  it('shows error state on fetch failure', async () => {
    mockListMatchesWithTeams.mockRejectedValue(new Error('Network error'))
    renderPage()
    expect(await screen.findByText('No se pudieron cargar los partidos')).toBeInTheDocument()
  })

  it('shows date chip when starts_at is set', async () => {
    mockListMatchesWithTeams.mockResolvedValue([
      makeMatch({ id: 'match-xyz', status: 'scheduled', starts_at: '2026-04-02T07:30:00Z' }),
    ])
    renderPage()
    await screen.findByText('Dominicos')
    expect(screen.getByText('mié 01 abr · 10:00')).toBeInTheDocument()
  })

  it('does not show date chip when starts_at is null', async () => {
    mockListMatchesWithTeams.mockResolvedValue([
      makeMatch({ id: 'match-xyz', status: 'scheduled', starts_at: null }),
    ])
    renderPage()
    await screen.findByText('Dominicos')
    expect(screen.queryByText('mié 01 abr · 10:00')).not.toBeInTheDocument()
  })

  it('renders scheduled matches in chronological order, nulls last', async () => {
    mockListMatchesWithTeams.mockResolvedValue([
      makeMatch({ id: 'm3', status: 'scheduled', starts_at: null, homeTeamName: 'TeamC', awayTeamName: 'Opp' }),
      makeMatch({ id: 'm1', status: 'scheduled', starts_at: '2026-04-01T08:00:00Z', homeTeamName: 'TeamA', awayTeamName: 'Opp' }),
      makeMatch({ id: 'm2', status: 'scheduled', starts_at: '2026-04-01T10:00:00Z', homeTeamName: 'TeamB', awayTeamName: 'Opp' }),
    ])
    renderPage()
    await screen.findByText('TeamA')
    const cards = screen.getAllByRole('link').map((el) => el.textContent)
    const teamAIdx = cards.findIndex((t) => t?.includes('TeamA'))
    const teamBIdx = cards.findIndex((t) => t?.includes('TeamB'))
    const teamCIdx = cards.findIndex((t) => t?.includes('TeamC'))
    expect(teamAIdx).toBeLessThan(teamBIdx)
    expect(teamBIdx).toBeLessThan(teamCIdx)
  })
})
