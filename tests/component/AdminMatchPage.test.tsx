import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminMatchPage } from '../../src/pages/AdminMatchPage'

const mockGetMatch = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockSaveSession = vi.fn()

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockSupabaseFrom(...args) },
  isSupabaseConfigured: true,
}))

vi.mock('../../src/lib/matches', () => ({
  getMatch: (...args: unknown[]) => mockGetMatch(...args),
}))

vi.mock('../../src/lib/session', () => ({
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
}))

const MATCH = {
  id: 'match-1',
  home_team_id: 'team-a',
  away_team_id: 'team-b',
  home_score: 5,
  away_score: 3,
  status: 'running',
  scorekeeper_code: 'SK1234',
  stat_tracker_code: 'ST5678',
  viewer_code: 'VW9012',
  current_half: 1,
  clock_seconds: 300,
  config_halves: 2,
  config_half_duration_minutes: 25,
  config_timeouts_per_half: 1,
  config_exclusion_duration_seconds: 120,
  source: 'live',
  created_at: '2026-03-30T10:00:00Z',
}

function mockTeamLookup() {
  let callCount = 0
  mockSupabaseFrom.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        single: () => {
          callCount++
          const name = callCount % 2 === 1 ? 'Dominicos' : 'Maristas'
          return Promise.resolve({ data: { name }, error: null })
        },
      }),
    }),
  }))
}

function renderPage(matchId = 'match-1') {
  return render(
    <MemoryRouter initialEntries={[`/admin/match/${matchId}`]}>
      <Routes>
        <Route path="/admin/match/:matchId" element={<AdminMatchPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminMatchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows match info with team names', async () => {
    mockGetMatch.mockResolvedValue(MATCH)
    mockTeamLookup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Administrar partido')).toBeInTheDocument()
    })
    expect(screen.getByText('Dominicos vs Maristas')).toBeInTheDocument()
    expect(screen.queryByText('SK1234')).not.toBeInTheDocument()
    expect(screen.queryByText('Código de anotador')).not.toBeInTheDocument()
  })

  it('shows match link (no code rows)', async () => {
    mockGetMatch.mockResolvedValue(MATCH)
    mockTeamLookup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/\/match\/match-1/)).toBeInTheDocument()
    })
    expect(screen.queryByText('Enlace de espectador')).not.toBeInTheDocument()
  })

  it('shows error when match not found', async () => {
    mockGetMatch.mockResolvedValue(null)
    renderPage('nonexistent')

    await waitFor(() => {
      expect(screen.getByText('Partido no encontrado')).toBeInTheDocument()
    })
  })

  it('shows status badge', async () => {
    mockGetMatch.mockResolvedValue(MATCH)
    mockTeamLookup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('En juego')).toBeInTheDocument()
    })
  })

  it('has link to view match', async () => {
    mockGetMatch.mockResolvedValue(MATCH)
    mockTeamLookup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Ver partido')).toBeInTheDocument()
    })
    expect(screen.getByText('Ver partido').closest('button')).toBeInTheDocument()
  })

  it('shows back link to games', async () => {
    mockGetMatch.mockResolvedValue(MATCH)
    mockTeamLookup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Administrar partido')).toBeInTheDocument()
    })
    const backLink = document.querySelector('a[href="/games"]')
    expect(backLink).toBeInTheDocument()
  })

  it('saves admin session when "Ver partido" clicked', async () => {
    mockGetMatch.mockResolvedValue(MATCH)
    mockTeamLookup()
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Ver partido')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Ver partido'))
    expect(mockSaveSession).toHaveBeenCalledWith('match-1', 'admin')
  })

  it('shows scheduled status for upcoming matches', async () => {
    mockGetMatch.mockResolvedValue({ ...MATCH, status: 'scheduled' })
    mockTeamLookup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Programado')).toBeInTheDocument()
    })
  })
})
