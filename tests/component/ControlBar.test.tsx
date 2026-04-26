import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ControlBar } from '../../src/components/scoreboard/ControlBar'
import { useMatchStore } from '../../src/hooks/useMatchStore'

describe('ControlBar', () => {
  const mockOnExclusion = vi.fn()

  beforeEach(() => {
    useMatchStore.getState().reset()
    mockOnExclusion.mockClear()
  })

  it('renders nothing for non-operators', () => {
    const { container } = render(<ControlBar isOperator={false} onExclusion={mockOnExclusion} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows pause button when running', () => {
    useMatchStore.getState().toggleClock() // running
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)
    expect(screen.getByLabelText('Pausar reloj')).toBeInTheDocument()
  })

  it('disables timeout when none left', () => {
    useMatchStore.getState().toggleClock()
    useMatchStore.getState().callTimeout('home')
    useMatchStore.getState().toggleClock() // resume
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)
    expect(screen.getByLabelText('Tiempo muerto local')).toBeDisabled()
  })

  it('disables exclusion button when team reaches max (3)', () => {
    useMatchStore.getState().toggleClock()
    useMatchStore.getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
    useMatchStore.getState().addExclusion({ player_id: 'p2', team_id: 'home', start_time: 0, duration: 120, half: 1 })
    useMatchStore.getState().addExclusion({ player_id: 'p3', team_id: 'home', start_time: 0, duration: 120, half: 1 })
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)
    expect(screen.getByLabelText('Exclusión local')).toBeDisabled()
    expect(screen.getByLabelText('Exclusión visitante')).not.toBeDisabled()
  })

  it('re-enables exclusion button after dismissing one', () => {
    useMatchStore.getState().toggleClock()
    useMatchStore.getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
    useMatchStore.getState().addExclusion({ player_id: 'p2', team_id: 'home', start_time: 0, duration: 120, half: 1 })
    useMatchStore.getState().addExclusion({ player_id: 'p3', team_id: 'home', start_time: 0, duration: 120, half: 1 })
    useMatchStore.getState().dismissExclusion(0)
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)
    expect(screen.getByLabelText('Exclusión local')).not.toBeDisabled()
  })

  it('calls onExclusion when exclusion button clicked', async () => {
    const user = userEvent.setup()
    useMatchStore.getState().toggleClock()
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)
    await user.click(screen.getByLabelText('Exclusión local'))
    expect(mockOnExclusion).toHaveBeenCalledWith('home')
  })

  it('shows "Siguiente parte" when paused in first half', () => {
    useMatchStore.getState().toggleClock()
    useMatchStore.getState().toggleClock() // pause
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)
    expect(screen.getByText('Siguiente parte')).toBeInTheDocument()
  })

  it('shows "Terminar partido" when paused in last half', () => {
    useMatchStore.getState().nextHalf()
    useMatchStore.getState().toggleClock()
    useMatchStore.getState().toggleClock() // pause
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)
    expect(screen.getByText('Terminar partido')).toBeInTheDocument()
  })

  it('hides controls when match is finished', () => {
    useMatchStore.getState().setStatus('finished')
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)
    expect(screen.queryByLabelText('Iniciar reloj')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tiempo muerto local')).not.toBeInTheDocument()
  })

  it('cancel: shows confirmation, confirms calls onCancel, dismiss hides dialog', async () => {
    const user = userEvent.setup()
    const mockOnCancel = vi.fn()
    useMatchStore.getState().toggleClock()
    render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} onCancel={mockOnCancel} />)

    await user.click(screen.getByLabelText('Cancelar partido'))
    expect(screen.getByText('¿Cancelar este partido?')).toBeInTheDocument()

    // Dismiss
    await user.click(screen.getByText('Seguir jugando'))
    expect(screen.queryByText('¿Cancelar este partido?')).not.toBeInTheDocument()

    // Confirm
    await user.click(screen.getByLabelText('Cancelar partido'))
    const buttons = screen.getAllByText('Cancelar partido')
    await user.click(buttons[buttons.length - 1])
    expect(mockOnCancel).toHaveBeenCalledOnce()
  })

  describe('Reset Score', () => {
    it('shows confirmation, resets scores on confirm, dismisses on cancel', async () => {
      const user = userEvent.setup()
      useMatchStore.getState().toggleClock()
      useMatchStore.getState().incrementScore('home')
      useMatchStore.getState().incrementScore('away')
      render(<ControlBar isOperator={true} onExclusion={mockOnExclusion} />)

      // Open dialog
      await user.click(screen.getByLabelText('Reiniciar marcador'))
      expect(screen.getByText('¿Reiniciar marcador a 0 – 0?')).toBeInTheDocument()

      // Dismiss
      await user.click(screen.getByText('Mantener marcador'))
      expect(screen.queryByText('¿Reiniciar marcador a 0 – 0?')).not.toBeInTheDocument()

      // Confirm reset
      await user.click(screen.getByLabelText('Reiniciar marcador'))
      const confirmButtons = screen.getAllByText('Reiniciar marcador')
      await user.click(confirmButtons[confirmButtons.length - 1])
      expect(useMatchStore.getState().homeScore).toBe(0)
      expect(useMatchStore.getState().awayScore).toBe(0)
    })
  })
})
