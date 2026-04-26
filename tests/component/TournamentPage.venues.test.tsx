import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TournamentPage } from '../../src/pages/TournamentPage'
import { useTournamentStore } from '../../src/hooks/useTournamentStore'
import type { DbTeam, DbTournament, DbMatch, DbVenue } from '../../src/lib/database.types'

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

function makeMatch(id: string, homeId: string, awayId: string, venueId: string | null = null): DbMatch {
  return {
    id,
    tournament_id: 't1',
    phase: 'group',
    group_label: 'A',
    home_team_id: homeId,
    away_team_id: awayId,
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
    venue_id: venueId,
    penalty_home_score: null,
    penalty_away_score: null,
    starts_at: null,
    started_at: null,
    finished_at: null,
    created_at: '',
  }
}

function makeVenue(id: string, name: string, address?: string): DbVenue {
  return { id, tournament_id: 'tour1', name, address: address ?? null, created_at: '' }
}

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

const teams = [makeTeam('t1', 'Dominicos'), makeTeam('t2', 'Maristas')]
const teamsMap = new Map(teams.map((t) => [t.id, t]))

function renderPage(state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/tournament/tour1', state }]}>
      <Routes>
        <Route path="/tournament/:id" element={<TournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TournamentPage — venue features', () => {
  const noopFn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: baseCategories,
      matches: [makeMatch('m1', 't1', 't2')],
      teamsMap,
      venues: [],
      loading: false,
      error: null,
      fetchTournament: noopFn,
      addVenue: noopFn,
      editVenue: noopFn,
      removeVenue: noopFn,
      assignVenue: noopFn,
    })
  })

  it('venues section is not visible to viewers', () => {
    renderPage()
    // The venues toggle button should not exist for non-admin
    expect(screen.queryByRole('button', { name: /sedes/i })).not.toBeInTheDocument()
  })

  it('venues section is visible to admins', () => {
    renderPage({ isAdmin: true })
    expect(screen.getByRole('button', { name: /sedes/i })).toBeInTheDocument()
  })

  it('venues section expands when toggled', async () => {
    renderPage({ isAdmin: true })
    const toggle = screen.getByRole('button', { name: /sedes/i })
    await userEvent.setup().click(toggle)
    // Add form should appear
    expect(screen.getByPlaceholderText(/nombre de la sede/i)).toBeInTheDocument()
  })

  it('calls addVenue when form is submitted', async () => {
    const mockAdd = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({ addVenue: mockAdd })
    renderPage({ isAdmin: true })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sedes/i }))
    await user.type(screen.getByPlaceholderText(/nombre de la sede/i), 'Pabellón')
    await user.click(screen.getByRole('button', { name: /añadir sede/i }))

    expect(mockAdd).toHaveBeenCalledWith('Pabellón', undefined)
  })

  it('shows venue list and calls removeVenue when delete is clicked on unused venue', async () => {
    const mockRemove = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')],
      matches: [makeMatch('m1', 't1', 't2', null)], // venue_id is null → not in use
      removeVenue: mockRemove,
    })
    renderPage({ isAdmin: true })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sedes/i }))
    await user.click(screen.getByRole('button', { name: 'Eliminar Pabellón' }))

    expect(mockRemove).toHaveBeenCalledWith('v1')
  })

  it('blocks delete when venue is in use and shows error', async () => {
    const mockRemove = vi.fn()
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')],
      matches: [makeMatch('m1', 't1', 't2', 'v1')], // match uses v1
      removeVenue: mockRemove,
    })
    renderPage({ isAdmin: true })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sedes/i }))
    await user.click(screen.getByRole('button', { name: 'Eliminar Pabellón' }))

    expect(mockRemove).not.toHaveBeenCalled()
    expect(screen.getByText(/asignada a 1 partido/i)).toBeInTheDocument()
  })

  it('shows venue dropdown on match row when admin has venues', () => {
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')],
    })
    renderPage({ isAdmin: true })

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /sin sede/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Pabellón' })).toBeInTheDocument()
  })

  it('venue dropdown not shown when no venues exist', () => {
    useTournamentStore.setState({ venues: [] })
    renderPage({ isAdmin: true })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('calls assignVenue when venue dropdown changes', async () => {
    const mockAssign = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')],
      assignVenue: mockAssign,
    })
    renderPage({ isAdmin: true })

    const select = screen.getByRole('combobox')
    await userEvent.setup().selectOptions(select, 'v1')

    expect(mockAssign).toHaveBeenCalledWith('m1', 'v1')
  })

  it('opens inline edit form when edit button is clicked', async () => {
    useTournamentStore.setState({ venues: [makeVenue('v1', 'Pabellón', 'Calle Mayor 1')] })
    renderPage({ isAdmin: true })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sedes/i }))
    await user.click(screen.getByRole('button', { name: 'Editar Pabellón' }))

    expect(screen.getByDisplayValue('Pabellón')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Calle Mayor 1')).toBeInTheDocument()
  })

  it('calls editVenue when inline edit is saved', async () => {
    const mockEdit = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')],
      editVenue: mockEdit,
    })
    renderPage({ isAdmin: true })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sedes/i }))
    await user.click(screen.getByRole('button', { name: 'Editar Pabellón' }))
    await user.clear(screen.getByDisplayValue('Pabellón'))
    await user.type(screen.getByPlaceholderText('Nombre *'), 'Pabellón Norte')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(mockEdit).toHaveBeenCalledWith('v1', 'Pabellón Norte', undefined)
  })

  it('shows venue location link on group match when venue has an address', () => {
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón', 'Calle Mayor 1, Madrid')],
      matches: [makeMatch('m1', 't1', 't2', 'v1')],
    })
    renderPage()

    const link = screen.getByRole('link', { name: /pabellón/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toContain('google.com/maps')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not show venue link on group match when venue has no address', () => {
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')],
      matches: [makeMatch('m1', 't1', 't2', 'v1')],
    })
    renderPage()

    expect(screen.queryByRole('link', { name: /pabellón/i })).not.toBeInTheDocument()
  })

  it('does not show venue link when match has no venue assigned', () => {
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón', 'Calle Mayor 1')],
      matches: [makeMatch('m1', 't1', 't2', null)],
    })
    renderPage()

    expect(screen.queryByRole('link', { name: /pabellón/i })).not.toBeInTheDocument()
  })
})
