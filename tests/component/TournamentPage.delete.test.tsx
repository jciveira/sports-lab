import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TournamentPage } from '../../src/pages/TournamentPage'
import { useTournamentStore } from '../../src/hooks/useTournamentStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tournament/t1']}>
      <Routes>
        <Route path="/tournament/:id" element={<TournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const mockTournament = {
  id: 't1',
  name: 'Copa Test',
  date: '2026-03-28',
  num_teams: 8,
  status: 'group_stage' as const,
  viewer_code: 'abc',
  created_at: '2026-01-01',
}

describe('TournamentPage — Delete Tournament', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTournamentStore.setState({
      tournament: mockTournament,
      categories: [{ id: 'c1', tournament_id: 't1', name: 'Niños', groups: [] }],
      matches: [],
      teamsMap: new Map(),
      loading: false,
      error: null,
      fetchTournament: vi.fn(),
      deleteTournament: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('shows confirmation dialog, dismisses on cancel', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByLabelText('Eliminar torneo'))
    expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeInTheDocument()
    await user.click(screen.getByText('Cancelar'))
    expect(screen.queryByText('Esta acción no se puede deshacer.')).not.toBeInTheDocument()
  })

  it('calls deleteTournament and navigates to /tournaments on confirm', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByLabelText('Eliminar torneo'))
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(useTournamentStore.getState().deleteTournament).toHaveBeenCalledWith('t1')
    })
    expect(mockNavigate).toHaveBeenCalledWith('/tournaments')
  })
})
