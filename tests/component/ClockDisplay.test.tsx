import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClockDisplay } from '../../src/components/scoreboard/ClockDisplay'
import { useMatchStore } from '../../src/hooks/useMatchStore'

describe('ClockDisplay', () => {
  beforeEach(() => {
    useMatchStore.getState().reset()
  })

  it('formats minutes and seconds from store state', () => {
    useMatchStore.setState({ clockSeconds: 125 }) // 2:05
    render(<ClockDisplay />)
    expect(screen.getByText('02:05')).toBeInTheDocument()
  })

  it('reflects half change after nextHalf', () => {
    useMatchStore.getState().nextHalf()
    render(<ClockDisplay />)
    expect(screen.getByText('2do tiempo (2/2)')).toBeInTheDocument()
  })
})
