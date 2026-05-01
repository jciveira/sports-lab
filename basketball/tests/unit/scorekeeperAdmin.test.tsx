import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import type { Match } from '../../src/types'

const chainable = { select: () => chainable, in: () => Promise.resolve({ data: [] }) }
vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: { from: () => chainable },
}))
vi.mock('../../src/lib/offlineSync', () => ({ flushPendingEvents: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: () => ({ id: 'match-1' }) }
})

import ScorekeeperPage from '../../src/pages/ScorekeeperPage'
import { useMatchStore } from '../../src/stores/useMatchStore'

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tournament_id: null,
    phase: null,
    home_team_id: 'home',
    away_team_id: 'away',
    home_score: 10,
    away_score: 8,
    status: 'running',
    quarter: 2,
    time_remaining_seconds: 300,
    scorekeeper_claimed_by: 'other-device',
    started_at: null,
    finished_at: null,
    created_at: '2025-01-01T00:00:00Z',
    venue_id: null,
    scheduled_at: null,
    not_played: false,
    ...overrides,
  }
}

const baseStoreState = {
  match: null,
  events: [],
  claimed: false,
  clockRunning: false,
  timeRemaining: 480,
  homeFouls: 0,
  awayFouls: 0,
  homeTimeouts: 2,
  awayTimeouts: 2,
  loadMatch: vi.fn(),
  claimScorekeeper: vi.fn(),
  scoreGoal: vi.fn(),
  recordFoul: vi.fn(),
  undoLastEvent: vi.fn(),
  startClock: vi.fn(),
  pauseClock: vi.fn(),
  useTimeout: vi.fn(),
  endQuarter: vi.fn(),
  finishMatch: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  useMatchStore.setState(baseStoreState)
})

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/match/match-1${search}`]}>
      <ScorekeeperPage />
    </MemoryRouter>,
  )
}

describe('ScorekeeperPage — admin bypass', () => {
  it('shows claim gate when match is claimed and no admin param', () => {
    useMatchStore.setState({ ...baseStoreState, match: makeMatch(), claimed: false })
    renderPage()
    expect(screen.getByText('Marcador ya reclamado')).toBeTruthy()
  })

  it('shows full scorekeeper UI when ?admin=1 even if match is claimed', () => {
    useMatchStore.setState({ ...baseStoreState, match: makeMatch(), claimed: false })
    renderPage('?admin=1')
    // Full UI has the Iniciar/Pausar clock button
    expect(screen.getByText(/Iniciar|Pausar/)).toBeTruthy()
  })

  it('does not show Reclamar button when ?admin=1', () => {
    useMatchStore.setState({ ...baseStoreState, match: makeMatch({ scorekeeper_claimed_by: null }), claimed: false })
    renderPage('?admin=1')
    expect(screen.queryByText('Reclamar marcador')).toBeNull()
  })

  it('does not call claimScorekeeper when ?admin=1', () => {
    const claimScorekeeper = vi.fn()
    useMatchStore.setState({ ...baseStoreState, match: makeMatch({ scorekeeper_claimed_by: null }), claimed: false, claimScorekeeper })
    renderPage('?admin=1')
    expect(claimScorekeeper).not.toHaveBeenCalled()
  })
})
