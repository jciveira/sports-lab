import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MatchesTab } from '../../src/pages/MatchesTab'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
  },
  isSupabaseConfigured: true,
}))

const MATCH_LIVE = {
  id: 'm1', status: 'running', home_score: 3, away_score: 1,
  homeTeamName: 'Dominicos', awayTeamName: 'Vikingos',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-15T10:00:00Z',
  home_team_id: 't1', away_team_id: 't2', tournament_id: null,
  gender: 'Masculino', tournamentName: null,
}
const MATCH_SCHEDULED = {
  id: 'm2', status: 'scheduled', home_score: 0, away_score: 0,
  homeTeamName: 'Lobos', awayTeamName: 'Águilas',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-16T10:00:00Z',
  home_team_id: 't3', away_team_id: 't4', tournament_id: null,
  gender: 'Femenino', tournamentName: null,
}
const MATCH_FINISHED = {
  id: 'm3', status: 'finished', home_score: 5, away_score: 3,
  homeTeamName: 'Tigres', awayTeamName: 'Leones',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-14T10:00:00Z',
  home_team_id: 't5', away_team_id: 't6', tournament_id: null,
  gender: 'Masculino', tournamentName: null,
}
const MATCH_TOURNAMENT_F = {
  id: 'm4', status: 'scheduled', home_score: 0, away_score: 0,
  homeTeamName: 'Rías', awayTeamName: 'Celta',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-17T10:00:00Z',
  home_team_id: 't7', away_team_id: 't8', tournament_id: 'tour1',
  gender: 'Femenino', tournamentName: 'Copa Primavera',
}
const MATCH_TOURNAMENT_M = {
  id: 'm5', status: 'scheduled', home_score: 0, away_score: 0,
  homeTeamName: 'Norte', awayTeamName: 'Sur',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-18T10:00:00Z',
  home_team_id: 't9', away_team_id: 't10', tournament_id: 'tour2',
  gender: 'Masculino', tournamentName: 'Liga Verano',
}

vi.mock('../../src/lib/matches', () => ({
  listMatchesWithTeams: vi.fn(),
}))

import { listMatchesWithTeams } from '../../src/lib/matches'

function renderTab() {
  return render(
    <MemoryRouter>
      <MatchesTab />
    </MemoryRouter>,
  )
}

describe('MatchesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows En directo section open by default and others collapsed', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderTab()
    await screen.findByText('Dominicos')

    // En directo heading + card visible
    expect(screen.getByText(/en directo/i)).toBeInTheDocument()
    expect(screen.getByText('Dominicos')).toBeInTheDocument()

    // Other sections collapsed (headings present, content not rendered)
    expect(screen.getByText(/programados/i)).toBeInTheDocument()
    expect(screen.getByText(/finalizados/i)).toBeInTheDocument()
    expect(screen.queryByText('Lobos')).not.toBeInTheDocument()
  })

  it('renders live match score and links to /match/:id', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderTab()
    await screen.findByText('Dominicos')

    expect(screen.getByText('3 – 1')).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/match/m1')
  })

  it('shows score for finished match', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_FINISHED as any])
    renderTab()

    // Wait for loading to complete (page heading appears)
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Partidos' })

    // Expand Finalizados
    await user.click(screen.getByText(/finalizados/i))
    await screen.findByText('Tigres')
    expect(screen.getByText('5 – 3')).toBeInTheDocument()
  })

  it('scheduled match shows no link and no score', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_SCHEDULED as any])
    renderTab()

    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Partidos' })
    await user.click(screen.getByText(/programados/i))
    await screen.findByText('Lobos')

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/–/)).not.toBeInTheDocument()
  })

  it('shows empty state message when section has no matches', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([])
    renderTab()
    await screen.findByText('No hay partidos en directo')
  })

  it('live match card is wrapped in a link (fully tappable)', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderTab()
    await screen.findByText('Dominicos')
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/match/m1')
    expect(link.querySelector('div')).toBeInTheDocument()
  })

  it('toggles section open/closed on click', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderTab()
    await screen.findByText('Dominicos')

    // Close En directo
    await user.click(screen.getByText(/en directo/i))
    expect(screen.queryByText('Dominicos')).not.toBeInTheDocument()

    // Reopen
    await user.click(screen.getByText(/en directo/i))
    expect(screen.getByText('Dominicos')).toBeInTheDocument()
  })

  it('shows gender chips (Todos, Masculino, Femenino) always', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderTab()
    await screen.findByRole('heading', { name: 'Partidos' })
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Masculino' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Femenino' })).toBeInTheDocument()
  })

  it('gender filter hides non-matching matches', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any, MATCH_SCHEDULED as any])
    renderTab()
    await screen.findByText('Dominicos') // live male match

    await user.click(screen.getByRole('button', { name: 'Femenino' }))

    // MATCH_LIVE is Masculino — should no longer appear
    expect(screen.queryByText('Dominicos')).not.toBeInTheDocument()
  })

  it('shows empty state when no matches survive filters', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderTab()
    await screen.findByText('Dominicos')

    await user.click(screen.getByRole('button', { name: 'Femenino' }))
    expect(screen.getByText('No hay partidos con estos filtros')).toBeInTheDocument()
  })

  it('does NOT show tournament dropdown when only one tournament exists', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_TOURNAMENT_F as any])
    renderTab()
    await screen.findByRole('heading', { name: 'Partidos' })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows tournament dropdown when multiple tournaments exist', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_TOURNAMENT_F as any, MATCH_TOURNAMENT_M as any])
    renderTab()
    await screen.findByRole('heading', { name: 'Partidos' })
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Copa Primavera')).toBeInTheDocument()
    expect(screen.getByText('Liga Verano')).toBeInTheDocument()
  })
})
