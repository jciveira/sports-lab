import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TournamentsTab } from '../../src/pages/TournamentsTab'
import { listTournaments } from '../../src/lib/tournaments'
import type { DbTournament } from '../../src/lib/database.types'

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('../../src/lib/tournaments', () => ({
  listTournaments: vi.fn(),
}))

const mockListTournaments = vi.mocked(listTournaments)

function makeTournament(overrides: Partial<DbTournament> & { id: string; name: string; status: string }): DbTournament {
  return {
    num_teams: 8,
    date: null,
    viewer_code: 'ABCD',
    created_at: '',
    category: null,
    gender: null,
    ...overrides,
  } as DbTournament
}

function renderTab() {
  return render(
    <MemoryRouter>
      <TournamentsTab />
    </MemoryRouter>,
  )
}

describe('TournamentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders three section headings', async () => {
    mockListTournaments.mockResolvedValue([])

    renderTab()

    const headings = await screen.findAllByRole('heading', { level: 2 })
    const texts = headings.map((h) => h.textContent ?? '')
    expect(texts.some((t) => /En curso/i.test(t))).toBe(true)
    expect(texts.some((t) => /Próximos/i.test(t))).toBe(true)
    expect(texts.some((t) => /Finalizados/i.test(t))).toBe(true)
  })

  it('shows empty state text when no tournaments exist', async () => {
    mockListTournaments.mockResolvedValue([])

    renderTab()

    expect(await screen.findByText('No hay torneos en curso')).toBeInTheDocument()
    expect(screen.getByText('No hay torneos próximos')).toBeInTheDocument()
    expect(screen.getByText('No hay torneos finalizados')).toBeInTheDocument()
  })

  it('places group_stage tournament in En curso section', async () => {
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Copa Primavera', status: 'group_stage' }),
    ])

    renderTab()

    expect(await screen.findByText('Copa Primavera')).toBeInTheDocument()
    // Should not appear in the finished section (no finished empty state means there IS a finished section with empty text)
    expect(screen.getByText('No hay torneos finalizados')).toBeInTheDocument()
  })

  it('places knockouts tournament in En curso section', async () => {
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Liga Verano', status: 'knockouts' }),
    ])

    renderTab()

    expect(await screen.findByText('Liga Verano')).toBeInTheDocument()
    expect(screen.getByText('No hay torneos finalizados')).toBeInTheDocument()
  })

  it('places finished tournament in Finalizados section', async () => {
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Torneo Otoño', status: 'finished' }),
    ])

    renderTab()

    expect(await screen.findByText('Torneo Otoño')).toBeInTheDocument()
    expect(screen.getByText('No hay torneos en curso')).toBeInTheDocument()
  })

  it('filters out draft tournaments', async () => {
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 't1', name: 'Borrador Interno', status: 'draft' }),
    ])

    renderTab()

    await screen.findByText('No hay torneos en curso')
    expect(screen.queryByText('Borrador Interno')).not.toBeInTheDocument()
  })

  it('links tournament card to /torneos/:id', async () => {
    mockListTournaments.mockResolvedValue([
      makeTournament({ id: 'abc123', name: 'Copa Test', status: 'group_stage' }),
    ])

    renderTab()

    const link = await screen.findByRole('link', { name: /Copa Test/ })
    expect(link).toHaveAttribute('href', '/torneos/abc123')
  })
})
