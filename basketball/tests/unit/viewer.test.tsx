import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Match, Team } from '../../src/types'
import { ViewerPage } from '../../src/pages/ViewerPage'
import { useRealtimeMatch } from '../../src/hooks/useRealtimeMatch'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
}

// match_events query: select().eq().eq().eq().eq() → { count, error }
// We need .eq() to chain indefinitely and also be the final return value.
function makeChainableEq(finalValue: { count: number; error: null }) {
  const chain: Record<string, unknown> = {}
  chain.eq = vi.fn(() => chain)
  // After all .eq() calls, the consumer awaits the chain itself — but
  // the Supabase client returns a PromiseLike from the builder, so we
  // make the chain thenable so that `await chain` resolves to finalValue.
  chain.then = (resolve: (v: unknown) => void) => resolve(finalValue)
  return chain
}

const foulChain = makeChainableEq({ count: 2, error: null })

// teams query
const mockTeamsSingle = vi.fn()
const mockTeamsChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: mockTeamsSingle,
}

// matches query
const mockMatchesSingle = vi.fn()
const mockMatchesChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: mockMatchesSingle,
}

// match_events query builder
const mockMatchEventsChain = {
  select: vi.fn(() => foulChain),
}

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'teams') return mockTeamsChain
      if (table === 'match_events') return mockMatchEventsChain
      return mockMatchesChain // 'matches'
    }),
    channel: vi.fn(() => mockChannel),
  },
}))

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tournament_id: null,
    phase: null,
    home_team_id: 'home-id',
    away_team_id: 'away-id',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    quarter: 1,
    time_remaining_seconds: 600,
    scorekeeper_claimed_by: null,
    started_at: null,
    finished_at: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeTeam(name: string, id: string): Team {
  return {
    id,
    name,
    nickname: null,
    badge_url: null,
    city_district: null,
    created_at: '2025-01-01T00:00:00Z',
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMatchMocks(match: Match) {
  mockMatchesSingle.mockResolvedValue({ data: match, error: null })
  mockTeamsSingle
    .mockResolvedValueOnce({ data: makeTeam('Lakers', 'home-id'), error: null })
    .mockResolvedValueOnce({ data: makeTeam('Celtics', 'away-id'), error: null })
}

function renderViewer(matchId = 'match-1') {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [`/match/${matchId}/view`] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: '/match/:id/view',
          element: React.createElement(ViewerPage),
        }),
      ),
    ),
  )
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockChannel.on.mockReturnThis()
  mockChannel.subscribe.mockReturnThis()
  mockMatchesChain.select.mockReturnThis()
  mockMatchesChain.eq.mockReturnThis()
  mockTeamsChain.select.mockReturnThis()
  mockTeamsChain.eq.mockReturnThis()
  mockMatchEventsChain.select.mockImplementation(() => foulChain)
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRealtimeMatch', () => {
  it('returns loading=true initially', () => {
    // Make the match query hang indefinitely to observe loading state
    mockMatchesSingle.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useRealtimeMatch('match-1'))

    expect(result.current.loading).toBe(true)
    expect(result.current.match).toBeNull()
  })
})

describe('ViewerPage', () => {
  it('renders "Match not started yet" when status is scheduled', async () => {
    setupMatchMocks(makeMatch({ status: 'scheduled' }))

    await act(async () => {
      renderViewer()
    })

    await waitFor(() => {
      expect(screen.getByText('Match not started yet')).toBeInTheDocument()
    })
  })

  it('renders score when status is running', async () => {
    setupMatchMocks(
      makeMatch({
        status: 'running',
        home_score: 54,
        away_score: 48,
        quarter: 3,
        time_remaining_seconds: 320,
      }),
    )

    await act(async () => {
      renderViewer()
    })

    await waitFor(() => {
      expect(screen.getByText('54')).toBeInTheDocument()
      expect(screen.getByText('48')).toBeInTheDocument()
      expect(screen.getByText('Q3')).toBeInTheDocument()
    })
  })

  it('renders "Match finished" banner when status is finished', async () => {
    setupMatchMocks(
      makeMatch({
        status: 'finished',
        home_score: 98,
        away_score: 95,
        quarter: 4,
        time_remaining_seconds: 0,
      }),
    )

    await act(async () => {
      renderViewer()
    })

    await waitFor(() => {
      expect(screen.getByText('Match finished')).toBeInTheDocument()
      expect(screen.getByText('98')).toBeInTheDocument()
      expect(screen.getByText('95')).toBeInTheDocument()
    })
  })
})
