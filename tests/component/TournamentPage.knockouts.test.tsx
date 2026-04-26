import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
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

// 4 teams, 2 groups (1 team each side — simplified for pairing logic)
// Using 2-group setup: top 2 each → 4 semis
const teams = [
  makeTeam('tA1', 'Dominicos'),
  makeTeam('tA2', 'Maristas'),
  makeTeam('tB1', 'Teucro'),
  makeTeam('tB2', 'Cangas'),
]

const baseTournament: DbTournament = {
  id: 'tour1',
  name: 'Copa Test',
  date: '2026-04-01',
  num_teams: 4,
  status: 'group_stage',
  viewer_code: 'TEST',
  created_at: '',
}

// One finished group match per group (so allGroupsDone = true with 1 match per group)
const finishedGroupMatches: DbMatch[] = [
  makeMatch({
    id: 'gm1',
    home_team_id: 'tA1',
    away_team_id: 'tA2',
    phase: 'group',
    status: 'finished',
    home_score: 3,
    away_score: 1,
    tournament_group_id: 'grpA',
    tournament_category_id: 'cat1',
  }),
  makeMatch({
    id: 'gm2',
    home_team_id: 'tB1',
    away_team_id: 'tB2',
    phase: 'group',
    status: 'finished',
    home_score: 2,
    away_score: 0,
    tournament_group_id: 'grpB',
    tournament_category_id: 'cat1',
  }),
]

const twoGroupCategory = {
  id: 'cat1',
  tournament_id: 'tour1',
  name: 'Open',
  groups: [
    { id: 'grpA', category_id: 'cat1', label: 'A', teamIds: ['tA1', 'tA2'] },
    { id: 'grpB', category_id: 'cat1', label: 'B', teamIds: ['tB1', 'tB2'] },
  ],
}

function renderAdminPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/tournament/tour1', state: { isAdmin: true } }]}>
      <Routes>
        <Route path="/tournament/:id" element={<TournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TournamentPage — knockout pairing confirmation', () => {
  const noopFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useTournamentStore.setState({
      tournament: baseTournament,
      categories: [twoGroupCategory],
      matches: finishedGroupMatches,
      teamsMap: new Map(teams.map((t) => [t.id, t])),
      loading: false,
      error: null,
      fetchTournament: noopFetch,
      generateKnockouts: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('shows "Generar Semifinales" button when all group matches are finished', () => {
    renderAdminPage()
    expect(screen.getByRole('button', { name: /Generar Semifinales/i })).toBeInTheDocument()
  })

  it('clicking "Generar Semifinales" opens confirmation modal with suggested pairings', async () => {
    renderAdminPage()
    await userEvent.setup().click(screen.getByRole('button', { name: /Generar Semifinales/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Confirmar emparejamientos')).toBeInTheDocument()
    // Default algorithm: 1A vs 2B (tA1 vs tB2), 1B vs 2A (tB1 vs tA2)
    expect(within(dialog).getByRole('button', { name: /Dominicos/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Cangas/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Teucro/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Maristas/ })).toBeInTheDocument()
  })

  it('clicking cancel closes the modal without generating', async () => {
    const mockGenerate = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({ generateKnockouts: mockGenerate })
    renderAdminPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Generar Semifinales/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Confirmar emparejamientos')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('Confirmar emparejamientos')).not.toBeInTheDocument()
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('"Confirmar y generar" calls generateKnockouts with the suggested pairings', async () => {
    const mockGenerate = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({ generateKnockouts: mockGenerate })
    renderAdminPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Generar Semifinales/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar y generar' }))
    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        'cat1',
        expect.objectContaining({
          phase: 'semi',
          matches: [
            { homeTeamId: 'tA1', awayTeamId: 'tB2' },
            { homeTeamId: 'tB1', awayTeamId: 'tA2' },
          ],
        }),
      )
    })
  })

  it('tapping a team selects it, tapping again deselects', async () => {
    renderAdminPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Generar Semifinales/i }))

    const dialog = screen.getByRole('dialog')
    const dominicosBtn = within(dialog).getByRole('button', { name: /Dominicos/ })
    // Select
    await user.click(dominicosBtn)
    expect(dominicosBtn).toHaveAttribute('aria-pressed', 'true')
    // Deselect same slot
    await user.click(dominicosBtn)
    expect(dominicosBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('swapping two teams within the same match updates the pairings display', async () => {
    const mockGenerate = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({ generateKnockouts: mockGenerate })
    renderAdminPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Generar Semifinales/i }))

    const dialog = screen.getByRole('dialog')
    // Swap Dominicos (SF1 home) with Cangas (SF1 away)
    await user.click(within(dialog).getByRole('button', { name: /Dominicos/ }))
    await user.click(within(dialog).getByRole('button', { name: /Cangas/ }))

    // Confirm and check call args — home/away are swapped in SF1
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar y generar' }))
    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        'cat1',
        expect.objectContaining({
          matches: [
            { homeTeamId: 'tB2', awayTeamId: 'tA1' },
            { homeTeamId: 'tB1', awayTeamId: 'tA2' },
          ],
        }),
      )
    })
  })

  it('swapping a team across matches updates both pairings', async () => {
    const mockGenerate = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({ generateKnockouts: mockGenerate })
    renderAdminPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Generar Semifinales/i }))

    const dialog = screen.getByRole('dialog')
    // Default: SF1: tA1(Dominicos) vs tB2(Cangas), SF2: tB1(Teucro) vs tA2(Maristas)
    // Swap Cangas (SF1 away) with Teucro (SF2 home) → SF1: Dominicos vs Teucro, SF2: Cangas vs Maristas
    await user.click(within(dialog).getByRole('button', { name: /Cangas/ }))
    await user.click(within(dialog).getByRole('button', { name: /Teucro/ }))

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar y generar' }))
    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        'cat1',
        expect.objectContaining({
          matches: [
            { homeTeamId: 'tA1', awayTeamId: 'tB1' },
            { homeTeamId: 'tB2', awayTeamId: 'tA2' },
          ],
        }),
      )
    })
  })
})
