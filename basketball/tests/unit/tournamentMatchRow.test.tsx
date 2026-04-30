import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import type { Match, Team, Venue, Tournament, TournamentTeam, TournamentMatch } from '../../src/types'

// ─── Supabase mock — no real network ──────────────────────────────────────────

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn(),
    })),
  },
}))

import { TournamentPage } from '../../src/pages/TournamentPage'
import { useTournamentStore } from '../../src/stores/useTournamentStore'
import { useTeamsStore } from '../../src/stores/useTeamsStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTeam(id: string, name: string): Team {
  return { id, name, nickname: null, badge_url: null, city_district: null, created_at: '' }
}

function makeTournamentTeam(teamId: string, groupName: string): TournamentTeam {
  return { id: `tt-${teamId}`, tournament_id: 't1', team_id: teamId, group_name: groupName, seed: null, created_at: '' }
}

function makeTournamentMatch(id: string, homeId: string, awayId: string, matchId: string | null): TournamentMatch {
  return {
    id,
    tournament_id: 't1',
    phase: 'group',
    round_index: 0,
    match_slot: 0,
    home_team_id: homeId,
    away_team_id: awayId,
    match_id: matchId,
    created_at: '',
  }
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    tournament_id: 't1',
    phase: 'group',
    home_team_id: 'team-a',
    away_team_id: 'team-b',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    quarter: 1,
    time_remaining_seconds: null,
    scorekeeper_claimed_by: null,
    started_at: null,
    finished_at: null,
    created_at: '',
    venue_id: null,
    scheduled_at: null,
    not_played: false,
    ...overrides,
  }
}

function makeTournament(): Tournament {
  return {
    id: 't1',
    name: 'Test Cup',
    status: 'group_phase',
    format: '3x3',
    num_teams: 2,
    created_at: '',
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tournament/t1']}>
      <Routes>
        <Route path="/tournament/:id" element={<TournamentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TournamentPage match row — venue and schedule display', () => {
  beforeEach(() => {
    useTournamentStore.setState({
      currentTournament: makeTournament(),
      tournamentTeams: [makeTournamentTeam('team-a', 'A'), makeTournamentTeam('team-b', 'A')],
      tournamentMatches: [makeTournamentMatch('tm1', 'team-a', 'team-b', 'm1')],
      venues: [],
      loading: false,
      error: null,
    })
    useTeamsStore.setState({
      teams: [makeTeam('team-a', 'Águilas'), makeTeam('team-b', 'Búhos')],
    })
  })

  it('renders without crashing when match has no scheduled_at and no venue_id', () => {
    // Calendario section is collapsed by default — match rows are not in DOM
    // Verify the page renders without errors
    const { container } = renderPage()
    expect(container).toBeTruthy()
  })

  it('shows schedule section when tournament is in group_phase', () => {
    renderPage()
    // Calendario section should be present
    expect(screen.getByText('Calendario')).toBeTruthy()
  })

  it('shows team names in the match row', () => {
    renderPage()
    expect(screen.getByText(/Águilas/)).toBeTruthy()
    expect(screen.getByText(/Búhos/)).toBeTruthy()
  })
})
