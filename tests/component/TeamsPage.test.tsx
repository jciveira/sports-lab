import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TeamsPage } from '../../src/pages/TeamsPage'
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

function renderTeamsPage() {
  return render(
    <MemoryRouter>
      <TeamsPage />
    </MemoryRouter>,
  )
}

const seedTeams = [
  makeTeam({ id: 'team-1', name: 'Dominicos' }),
  makeTeam({ id: 'team-2', name: 'Maristas' }),
  makeTeam({ id: 'team-3', name: 'Teucro' }),
]

describe('TeamsPage — duplicate name validation', () => {
  beforeEach(() => {
    const store = useTeamsStore.getState()
    useTeamsStore.setState({
      teams: seedTeams,
      loading: false,
      error: null,
      fetch: vi.fn(),
      add: vi.fn().mockResolvedValue(makeTeam({ name: 'New' })),
      update: store.update,
      remove: store.remove,
    })
  })

  describe('create form', () => {
    it('shows error for case-insensitive duplicates and clears on input change', async () => {
      const user = userEvent.setup()
      renderTeamsPage()

      await user.click(screen.getByText('Nuevo equipo', { selector: 'button' }))
      const input = screen.getByPlaceholderText('Nombre del equipo')
      await user.type(input, 'DOMINICOS')
      await user.click(screen.getByText('Crear'))

      expect(screen.getByText('Un equipo con este nombre ya existe')).toBeInTheDocument()
      expect(useTeamsStore.getState().add).not.toHaveBeenCalled()

      await user.type(input, 'X')
      expect(screen.queryByText('Un equipo con este nombre ya existe')).not.toBeInTheDocument()
    })

    it('allows creating a team with a unique name', async () => {
      const user = userEvent.setup()
      renderTeamsPage()

      await user.click(screen.getByText('Nuevo equipo', { selector: 'button' }))
      await user.type(screen.getByPlaceholderText('Nombre del equipo'), 'Ademar')
      await user.click(screen.getByText('Crear'))

      expect(screen.queryByText('Un equipo con este nombre ya existe')).not.toBeInTheDocument()
      expect(useTeamsStore.getState().add).toHaveBeenCalledWith({
        name: 'Ademar',
        badge_url: undefined,
      })
    })
  })

  describe('edit form', () => {
    it('shows error when renaming to an existing team name', async () => {
      const user = userEvent.setup()
      renderTeamsPage()

      const editButtons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('svg.lucide-pencil'),
      )
      await user.click(editButtons[0])

      const input = screen.getByDisplayValue('Dominicos')
      await user.clear(input)
      await user.type(input, 'Maristas')
      await user.click(screen.getByText('Guardar'))

      expect(screen.getByText('Un equipo con este nombre ya existe')).toBeInTheDocument()
    })

    it('allows saving same name (self-exclusion)', async () => {
      const user = userEvent.setup()
      const mockUpdate = vi.fn().mockResolvedValue(undefined)
      useTeamsStore.setState({ update: mockUpdate })
      renderTeamsPage()

      const editButtons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('svg.lucide-pencil'),
      )
      await user.click(editButtons[0])
      await user.click(screen.getByText('Guardar'))

      expect(screen.queryByText('Un equipo con este nombre ya existe')).not.toBeInTheDocument()
    })
  })
})
