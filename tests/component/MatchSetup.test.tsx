import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatchSetup } from '../../src/components/scoreboard/MatchSetup'
import { useMatchStore } from '../../src/hooks/useMatchStore'
import { useTeamsStore } from '../../src/hooks/useTeamsStore'
import type { DbTeam } from '../../src/lib/database.types'

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

const HOME_TEAM: DbTeam = { id: 'h1', name: 'Home', badge_url: null, nickname: null, city_district: null, created_at: '', category: null, gender: null, region: null }
const AWAY_TEAM: DbTeam = { id: 'a1', name: 'Away', badge_url: null, nickname: null, city_district: null, created_at: '', category: null, gender: null, region: null }

describe('MatchSetup', () => {
  const mockOnStart = vi.fn()

  beforeEach(() => {
    useMatchStore.getState().reset()
    useTeamsStore.setState({ teams: [HOME_TEAM, AWAY_TEAM], loading: false, error: null })
    mockOnStart.mockClear()
  })

  it('applies preset on click', async () => {
    const user = userEvent.setup()
    render(<MatchSetup onStart={mockOnStart} />)
    await user.click(screen.getByText('U14 Standard (2×25 min)'))
    expect(useMatchStore.getState().config.halfDurationMinutes).toBe(25)
  })

  it('calls onStart when start button clicked', async () => {
    const user = userEvent.setup()
    const mockChange = vi.fn()
    render(
      <MatchSetup
        onStart={mockOnStart}
        homeTeam={HOME_TEAM}
        awayTeam={AWAY_TEAM}
        onHomeTeamChange={mockChange}
        onAwayTeamChange={mockChange}
      />
    )
    await user.click(screen.getByText('Empezar partido'))
    expect(mockOnStart).toHaveBeenCalledOnce()
  })

  it('toggles advanced settings', async () => {
    const user = userEvent.setup()
    render(<MatchSetup onStart={mockOnStart} />)
    expect(screen.queryByText('Partes')).not.toBeInTheDocument()
    await user.click(screen.getByText('Mostrar configuración avanzada'))
    expect(screen.getByText('Partes')).toBeInTheDocument()
  })
})
