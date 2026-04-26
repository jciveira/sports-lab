import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminTorneosPage } from '../../src/pages/admin/AdminTorneosPage'
import type { DbTournament } from '../../src/lib/database.types'

const mockListTournaments = vi.fn<() => Promise<DbTournament[]>>()
const mockDeleteTournament = vi.fn<() => Promise<void>>()
const mockUpdateTournament = vi.fn<() => Promise<void>>()

vi.mock('../../src/lib/tournaments', () => ({
  listTournaments: (...args: unknown[]) => mockListTournaments(...args as []),
  deleteTournament: (...args: unknown[]) => mockDeleteTournament(...(args as [string])),
  updateTournament: (...args: unknown[]) => mockUpdateTournament(...(args as [string, object])),
}))

function makeTournament(overrides: Partial<DbTournament> & { id: string }): DbTournament {
  return {
    name: 'Torneo Test',
    date: '2026-04-15',
    num_teams: 8,
    status: 'group_stage',
    viewer_code: 'VW1',
    category: null,
    gender: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/torneos']}>
      <AdminTorneosPage />
    </MemoryRouter>,
  )
}

describe('AdminTorneosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('groups tournaments into sections by status', async () => {
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Liga Activa', status: 'group_stage' }),
      makeTournament({ id: 't2', name: 'Copa Draft', status: 'draft' }),
      makeTournament({ id: 't3', name: 'Torneo Viejo', status: 'finished' }),
    ])
    renderPage()
    expect(await screen.findByText('Liga Activa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /En curso/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Próximos/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Finalizados/ })).toBeInTheDocument()
  })

  it('finished section is collapsed by default, active section is expanded', async () => {
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Liga Activa', status: 'group_stage' }),
      makeTournament({ id: 't2', name: 'Torneo Viejo', status: 'finished' }),
    ])
    renderPage()
    await screen.findByText('Liga Activa') // active section expanded
    expect(screen.queryByText('Torneo Viejo')).not.toBeInTheDocument() // finished collapsed

    const finishedBtn = screen.getByRole('button', { name: /Finalizados/ })
    await userEvent.setup().click(finishedBtn)
    expect(screen.getByText('Torneo Viejo')).toBeInTheDocument()
  })

  it('shows category label when tournament has category and gender', async () => {
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Copa Primavera', category: 'Alevín', gender: 'Masculino' }),
    ])
    renderPage()
    expect(await screen.findByText('Alevín Masculino')).toBeInTheDocument()
  })

  it('shows empty state when no tournaments', async () => {
    mockListTournaments.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/No hay torneos/)).toBeInTheDocument()
  })

  it('shows error state on fetch failure', async () => {
    mockListTournaments.mockRejectedValue(new Error('fail'))
    renderPage()
    expect(await screen.findByText('No se pudieron cargar los torneos')).toBeInTheDocument()
  })

  it('filters tournaments by category dropdown', async () => {
    const user = userEvent.setup()
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Copa Alevín', category: 'Alevín', gender: 'Masculino' }),
      makeTournament({ id: 't2', name: 'Copa Cadete', category: 'Cadete', gender: 'Femenino' }),
    ])
    renderPage()
    await screen.findByText('Copa Alevín')
    await user.selectOptions(screen.getByDisplayValue('Todas las categorías'), 'Alevín')
    expect(screen.getByText('Copa Alevín')).toBeInTheDocument()
    expect(screen.queryByText('Copa Cadete')).not.toBeInTheDocument()
  })

  it('shows tournaments with null category when a category filter is active', async () => {
    const user = userEvent.setup()
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'CORRALES', category: null, gender: null }),
      makeTournament({ id: 't2', name: 'Copa Cadete', category: 'Cadete', gender: 'Femenino' }),
    ])
    renderPage()
    await screen.findByText('CORRALES')
    await user.selectOptions(screen.getByDisplayValue('Todas las categorías'), 'Alevín')
    expect(screen.getByText('CORRALES')).toBeInTheDocument()
    expect(screen.queryByText('Copa Cadete')).not.toBeInTheDocument()
  })

  it('shows tournaments with null gender when a gender filter is active', async () => {
    const user = userEvent.setup()
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'CORRALES', category: null, gender: null }),
      makeTournament({ id: 't2', name: 'Copa Fem', category: 'Alevín', gender: 'Femenino' }),
    ])
    renderPage()
    await screen.findByText('CORRALES')
    await user.selectOptions(screen.getByDisplayValue('Todos los géneros'), 'Masculino')
    expect(screen.getByText('CORRALES')).toBeInTheDocument()
    expect(screen.queryByText('Copa Fem')).not.toBeInTheDocument()
  })

  describe('edit tournament', () => {
    it('shows edit button on each tournament card', async () => {
      mockListTournaments.mockResolvedValue([
        makeTournament({ id: 't1', name: 'Copa Test' }),
      ])
      renderPage()
      expect(await screen.findByRole('button', { name: 'Editar torneo' })).toBeInTheDocument()
    })

    it('clicking edit opens form pre-populated with current values', async () => {
      const user = userEvent.setup()
      mockListTournaments.mockResolvedValue([
        makeTournament({ id: 't1', name: 'Liga Verano', date: '2026-07-01', category: 'Alevín', gender: 'Masculino' }),
      ])
      renderPage()
      await user.click(await screen.findByRole('button', { name: 'Editar torneo' }))
      expect(screen.getByDisplayValue('Liga Verano')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2026-07-01')).toBeInTheDocument()
    })

    it('shows warning when editing a started tournament', async () => {
      const user = userEvent.setup()
      mockListTournaments.mockResolvedValue([
        makeTournament({ id: 't1', name: 'Copa Activa', status: 'group_stage' }),
      ])
      renderPage()
      await user.click(await screen.findByRole('button', { name: 'Editar torneo' }))
      expect(screen.getByText(/ya ha comenzado/)).toBeInTheDocument()
    })

    it('does not show warning for draft tournament', async () => {
      const user = userEvent.setup()
      mockListTournaments.mockResolvedValue([
        makeTournament({ id: 't1', name: 'Copa Draft', status: 'draft' }),
      ])
      renderPage()
      await user.click(await screen.findByRole('button', { name: 'Editar torneo' }))
      expect(screen.queryByText(/ya ha comenzado/)).not.toBeInTheDocument()
    })

    it('calls updateTournament with new values on save', async () => {
      const user = userEvent.setup()
      mockListTournaments.mockResolvedValue([
        makeTournament({ id: 't1', name: 'Viejo nombre' }),
      ])
      mockUpdateTournament.mockResolvedValue(undefined)
      renderPage()
      await user.click(await screen.findByRole('button', { name: 'Editar torneo' }))
      const nameInput = screen.getByDisplayValue('Viejo nombre')
      await user.clear(nameInput)
      await user.type(nameInput, 'Nuevo nombre')
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
      expect(mockUpdateTournament).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'Nuevo nombre' }))
    })

    it('canceling edit closes the form without saving', async () => {
      const user = userEvent.setup()
      mockListTournaments.mockResolvedValue([
        makeTournament({ id: 't1', name: 'Copa Test' }),
      ])
      renderPage()
      await user.click(await screen.findByRole('button', { name: 'Editar torneo' }))
      await user.click(screen.getByRole('button', { name: 'Cancelar edición' }))
      expect(mockUpdateTournament).not.toHaveBeenCalled()
      expect(screen.getByText('Copa Test')).toBeInTheDocument()
    })
  })

  it('deletes a tournament after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Torneo Borrar' }),
    ])
    mockDeleteTournament.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('Torneo Borrar')
    const deleteBtn = screen.getByTitle('Eliminar torneo')
    await userEvent.setup().click(deleteBtn)
    expect(mockDeleteTournament).toHaveBeenCalledWith('t1')
  })
})
