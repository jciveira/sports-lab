import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Supabase mock — use vi.hoisted so variables are available when vi.mock runs
// ---------------------------------------------------------------------------

const { mockFrom, mockUpdate, mockInsert, mockDelete, mockSingle } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockOrder = vi.fn(async () => ({ data: [], error: null }))
  const mockIn = vi.fn(async () => ({ data: [], error: null }))

  // Chainable stubs — each returns an object with the common chaining methods
  const mockEq = vi.fn()
  const mockIs = vi.fn(async () => ({ error: null }))
  const mockSelect = vi.fn(() => ({ single: mockSingle, eq: mockEq, in: mockIn, order: mockOrder }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockDelete = vi.fn(() => ({ eq: mockEq }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))

  // Default eq chain — returns another eq for chaining and terminal resolvers
  mockEq.mockReturnValue({
    single: mockSingle,
    eq: mockEq,
    is: mockIs,
    select: mockSelect,
    order: mockOrder,
  })

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
  }))

  return { mockFrom, mockUpdate, mockInsert, mockDelete, mockSingle, mockEq, mockIs }
})

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: mockFrom },
  isSupabaseConfigured: false,
}))

// ---------------------------------------------------------------------------
// Mock offlineSync — IndexedDB (Dexie) is not available in jsdom
// ---------------------------------------------------------------------------

vi.mock('../../src/lib/offlineSync', () => ({
  queueEvent: vi.fn(async () => {}),
  flushPendingEvents: vi.fn(async () => {}),
  onlineStatus: { isOnline: true },
  initOnlineListener: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import store after mock
// ---------------------------------------------------------------------------

import { useMatchStore } from '../../src/stores/useMatchStore'
import type { Match } from '../../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tournament_id: null,
    phase: null,
    home_team_id: 'home-team',
    away_team_id: 'away-team',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    quarter: 1,
    scorekeeper_claimed_by: null,
    started_at: null,
    finished_at: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

function resetStore() {
  useMatchStore.setState({
    match: null,
    events: [],
    claimed: false,
    clockRunning: false,
    timeRemaining: 480,
    homeFouls: 0,
    awayFouls: 0,
    homeTimeouts: 2,
    awayTimeouts: 2,
    intervalId: null,
  })
}

function makeEventData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev-1',
    match_id: 'match-1',
    type: 'goal_2',
    team_id: 'home-team',
    player_id: null,
    quarter: 1,
    time_remaining: 400,
    synced: true,
    created_at: '2025-01-01T00:00:10Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMatchStore', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
    // Re-apply default behavior after clearAllMocks
    mockUpdate.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) })
    mockDelete.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) })
    mockInsert.mockReturnValue({
      select: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: new Error('no mock') })) })),
    })
  })

  afterEach(() => {
    const { intervalId } = useMatchStore.getState()
    if (intervalId) clearInterval(intervalId)
  })

  // -------------------------------------------------------------------------
  // claimScorekeeper
  // -------------------------------------------------------------------------
  describe('claimScorekeeper', () => {
    it('sets claimed = true on successful claim', async () => {
      const match = makeMatch()
      useMatchStore.setState({ match })

      mockUpdate.mockReturnValueOnce({
        eq: vi.fn(() => ({
          is: vi.fn(async () => ({ error: null })),
        })),
      })

      await useMatchStore.getState().claimScorekeeper('match-1')

      expect(useMatchStore.getState().claimed).toBe(true)
    })

    it('does NOT set claimed if Supabase returns an error', async () => {
      const match = makeMatch()
      useMatchStore.setState({ match })

      mockUpdate.mockReturnValueOnce({
        eq: vi.fn(() => ({
          is: vi.fn(async () => ({ error: new Error('already claimed') })),
        })),
      })

      await useMatchStore.getState().claimScorekeeper('match-1')

      expect(useMatchStore.getState().claimed).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // scoreGoal
  // -------------------------------------------------------------------------
  describe('scoreGoal', () => {
    function mockGoalWrite(eventOverrides: Record<string, unknown> = {}) {
      mockUpdate.mockReturnValueOnce({ eq: vi.fn(async () => ({ error: null })) })
      mockInsert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: makeEventData(eventOverrides),
            error: null,
          })),
        })),
      })
    }

    it('increments home score by 2 for goal_2', async () => {
      const match = makeMatch({ home_score: 4 })
      useMatchStore.setState({ match, claimed: true })
      mockGoalWrite({ type: 'goal_2', team_id: 'home-team' })

      await useMatchStore.getState().scoreGoal('home', 2)

      expect(useMatchStore.getState().match?.home_score).toBe(6)
    })

    it('increments away score by 3 for goal_3', async () => {
      const match = makeMatch({ away_score: 6 })
      useMatchStore.setState({ match, claimed: true })
      mockGoalWrite({ type: 'goal_3', team_id: 'away-team' })

      await useMatchStore.getState().scoreGoal('away', 3)

      expect(useMatchStore.getState().match?.away_score).toBe(9)
    })

    it('increments home score by 1 for freethrow', async () => {
      const match = makeMatch({ home_score: 10 })
      useMatchStore.setState({ match, claimed: true })
      mockGoalWrite({ type: 'freethrow', team_id: 'home-team' })

      await useMatchStore.getState().scoreGoal('home', 1)

      expect(useMatchStore.getState().match?.home_score).toBe(11)
    })
  })

  // -------------------------------------------------------------------------
  // recordFoul
  // -------------------------------------------------------------------------
  describe('recordFoul', () => {
    function mockFoulWrite(teamId: string) {
      mockInsert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: makeEventData({ id: 'ev-foul', type: 'foul', team_id: teamId }),
            error: null,
          })),
        })),
      })
    }

    it('increments home foul count', async () => {
      const match = makeMatch()
      useMatchStore.setState({ match, claimed: true, homeFouls: 2 })
      mockFoulWrite('home-team')

      await useMatchStore.getState().recordFoul('home')

      expect(useMatchStore.getState().homeFouls).toBe(3)
    })

    it('increments away foul count', async () => {
      const match = makeMatch()
      useMatchStore.setState({ match, claimed: true, awayFouls: 1 })
      mockFoulWrite('away-team')

      await useMatchStore.getState().recordFoul('away')

      expect(useMatchStore.getState().awayFouls).toBe(2)
    })
  })

  // -------------------------------------------------------------------------
  // undoLastEvent
  // -------------------------------------------------------------------------
  describe('undoLastEvent', () => {
    it('reverts last scoring event and decrements score', async () => {
      const match = makeMatch({ home_score: 8, quarter: 1 })
      const events = [
        {
          id: 'ev-score-1',
          match_id: 'match-1',
          type: 'goal_2' as const,
          team_id: 'home-team',
          player_id: null,
          quarter: 1,
          time_remaining: 300,
          synced: true,
          created_at: '2025-01-01T00:02:00Z',
        },
      ]
      useMatchStore.setState({ match, events, claimed: true })

      mockDelete.mockReturnValueOnce({ eq: vi.fn(async () => ({ error: null })) })
      mockUpdate.mockReturnValueOnce({ eq: vi.fn(async () => ({ error: null })) })

      await useMatchStore.getState().undoLastEvent()

      const state = useMatchStore.getState()
      expect(state.match?.home_score).toBe(6)
      expect(state.events).toHaveLength(0)
    })

    it('does nothing if there are no events in current quarter', async () => {
      const match = makeMatch({ home_score: 5, quarter: 2 })
      const events = [
        {
          id: 'ev-old',
          match_id: 'match-1',
          type: 'goal_2' as const,
          team_id: 'home-team',
          player_id: null,
          quarter: 1, // different quarter
          time_remaining: 100,
          synced: true,
          created_at: '2025-01-01T00:00:00Z',
        },
      ]
      useMatchStore.setState({ match, events, claimed: true })

      await useMatchStore.getState().undoLastEvent()

      expect(useMatchStore.getState().match?.home_score).toBe(5)
      expect(useMatchStore.getState().events).toHaveLength(1)
    })
  })

  // -------------------------------------------------------------------------
  // startClock / pauseClock
  // -------------------------------------------------------------------------
  describe('clock', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('startClock sets clockRunning = true', () => {
      const match = makeMatch()
      useMatchStore.setState({ match, claimed: true })
      mockUpdate.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) })

      useMatchStore.getState().startClock()

      expect(useMatchStore.getState().clockRunning).toBe(true)
    })

    it('pauseClock sets clockRunning = false', () => {
      const match = makeMatch()
      useMatchStore.setState({ match, claimed: true })
      mockUpdate.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) })

      useMatchStore.getState().startClock()
      useMatchStore.getState().pauseClock()

      expect(useMatchStore.getState().clockRunning).toBe(false)
    })

    it('clock ticks down timeRemaining each second', () => {
      const match = makeMatch()
      useMatchStore.setState({ match, claimed: true, timeRemaining: 10 })
      mockUpdate.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) })

      useMatchStore.getState().startClock()
      vi.advanceTimersByTime(3000)

      expect(useMatchStore.getState().timeRemaining).toBe(7)
    })
  })

  // -------------------------------------------------------------------------
  // useTimeout
  // -------------------------------------------------------------------------
  describe('useTimeout', () => {
    function mockTimeoutWrite(teamId: string) {
      mockInsert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: makeEventData({ id: 'ev-to', type: 'timeout', team_id: teamId }),
            error: null,
          })),
        })),
      })
    }

    it('decrements home timeout count', async () => {
      const match = makeMatch()
      useMatchStore.setState({ match, claimed: true, homeTimeouts: 2 })
      mockUpdate.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) })
      mockTimeoutWrite('home-team')

      await useMatchStore.getState().useTimeout('home')

      expect(useMatchStore.getState().homeTimeouts).toBe(1)
    })

    it('decrements away timeout count', async () => {
      const match = makeMatch()
      useMatchStore.setState({ match, claimed: true, awayTimeouts: 2 })
      mockUpdate.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) })
      mockTimeoutWrite('away-team')

      await useMatchStore.getState().useTimeout('away')

      expect(useMatchStore.getState().awayTimeouts).toBe(1)
    })

    it('does not decrement if timeouts are exhausted', async () => {
      const match = makeMatch()
      useMatchStore.setState({ match, claimed: true, homeTimeouts: 0 })

      await useMatchStore.getState().useTimeout('home')

      expect(useMatchStore.getState().homeTimeouts).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // endQuarter
  // -------------------------------------------------------------------------
  describe('endQuarter', () => {
    function mockEndQuarterWrite() {
      mockInsert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: makeEventData({ id: 'ev-qe', type: 'quarter_end', team_id: null }),
            error: null,
          })),
        })),
      })
      mockUpdate.mockReturnValueOnce({ eq: vi.fn(async () => ({ error: null })) })
    }

    it('increments quarter number', async () => {
      const match = makeMatch({ quarter: 1 })
      useMatchStore.setState({ match, claimed: true })
      mockEndQuarterWrite()

      await useMatchStore.getState().endQuarter()

      expect(useMatchStore.getState().match?.quarter).toBe(2)
    })

    it('resets fouls to 0 on quarter end', async () => {
      const match = makeMatch({ quarter: 1 })
      useMatchStore.setState({ match, claimed: true, homeFouls: 4, awayFouls: 3 })
      mockEndQuarterWrite()

      await useMatchStore.getState().endQuarter()

      expect(useMatchStore.getState().homeFouls).toBe(0)
      expect(useMatchStore.getState().awayFouls).toBe(0)
    })

    it('resets timeouts at halftime (after Q2)', async () => {
      const match = makeMatch({ quarter: 2 })
      useMatchStore.setState({ match, claimed: true, homeTimeouts: 0, awayTimeouts: 1 })
      mockEndQuarterWrite()

      await useMatchStore.getState().endQuarter()

      expect(useMatchStore.getState().homeTimeouts).toBe(2)
      expect(useMatchStore.getState().awayTimeouts).toBe(2)
    })

    it('sets status to quarter_break', async () => {
      const match = makeMatch({ quarter: 3 })
      useMatchStore.setState({ match, claimed: true })
      mockEndQuarterWrite()

      await useMatchStore.getState().endQuarter()

      expect(useMatchStore.getState().match?.status).toBe('quarter_break')
    })
  })
})
