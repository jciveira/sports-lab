import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PlayersPage } from '../../src/pages/PlayersPage'
import { usePlayersStore } from '../../src/hooks/usePlayersStore'
import { useTeamsStore } from '../../src/hooks/useTeamsStore'

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: true,
}))

const mockUploadPlayerAvatar = vi.fn()
const mockGetPlayerAvatarUrl = vi.fn()

vi.mock('../../src/lib/players', () => ({
  listPlayers: vi.fn().mockResolvedValue([]),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  deletePlayer: vi.fn(),
  uploadPlayerAvatar: (...args: unknown[]) => mockUploadPlayerAvatar(...args),
  getPlayerAvatarUrl: (...args: unknown[]) => mockGetPlayerAvatarUrl(...args),
}))

vi.mock('../../src/lib/teams', () => ({
  listTeams: vi.fn().mockResolvedValue([]),
  createTeam: vi.fn(),
}))

const TEAM_A = { id: 'team-a', name: 'Dominicos', badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: null, created_at: '' }
const PLAYER_1 = { id: 'p1', team_id: 'team-a', display_name: 'Mateo', number: 7, role: 'LW', avatar_url: null, strengths: [], ratings: null, card_type: 'base' as const, available: true, injured: false, created_at: '' }
const PLAYER_2 = { id: 'p2', team_id: 'team-a', display_name: 'Miguel', number: 10, role: 'CB', avatar_url: null, strengths: [], ratings: null, card_type: 'base' as const, available: true, injured: false, created_at: '' }
const PLAYER_WITH_RATINGS = { id: 'p3', team_id: 'team-a', display_name: 'Hugo', number: 23, role: 'CB', avatar_url: null, strengths: [], ratings: { tiro: 89, pase: 85, defensa: 90, fisico: 79, stamina: 75, vision_de_juego: 85 }, card_type: 'toty' as const, available: true, injured: false, created_at: '' }

function renderPage() {
  return render(
    <MemoryRouter>
      <PlayersPage />
    </MemoryRouter>,
  )
}

describe('PlayersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPlayerAvatarUrl.mockResolvedValue(null)
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

  it('shows create form when button is clicked and hides on cancel', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Nuevo jugador'))
    expect(screen.getByPlaceholderText('Nombre o apodo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Dorsal')).toBeInTheDocument()
    await user.click(screen.getByText('Cancelar'))
    expect(screen.queryByPlaceholderText('Nombre o apodo')).not.toBeInTheDocument()
  })

  it('shows edit form with pre-populated values when pencil icon is clicked', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    renderPage()

    const pencilBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-pencil'))
    await user.click(pencilBtn!)
    expect(screen.getByDisplayValue('Mateo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('7')).toBeInTheDocument()
  })

  it('shows delete confirmation when trash icon is clicked', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    renderPage()

    const trashBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-trash-2'))
    await user.click(trashBtn!)
    expect(screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-check'))).toBeDefined()
  })

  it('shows duplicate jersey error when editing to existing number', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1, PLAYER_2] })
    renderPage()

    const pencilBtns = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg.lucide-pencil'))
    await user.click(pencilBtns[0])

    const numberInput = screen.getByDisplayValue('7')
    await user.clear(numberInput)
    await user.type(numberInput, '10')
    await user.click(screen.getByText('Guardar'))
    expect(screen.getByText(/dorsal #10 ya está ocupado/i)).toBeInTheDocument()
  })

  it('create button is disabled without team or name', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Nuevo jugador'))

    const createBtn = screen.getByText('Crear')
    expect(createBtn).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Nombre o apodo'), 'Pablo')
    await user.type(screen.getByPlaceholderText('Dorsal'), '5')
    expect(createBtn).toBeDisabled()
  })

  it('toggles Ratings FIFA: shows 6 stat inputs + card type when enabled, hides when disabled', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    renderPage()

    const pencilBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-pencil'))
    await user.click(pencilBtn!)

    expect(screen.getByRole('checkbox')).not.toBeChecked()
    await user.click(screen.getByRole('checkbox'))

    const numberInputs = screen.getAllByRole('spinbutton')
    expect(numberInputs.length).toBe(7) // 1 jersey + 6 stats
    expect(screen.getByText('Tiro')).toBeInTheDocument()
    expect(screen.getByText('Tipo carta:')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox'))
    expect(screen.queryByText('Tiro')).not.toBeInTheDocument()
    expect(screen.queryByText('Tipo carta:')).not.toBeInTheDocument()
  })

  it('shows existing ratings when editing player with ratings', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_WITH_RATINGS] })
    renderPage()

    const pencilBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-pencil'))
    await user.click(pencilBtn!)

    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByDisplayValue('89')).toBeInTheDocument()
    const cardSelects = screen.getAllByRole('combobox') as HTMLSelectElement[]
    const cardTypeSelect = cardSelects.find((s) => s.value === 'toty')
    expect(cardTypeSelect).toBeDefined()
  })

  it('shows camera hint button when player has no avatar', () => {
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    renderPage()

    expect(screen.getByRole('button', { name: 'Añadir foto' })).toBeInTheDocument()
  })

  it('tapping camera hint opens edit mode', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Añadir foto' }))
    expect(screen.getByDisplayValue('Mateo')).toBeInTheDocument()
  })

  it('hides camera hint when player has avatar', () => {
    const playerWithAvatar = { ...PLAYER_1, avatar_url: 'https://example.com/photo.jpg' }
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [playerWithAvatar] })
    renderPage()

    expect(screen.queryByRole('button', { name: 'Añadir foto' })).not.toBeInTheDocument()
    expect(screen.getByAltText('Mateo')).toBeInTheDocument()
  })

  it('shows empty state when no players', () => {
    renderPage()
    expect(screen.getByText(/no hay jugadores/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    usePlayersStore.setState({ error: 'Failed to load players' })
    renderPage()
    expect(screen.getByText('Failed to load players')).toBeInTheDocument()
  })

  it('shows avatar upload area in edit mode and uploads on file select', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    mockUploadPlayerAvatar.mockResolvedValue({ path: 'p1.jpg', previewUrl: 'https://example.com/signed-url.jpg' })
    renderPage()

    const pencilBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-pencil'))
    await user.click(pencilBtn!)

    expect(screen.getByText(/añadir foto/i)).toBeInTheDocument()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()
    expect(fileInput.accept).toBe('image/*')

    const file = new File(['photo'], 'avatar.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    expect(mockUploadPlayerAvatar).toHaveBeenCalledWith('p1', file)
  })

  it('shows avatar preview when player has existing avatar_url', async () => {
    const user = userEvent.setup()
    const playerWithAvatar = { ...PLAYER_1, avatar_url: 'https://example.com/existing.jpg' }
    mockGetPlayerAvatarUrl.mockResolvedValue('https://example.com/existing.jpg')
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [playerWithAvatar] })
    renderPage()

    const pencilBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-pencil'))
    await user.click(pencilBtn!)

    expect(screen.getByText(/toca para cambiar foto/i)).toBeInTheDocument()
    const avatarImg = await screen.findByAltText('Mateo')
    expect(avatarImg).toHaveAttribute('src', 'https://example.com/existing.jpg')
  })

  it('shows error message when file exceeds 2MB', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    renderPage()

    const pencilBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-pencil'))
    await user.click(pencilBtn!)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, bigFile)

    expect(screen.getByText('La imagen supera 2MB')).toBeInTheDocument()
    expect(mockUploadPlayerAvatar).not.toHaveBeenCalled()
  })

  it('shows error message when upload fails', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [TEAM_A] })
    usePlayersStore.setState({ players: [PLAYER_1] })
    mockUploadPlayerAvatar.mockRejectedValue(new Error('Storage error'))
    renderPage()

    const pencilBtn = screen.getAllByRole('button').find((btn) => btn.querySelector('svg.lucide-pencil'))
    await user.click(pencilBtn!)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['photo'], 'avatar.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    expect(await screen.findByText('Error al subir la foto')).toBeInTheDocument()
  })
})
