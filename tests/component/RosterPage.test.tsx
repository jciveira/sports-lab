import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RosterPage } from '../../src/pages/RosterPage'
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

const TEAM_A = { id: 'team-a', name: 'Dominicos', badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: null, created_at: '' }
const PLAYER_1 = { id: 'p1', team_id: 'team-a', display_name: 'Mateo', number: 7, role: 'LW', avatar_url: null, strengths: [], available: true, injured: false, created_at: '' }
const PLAYER_UNASSIGNED = { id: 'p3', team_id: null, display_name: 'Pablo', number: 5, role: 'GK', avatar_url: null, strengths: [], available: true, injured: false, created_at: '' }
const PLAYER_INJURED = { id: 'p4', team_id: 'team-a', display_name: 'Carlos', number: 3, role: 'PV', avatar_url: null, strengths: [], available: false, injured: true, created_at: '' }

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/teams/team-a/roster']}>
      <Routes>
        <Route path="/admin/teams/:teamId/roster" element={<RosterPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePlayersStore.setState({
      players: [],
      loading: false,
      error: null,
      fetch: vi.fn().mockResolvedValue(undefined),
      add: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn(),
    })
    useTeamsStore.setState({
      teams: [TEAM_A],
      loading: false,
      error: null,
      fetch: vi.fn().mockResolvedValue(undefined),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    })
  })

  it('shows add player button that reveals unassigned pool', async () => {
    const user = userEvent.setup()
    usePlayersStore.setState({ players: [PLAYER_1, PLAYER_UNASSIGNED] })
    renderPage()

    await user.click(screen.getByText('Añadir jugador'))
    expect(screen.getByText(/jugadores sin equipo/i)).toBeInTheDocument()
    expect(screen.getByText('Pablo')).toBeInTheDocument()
  })

  it('calls update with team_id when assigning a player', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    usePlayersStore.setState({ players: [PLAYER_UNASSIGNED], update: mockUpdate })
    renderPage()

    await user.click(screen.getByText('Añadir jugador'))
    const assignBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-user-plus'))
    await user.click(assignBtn!)

    expect(mockUpdate).toHaveBeenCalledWith('p3', { team_id: 'team-a' })
  })

  it('calls update with null team_id when removing a player', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    usePlayersStore.setState({ players: [PLAYER_1], update: mockUpdate })
    renderPage()

    const removeBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-user-minus'))
    await user.click(removeBtn!)

    expect(mockUpdate).toHaveBeenCalledWith('p1', { team_id: null })
  })

  it('shows injured player with dimmed style and lesionado label', () => {
    usePlayersStore.setState({ players: [PLAYER_INJURED] })
    renderPage()

    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText(/lesionado/i)).toBeInTheDocument()
    const row = screen.getByText('Carlos').closest('[class*="opacity-50"]')
    expect(row).toBeInTheDocument()
  })

  it('toggles injured status and sets available to false', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    usePlayersStore.setState({ players: [PLAYER_1], update: mockUpdate })
    renderPage()

    const heartBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-heart'))
    await user.click(heartBtn!)

    expect(mockUpdate).toHaveBeenCalledWith('p1', { injured: true, available: false })
  })

  it('toggles availability status', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.fn().mockResolvedValue(undefined)
    usePlayersStore.setState({ players: [PLAYER_1], update: mockUpdate })
    renderPage()

    const availBtn = screen.getByText('OK')
    await user.click(availBtn)

    expect(mockUpdate).toHaveBeenCalledWith('p1', { available: false })
  })
})
