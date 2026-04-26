import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminEquiposPage } from '../../src/pages/admin/AdminEquiposPage'
import { useTeamsStore } from '../../src/hooks/useTeamsStore'
import { usePlayersStore } from '../../src/hooks/usePlayersStore'
import type { DbTeam } from '../../src/lib/database.types'

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

const mockDeleteTeam = vi.fn()

vi.mock('../../src/lib/teams', () => ({
  listTeams: vi.fn().mockResolvedValue([]),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
}))

const DOMINICOS: DbTeam = { id: 't1', name: 'Dominicos Alevín', badge_url: null, nickname: null, city_district: null, category: 'Alevín', gender: 'Masculino', region: 'Madrid', created_at: '' }
const MARISTAS: DbTeam = { id: 't2', name: 'Maristas', badge_url: null, nickname: null, city_district: null, category: 'Infantil', gender: 'Femenino', region: 'Navarra', created_at: '' }
const NO_CATEGORY: DbTeam = { id: 't3', name: 'Aloha', badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: null, created_at: '' }

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/equipos']}>
      <AdminEquiposPage />
    </MemoryRouter>,
  )
}

async function expandAllRegions(user: ReturnType<typeof userEvent.setup>) {
  const headers = screen.getAllByRole('button', { expanded: false })
  // Filter to region toggle buttons (they have aria-expanded attribute)
  for (const btn of headers) {
    if (btn.hasAttribute('aria-expanded')) await user.click(btn)
  }
}

describe('AdminEquiposPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteTeam.mockResolvedValue(undefined)
    const noopFetch = async () => {}
    useTeamsStore.setState({ teams: [MARISTAS, DOMINICOS, NO_CATEGORY], loading: false, error: null, fetch: noopFetch })
    usePlayersStore.setState({
      players: [
        { id: 'p1', team_id: 't1', display_name: 'Mateo', number: 7, role: 'LW', avatar_url: null, strengths: [], available: true, injured: false, ratings: null, card_type: 'base' as const, created_at: '' },
        { id: 'p2', team_id: 't1', display_name: 'Miguel', number: 10, role: 'CB', avatar_url: null, strengths: [], available: true, injured: false, ratings: null, card_type: 'base' as const, created_at: '' },
      ],
      loading: false,
      error: null,
      fetch: noopFetch,
    })
  })

  it('pins Dominicos teams at the top of the grid', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    const cards = screen.getAllByText(/jugador/)
    // Dominicos card should appear first (has 2 players), then the rest
    expect(cards[0]).toHaveTextContent('2 jugadores')
  })

  it('shows category and gender when present', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    expect(screen.getByText('Alevín')).toBeInTheDocument()
    expect(screen.getByText('Masculino')).toBeInTheDocument()
    expect(screen.getByText('Infantil')).toBeInTheDocument()
    expect(screen.getByText('Femenino')).toBeInTheDocument()
  })

  it('shows roster count per team', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    expect(screen.getByText('2 jugadores')).toBeInTheDocument()
    expect(screen.getAllByText('0 jugadores')).toHaveLength(2)
  })

  it('opens create form when clicking Nuevo equipo', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Nuevo equipo'))
    expect(screen.getByPlaceholderText('Nombre del equipo')).toBeInTheDocument()
    expect(screen.getByText('Crear')).toBeInTheDocument()
  })

  it('shows edit form with team data when clicking edit', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    const editButtons = screen.getAllByTitle('Editar equipo')
    await user.click(editButtons[0])
    expect(screen.getByDisplayValue('Dominicos Alevín')).toBeInTheDocument()
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })

  it('requires two-click confirmation for delete', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    const deleteButtons = screen.getAllByTitle('Eliminar equipo')
    await user.click(deleteButtons[0])
    // Confirm button should appear
    expect(screen.getByTitle('Confirmar eliminar')).toBeInTheDocument()
    // Cancel should dismiss
    await user.click(screen.getByTitle('Cancelar'))
    expect(screen.queryByTitle('Confirmar eliminar')).not.toBeInTheDocument()
  })

  it('shows reduced opacity for teams without roster', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    // Maristas (t2) has 0 players — its card should have opacity-60
    const maristasCard = screen.getByText('Maristas').closest('div[class*="rounded-xl"]')
    expect(maristasCard?.className).toContain('opacity-60')
  })

  it('shows region headers for grouped teams', () => {
    renderPage()
    // Region headers visible without expanding
    expect(screen.getByRole('button', { name: /Madrid/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Navarra/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sin región/ })).toBeInTheDocument()
  })

  it('expands region on click and collapses on second click', async () => {
    const user = userEvent.setup()
    renderPage()
    const madridBtn = screen.getByRole('button', { name: /Madrid/ })
    // Collapsed initially — team cards not visible
    expect(screen.queryByText('Dominicos Alevín')).not.toBeInTheDocument()
    await user.click(madridBtn)
    expect(screen.getByText('Dominicos Alevín')).toBeInTheDocument()
    await user.click(madridBtn)
    expect(screen.queryByText('Dominicos Alevín')).not.toBeInTheDocument()
  })

  it('create form includes region dropdown', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Nuevo equipo'))
    expect(screen.getByDisplayValue('Comunidad Autónoma *')).toBeInTheDocument()
  })

  it('create button is disabled until region is selected', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Nuevo equipo'))
    const nameInput = screen.getByPlaceholderText('Nombre del equipo')
    await user.type(nameInput, 'Nuevo Club')
    // Crear button should still be disabled — no region selected
    expect(screen.getByText('Crear')).toBeDisabled()
  })

  it('create button enables after name and region are filled', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Nuevo equipo'))
    await user.type(screen.getByPlaceholderText('Nombre del equipo'), 'Nuevo Club')
    await user.selectOptions(screen.getByDisplayValue('Comunidad Autónoma *'), 'Valencia')
    expect(screen.getByText('Crear')).toBeEnabled()
  })

  it('edit form pre-fills region from team data', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    const editButtons = screen.getAllByTitle('Editar equipo')
    await user.click(editButtons[0]) // Dominicos — region: Madrid
    expect(screen.getByDisplayValue('Madrid')).toBeInTheDocument()
  })

  it('save button enabled in edit mode when team has no region', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    // Aloha (NO_CATEGORY) has region: null — edit button index 2 after sorting (Dominicos, Maristas, Aloha)
    const editButtons = screen.getAllByTitle('Editar equipo')
    // Find the Aloha edit button specifically
    const alohaCard = screen.getByText('Aloha').closest('div[class*="rounded-xl"]')!
    const alohaEditBtn = within(alohaCard).getByTitle('Editar equipo')
    await user.click(alohaEditBtn)
    expect(screen.getByText('Guardar')).toBeEnabled()
  })

  it('save button stays enabled after changing category in edit mode', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    const editButtons = screen.getAllByTitle('Editar equipo')
    await user.click(editButtons[0]) // Dominicos — category: 'Alevín'
    expect(screen.getByText('Guardar')).toBeEnabled()
    await user.selectOptions(screen.getByDisplayValue('Alevín'), 'Senior')
    expect(screen.getByText('Guardar')).toBeEnabled()
  })

  it('save button stays enabled after changing gender in edit mode', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    const editButtons = screen.getAllByTitle('Editar equipo')
    await user.click(editButtons[0]) // Dominicos — gender: 'Masculino'
    expect(screen.getByText('Guardar')).toBeEnabled()
    await user.selectOptions(screen.getByDisplayValue('Masculino'), 'Femenino')
    expect(screen.getByText('Guardar')).toBeEnabled()
  })

  it('edit region placeholder has no asterisk (region optional on edit)', async () => {
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    const editButtons = screen.getAllByTitle('Editar equipo')
    await user.click(editButtons[0]) // any team
    // In edit mode the empty option should not carry * (region is optional)
    expect(screen.queryByDisplayValue('Comunidad Autónoma *')).not.toBeInTheDocument()
  })

  it('create region placeholder shows asterisk (region required on create)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Nuevo equipo'))
    expect(screen.getByDisplayValue('Comunidad Autónoma *')).toBeInTheDocument()
  })

  it('shows error message when delete is blocked by server', async () => {
    mockDeleteTeam.mockRejectedValue(new Error('Delete blocked by server'))
    const user = userEvent.setup()
    renderPage()
    await expandAllRegions(user)
    const deleteButtons = screen.getAllByTitle('Eliminar equipo')
    await user.click(deleteButtons[0])
    await user.click(screen.getByTitle('Confirmar eliminar'))
    await waitFor(() => {
      expect(screen.getByText('No se pudo eliminar el equipo')).toBeInTheDocument()
    })
  })
})
