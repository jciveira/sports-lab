import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import type { Match } from '../../src/types'

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}))

import { PartidosTab } from '../../src/pages/PartidosTab'
import { useMatchesStore } from '../../src/stores/useMatchesStore'
import { useTeamsStore } from '../../src/stores/useTeamsStore'

function makeMatch(id: string, status: Match['status']): Match {
  return {
    id,
    tournament_id: null,
    phase: null,
    home_team_id: 'h',
    away_team_id: 'a',
    home_score: 10,
    away_score: 8,
    status,
    quarter: 1,
    time_remaining_seconds: 480,
    scorekeeper_claimed_by: null,
    started_at: null,
    finished_at: null,
    created_at: '2025-01-01T00:00:00Z',
    venue_id: null,
    scheduled_at: null,
    not_played: false,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useTeamsStore.setState({ teams: [], loading: false, error: null })
  useMatchesStore.setState({ matches: [], loading: false, error: null })
})

function renderTab() {
  return render(
    <MemoryRouter>
      <PartidosTab />
    </MemoryRouter>,
  )
}

describe('PartidosTab — grouping', () => {
  it('shows En curso section for running match', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'running')], loading: false, error: null })
    renderTab()
    expect(screen.getByText('En curso')).toBeTruthy()
  })

  it('shows Programados section for scheduled match', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'scheduled')], loading: false, error: null })
    renderTab()
    expect(screen.getByText('Programados')).toBeTruthy()
  })

  it('shows Pasados section for finished match', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'finished')], loading: false, error: null })
    renderTab()
    expect(screen.getByText('Pasados')).toBeTruthy()
  })

  it('hides En curso section when no active matches', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'scheduled')], loading: false, error: null })
    renderTab()
    expect(screen.queryByText('En curso')).toBeNull()
  })

  it('hides Programados section when no scheduled matches', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'running')], loading: false, error: null })
    renderTab()
    expect(screen.queryByText('Programados')).toBeNull()
  })

  it('hides Pasados section when no finished matches', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'running')], loading: false, error: null })
    renderTab()
    expect(screen.queryByText('Pasados')).toBeNull()
  })

  it('groups paused and quarter_break into En curso', () => {
    useMatchesStore.setState({
      matches: [makeMatch('m1', 'paused'), makeMatch('m2', 'quarter_break')],
      loading: false,
      error: null,
    })
    renderTab()
    expect(screen.getByText('En curso')).toBeTruthy()
    expect(screen.queryByText('Programados')).toBeNull()
  })
})
