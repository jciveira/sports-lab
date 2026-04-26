import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PlayerCardPage } from '../../src/pages/PlayerCardPage'

const mockGetPlayer = vi.fn()
const mockGetPlayerAvatarUrl = vi.fn()

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: true,
}))

vi.mock('../../src/lib/players', () => ({
  getPlayer: (...args: unknown[]) => mockGetPlayer(...args),
  getPlayerAvatarUrl: (...args: unknown[]) => mockGetPlayerAvatarUrl(...args),
}))

const PLAYER = {
  id: 'p1',
  team_id: 'team-a',
  display_name: 'Mateo',
  number: 7,
  role: 'LW',
  avatar_url: null,
  strengths: [],
  ratings: null,
  card_type: 'base',
  available: true,
  injured: false,
  created_at: '',
  team: { id: 'team-a', name: 'Dominicos', badge_url: null },
}

const PLAYER_WITH_AVATAR = {
  ...PLAYER,
  id: 'p2',
  display_name: 'Miguel',
  number: 10,
  avatar_url: 'https://example.com/photo.jpg',
}

const PLAYER_INJURED = {
  ...PLAYER,
  id: 'p3',
  display_name: 'Carlos',
  injured: true,
  available: false,
}

const PLAYER_WITH_RATINGS = {
  ...PLAYER,
  id: 'p4',
  display_name: 'Rubén',
  number: 2,
  ratings: { tiro: 83, pase: 90, defensa: 80, fisico: 80, stamina: 90, vision_de_juego: 90 },
  card_type: 'base',
}

const PLAYER_TOTY = {
  ...PLAYER,
  id: 'p5',
  display_name: 'Lorién',
  number: 38,
  ratings: { tiro: 98, pase: 98, defensa: 99, fisico: 70, stamina: 75, vision_de_juego: 99 },
  card_type: 'toty',
}

const PLAYER_GK_RATED = {
  ...PLAYER,
  id: 'p6',
  display_name: 'Miquel',
  number: 51,
  role: 'GK',
  ratings: { '9m': 87, '6m': 91, ex: 90, pas: 96, med: 99, '7m': 93 },
  card_type: 'toty',
}

function renderPage(playerId = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/player/${playerId}`]}>
      <Routes>
        <Route path="/player/:id" element={<PlayerCardPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PlayerCardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPlayerAvatarUrl.mockResolvedValue(null)
  })

  it('shows player name, number, role, and team', async () => {
    mockGetPlayer.mockResolvedValue(PLAYER)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Mateo')).toBeInTheDocument()
    })
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Extremo Izquierdo')).toBeInTheDocument()
    expect(screen.getByText('Dominicos')).toBeInTheDocument()
  })

  it('shows avatar image when photo is set', async () => {
    mockGetPlayer.mockResolvedValue(PLAYER_WITH_AVATAR)
    mockGetPlayerAvatarUrl.mockResolvedValue('https://example.com/photo.jpg')
    renderPage('p2')

    await waitFor(() => {
      expect(screen.getByText('Miguel')).toBeInTheDocument()
    })
    const img = await screen.findByAltText('Miguel')
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('shows injured badge when player is injured', async () => {
    mockGetPlayer.mockResolvedValue(PLAYER_INJURED)
    renderPage('p3')

    await waitFor(() => {
      expect(screen.getByText('Carlos')).toBeInTheDocument()
    })
    expect(screen.getByText(/lesionado/i)).toBeInTheDocument()
  })

  it('shows stat bars and media for field player with ratings', async () => {
    mockGetPlayer.mockResolvedValue(PLAYER_WITH_RATINGS)
    renderPage('p4')

    await waitFor(() => {
      expect(screen.getByText('Rubén')).toBeInTheDocument()
    })
    expect(screen.getByText('Tiro')).toBeInTheDocument()
    expect(screen.getByText('Pase')).toBeInTheDocument()
    expect(screen.getByText('83')).toBeInTheDocument()
    // Media = round((83+90+80+80+90+90)/6) = 86
    expect(screen.getByText('86')).toBeInTheDocument()
    expect(screen.queryByText(/estadísticas próximamente/i)).not.toBeInTheDocument()
  })

  it('shows TOTY badge for toty card type', async () => {
    mockGetPlayer.mockResolvedValue(PLAYER_TOTY)
    renderPage('p5')

    await waitFor(() => {
      expect(screen.getByText('Lorién')).toBeInTheDocument()
    })
    expect(screen.getByText('TOTY')).toBeInTheDocument()
  })

  it('shows TOTY card layout for toty player without ratings', async () => {
    const totyNoRatings = { ...PLAYER, id: 'p7', display_name: 'Iker', card_type: 'toty', ratings: null }
    mockGetPlayer.mockResolvedValue(totyNoRatings)
    renderPage('p7')

    await waitFor(() => {
      expect(screen.getByText('Iker')).toBeInTheDocument()
    })
    expect(screen.getByText('TOTY')).toBeInTheDocument()
    expect(screen.getByText(/estadísticas próximamente/i)).toBeInTheDocument()
  })

  it('shows GK stat labels for goalkeeper with ratings', async () => {
    mockGetPlayer.mockResolvedValue(PLAYER_GK_RATED)
    renderPage('p6')

    await waitFor(() => {
      expect(screen.getByText('Miquel')).toBeInTheDocument()
    })
    expect(screen.getByText('9M')).toBeInTheDocument()
    expect(screen.getByText('6M')).toBeInTheDocument()
    expect(screen.queryByText('Tiro')).not.toBeInTheDocument()
  })

  it('shows error when player not found', async () => {
    mockGetPlayer.mockRejectedValue(new Error('not found'))
    renderPage('nonexistent')

    await waitFor(() => {
      expect(screen.getByText(/jugador no encontrado/i)).toBeInTheDocument()
    })
  })

  it('shows stats placeholder when no ratings', async () => {
    mockGetPlayer.mockResolvedValue(PLAYER)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Mateo')).toBeInTheDocument()
    })
    expect(screen.getByText(/estadísticas próximamente/i)).toBeInTheDocument()
  })
})
