import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExclusionDisplay } from '../../src/components/scoreboard/ExclusionDisplay'
import { useMatchStore } from '../../src/hooks/useMatchStore'

describe('ExclusionDisplay', () => {
  beforeEach(() => {
    useMatchStore.getState().reset()
  })

  it('renders nothing when no exclusions exist', () => {
    const { container } = render(
      <ExclusionDisplay team="home" teamColor="red" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows countdown timer for active exclusion', () => {
    useMatchStore.setState({ clockSeconds: 10 })
    useMatchStore.getState().addExclusion({
      player_id: 'p1',
      team_id: 'home',
      start_time: 0,
      duration: 120,
      half: 1,
    })
    render(<ExclusionDisplay team="home" teamColor="red" />)
    // 120 - 10 = 110 seconds remaining = 1:50
    expect(screen.getByText('1:50')).toBeInTheDocument()
  })

  it('renders nothing when exclusion is expired', () => {
    useMatchStore.setState({ clockSeconds: 130 })
    useMatchStore.getState().addExclusion({
      player_id: 'p1',
      team_id: 'home',
      start_time: 0,
      duration: 120,
      half: 1,
    })
    const { container } = render(<ExclusionDisplay team="home" teamColor="red" />)
    expect(container.firstChild).toBeNull()
  })

  it('only shows exclusions for the specified team', () => {
    useMatchStore.getState().addExclusion({
      player_id: 'p1',
      team_id: 'away',
      start_time: 0,
      duration: 120,
      half: 1,
    })
    const { container } = render(
      <ExclusionDisplay team="home" teamColor="red" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows multiple active exclusions with correct countdowns', () => {
    useMatchStore.setState({ clockSeconds: 30 })
    useMatchStore.getState().addExclusion({
      player_id: 'p1',
      team_id: 'home',
      start_time: 10,
      duration: 120,
      half: 1,
    })
    useMatchStore.getState().addExclusion({
      player_id: 'p2',
      team_id: 'home',
      start_time: 20,
      duration: 120,
      half: 1,
    })
    render(<ExclusionDisplay team="home" teamColor="red" />)
    expect(screen.getByText('2/3 activas')).toBeInTheDocument()
    expect(screen.getByText('1:40')).toBeInTheDocument()
    expect(screen.getByText('1:50')).toBeInTheDocument()
  })

  it('renders nothing when exclusions are from a different half', () => {
    useMatchStore.getState().addExclusion({
      player_id: 'p1',
      team_id: 'home',
      start_time: 0,
      duration: 120,
      half: 1,
    })
    useMatchStore.setState({ currentHalf: 2, clockSeconds: 10 })

    const { container } = render(<ExclusionDisplay team="home" teamColor="red" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows dismiss button only for operators', () => {
    useMatchStore.getState().addExclusion({
      player_id: 'p1',
      team_id: 'home',
      start_time: 0,
      duration: 120,
      half: 1,
    })
    const { rerender } = render(<ExclusionDisplay team="home" teamColor="red" isOperator={true} />)
    expect(screen.getByLabelText('Descartar exclusión')).toBeInTheDocument()

    rerender(<ExclusionDisplay team="home" teamColor="red" isOperator={false} />)
    expect(screen.queryByLabelText('Descartar exclusión')).not.toBeInTheDocument()
  })

  it('dismissing an exclusion removes it from active display', async () => {
    const user = userEvent.setup()
    useMatchStore.getState().addExclusion({
      player_id: 'p1',
      team_id: 'home',
      start_time: 0,
      duration: 120,
      half: 1,
    })
    const { container } = render(<ExclusionDisplay team="home" teamColor="red" isOperator={true} />)
    expect(screen.getByText('1/3 activas')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Descartar exclusión'))
    expect(container.firstChild).toBeNull()
  })

  it('calls onDismiss callback instead of store dismiss when provided', async () => {
    const user = userEvent.setup()
    const mockOnDismiss = vi.fn()
    useMatchStore.getState().addExclusion({
      player_id: 'p1',
      team_id: 'home',
      start_time: 0,
      duration: 120,
      half: 1,
    })
    render(<ExclusionDisplay team="home" teamColor="red" isOperator={true} onDismiss={mockOnDismiss} />)

    await user.click(screen.getByLabelText('Descartar exclusión'))

    expect(mockOnDismiss).toHaveBeenCalledOnce()
    expect(mockOnDismiss).toHaveBeenCalledWith(
      expect.objectContaining({ team_id: 'home', start_time: 0 }),
      0, // global index
    )
  })

  it('viewers see exclusions added via remote state (no dismiss button)', () => {
    useMatchStore.setState({
      exclusions: [{
        player_id: '',
        team_id: 'home',
        start_time: 0,
        duration: 120,
        half: 1,
      }],
    })
    render(<ExclusionDisplay team="home" teamColor="red" isOperator={false} />)
    expect(screen.getByText('Exclusiones')).toBeInTheDocument()
    expect(screen.getByText('1/3 activas')).toBeInTheDocument()
    expect(screen.queryByLabelText('Descartar exclusión')).not.toBeInTheDocument()
  })
})
