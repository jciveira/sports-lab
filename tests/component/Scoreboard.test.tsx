import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Scoreboard } from '../../src/components/scoreboard/Scoreboard'
import { useMatchStore } from '../../src/hooks/useMatchStore'

vi.mock('../../src/lib/access', () => ({
  scorekeeperHeartbeat: vi.fn().mockResolvedValue(undefined),
  isScorekeeperTimedOut: vi.fn().mockReturnValue(false),
}))
vi.mock('../../src/lib/session', () => ({
  getSession: vi.fn().mockReturnValue({ matchId: 'match-1', role: 'scorekeeper', sessionId: 'sess-1' }),
  saveSession: vi.fn().mockReturnValue('sess-1'),
  clearSession: vi.fn(),
}))

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Scoreboard', () => {
  beforeEach(() => {
    useMatchStore.getState().reset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows status badge with pulse when running', () => {
    useMatchStore.getState().toggleClock() // running
    const { container } = renderWithRouter(
      <Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={true} />
    )
    const pulse = container.querySelector('.animate-pulse')
    expect(pulse).toBeInTheDocument()
    expect(screen.getByText('en juego')).toBeInTheDocument()
  })

  it('does not show pulse when paused', () => {
    useMatchStore.getState().toggleClock()
    useMatchStore.getState().toggleClock() // paused
    const { container } = renderWithRouter(
      <Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={true} />
    )
    const pulse = container.querySelector('.animate-pulse')
    expect(pulse).not.toBeInTheDocument()
  })

  it('shows halftime status text', () => {
    useMatchStore.getState().setStatus('halftime')
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" />)
    expect(screen.getByText('Descanso')).toBeInTheDocument()
  })

  it('shows "Back to Home" link when finished (all users)', () => {
    useMatchStore.getState().setStatus('finished')
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={false} />)
    expect(screen.getByText('Volver al inicio')).toBeInTheDocument()
  })

  it('shows "Volver al inicio" link for operators when finished', () => {
    useMatchStore.getState().setStatus('finished')
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={true} />)
    expect(screen.getByText('Volver al inicio')).toBeInTheDocument()
  })

  it('renders both team names', () => {
    renderWithRouter(<Scoreboard homeTeamName="Lions" awayTeamName="Bears" isOperator={true} />)
    expect(screen.getByText('Lions')).toBeInTheDocument()
    expect(screen.getByText('Bears')).toBeInTheDocument()
  })

  it('uses default team names if not provided', () => {
    renderWithRouter(<Scoreboard />)
    expect(screen.getByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Visitante')).toBeInTheDocument()
  })

  it('renders ConnectionStatus when connectionState is provided', () => {
    renderWithRouter(
      <Scoreboard
        homeTeamName="Team A"
        awayTeamName="Team B"
        connectionState="online"
        pendingCount={0}
      />
    )
    expect(screen.getByText('En línea')).toBeInTheDocument()
  })

  it('shows offline indicator with pending count', () => {
    renderWithRouter(
      <Scoreboard
        homeTeamName="Team A"
        awayTeamName="Team B"
        connectionState="offline"
        pendingCount={5}
      />
    )
    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
    expect(screen.getByText('5 pendientes')).toBeInTheDocument()
  })

  it('does not render ConnectionStatus when connectionState is undefined', () => {
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" />)
    expect(screen.queryByText('En línea')).not.toBeInTheDocument()
    expect(screen.queryByText('Sin conexión')).not.toBeInTheDocument()
  })

  it('shows "Cancel Match" button for operator during active game', () => {
    useMatchStore.getState().setStatus('running')
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={true} />)
    expect(screen.getByLabelText('Cancelar partido')).toBeInTheDocument()
  })

  it('hides "Cancel Match" when match is finished', () => {
    useMatchStore.getState().setStatus('finished')
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={true} />)
    expect(screen.queryByLabelText('Cancelar partido')).not.toBeInTheDocument()
  })

  it('hides "Cancelar partido" for non-operators', () => {
    useMatchStore.getState().setStatus('running')
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={false} />)
    expect(screen.queryByLabelText('Cancelar partido')).not.toBeInTheDocument()
  })

  it('operator back button links to home', () => {
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={true} />)
    const link = screen.getByLabelText('Volver al inicio')
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })

  it('viewer leave button links to home', () => {
    renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={false} />)
    const link = screen.getByLabelText('Salir del partido')
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })

  describe('timeout banner', () => {
    it('shows timeout banner when activeTimeout is set', () => {
      useMatchStore.getState().setStatus('running')
      useMatchStore.getState().callTimeout('home')
      renderWithRouter(
        <Scoreboard homeTeamName="Colindres" awayTeamName="Dominicos" isOperator={false} />
      )
      expect(screen.getByText(/Tiempo Muerto — Colindres/)).toBeInTheDocument()
    })

    it('shows away team name for away timeout', () => {
      useMatchStore.getState().setStatus('running')
      useMatchStore.getState().callTimeout('away')
      renderWithRouter(
        <Scoreboard homeTeamName="Colindres" awayTeamName="Dominicos" isOperator={false} />
      )
      expect(screen.getByText(/Tiempo Muerto — Dominicos/)).toBeInTheDocument()
    })

    it('hides timeout banner when no timeout active', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard homeTeamName="Colindres" awayTeamName="Dominicos" isOperator={false} />
      )
      expect(screen.queryByText(/Tiempo Muerto/)).not.toBeInTheDocument()
    })

    it('shows timeout banner for operators too', () => {
      useMatchStore.getState().setStatus('running')
      useMatchStore.getState().callTimeout('home')
      renderWithRouter(
        <Scoreboard homeTeamName="Colindres" awayTeamName="Dominicos" isOperator={true} />
      )
      expect(screen.getByText(/Tiempo Muerto/)).toBeInTheDocument()
    })
  })

  describe('scorekeeper status widget', () => {
    it('shows Ser anotador button for viewer when unclaimed and running', () => {
      useMatchStore.getState().setStatus('running')
      const mockClaim = vi.fn()
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={false}
          onClaimScorekeeper={mockClaim}
        />
      )
      expect(screen.getByText('Ser anotador')).toBeInTheDocument()
    })

    it('shows Anotador disponible badge for operator when unclaimed', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={true}
          scorekeeperClaimed={false}
        />
      )
      expect(screen.getByText('Anotador: disponible')).toBeInTheDocument()
      // Operator badge is not a button (no onClaimScorekeeper)
      expect(screen.queryByText('Ser anotador')).not.toBeInTheDocument()
    })

    it('shows Anotado por badge for all roles including operator', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={true}
          scorekeeperClaimed={true}
          scorekeeperName="Mateo"
        />
      )
      expect(screen.getByText('Mateo')).toBeInTheDocument()
    })

    it('shows Anotado por badge for viewer role', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={true}
          scorekeeperName="Miguel"
        />
      )
      expect(screen.getByText('Miguel')).toBeInTheDocument()
    })

    it('shows Anotador activo when claimed but name is null', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={true}
          scorekeeperName={null}
        />
      )
      expect(screen.getByText('Anotador activo')).toBeInTheDocument()
    })

    it('hides status widget when match is finished', () => {
      useMatchStore.getState().setStatus('finished')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={false}
          onClaimScorekeeper={vi.fn()}
        />
      )
      expect(screen.queryByText('Ser anotador')).not.toBeInTheDocument()
      expect(screen.queryByText('Anotador: disponible')).not.toBeInTheDocument()
    })

    it('shows "Soltar el marcador" button for operator with onReleaseRole callback', () => {
      const onRelease = vi.fn()
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={true}
          onReleaseRole={onRelease}
        />
      )
      expect(screen.getByLabelText('Soltar el marcador')).toBeInTheDocument()
    })

    it('button label is visible on mobile (not hidden with sm:inline)', () => {
      const onRelease = vi.fn()
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={true}
          onReleaseRole={onRelease}
        />
      )
      // Text must be in the DOM — not wrapped in hidden sm:inline span
      expect(screen.getByText('Soltar el marcador')).toBeInTheDocument()
    })

    it('calls onReleaseRole and shows toast when button is clicked', () => {
      const onRelease = vi.fn()
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={true}
          onReleaseRole={onRelease}
        />
      )
      fireEvent.click(screen.getByLabelText('Soltar el marcador'))
      expect(onRelease).toHaveBeenCalledOnce()
      expect(screen.getByText('Marcador liberado')).toBeInTheDocument()
    })

    it('does not show release button when match is finished', () => {
      useMatchStore.getState().setStatus('finished')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={true}
          onReleaseRole={vi.fn()}
        />
      )
      expect(screen.queryByLabelText('Soltar el marcador')).not.toBeInTheDocument()
    })
  })

  describe('back button', () => {
    it('shows leave button for viewers during active play', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={false} />)
      expect(screen.getByLabelText('Salir del partido')).toBeInTheDocument()
    })

    it('shows back button for operators during active play', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={true} />)
      expect(screen.getByLabelText('Volver al inicio')).toBeInTheDocument()
    })

    it('shows leave button for viewers when match is finished', () => {
      useMatchStore.getState().setStatus('finished')
      renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={false} />)
      expect(screen.getByLabelText('Salir del partido')).toBeInTheDocument()
    })

    it('back button links to home page', () => {
      renderWithRouter(<Scoreboard homeTeamName="Team A" awayTeamName="Team B" isOperator={true} />)
      const link = screen.getByLabelText('Volver al inicio')
      expect(link.closest('a')).toHaveAttribute('href', '/')
    })
  })

  describe('scorekeeper claim flow', () => {
    it('shows "Ser anotador" button for viewers when role is free', () => {
      useMatchStore.getState().setStatus('running')
      const mockClaim = vi.fn().mockResolvedValue(true)
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={false}
          onClaimScorekeeper={mockClaim}
        />
      )
      expect(screen.getByText('Ser anotador')).toBeInTheDocument()
    })

    it('does not show claim button when scorekeeper is already active', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={true}
          onClaimScorekeeper={vi.fn()}
        />
      )
      expect(screen.queryByText('Ser anotador')).not.toBeInTheDocument()
    })

    it('does not show claim button when match is finished', () => {
      useMatchStore.getState().setStatus('finished')
      const mockClaim = vi.fn()
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={false}
          onClaimScorekeeper={mockClaim}
        />
      )
      expect(screen.queryByText('Ser anotador')).not.toBeInTheDocument()
    })

    it('shows name input after clicking "Ser anotador"', () => {
      useMatchStore.getState().setStatus('running')
      const mockClaim = vi.fn().mockResolvedValue(true)
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={false}
          onClaimScorekeeper={mockClaim}
        />
      )
      fireEvent.click(screen.getByText('Ser anotador'))
      expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument()
    })

    it('calls onClaimScorekeeper with entered name on submit', async () => {
      useMatchStore.getState().setStatus('running')
      const mockClaim = vi.fn().mockResolvedValue(false)
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={false}
          onClaimScorekeeper={mockClaim}
        />
      )
      fireEvent.click(screen.getByText('Ser anotador'))
      fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Mateo' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Anotar'))
      })
      expect(mockClaim).toHaveBeenCalledWith('Mateo')
    })

    it('shows error when claim is rejected', async () => {
      useMatchStore.getState().setStatus('running')
      const mockClaim = vi.fn().mockResolvedValue(false)
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={false}
          onClaimScorekeeper={mockClaim}
        />
      )
      fireEvent.click(screen.getByText('Ser anotador'))
      fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Mateo' } })
      await act(async () => {
        fireEvent.click(screen.getByText('Anotar'))
      })
      expect(screen.getByText('El rol de anotador ya está ocupado')).toBeInTheDocument()
    })

    it('does not show claim button for operators (MatchPage never passes onClaimScorekeeper to operators)', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={true}
          scorekeeperClaimed={false}
          // onClaimScorekeeper intentionally omitted — MatchPage passes undefined for operators
        />
      )
      expect(screen.queryByText('Ser anotador')).not.toBeInTheDocument()
      expect(screen.getByText('Anotador: disponible')).toBeInTheDocument()
    })
  })

  describe('scorekeeper badge', () => {
    it('shows "Anotado por" badge when scorekeeper is active (all roles)', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={true}
          scorekeeperName="Mateo"
        />
      )
      expect(screen.getByText('Mateo')).toBeInTheDocument()
    })

    it('does not show name when match is finished', () => {
      useMatchStore.getState().setStatus('finished')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={true}
          scorekeeperName="Mateo"
        />
      )
      expect(screen.queryByText('Mateo')).not.toBeInTheDocument()
    })

    it('shows Anotador activo when claimed but name is not set', () => {
      useMatchStore.getState().setStatus('running')
      renderWithRouter(
        <Scoreboard
          homeTeamName="Team A"
          awayTeamName="Team B"
          isOperator={false}
          scorekeeperClaimed={true}
          scorekeeperName={null}
        />
      )
      expect(screen.queryByText('Anotado por')).not.toBeInTheDocument()
      expect(screen.getByText('Anotador activo')).toBeInTheDocument()
    })
  })
})
