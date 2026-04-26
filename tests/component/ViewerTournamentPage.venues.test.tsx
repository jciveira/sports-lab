import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ViewerTournamentPage } from '../../src/pages/ViewerTournamentPage'
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
    tournament_id: 'tour1',
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/torneos/tour1']}>
      <Routes>
        <Route path="/torneos/:id" element={<ViewerTournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ViewerTournamentPage — venue features', () => {
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

  it('venues section is hidden when no venues', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /sedes/i })).not.toBeInTheDocument()
  })

  it('venues section appears when tournament has venues', () => {
    useTournamentStore.setState({ venues: [makeVenue('v1', 'Pabellón')] })
    renderPage()
    expect(screen.getByRole('button', { name: /sedes/i })).toBeInTheDocument()
  })

  it('venues list is shown after clicking toggle', async () => {
    useTournamentStore.setState({ venues: [makeVenue('v1', 'Pabellón', 'Calle Mayor 1')] })
    renderPage()
    await userEvent.setup().click(screen.getByRole('button', { name: /sedes/i }))
    expect(screen.getByText('Pabellón')).toBeInTheDocument()
    expect(screen.getByText('Calle Mayor 1')).toBeInTheDocument()
  })

  it('address in venue list is a maps link', async () => {
    useTournamentStore.setState({ venues: [makeVenue('v1', 'Pabellón', 'Calle Mayor 1')] })
    renderPage()
    await userEvent.setup().click(screen.getByRole('button', { name: /sedes/i }))
    const link = screen.getByRole('link', { name: 'Calle Mayor 1' })
    expect(link).toHaveAttribute('href', expect.stringContaining('google.com/maps'))
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('Calle Mayor 1')))
  })

  it('venue name shown on match card when match has venue_id', () => {
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')],
      matches: [makeMatch('m1', 't1', 't2', 'v1')],
    })
    renderPage()
    // Venue chip should appear below the match row
    expect(screen.getByText('Pabellón')).toBeInTheDocument()
  })

  it('no venue shown on match card when match has no venue_id', () => {
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')],
      matches: [makeMatch('m1', 't1', 't2', null)],
    })
    renderPage()
    // Pabellón should not appear in match cards area
    expect(screen.queryByText('Pabellón')).not.toBeInTheDocument()
  })

  it('venue name with address on match card is a maps link', () => {
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón', 'Calle Mayor 1')],
      matches: [makeMatch('m1', 't1', 't2', 'v1')],
    })
    renderPage()
    const link = screen.getByRole('link', { name: 'Pabellón' })
    expect(link).toHaveAttribute('href', expect.stringContaining('google.com/maps'))
  })

  it('venue name without address on match card is plain text, not a link', () => {
    useTournamentStore.setState({
      venues: [makeVenue('v1', 'Pabellón')], // no address
      matches: [makeMatch('m1', 't1', 't2', 'v1')],
    })
    renderPage()
    expect(screen.getByText('Pabellón')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Pabellón' })).not.toBeInTheDocument()
  })
})
