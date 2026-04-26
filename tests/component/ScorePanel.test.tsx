import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScorePanel } from '../../src/components/scoreboard/ScorePanel'
import { useMatchStore } from '../../src/hooks/useMatchStore'

describe('ScorePanel', () => {
  beforeEach(() => {
    useMatchStore.getState().reset()
  })

  it('increments score on + click', async () => {
    const user = userEvent.setup()
    render(<ScorePanel team="home" teamName="Tigers" color="red" isOperator={true} />)
    await user.click(screen.getByLabelText('Sumar gol Tigers'))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('decrements score on - click', async () => {
    const user = userEvent.setup()
    useMatchStore.getState().incrementScore('home')
    useMatchStore.getState().incrementScore('home')
    render(<ScorePanel team="home" teamName="Tigers" color="red" isOperator={true} />)
    await user.click(screen.getByLabelText('Restar gol Tigers'))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('hides score buttons for non-operators', () => {
    render(<ScorePanel team="home" teamName="Tigers" color="red" isOperator={false} />)
    expect(screen.queryByLabelText('Sumar gol Tigers')).not.toBeInTheDocument()
  })
})
