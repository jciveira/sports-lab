import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RostersTab } from '../../src/pages/RostersTab'
import { useTeamsStore } from '../../src/hooks/useTeamsStore'
import { usePlayersStore } from '../../src/hooks/usePlayersStore'
import type { DbTeam, DbPlayer } from '../../src/lib/database.types'

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: true,
}))

const SHARKS: DbTeam = { id: 't1', name: 'Sharks', badge_url: null, nickname: null, city_district: null, category: 'Alevín', gender: 'Masculino', region: 'Madrid', created_at: '' }
const EAGLES: DbTeam = { id: 't2', name: 'Eagles', badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: 'Madrid', created_at: '' }
const WOLVES: DbTeam = { id: 't3', name: 'Wolves', badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: 'Galicia', created_at: '' }

const MATEO: DbPlayer = { id: 'p1', team_id: 't1', display_name: 'Mateo', number: 7, role: 'LW', avatar_url: null, strengths: [], available: true, injured: false, ratings: null, card_type: 'base', created_at: '' }
const MIGUEL: DbPlayer = { id: 'p2', team_id: 't1', display_name: 'Miguel', number: 10, role: 'CB', avatar_url: null, strengths: [], available: true, injured: false, ratings: { tiro: 80, pase: 70, defensa: 60, fisico: 75, stamina: 65, vision_de_juego: 72 }, card_type: 'base', created_at: '' }

const noopFetch = async () => {}

function renderTab() {
  return render(
    <MemoryRouter>
      <RostersTab />
    </MemoryRouter>,
  )
}

describe('RostersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTeamsStore.setState({ teams: [SHARKS, EAGLES], loading: false, error: null, fetch: noopFetch })
    usePlayersStore.setState({ players: [MATEO, MIGUEL], loading: false, error: null, fetch: noopFetch })
  })

  it('shows team grid on initial render', () => {
    renderTab()
    expect(screen.getByText('Sharks')).toBeInTheDocument()
    expect(screen.getByText('Eagles')).toBeInTheDocument()
  })

  it('shows category and gender on team card', () => {
    renderTab()
    expect(screen.getByText('Alevín · Masculino')).toBeInTheDocument()
  })

  it('shows player count per team', () => {
    renderTab()
    expect(screen.getByText('2 jugadores')).toBeInTheDocument()
    expect(screen.getByText('0 jugadores')).toBeInTheDocument()
  })

  it('drills into roster when tapping a team', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText('Sharks'))
    expect(screen.getByText('Mateo')).toBeInTheDocument()
    expect(screen.getByText('Miguel')).toBeInTheDocument()
  })

  it('shows back button in roster view and returns to team grid', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText('Sharks'))
    await user.click(screen.getByRole('button', { name: 'Volver a equipos' }))
    expect(screen.getByText('Sharks')).toBeInTheDocument()
    expect(screen.getByText('Eagles')).toBeInTheDocument()
  })

  it('shows roster sorted by jersey number', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText('Sharks'))
    const items = screen.getAllByText(/^#\d+$/)
    expect(items[0]).toHaveTextContent('#7')
    expect(items[1]).toHaveTextContent('#10')
  })

  it('shows overall rating for player with ratings', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText('Sharks'))
    // Miguel has ratings averaging to 70
    expect(screen.getByText('70')).toBeInTheDocument()
  })

  it('links player rows to /player/:id', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText('Sharks'))
    const mateoLink = screen.getByText('Mateo').closest('a')
    expect(mateoLink).toHaveAttribute('href', '/player/p1')
  })

  it('shows full opacity for teams with a roster', () => {
    renderTab()
    const sharksBtn = screen.getByText('Sharks').closest('button')
    expect(sharksBtn?.className).toContain('opacity-100')
    expect(sharksBtn?.className).not.toContain('opacity-60')
  })

  it('shows reduced opacity for teams without a roster', () => {
    renderTab()
    const eaglesBtn = screen.getByText('Eagles').closest('button')
    expect(eaglesBtn?.className).toContain('opacity-60')
  })

  it('shows empty state when no teams', () => {
    useTeamsStore.setState({ teams: [], loading: false, error: null, fetch: noopFetch })
    renderTab()
    expect(screen.getByText('No hay equipos')).toBeInTheDocument()
  })

  it('shows empty roster state for team with no players', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByText('Eagles'))
    expect(screen.getByText('Sin jugadores en este equipo')).toBeInTheDocument()
  })

  it('shows region headers as accordion toggles', () => {
    renderTab()
    expect(screen.getByRole('button', { name: /Madrid/i })).toBeInTheDocument()
  })

  it('auto-expands the region with the most teams', () => {
    // Madrid has 2 teams, Galicia has 1 — Madrid should be expanded
    useTeamsStore.setState({ teams: [SHARKS, EAGLES, WOLVES], loading: false, error: null, fetch: noopFetch })
    renderTab()
    // Madrid expanded → teams visible
    expect(screen.getByText('Sharks')).toBeInTheDocument()
    expect(screen.getByText('Eagles')).toBeInTheDocument()
    // Galicia collapsed → Wolves not visible
    expect(screen.queryByText('Wolves')).not.toBeInTheDocument()
  })

  it('tapping a collapsed region header expands it', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [SHARKS, EAGLES, WOLVES], loading: false, error: null, fetch: noopFetch })
    renderTab()

    // Galicia is collapsed
    expect(screen.queryByText('Wolves')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Galicia/i }))
    expect(screen.getByText('Wolves')).toBeInTheDocument()
  })

  it('tapping an expanded region header collapses it', async () => {
    const user = userEvent.setup()
    useTeamsStore.setState({ teams: [SHARKS, EAGLES, WOLVES], loading: false, error: null, fetch: noopFetch })
    renderTab()

    // Madrid is auto-expanded
    expect(screen.getByText('Sharks')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Madrid/i }))
    expect(screen.queryByText('Sharks')).not.toBeInTheDocument()
  })
})
