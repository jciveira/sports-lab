import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TournamentPage } from '../../src/pages/TournamentPage'
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
    starts_at: null,
    venue_id: null,
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
  num_teams: 8,
  status: 'group_stage',
  viewer_code: 'ABCD',
  created_at: '',
}

function renderPage(state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/tournament/tour1', state }]}>
      <Routes>
        <Route path="/tournament/:id" element={<TournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TournamentPage', () => {
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

  it('does not show category tabs when only one category exists', () => {
    const teamsMap = new Map(teams.map((t) => [t.id, t]))
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Boys',
          groups: [
            { id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] },
            { id: 'g2', category_id: 'cat1', label: 'B', teamIds: ['t3', 't4'] },
          ],
        },
      ],
      matches: [
        makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', tournament_group_id: 'g1', tournament_category_id: 'cat1' }),
      ],
      teamsMap,
      loading: false,
    })

    renderPage()

    expect(screen.getByText('Spring Cup')).toBeInTheDocument()
    expect(screen.getByText('Grupo A')).toBeInTheDocument()
    expect(screen.getByText('Grupo B')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Boys' })).not.toBeInTheDocument()
  })

  it('shows category tabs when multiple categories exist', () => {
    const allTeams = [
      ...teams,
      makeTeam('t5', 'Atlético'),
      makeTeam('t6', 'Bidasoa'),
      makeTeam('t7', 'Ademar'),
      makeTeam('t8', 'Anaitasuna'),
    ]
    const teamsMap = new Map(allTeams.map((t) => [t.id, t]))

    useTournamentStore.setState({
      tournament: baseTournament,
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Boys',
          groups: [
            { id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] },
            { id: 'g2', category_id: 'cat1', label: 'B', teamIds: ['t3', 't4'] },
          ],
        },
        {
          id: 'cat2',
          tournament_id: 'tour1',
          name: 'Girls',
          groups: [
            { id: 'g3', category_id: 'cat2', label: 'A', teamIds: ['t5', 't6'] },
            { id: 'g4', category_id: 'cat2', label: 'B', teamIds: ['t7', 't8'] },
          ],
        },
      ],
      matches: [],
      teamsMap,
      loading: false,
    })

    renderPage()

    expect(screen.getByRole('button', { name: 'Boys' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Girls' })).toBeInTheDocument()
  })

  it('renders 4 group tables for a 4-group category', () => {
    const allTeams = Array.from({ length: 16 }, (_, i) =>
      makeTeam(`t${i + 1}`, `Team ${i + 1}`),
    )
    const teamsMap = new Map(allTeams.map((t) => [t.id, t]))

    useTournamentStore.setState({
      tournament: { ...baseTournament, num_teams: 16 },
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Alevín Masculino',
          groups: [
            { id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2', 't3', 't4'] },
            { id: 'g2', category_id: 'cat1', label: 'B', teamIds: ['t5', 't6', 't7', 't8'] },
            { id: 'g3', category_id: 'cat1', label: 'C', teamIds: ['t9', 't10', 't11', 't12'] },
            { id: 'g4', category_id: 'cat1', label: 'D', teamIds: ['t13', 't14', 't15', 't16'] },
          ],
        },
      ],
      matches: [],
      teamsMap,
      loading: false,
    })

    renderPage()

    expect(screen.getByText('Grupo A')).toBeInTheDocument()
    expect(screen.getByText('Grupo B')).toBeInTheDocument()
    expect(screen.getByText('Grupo C')).toBeInTheDocument()
    expect(screen.getByText('Grupo D')).toBeInTheDocument()
  })

  it('renders quarterfinal matches in the bracket view', () => {
    const allTeams = Array.from({ length: 8 }, (_, i) =>
      makeTeam(`t${i + 1}`, `QF Team ${i + 1}`),
    )
    const teamsMap = new Map(allTeams.map((t) => [t.id, t]))

    const quarterMatches = [
      makeMatch({ id: 'qf1', home_team_id: 't1', away_team_id: 't8', phase: 'quarter', tournament_category_id: 'cat1', tournament_group_id: null, group_label: null }),
      makeMatch({ id: 'qf2', home_team_id: 't2', away_team_id: 't7', phase: 'quarter', tournament_category_id: 'cat1', tournament_group_id: null, group_label: null }),
      makeMatch({ id: 'qf3', home_team_id: 't3', away_team_id: 't6', phase: 'quarter', tournament_category_id: 'cat1', tournament_group_id: null, group_label: null }),
      makeMatch({ id: 'qf4', home_team_id: 't4', away_team_id: 't5', phase: 'quarter', tournament_category_id: 'cat1', tournament_group_id: null, group_label: null }),
    ]

    useTournamentStore.setState({
      tournament: { ...baseTournament, status: 'knockouts' },
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Open',
          groups: [],
        },
      ],
      matches: quarterMatches,
      teamsMap,
      loading: false,
    })

    renderPage()

    expect(screen.getByText('Cuartos de final')).toBeInTheDocument()
    expect(screen.getByText('QF Team 1')).toBeInTheDocument()
    expect(screen.getByText('QF Team 8')).toBeInTheDocument()
  })

  it('shows not found when tournament is null', () => {
    useTournamentStore.setState({ tournament: null, loading: false })
    renderPage()
    expect(screen.getByText('Torneo no encontrado')).toBeInTheDocument()
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

  it('sorts knockout matches by starts_at ascending (earliest first)', () => {
    // s1 has a later time, s2 has an earlier time → s2 should appear first
    const teamsMap = new Map(teams.map((t) => [t.id, t]))
    const semiMatches = [
      makeMatch({ id: 's1', home_team_id: 't3', away_team_id: 't4', phase: 'semi', tournament_category_id: 'cat1', tournament_group_id: null, group_label: null, starts_at: '2026-04-05T10:00:00Z' }),
      makeMatch({ id: 's2', home_team_id: 't1', away_team_id: 't2', phase: 'semi', tournament_category_id: 'cat1', tournament_group_id: null, group_label: null, starts_at: '2026-04-05T08:00:00Z' }),
    ]

    useTournamentStore.setState({
      tournament: { ...baseTournament, status: 'knockouts' },
      categories: [{ id: 'cat1', tournament_id: 'tour1', name: 'Open', groups: [] }],
      matches: semiMatches,
      teamsMap,
      loading: false,
    })

    renderPage()

    const text = document.body.textContent ?? ''
    // s2 (08:00 — Dominicos vs Maristas) should appear before s1 (10:00 — Teucro vs Cangas)
    expect(text.indexOf('Dominicos')).toBeLessThan(text.indexOf('Teucro'))
  })

  it('sorts group phase matches by starts_at ascending (earliest first)', () => {
    const teamsMap = new Map(teams.map((t) => [t.id, t]))
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: [
        {
          id: 'cat1',
          tournament_id: 'tour1',
          name: 'Open',
          groups: [{ id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2', 't3', 't4'] }],
        },
      ],
      matches: [
        makeMatch({ id: 'g1', home_team_id: 't3', away_team_id: 't4', tournament_group_id: 'g1', tournament_category_id: 'cat1', starts_at: '2026-04-05T10:00:00Z' }),
        makeMatch({ id: 'g2', home_team_id: 't1', away_team_id: 't2', tournament_group_id: 'g1', tournament_category_id: 'cat1', starts_at: '2026-04-05T08:00:00Z' }),
      ],
      teamsMap,
      venues: [],
      loading: false,
    })
    renderPage()
    const text = document.body.textContent ?? ''
    // g2 (08:00 — Dominicos vs Maristas) should appear before g1 (10:00 — Teucro vs Cangas)
    expect(text.indexOf('Dominicos')).toBeLessThan(text.indexOf('Teucro'))
  })

  describe('group match edit', () => {
    function setupGroupState(matchStatus: 'scheduled' | 'finished', isAdmin = true) {
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
          makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', tournament_group_id: 'g1', tournament_category_id: 'cat1', status: matchStatus, home_score: 4, away_score: 2 }),
        ],
        teamsMap,
        venues: [],
        loading: false,
      })
    }

    it('admin sees edit button on finished group match', () => {
      setupGroupState('finished')
      renderPage({ isAdmin: true })
      expect(screen.getByRole('button', { name: 'Editar resultado' })).toBeInTheDocument()
    })

    it('viewer does not see edit button on finished group match', () => {
      setupGroupState('finished', false)
      renderPage()
      expect(screen.queryByRole('button', { name: 'Editar resultado' })).not.toBeInTheDocument()
    })

    it('clicking edit on finished group match opens score entry form with current scores', async () => {
      const mockRecordScore = vi.fn().mockResolvedValue(undefined)
      setupGroupState('finished')
      useTournamentStore.setState({ recordScore: mockRecordScore })
      renderPage({ isAdmin: true })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Editar resultado' }))
      expect(screen.getByText('Confirmar')).toBeInTheDocument()
    })
  })

  describe('group match date edit', () => {
    function setupGroupScheduled() {
      const teamsMap = new Map(teams.map((t) => [t.id, t]))
      useTournamentStore.setState({
        tournament: baseTournament,
        categories: [{ id: 'cat1', tournament_id: 'tour1', name: 'Open', groups: [{ id: 'g1', category_id: 'cat1', label: 'A', teamIds: ['t1', 't2'] }] }],
        matches: [makeMatch({ id: 'm1', home_team_id: 't1', away_team_id: 't2', tournament_group_id: 'g1', tournament_category_id: 'cat1', status: 'scheduled' })],
        teamsMap,
        venues: [],
        loading: false,
      })
    }

    it('admin sees date edit button on scheduled group match', () => {
      setupGroupScheduled()
      renderPage({ isAdmin: true })
      expect(screen.getByRole('button', { name: 'Editar fecha y hora' })).toBeInTheDocument()
    })

    it('clicking date edit button reveals save and cancel controls', async () => {
      setupGroupScheduled()
      const mockUpdateSchedule = vi.fn().mockResolvedValue(undefined)
      useTournamentStore.setState({ updateSchedule: mockUpdateSchedule })
      renderPage({ isAdmin: true })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Editar fecha y hora' }))
      expect(screen.getByRole('button', { name: 'Guardar fecha' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    })
  })

  describe('knockout match edit', () => {
    const finishedSemiMatches = [
      makeMatch({ id: 's1', home_team_id: 't1', away_team_id: 't2', phase: 'semi', status: 'finished', home_score: 3, away_score: 1, tournament_category_id: 'cat1', tournament_group_id: null, group_label: null }),
      makeMatch({ id: 's2', home_team_id: 't3', away_team_id: 't4', phase: 'semi', status: 'scheduled', tournament_category_id: 'cat1', tournament_group_id: null, group_label: null }),
    ]

    function setupKnockoutState() {
      const teamsMap = new Map(teams.map((t) => [t.id, t]))
      useTournamentStore.setState({
        tournament: { ...baseTournament, status: 'knockouts' },
        categories: [{ id: 'cat1', tournament_id: 'tour1', name: 'Open', groups: [] }],
        matches: finishedSemiMatches,
        teamsMap,
        loading: false,
      })
    }

    it('admin sees edit button on finished knockout match', () => {
      setupKnockoutState()
      renderPage({ isAdmin: true })
      expect(screen.getByRole('button', { name: 'Editar resultado' })).toBeInTheDocument()
    })

    it('viewer does not see edit button on finished knockout match', () => {
      setupKnockoutState()
      renderPage()
      expect(screen.queryByRole('button', { name: 'Editar resultado' })).not.toBeInTheDocument()
    })

    it('clicking edit on finished match opens score entry form with current scores', async () => {
      const mockRecordScore = vi.fn().mockResolvedValue(undefined)
      setupKnockoutState()
      useTournamentStore.setState({ recordScore: mockRecordScore })
      renderPage({ isAdmin: true })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Editar resultado' }))
      expect(screen.getByText('Confirmar')).toBeInTheDocument()
    })
  })
})
