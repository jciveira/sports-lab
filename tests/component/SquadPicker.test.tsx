import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SquadPicker } from '../../src/components/ui/SquadPicker'
import type { DbPlayer } from '../../src/lib/database.types'

const mockFrom = vi.fn()

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function makePlayer(overrides: Partial<DbPlayer> & { display_name: string; number: number }): DbPlayer {
  return {
    id: crypto.randomUUID(),
    team_id: 'team-1',
    role: 'CB',
    avatar_url: null,
    strengths: [],
    available: true,
    injured: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

const seedPlayers: DbPlayer[] = [
  makePlayer({ id: 'p1', display_name: 'Ana', number: 1, role: 'GK', available: true, injured: false }),
  makePlayer({ id: 'p2', display_name: 'Bea', number: 5, role: 'CB', available: true, injured: false }),
  makePlayer({ id: 'p3', display_name: 'Carlos', number: 7, role: 'LW', available: true, injured: true }),
  makePlayer({ id: 'p4', display_name: 'Diana', number: 9, role: 'PV', available: false, injured: false }),
]

function setupMockQuery(players: DbPlayer[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: players, error: null }),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

function renderPicker(props: Partial<React.ComponentProps<typeof SquadPicker>> = {}) {
  const onChange = props.onChange ?? vi.fn()
  return {
    onChange,
    ...render(
      <MemoryRouter>
        <SquadPicker
          teamId="team-1"
          teamName="Dominicos"
          selected={props.selected ?? []}
          onChange={onChange}
          {...props}
        />
      </MemoryRouter>,
    ),
  }
}

describe('SquadPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty roster message when no players', async () => {
    setupMockQuery([])
    renderPicker()

    expect(await screen.findByText(/sin plantilla/i)).toBeInTheDocument()
    expect(screen.getByText(/añade jugadores en equipos/i)).toBeInTheDocument()
  })

  it('calls onChange with default selection (available + not injured)', async () => {
    setupMockQuery(seedPlayers)
    const onChange = vi.fn()
    renderPicker({ onChange })

    // Wait for fetch to complete — default selection excludes injured (Carlos) and unavailable (Diana)
    await screen.findByText(/convocados/)
    expect(onChange).toHaveBeenCalledWith(['p1', 'p2']) // Ana + Bea
  })

  it('expands to show player list on click', async () => {
    setupMockQuery(seedPlayers)
    const user = userEvent.setup()
    renderPicker({ selected: ['p1', 'p2'] })

    await screen.findByText(/convocados/)

    // Player names not visible before expanding
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()

    // Click to expand
    await user.click(screen.getByText(/dominicos/i))

    // Player names now visible
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Bea')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('Diana')).toBeInTheDocument()
  })

  it('shows injured and unavailable badges', async () => {
    setupMockQuery(seedPlayers)
    const user = userEvent.setup()
    renderPicker({ selected: ['p1', 'p2'] })

    await screen.findByText(/convocados/)
    await user.click(screen.getByText(/dominicos/i))

    expect(screen.getByText(/lesionado/i)).toBeInTheDocument()
    expect(screen.getByText(/no disponible/i)).toBeInTheDocument()
  })

  it('toggles individual player on checkbox click', async () => {
    setupMockQuery(seedPlayers)
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderPicker({ selected: ['p1', 'p2'], onChange })

    await screen.findByText(/convocados/)
    await user.click(screen.getByText(/dominicos/i))

    // Get all checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    // Uncheck p1 (Ana) — first checkbox
    await user.click(checkboxes[0])
    expect(onChange).toHaveBeenCalledWith(['p2'])
  })

  it('select all and deselect all buttons work', async () => {
    setupMockQuery(seedPlayers)
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderPicker({ selected: ['p1'], onChange })

    await screen.findByText(/convocados/)
    await user.click(screen.getByText(/dominicos/i))

    // Select all
    await user.click(screen.getByText('Todos'))
    expect(onChange).toHaveBeenCalledWith(['p1', 'p2', 'p3', 'p4'])

    // Deselect all
    await user.click(screen.getByText('Ninguno'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('shows convocados count in header', async () => {
    setupMockQuery(seedPlayers)
    renderPicker({ selected: ['p1', 'p2', 'p3'] })

    expect(await screen.findByText('3/4 convocados')).toBeInTheDocument()
  })
})
