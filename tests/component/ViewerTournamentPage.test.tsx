import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
}))

function makeTeam(id: string, name: string): DbTeam {
  return { id, name, nickname: null, badge_url: null, city_district: null, category: null, gender: null, created_at: '' }
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

const teams = [
  makeTeam('t1', 'Dominicos'),
  makeTeam('t2', 'Maristas'),
  makeTeam('t3', 'Teucro'),
  makeTeam('t4', 'Cangas'),
]

const baseTournament: DbTournament = {
  id: 'tour1',
  name: 'Spring Cup',
  date: '2026-04-03',
  num_teams: 4,
  status: 'group_stage',
  viewer_code: 'ABCD',
  created_at: '',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/torneos/tour1']}>
      <Routes>
        <Route path="/torneos/:id" element={<ViewerTournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ViewerTournamentPage', () => {
  const noopFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useTournamentStore.setState({
      tournament: null,
      categories: [],
      matches: [],
      teamsMap: new Map(),
      loading: false,
      error: null,
      fetchTournament: noopFetch,
    })
  })

  it('shows not found when tournament is null', () => {
    useTournamentStore.setState({ tournament: null, loading: false })
    renderPage()
    expect(screen.getByText('Torneo no encontrado')).toBeInTheDocument()
  })

  it('renders tournament name and group standings', () => {
    const teamsMap = new Map(teams.map((t) => [t.id, t]))
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Open',
          groups: [
            { id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] },
            { id: 'g2', category_id: 'cat1', label: 'B', teamIds: ['t3', 't4'] },
          ],
        },
      ],
      matches: [],
      teamsMap,
      loading: false,
    })

    renderPage()

    expect(screen.getByText('Spring Cup')).toBeInTheDocument()
    expect(screen.getByText('Grupo A')).toBeInTheDocument()
    expect(screen.getByText('Grupo B')).toBeInTheDocument()
  })

  it('does NOT render edit buttons (no generate knockouts, no generate finals)', () => {
    const teamsMap = new Map(teams.map((t) => [t.id, t]))
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Open',
          groups: [
            { id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] },
          ],
        },
      ],
      matches: [
        makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', status: 'finished', home_score: 3, away_score: 1 }),
      ],
      teamsMap,
      loading: false,
    })

    renderPage()

    expect(screen.queryByText(/Generar/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Eliminar torneo/i)).not.toBeInTheDocument()
  })

  it('shows knockout phases in reverse order: Final before Semis before Quarters', () => {
    const allTeams = Array.from({ length: 8 }, (_, i) => makeTeam(`t${i + 1}`, `Team ${i + 1}`))
    const teamsMap = new Map(allTeams.map((t) => [t.id, t]))

    useTournamentStore.setState({
      tournament: { ...baseTournament, status: 'knockouts' },
      categories: [
        { id: 'cat1', tournament_id: 'tour1', name: 'Open', groups: [] },
      ],
      matches: [
        makeMatch({ id: 'qf1', home_team_id: 't1', away_team_id: 't8', phase: 'quarter', tournament_group_id: null, group_label: null }),
        makeMatch({ id: 's1', home_team_id: 't1', away_team_id: 't2', phase: 'semi', tournament_group_id: null, group_label: null }),
        makeMatch({ id: 'f1', home_team_id: 't1', away_team_id: 't3', phase: 'final', tournament_group_id: null, group_label: null }),
      ],
      teamsMap,
      loading: false,
    })

    renderPage()

    const headings = screen.getAllByText(/Final|Semifinales|Cuartos de final/i)
    const texts = headings.map((el) => el.textContent)

    // Final should appear before Semis, Semis before Quarters
    const finalIdx = texts.findIndex((t) => /^Final$/i.test(t ?? ''))
    const semiIdx = texts.findIndex((t) => /Semifinales/i.test(t ?? ''))
    const quarterIdx = texts.findIndex((t) => /Cuartos/i.test(t ?? ''))

    expect(finalIdx).toBeLessThan(semiIdx)
    expect(semiIdx).toBeLessThan(quarterIdx)
  })

  it('pins group containing Dominicos team to top', () => {
    const allTeams = [
      makeTeam('t1', 'Vikingos'),
      makeTeam('t2', 'Maristas'),
      makeTeam('t3', 'Dominicos AMA'),
      makeTeam('t4', 'Cangas'),
    ]
    const teamsMap = new Map(allTeams.map((t) => [t.id, t]))

    useTournamentStore.setState({
      tournament: baseTournament,
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Open',
          groups: [
            { id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] },
            { id: 'g2', category_id: 'cat1', label: 'B', teamIds: ['t3', 't4'] },
          ],
        },
      ],
      matches: [],
      teamsMap,
      loading: false,
    })

    renderPage()

    const groupHeadings = screen.getAllByText(/^Grupo [AB]$/)
    expect(groupHeadings[0].textContent).toBe('Grupo B')
    expect(groupHeadings[1].textContent).toBe('Grupo A')
  })

  it('sorts knockout semis by starts_at asc, nulls last', () => {
    const allTeams = [
      makeTeam('t1', 'Vikingos'),
      makeTeam('t2', 'Maristas'),
      makeTeam('t3', 'Teucro'),
      makeTeam('t4', 'Cangas'),
    ]
    const teamsMap = new Map(allTeams.map((t) => [t.id, t]))

    useTournamentStore.setState({
      tournament: { ...baseTournament, status: 'knockouts' },
      categories: [{ id: 'cat1', tournament_id: 'tour1', name: 'Open', groups: [] }],
      matches: [
        makeMatch({ id: 's1', home_team_id: 't1', away_team_id: 't2', phase: 'semi', tournament_group_id: null, group_label: null, starts_at: '2026-04-02T10:00:00Z' }),
        makeMatch({ id: 's2', home_team_id: 't3', away_team_id: 't4', phase: 'semi', tournament_group_id: null, group_label: null, starts_at: '2026-04-02T08:00:00Z' }),
      ],
      teamsMap,
      loading: false,
    })

    renderPage()

    const semiLabels = screen.getAllByText(/^Semi \d$/)
    // Earlier match (s2 at 08:00) should render first as "Semi 1"
    expect(semiLabels[0].closest('div')?.textContent).toContain('Teucro')
  })

  it('shows Clock chip for group match with starts_at set', () => {
    const teamsMap = new Map(teams.map((t) => [t.id, t]))
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
        makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', starts_at: '2026-04-02T07:30:00Z' }),
      ],
      teamsMap,
      loading: false,
    })

    renderPage()

    // Clock chip: should show a formatted date string (contains · separator)
    expect(screen.getByText(/·/)).toBeInTheDocument()
  })

  it('group matches are read-only (no score editing interaction)', () => {
    const teamsMap = new Map(teams.map((t) => [t.id, t]))
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
        makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', status: 'scheduled' }),
      ],
      teamsMap,
      loading: false,
    })

    renderPage()

    // Match rows should not be buttons (no interactivity) — check no button in the page
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
