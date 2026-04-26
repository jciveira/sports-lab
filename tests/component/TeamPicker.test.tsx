import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamPicker } from '../../src/components/ui/TeamPicker'
import { useTeamsStore } from '../../src/hooks/useTeamsStore'
import type { DbTeam } from '../../src/lib/database.types'

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

function makeTeam(overrides: Partial<DbTeam> & { name: string }): DbTeam {
  return {
    id: crypto.randomUUID(),
    nickname: null,
    badge_url: null,
    city_district: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

const seedTeams = [
  makeTeam({ id: 'team-1', name: 'Dominicos' }),
  makeTeam({ id: 'team-2', name: 'Maristas' }),
]

describe('TeamPicker — duplicate name validation', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
    useTeamsStore.setState({
      teams: seedTeams,
      loading: false,
      error: null,
      fetch: vi.fn(),
      add: vi.fn().mockResolvedValue(makeTeam({ name: 'New' })),
    })
  })

  it('shows error when quick-creating a duplicate team name (case-insensitive)', async () => {
    const user = userEvent.setup()
    render(<TeamPicker value={null} onChange={mockOnChange} />)

    await user.click(screen.getByText('Selecciona equipo'))
    await user.type(screen.getByPlaceholderText('Nombre del nuevo equipo...'), 'dominicos')

    const plusButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-plus'),
    )
    await user.click(plusButtons[0])

    expect(screen.getByText('Un equipo con este nombre ya existe')).toBeInTheDocument()
    expect(useTeamsStore.getState().add).not.toHaveBeenCalled()
  })

  it('clears error when user modifies the quick-create input', async () => {
    const user = userEvent.setup()
    render(<TeamPicker value={null} onChange={mockOnChange} />)

    await user.click(screen.getByText('Selecciona equipo'))
    const input = screen.getByPlaceholderText('Nombre del nuevo equipo...')
    await user.type(input, 'Dominicos')

    const plusButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-plus'),
    )
    await user.click(plusButtons[0])
    expect(screen.getByText('Un equipo con este nombre ya existe')).toBeInTheDocument()

    await user.type(input, 'X')
    expect(screen.queryByText('Un equipo con este nombre ya existe')).not.toBeInTheDocument()
  })

  it('allows quick-creating a team with a unique name', async () => {
    const user = userEvent.setup()
    render(<TeamPicker value={null} onChange={mockOnChange} />)

    await user.click(screen.getByText('Selecciona equipo'))
    await user.type(screen.getByPlaceholderText('Nombre del nuevo equipo...'), 'Ademar')

    const plusButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg.lucide-plus'),
    )
    await user.click(plusButtons[0])

    expect(screen.queryByText('Un equipo con este nombre ya existe')).not.toBeInTheDocument()
    expect(useTeamsStore.getState().add).toHaveBeenCalledWith({ name: 'Ademar' })
  })
})
