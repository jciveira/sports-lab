import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CreateTournamentPage } from '../../src/pages/CreateTournamentPage'
import { useTeamsStore } from '../../src/hooks/useTeamsStore'
import type { DbTeam } from '../../src/lib/database.types'

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('../../src/lib/tournaments', () => ({
  createTournament: vi.fn(),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateTournamentPage />
    </MemoryRouter>,
  )
}

const threeTeams = [
  makeTeam({ id: 't1', name: 'Dominicos' }),
  makeTeam({ id: 't2', name: 'Maristas' }),
  makeTeam({ id: 't3', name: 'Teucro' }),
]

describe('CreateTournamentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTeamsStore.setState({
      teams: [],
      loading: false,
      error: null,
      fetch: vi.fn(),
      add: vi.fn().mockImplementation(async (team: { name: string }) => makeTeam({ name: team.name })),
      update: vi.fn(),
      remove: vi.fn(),
    })
  })

  it('shows error message when createTournament throws', async () => {
    const { createTournament } = await import('../../src/lib/tournaments')
    const mockCreate = vi.mocked(createTournament)
    mockCreate.mockRejectedValueOnce(new Error('Database connection failed'))

    const fullTeams = Array.from({ length: 8 }, (_, i) =>
      makeTeam({ id: `team-${i}`, name: `Team ${i + 1}` }),
    )
    useTeamsStore.setState({ teams: fullTeams })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Nombre del torneo'), 'Spring Cup')
    const dateInput = document.querySelector('input[type="date"]') as HTMLElement
    await user.type(dateInput, '2026-04-03')
    await user.click(screen.getByText(/Siguiente/))

    for (let i = 0; i < 4; i++) await user.click(screen.getAllByText('→ A')[0])
    for (let i = 0; i < 4; i++) await user.click(screen.getAllByText('→ B')[0])

    await user.click(screen.getByRole('button', { name: /Confirmar/ }))
    await user.click(screen.getByRole('button', { name: /Crear torneo/ }))

    expect(await screen.findByText(/No se pudo crear el torneo: Database connection failed/)).toBeInTheDocument()
  })

  it('shows user-friendly duplicate name error', async () => {
    const { createTournament } = await import('../../src/lib/tournaments')
    const mockCreate = vi.mocked(createTournament)
    mockCreate.mockRejectedValueOnce(new Error('Ya existe un torneo con el nombre "Spring Cup"'))

    const fullTeams = Array.from({ length: 8 }, (_, i) =>
      makeTeam({ id: `team-${i}`, name: `Team ${i + 1}` }),
    )
    useTeamsStore.setState({ teams: fullTeams })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Nombre del torneo'), 'Spring Cup')
    const dateInput = document.querySelector('input[type="date"]') as HTMLElement
    await user.type(dateInput, '2026-04-03')
    await user.click(screen.getByText(/Siguiente/))

    for (let i = 0; i < 4; i++) await user.click(screen.getAllByText('→ A')[0])
    for (let i = 0; i < 4; i++) await user.click(screen.getAllByText('→ B')[0])

    await user.click(screen.getByRole('button', { name: /Confirmar/ }))
    await user.click(screen.getByRole('button', { name: /Crear torneo/ }))

    expect(await screen.findByText(/Ya existe un torneo con el nombre/)).toBeInTheDocument()
  })

  it('auto-generate calls store.add for each missing team', async () => {
    useTeamsStore.setState({ teams: threeTeams })
    const addMock = vi.fn().mockImplementation(async (team: { name: string }) => {
      const created = makeTeam({ name: team.name })
      const current = useTeamsStore.getState().teams
      useTeamsStore.setState({ teams: [...current, created] })
      return created
    })
    useTeamsStore.setState({ add: addMock })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Nombre del torneo'), 'Cup')
    const dateInput = document.querySelector('input[type="date"]') as HTMLElement
    await user.type(dateInput, '2026-04-03')
    await user.click(screen.getByText(/Siguiente/))

    await user.click(screen.getByText(/Generar/))
    expect(addMock).toHaveBeenCalledTimes(5)
  })

  it('shows error when auto-generate fails', async () => {
    useTeamsStore.setState({ teams: threeTeams })
    const addMock = vi.fn().mockRejectedValueOnce(new Error('Supabase insert failed'))
    useTeamsStore.setState({ add: addMock })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Nombre del torneo'), 'Cup')
    const dateInput = document.querySelector('input[type="date"]') as HTMLElement
    await user.type(dateInput, '2026-04-03')
    await user.click(screen.getByText(/Siguiente/))

    await user.click(screen.getByText(/Generar/))
    expect(await screen.findByText('Supabase insert failed')).toBeInTheDocument()
  })

  it('shows Confirmar button after completing group assignment', async () => {
    const fullTeams = Array.from({ length: 8 }, (_, i) =>
      makeTeam({ id: `team-${i}`, name: `Team ${i + 1}` }),
    )
    useTeamsStore.setState({ teams: fullTeams })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Nombre del torneo'), 'Cup')
    const dateInput = document.querySelector('input[type="date"]') as HTMLElement
    await user.type(dateInput, '2026-04-03')
    await user.click(screen.getByText(/Siguiente/))

    for (let i = 0; i < 4; i++) await user.click(screen.getAllByText('→ A')[0])
    for (let i = 0; i < 4; i++) await user.click(screen.getAllByText('→ B')[0])

    expect(screen.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument()
  })
})
