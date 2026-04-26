import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BracketView } from '../../src/components/tournament/BracketView'
import { useTournamentStore } from '../../src/hooks/useTournamentStore'
import type { DbMatch, DbTeam, DbVenue } from '../../src/lib/database.types'

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

function makeTeam(id: string, name: string): DbTeam {
  return { id, name, nickname: null, badge_url: null, city_district: null, category: null, gender: null, region: null, created_at: '' }
}

function makeMatch(overrides: Partial<DbMatch> & { id: string; home_team_id: string; away_team_id: string }): DbMatch {
  return {
    tournament_id: 'tour1',
    phase: 'semi',
    group_label: null,
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    current_half: 1,
    clock_seconds: 0,
    config_halves: 2,
    config_half_duration_minutes: 10,
    config_timeouts_per_half: 1,
    config_exclusion_duration_seconds: 120,
    scorekeeper_code: '',
    stat_tracker_code: '',
    viewer_code: '',
    scorekeeper_claimed_by: null,
    stat_tracker_claimed_by: null,
    home_timeouts_left: 1,
    away_timeouts_left: 1,
    source: 'manual',
    tournament_group_id: null,
    tournament_category_id: 'cat1',
    penalty_home_score: null,
    penalty_away_score: null,
    started_at: null,
    finished_at: null,
    created_at: '',
    ...overrides,
  }
}

const teams = [
  makeTeam('tA', 'Dominicos'),
  makeTeam('tB', 'Maristas'),
  makeTeam('tC', 'Teucro'),
  makeTeam('tD', 'Cangas'),
]
const teamsMap = new Map(teams.map((t) => [t.id, t]))

const finishedSemi = makeMatch({ id: 's1', home_team_id: 'tA', away_team_id: 'tB', phase: 'semi', status: 'finished', home_score: 3, away_score: 2 })
const scheduledSemi = makeMatch({ id: 's2', home_team_id: 'tC', away_team_id: 'tD', phase: 'semi' })
const finishedFinal = makeMatch({ id: 'f1', home_team_id: 'tA', away_team_id: 'tC', phase: 'final', status: 'finished', home_score: 2, away_score: 1 })

function makeVenue(id: string, name: string, address?: string): DbVenue {
  return { id, tournament_id: 'tour1', name, address: address ?? null, created_at: '' }
}

beforeEach(() => {
  vi.clearAllMocks()
  useTournamentStore.setState({
    recordScore: vi.fn(),
    recordPenalties: vi.fn(),
  })
})

describe('BracketView — admin knockout editing', () => {
  it('shows edit pencil button for admin on finished match', () => {
    render(<BracketView matches={[finishedSemi, scheduledSemi]} teamsMap={teamsMap} isAdmin />)
    expect(screen.getByRole('button', { name: /editar resultado/i })).toBeInTheDocument()
  })

  it('does not show edit pencil for non-admin', () => {
    render(<BracketView matches={[finishedSemi, scheduledSemi]} teamsMap={teamsMap} isAdmin={false} />)
    expect(screen.queryByRole('button', { name: /editar resultado/i })).not.toBeInTheDocument()
  })

  it('clicking edit pencil opens score entry form', async () => {
    render(<BracketView matches={[finishedSemi, scheduledSemi]} teamsMap={teamsMap} isAdmin />)
    await userEvent.setup().click(screen.getByRole('button', { name: /editar resultado/i }))
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('clicking unfinished match opens score entry for admin', async () => {
    render(<BracketView matches={[scheduledSemi]} teamsMap={teamsMap} isAdmin />)
    fireEvent.click(screen.getByText('Teucro'))
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })

  it('shows downstream warning after saving when a later phase match is finished', async () => {
    const mockRecordScore = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({ recordScore: mockRecordScore, recordPenalties: vi.fn() })

    // finishedSemi + finishedFinal: editing the semi has downstream (the final is finished)
    render(
      <BracketView
        matches={[finishedSemi, finishedFinal]}
        teamsMap={teamsMap}
        isAdmin
      />,
    )

    // Click the semi's edit button (first one in DOM, semi comes after final in render order)
    const editBtns = screen.getAllByRole('button', { name: /editar resultado/i })
    await userEvent.setup().click(editBtns[editBtns.length - 1]) // semi is rendered last (Semis section)
    await userEvent.setup().click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(screen.getByText(/el siguiente partido puede verse afectado/i)).toBeInTheDocument()
    })
  })

  it('does not show downstream warning when no later phase is finished', async () => {
    const mockRecordScore = vi.fn().mockResolvedValue(undefined)
    useTournamentStore.setState({ recordScore: mockRecordScore, recordPenalties: vi.fn() })

    render(
      <BracketView
        matches={[finishedSemi, scheduledSemi]}
        teamsMap={teamsMap}
        isAdmin
      />,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: /editar resultado/i }))
    await userEvent.setup().click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(mockRecordScore).toHaveBeenCalled()
    })
    expect(screen.queryByText(/el siguiente partido puede verse afectado/i)).not.toBeInTheDocument()
  })
})

describe('BracketView — admin venue assignment', () => {
  it('shows venue select for admin when venues are provided', () => {
    const venue = makeVenue('v1', 'Pabellón')
    render(
      <BracketView
        matches={[finishedSemi]}
        teamsMap={teamsMap}
        isAdmin
        venues={[venue]}
        onAssignVenue={vi.fn()}
      />,
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('calls onAssignVenue when venue is changed', async () => {
    const onAssign = vi.fn().mockResolvedValue(undefined)
    const venue = makeVenue('v1', 'Pabellón')
    render(
      <BracketView
        matches={[finishedSemi]}
        teamsMap={teamsMap}
        isAdmin
        venues={[venue]}
        onAssignVenue={onAssign}
      />,
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'v1' } })
    expect(onAssign).toHaveBeenCalledWith('s1', 'v1')
  })

  it('does not show venue select for non-admin', () => {
    const venue = makeVenue('v1', 'Pabellón')
    render(
      <BracketView
        matches={[finishedSemi]}
        teamsMap={teamsMap}
        isAdmin={false}
        venues={[venue]}
      />,
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})

describe('BracketView — admin datetime editing', () => {
  it('shows datetime edit button for admin when onUpdateSchedule is provided', () => {
    render(
      <BracketView
        matches={[finishedSemi]}
        teamsMap={teamsMap}
        isAdmin
        onUpdateSchedule={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /editar fecha y hora/i })).toBeInTheDocument()
  })

  it('does not show datetime edit button for non-admin', () => {
    render(
      <BracketView
        matches={[finishedSemi]}
        teamsMap={teamsMap}
        isAdmin={false}
        onUpdateSchedule={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /editar fecha y hora/i })).not.toBeInTheDocument()
  })

  it('clicking datetime edit button shows datetime input', async () => {
    render(
      <BracketView
        matches={[finishedSemi]}
        teamsMap={teamsMap}
        isAdmin
        onUpdateSchedule={vi.fn()}
      />,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: /editar fecha y hora/i }))
    expect(screen.getByRole('button', { name: /guardar fecha/i })).toBeInTheDocument()
  })
})
