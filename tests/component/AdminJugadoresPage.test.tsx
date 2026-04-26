import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminJugadoresPage } from '../../src/pages/admin/AdminJugadoresPage'
import { usePlayersStore } from '../../src/hooks/usePlayersStore'
import { useTeamsStore } from '../../src/hooks/useTeamsStore'

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: true,
}))

vi.mock('../../src/lib/players', () => ({
  listPlayers: vi.fn().mockResolvedValue([]),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  deletePlayer: vi.fn(),
}))

vi.mock('../../src/lib/teams', () => ({
  listTeams: vi.fn().mockResolvedValue([]),
  createTeam: vi.fn(),
}))

const TEAM_A = { id: 'team-a', name: 'Dominicos', badge_url: null, nickname: null, city_district: null, created_at: '' }
const TEAM_B = { id: 'team-b', name: 'Vikingos', badge_url: null, nickname: null, city_district: null, created_at: '' }
const PLAYER_1 = { id: 'p1', team_id: 'team-a', display_name: 'Mateo', number: 7, role: 'LW', avatar_url: null, strengths: [], ratings: null, card_type: 'base' as const, available: true, injured: false, created_at: '' }
const PLAYER_2 = { id: 'p2', team_id: 'team-b', display_name: 'Miguel', number: 10, role: 'CB', avatar_url: null, strengths: [], ratings: null, card_type: 'base' as const, available: true, injured: false, created_at: '' }

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminJugadoresPage />
    </MemoryRouter>,
  )
}

describe('AdminJugadoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePlayersStore.setState({
      players: [],
      loading: false,
      error: null,
      fetch: vi.fn().mockResolvedValue(undefined),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    })
    useTeamsStore.setState({
      teams: [],
      loading: false,
      error: null,
      fetch: vi.fn().mockResolvedValue(undefined),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    })
  })

  it('shows empty state when no players', () => {
    renderPage()
    expect(screen.getByText(/no hay jugadores/i)).toBeInTheDocument()
  })

  it('opens create form when "Nuevo jugador" is clicked and closes on cancel', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Nuevo jugador'))
    expect(screen.getByPlaceholderText('Nombre o apodo')).toBeInTheDocument()
    await user.click(screen.getByText('Cancelar'))
    expect(screen.queryByPlaceholderText('Nombre o apodo')).not.toBeInTheDocument()
  })

  it('filters players by name', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A, TEAM_B] })
    usePlayersStore.setState({ players: [PLAYER_1, PLAYER_2] })
    renderPage()

    expect(screen.getByText('Mateo')).toBeInTheDocument()
    expect(screen.getByText('Miguel')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/buscar/i), 'Mateo')
    expect(screen.getByText('Mateo')).toBeInTheDocument()
    expect(screen.queryByText('Miguel')).not.toBeInTheDocument()
  })

  it('filters players by team name', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A, TEAM_B] })
    usePlayersStore.setState({ players: [PLAYER_1, PLAYER_2] })
    renderPage()

    await user.type(screen.getByPlaceholderText(/buscar/i), 'Vikingos')
    expect(screen.queryByText('Mateo')).not.toBeInTheDocument()
    expect(screen.getByText('Miguel')).toBeInTheDocument()
  })

  it('shows "Sin resultados" when search has no matches', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    renderPage()

    await user.type(screen.getByPlaceholderText(/buscar/i), 'xyz')
    expect(screen.getByText('Sin resultados.')).toBeInTheDocument()
  })
})
