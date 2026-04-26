import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminMatchesPage } from '../../src/pages/AdminMatchesPage'
import type { MatchWithTeams } from '../../src/lib/matches'
import type { DbMatch } from '../../src/lib/database.types'

const mockListMatchesWithTeams = vi.fn<() => Promise<MatchWithTeams[]>>()
const mockDeleteMatch = vi.fn<(id: string) => Promise<void>>()

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('../../src/lib/matches', () => ({
  listMatchesWithTeams: (...args: unknown[]) => mockListMatchesWithTeams(...args as []),
  deleteMatch: (...args: unknown[]) => mockDeleteMatch(...args as [string]),
}))

function makeMatch(overrides: Partial<MatchWithTeams> & { homeTeamName: string; awayTeamName: string }): MatchWithTeams {
  const base: DbMatch = {
    id: crypto.randomUUID(),
    tournament_id: null,
    phase: null,
    group_label: null,
    home_team_id: 'ht-1',
    away_team_id: 'at-1',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    current_half: 1,
    clock_seconds: 0,
    config_halves: 2,
    config_half_duration_minutes: 25,
    config_timeouts_per_half: 1,
    config_exclusion_duration_seconds: 120,
    scorekeeper_code: 'SK1234',
    stat_tracker_code: 'ST1234',
    viewer_code: 'VW1234',
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
    created_at: '2026-03-28T10:00:00Z',
  }
  return {
    ...base,
    homeTeamLogo: null,
    awayTeamLogo: null,
    ...overrides,
  }
}

const seedMatches: MatchWithTeams[] = [
  makeMatch({ id: 'match-1', homeTeamName: 'Dominicos', awayTeamName: 'Maristas', status: 'finished', home_score: 12, away_score: 8 }),
  makeMatch({ id: 'match-2', homeTeamName: 'Teucro', awayTeamName: 'Cangas', status: 'running', home_score: 5, away_score: 3 }),
]

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMatchesPage />
    </MemoryRouter>,
  )
}

describe('AdminMatchesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListMatchesWithTeams.mockResolvedValue(seedMatches)
    mockDeleteMatch.mockResolvedValue(undefined)
  })

  it('renders active matches and collapses past games by default', async () => {
    renderPage()

    expect(screen.getByText('Partidos')).toBeInTheDocument()
    // Active (running) match visible immediately
    expect(await screen.findByText('Teucro')).toBeInTheDocument()
    expect(screen.getByText('Cangas')).toBeInTheDocument()
    // Finished match hidden until expanded
    expect(screen.queryByText('Dominicos')).not.toBeInTheDocument()
    // Collapsed section header shows count
    expect(screen.getByRole('button', { name: /1 partido anterior/i })).toBeInTheDocument()
  })

  it('expanding past games section reveals finished matches', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Teucro')
    const toggle = screen.getByRole('button', { name: /partido anterior/i })
    await user.click(toggle)

    expect(screen.getByText('Dominicos')).toBeInTheDocument()
    expect(screen.getByText('Maristas')).toBeInTheDocument()
  })

  it('shows empty state when no matches', async () => {
    mockListMatchesWithTeams.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No hay partidos.')).toBeInTheDocument()
  })

  it('delete confirmation — cancel keeps the match', async () => {
    const user = userEvent.setup()
    renderPage()

    // Active match (Teucro) is visible; delete it
    await screen.findByText('Teucro')

    const deleteBtn = screen.getByRole('button', { name: 'Eliminar partido' })
    await user.click(deleteBtn)

    const cancelBtn = screen.getByRole('button', { name: 'Cancelar eliminar' })
    await user.click(cancelBtn)

    expect(screen.getByText('Teucro')).toBeInTheDocument()
    expect(mockDeleteMatch).not.toHaveBeenCalled()
  })

  it('delete confirmation — confirm removes the match', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Teucro')

    const deleteBtn = screen.getByRole('button', { name: 'Eliminar partido' })
    await user.click(deleteBtn)

    await user.click(screen.getByRole('button', { name: 'Confirmar eliminar' }))

    expect(mockDeleteMatch).toHaveBeenCalledWith('match-2')
    await expect(screen.findByText('Teucro')).rejects.toThrow()
  })

  it('delete confirmation — confirm removes a past match when expanded', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Teucro')
    await user.click(screen.getByRole('button', { name: /partido anterior/i }))

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar partido' })
    // Two buttons now: active (Teucro) + expanded past (Dominicos); past is last
    await user.click(deleteButtons[deleteButtons.length - 1])
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminar' }))

    expect(mockDeleteMatch).toHaveBeenCalledWith('match-1')
    await expect(screen.findByText('Dominicos')).rejects.toThrow()
  })

  it('shows error when delete fails', async () => {
    mockDeleteMatch.mockRejectedValue(new Error('DB error'))
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Teucro')

    const deleteBtn = screen.getByRole('button', { name: 'Eliminar partido' })
    await user.click(deleteBtn)
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminar' }))

    expect(await screen.findByText('Error al eliminar el partido')).toBeInTheDocument()
  })

  it('displays status badge for active match without expanding', async () => {
    renderPage()

    expect(await screen.findByText('En juego')).toBeInTheDocument()
    expect(screen.queryByText('Finalizado')).not.toBeInTheDocument()
  })

  it('shows finished badge and score after expanding past games', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Teucro')
    await user.click(screen.getByRole('button', { name: /partido anterior/i }))

    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    expect(screen.getByText('12 – 8')).toBeInTheDocument()
    expect(screen.getByText('5 – 3')).toBeInTheDocument()
  })
})
