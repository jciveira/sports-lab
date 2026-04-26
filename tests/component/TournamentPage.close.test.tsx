import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
  setTournamentStatus: vi.fn().mockResolvedValue(undefined),
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
    tournament_id: 'tour1',
    phase: 'group',
    group_label: 'A',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    current_half: 1,
    clock_seconds: 0,
    config_halves: 2,
    config_half_duration_minutes: 10,
    config_timeouts_per_half: 1,
    config_exclusion_duration_seconds: 120,
    scorekeeper_code: '',
    stat_tracker_code: '',
    viewer_code: '',
    scorekeeper_claimed_by: null,
    stat_tracker_claimed_by: null,
    home_timeouts_left: 1,
    away_timeouts_left: 1,
    source: 'manual',
    tournament_group_id: 'g1',
    tournament_category_id: 'cat1',
    penalty_home_score: null,
    penalty_away_score: null,
    started_at: null,
    finished_at: null,
    created_at: '',
    ...overrides,
  }
}

const teams = [makeTeam('t1', 'Dominicos'), makeTeam('t2', 'Maristas')]
const teamsMap = new Map(teams.map((t) => [t.id, t]))

function makeTournament(status: string): DbTournament {
  return {
    id: 'tour1',
    name: 'Copa Primavera',
    date: '2026-04-07',
    num_teams: 2,
    status,
    viewer_code: 'XYZW',
    created_at: '',
  }
}

const baseCategories = [
  {
    id: 'cat1',
    tournament_id: 'tour1',
    name: 'Open',
    groups: [{ id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] }],
  },
]
const baseMatch = makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2' })

function renderAdmin(status = 'group_stage') {
  useTournamentStore.setState({
    tournament: makeTournament(status),
    categories: baseCategories,
    matches: [baseMatch],
    teamsMap,
    venues: [],
    loading: false,
    error: null,
    fetchTournament: vi.fn(),
    closeTournament: vi.fn().mockResolvedValue(undefined),
    reopenTournament: vi.fn().mockResolvedValue(undefined),
    addVenue: vi.fn(),
    editVenue: vi.fn(),
    removeVenue: vi.fn(),
    assignVenue: vi.fn(),
    updateSchedule: vi.fn(),
  })
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/tournament/tour1', state: { isAdmin: true } }]}>
      <Routes>
        <Route path="/tournament/:id" element={<TournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderViewer(status = 'group_stage') {
  useTournamentStore.setState({
    tournament: makeTournament(status),
    categories: baseCategories,
    matches: [baseMatch],
    teamsMap,
    venues: [],
    loading: false,
    error: null,
    fetchTournament: vi.fn(),
  })
  return render(
    <MemoryRouter initialEntries={['/torneos/tour1']}>
      <Routes>
        <Route path="/torneos/:id" element={<ViewerTournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TournamentPage — close tournament (admin)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "Cerrar torneo" button for active tournament', () => {
    renderAdmin('group_stage')
    expect(screen.getByRole('button', { name: /cerrar torneo/i })).toBeInTheDocument()
  })

  it('calls closeTournament when "Cerrar torneo" is clicked', async () => {
    const mockClose = vi.fn().mockResolvedValue(undefined)
    renderAdmin('group_stage')
    useTournamentStore.setState({ closeTournament: mockClose })
    await userEvent.setup().click(screen.getByRole('button', { name: /cerrar torneo/i }))
    await waitFor(() => expect(mockClose).toHaveBeenCalledWith('tour1'))
  })

  it('shows "Reabrir" button when tournament is finished', () => {
    renderAdmin('finished')
    expect(screen.getByRole('button', { name: /reabrir torneo/i })).toBeInTheDocument()
  })

  it('calls reopenTournament when "Reabrir" is clicked', async () => {
    const mockReopen = vi.fn().mockResolvedValue(undefined)
    renderAdmin('finished')
    useTournamentStore.setState({ reopenTournament: mockReopen })
    await userEvent.setup().click(screen.getByRole('button', { name: /reabrir torneo/i }))
    await waitFor(() => expect(mockReopen).toHaveBeenCalledWith('tour1'))
  })

  it('shows Finalizado badge in admin view when tournament is finished', () => {
    renderAdmin('finished')
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
  })

  it('does not show Finalizado badge when tournament is active', () => {
    renderAdmin('group_stage')
    expect(screen.queryByText('Finalizado')).not.toBeInTheDocument()
  })
})

describe('ViewerTournamentPage — Finalizado badge', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Finalizado badge when tournament is finished', () => {
    renderViewer('finished')
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
  })

  it('does not show Finalizado badge when tournament is active', () => {
    renderViewer('group_stage')
    expect(screen.queryByText('Finalizado')).not.toBeInTheDocument()
  })
})
