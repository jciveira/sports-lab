import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminPartidosPage } from '../../src/pages/admin/AdminPartidosPage'

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: true,
}))

const mockActivate = vi.fn().mockResolvedValue(undefined)
const mockFinish = vi.fn().mockResolvedValue(undefined)
const mockDelete = vi.fn().mockResolvedValue(undefined)

const mockUpdateSchedule = vi.fn().mockResolvedValue(undefined)

vi.mock('../../src/lib/matches', () => ({
  listMatchesWithTeams: vi.fn(),
  activateMatch: (...args: unknown[]) => mockActivate(...args),
  finishMatch: (...args: unknown[]) => mockFinish(...args),
  deleteMatch: (...args: unknown[]) => mockDelete(...args),
  updateMatchSchedule: (...args: unknown[]) => mockUpdateSchedule(...args),
  formatMatchDate: (startsAt: string | null | undefined) => startsAt ? 'mié 01 abr · 10:00' : null,
  toDatetimeLocal: (iso: string) => iso ? '2026-04-01T10:00' : '',
}))

import { listMatchesWithTeams } from '../../src/lib/matches'

const MATCH_LIVE = {
  id: 'm1', status: 'running', home_score: 3, away_score: 1,
  homeTeamName: 'Dominicos', awayTeamName: 'Vikingos',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-15T10:00:00Z',
  home_team_id: 't1', away_team_id: 't2', tournament_id: null, starts_at: null,
}
const MATCH_SCHEDULED = {
  id: 'm2', status: 'scheduled', home_score: 0, away_score: 0,
  homeTeamName: 'Lobos', awayTeamName: 'Águilas',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-16T10:00:00Z',
  home_team_id: 't3', away_team_id: 't4', tournament_id: null, starts_at: null,
}
const MATCH_SCHEDULED_WITH_DATE = {
  id: 'm4', status: 'scheduled', home_score: 0, away_score: 0,
  homeTeamName: 'Lobos', awayTeamName: 'Águilas',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-16T10:00:00Z',
  home_team_id: 't3', away_team_id: 't4', tournament_id: null, starts_at: '2026-04-02T07:30:00Z',
}
const MATCH_FINISHED = {
  id: 'm3', status: 'finished', home_score: 5, away_score: 3,
  homeTeamName: 'Tigres', awayTeamName: 'Leones',
  homeTeamLogo: null, awayTeamLogo: null, created_at: '2026-01-14T10:00:00Z',
  home_team_id: 't5', away_team_id: 't6', tournament_id: null, starts_at: null,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPartidosPage />
    </MemoryRouter>,
  )
}

describe('AdminPartidosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Crear partido" link to /admin/partidos/nuevo', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([])
    renderPage()
    await screen.findByText('No hay partidos en directo')
    const link = screen.getByRole('link', { name: /crear partido/i })
    expect(link).toHaveAttribute('href', '/admin/partidos/nuevo')
  })

  it('shows Activar button for scheduled match', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_SCHEDULED as any])
    renderPage()
    await screen.findByText('Lobos')
    expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument()
  })

  it('shows Finalizar and Abrir marcador for live match', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderPage()
    await screen.findByText('Dominicos')
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /abrir marcador/i })).toBeInTheDocument()
  })

  it('shows delete confirmation for finished match', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_FINISHED as any])
    renderPage()
    await user.click(await screen.findByRole('button', { name: /finalizados/i }))
    await screen.findByText('Tigres')

    await user.click(screen.getByRole('button', { name: /eliminar partido/i }))
    expect(screen.getByText(/¿Eliminar\?/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar eliminar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar eliminar/i })).toBeInTheDocument()
  })

  it('calls deleteMatch and removes card after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_FINISHED as any])
    renderPage()
    await user.click(await screen.findByRole('button', { name: /finalizados/i }))
    await screen.findByText('Tigres')

    await user.click(screen.getByRole('button', { name: /eliminar partido/i }))
    await user.click(screen.getByRole('button', { name: /confirmar eliminar/i }))
    expect(mockDelete).toHaveBeenCalledWith('m3')
    expect(screen.queryByText('Tigres')).not.toBeInTheDocument()
  })

  it('shows Finalizar confirmation dialog', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderPage()
    await screen.findByText('Dominicos')

    await user.click(screen.getByRole('button', { name: /finalizar/i }))
    expect(screen.getByText(/¿Finalizar\?/i)).toBeInTheDocument()
  })

  it('calls activateMatch when Activar is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_SCHEDULED as any])
    renderPage()
    await screen.findByText('Lobos')

    await user.click(screen.getByRole('button', { name: /activar/i }))
    expect(mockActivate).toHaveBeenCalledWith('m2')
  })

  it('shows empty state for expanded sections; Finalizados hidden until expanded', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([])
    renderPage()
    await screen.findByText('No hay partidos en directo')
    expect(screen.getByText('No hay partidos programados')).toBeInTheDocument()
    expect(screen.queryByText('No hay partidos finalizados')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /finalizados/i }))
    expect(screen.getByText('No hay partidos finalizados')).toBeInTheDocument()
  })

  it('section headers are collapsible buttons with aria-expanded', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any, MATCH_FINISHED as any])
    renderPage()
    await screen.findByText('Dominicos')

    const liveBtn = screen.getByRole('button', { name: /en directo/i })
    const finishedBtn = screen.getByRole('button', { name: /finalizados/i })
    expect(liveBtn).toHaveAttribute('aria-expanded', 'true')
    expect(finishedBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking collapsed Finalizados section reveals its matches', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_FINISHED as any])
    renderPage()
    await screen.findByRole('button', { name: /finalizados/i })

    expect(screen.queryByText('Tigres')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /finalizados/i }))
    expect(screen.getByText('Tigres')).toBeInTheDocument()
  })

  it('clicking expanded En directo section hides its matches', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_LIVE as any])
    renderPage()
    await screen.findByText('Dominicos')

    await user.click(screen.getByRole('button', { name: /en directo/i }))
    expect(screen.queryByText('Dominicos')).not.toBeInTheDocument()
  })

  it('shows date chip when match has starts_at', async () => {
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_SCHEDULED_WITH_DATE as any])
    renderPage()
    await screen.findByText('Lobos')
    expect(screen.getByText('mié 01 abr · 10:00')).toBeInTheDocument()
  })

  it('reveals datetime input when clock icon is clicked (non-finished match)', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_SCHEDULED as any])
    renderPage()
    await screen.findByText('Lobos')

    const editBtn = screen.getByRole('button', { name: /editar fecha y hora/i })
    await user.click(editBtn)
    expect(screen.getByRole('button', { name: /guardar fecha/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('does not show date edit button for finished matches', async () => {
    const user = userEvent.setup()
    vi.mocked(listMatchesWithTeams).mockResolvedValue([MATCH_FINISHED as any])
    renderPage()

    const finishedBtn = await screen.findByRole('button', { name: /finalizados/i })
    await user.click(finishedBtn)

    await screen.findByText('Tigres')
    expect(screen.queryByRole('button', { name: /editar fecha y hora/i })).not.toBeInTheDocument()
  })
})
