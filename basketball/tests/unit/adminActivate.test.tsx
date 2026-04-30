import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import type { Match, Team } from '../../src/types'

// ---------------------------------------------------------------------------
// Supabase mock — prevents real network calls from stores
// ---------------------------------------------------------------------------

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}))

import { AdminPage } from '../../src/pages/AdminPage'
import { useMatchesStore } from '../../src/stores/useMatchesStore'
import { useTeamsStore } from '../../src/stores/useTeamsStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(id: string, name: string): Team {
  return { id, name, nickname: null, badge_url: null, city_district: null, created_at: '2025-01-01T00:00:00Z' }
}

function makeMatch(id: string, status: Match['status']): Match & { quarter_duration_minutes: number } {
  return {
    id,
    tournament_id: null,
    phase: null,
    home_team_id: 'home',
    away_team_id: 'away',
    home_score: 0,
    away_score: 0,
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
    quarter_duration_minutes: 8,
  }
}

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Setup — pre-populate stores; isSupabaseConfigured=false so fetches are no-ops
// ---------------------------------------------------------------------------

beforeEach(() => {
  useTeamsStore.setState({ teams: [makeTeam('home', 'Lakers'), makeTeam('away', 'Celtics')], loading: false, error: null })
  useMatchesStore.setState({ matches: [], loading: false, error: null })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminPage — activate match button', () => {
  it('shows Activar button for scheduled match', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'scheduled')], loading: false, error: null })
    renderAdmin()
    expect(screen.getByText('Activar')).toBeTruthy()
  })

  it('Activar button links to scorekeeper route', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'scheduled')], loading: false, error: null })
    renderAdmin()
    const link = screen.getByText('Activar').closest('a')
    expect(link?.getAttribute('href')).toBe('/match/m1')
  })

  it('shows Continuar button for running match', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'running')], loading: false, error: null })
    renderAdmin()
    expect(screen.getByText('Continuar')).toBeTruthy()
  })

  it('shows Continuar button for paused match', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'paused')], loading: false, error: null })
    renderAdmin()
    expect(screen.getByText('Continuar')).toBeTruthy()
  })

  it('hides activate button for finished match', () => {
    useMatchesStore.setState({ matches: [makeMatch('m1', 'finished')], loading: false, error: null })
    renderAdmin()
    expect(screen.queryByText('Activar')).toBeNull()
    expect(screen.queryByText('Continuar')).toBeNull()
  })
})
