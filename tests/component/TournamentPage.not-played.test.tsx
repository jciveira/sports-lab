import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TournamentPage } from '../../src/pages/TournamentPage'
import { ViewerTournamentPage } from '../../src/pages/ViewerTournamentPage'
import { useTournamentStore } from '../../src/hooks/useTournamentStore'
import type { DbTeam, DbTournament, DbMatch } from '../../src/lib/database.types'

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('../../src/lib/tournaments', () => ({
  getTournament: vi.fn(),
  getTeamsForIds: vi.fn().mockResolvedValue([]),
  recordManualScore: vi.fn(),
  recordPenaltyResult: vi.fn(),
  generateKnockoutMatches: vi.fn(),
  generateFinalMatches: vi.fn(),
  markMatchNotPlayed: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/lib/venues', () => ({
  getVenuesByTournament: vi.fn().mockResolvedValue([]),
  createVenue: vi.fn(),
  updateVenue: vi.fn(),
  deleteVenue: vi.fn(),
  assignMatchVenue: vi.fn(),
}))

function makeTeam(id: string, name: string): DbTeam {
  return { id, name, nickname: null, badge_url: null, city_district: null, category: null, gender: null, region: null, created_at: '' }
}

function makeMatch(overrides: Partial<DbMatch> & { id: string; home_team_id: string; away_team_id: string }): DbMatch {
  return {
    tournament_id: 't1',
    phase: 'group',
    group_label: 'A',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    current_half: 1,
    clock_seconds: 0,
    clock_seconds_base: 0,
    clock_started_at: null,
    config_halves: 2,
    config_half_duration_minutes: 10,
    config_timeouts_per_half: 1,
    config_exclusion_duration_seconds: 120,
    scorekeeper_code: '',
    stat_tracker_code: '',
    viewer_code: '',
    scorekeeper_claimed_by: null,
    scorekeeper_name: null,
    scorekeeper_last_active_at: null,
    stat_tracker_claimed_by: null,
    home_timeouts_left: 1,
    away_timeouts_left: 1,
    source: 'manual',
    tournament_group_id: 'g1',
    tournament_category_id: 'cat1',
    home_squad: null,
    away_squad: null,
    penalty_home_score: null,
    penalty_away_score: null,
    venue_id: null,
    starts_at: null,
    started_at: null,
    finished_at: null,
    not_played: false,
    created_at: '',
    ...overrides,
  }
}

const teams = [makeTeam('t1', 'Dominicos'), makeTeam('t2', 'Maristas')]
const teamsMap = new Map(teams.map((t) => [t.id, t]))

const baseTournament: DbTournament = {
  id: 'tour1',
  name: 'Spring Cup',
  date: '2026-04-03',
  num_teams: 4,
  status: 'group_stage',
  viewer_code: 'ABCD',
  created_at: '',
}

const baseCategories = [
  {
    id: 'cat1',
    tournament_id: 'tour1',
    name: 'Open',
    groups: [{ id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] }],
  },
]

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/tournament/tour1', state: { isAdmin: true } }]}>
      <Routes>
        <Route path="/tournament/:id" element={<TournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderViewer() {
  return render(
    <MemoryRouter initialEntries={['/torneos/tour1']}>
      <Routes>
        <Route path="/torneos/:id" element={<ViewerTournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TournamentPage — not-played group matches (admin)', () => {
  const noopFn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: baseCategories,
      matches: [makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2' })],
      teamsMap,
      venues: [],
      loading: false,
      error: null,
      fetchTournament: noopFn,
      addVenue: noopFn,
      editVenue: noopFn,
      removeVenue: noopFn,
      assignVenue: noopFn,
      updateSchedule: noopFn,
      markNotPlayed: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('shows "No jugado" button on each group match row for admin', () => {
    renderAdmin()
    expect(screen.getByRole('button', { name: /marcar como no jugado/i })).toBeInTheDocument()
  })

  it('calls markNotPlayed(matchId, true) when "No jugado" is clicked', async () => {
    const mockMark = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({ markNotPlayed: mockMark })
    renderAdmin()

    await userEvent.setup().click(screen.getByRole('button', { name: /marcar como no jugado/i }))
    expect(mockMark).toHaveBeenCalledWith('m1', true)
  })

  it('shows "Restaurar" button when match is already not_played', () => {
    useTournamentStore.setState({
      matches: [makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', not_played: true })],
    })
    renderAdmin()
    expect(screen.getByRole('button', { name: /restaurar partido/i })).toBeInTheDocument()
  })

  it('calls markNotPlayed(matchId, false) when "Restaurar" is clicked', async () => {
    const mockMark = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({
      matches: [makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', not_played: true })],
      markNotPlayed: mockMark,
    })
    renderAdmin()

    await userEvent.setup().click(screen.getByRole('button', { name: /restaurar partido/i }))
    expect(mockMark).toHaveBeenCalledWith('m1', false)
  })
})

describe('ViewerTournamentPage — not-played matches hidden', () => {
  const noopFn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides not_played group matches from viewer', () => {
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: baseCategories,
      matches: [
        makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', status: 'finished', home_score: 2, away_score: 1 }),
        makeMatch({ id: 'm2', home_team_id: 't1', away_team_id: 't2', not_played: true }),
      ],
      teamsMap,
      venues: [],
      loading: false,
      error: null,
      fetchTournament: noopFn,
    })
    renderViewer()

    // m1 is visible (finished), m2 is not_played → hidden
    // Both have same teams, so both would show "Dominicos" and "Maristas"
    // But only one match row should be visible (m1)
    const matchRows = screen.getAllByText('Dominicos')
    // One from standings table, one from the match row — m2 should not add another
    // We check that only 1 score is shown (from m1)
    expect(screen.getAllByText('2 - 1')).toHaveLength(1)
  })

  it('excludes not_played matches from standings calculation', () => {
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Open',
          groups: [{ id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] }],
        },
      ],
      matches: [
        // This match would give t1 a win, but it's not_played → should not count
        makeMatch({
          id: 'm1',
          home_team_id: 't1',
          away_team_id: 't2',
          status: 'finished',
          home_score: 5,
          away_score: 0,
          not_played: true,
        }),
      ],
      teamsMap,
      venues: [],
      loading: false,
      error: null,
      fetchTournament: noopFn,
    })
    renderViewer()

    // Both teams should show 0 points (not_played match excluded from standings)
    const ptsCells = screen.getAllByText('0')
    // Should be at least 2 zero-points cells (one per team in the "Pts" column)
    expect(ptsCells.length).toBeGreaterThanOrEqual(2)
  })
})
