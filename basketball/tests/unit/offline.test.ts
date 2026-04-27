import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock offlineDb (Dexie) — IndexedDB is not available in jsdom
// ---------------------------------------------------------------------------

const { mockAdd, mockWhere, mockEquals, mockSortBy, mockUpdate: mockDbUpdate, mockCount } = vi.hoisted(() => {
  const mockCount = vi.fn(async () => 0)
  const mockSortBy = vi.fn(async () => [])
  const mockEquals = vi.fn(() => ({ sortBy: mockSortBy, count: mockCount }))
  const mockWhere = vi.fn(() => ({ equals: mockEquals }))
  const mockAdd = vi.fn(async () => 1)
  const mockUpdate = vi.fn(async () => 1)

  return { mockAdd, mockWhere, mockEquals, mockSortBy, mockUpdate, mockCount }
})

vi.mock('../../src/lib/offline', () => ({
  offlineDb: {
    pendingEvents: {
      add: mockAdd,
      where: mockWhere,
      update: mockDbUpdate,
    },
  },
}))

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const { mockSupabaseInsert, mockSupabaseSingle } = vi.hoisted(() => {
  const mockSupabaseSingle = vi.fn(async () => ({ error: null }))
  const mockSupabaseSelect = vi.fn(() => ({ single: mockSupabaseSingle }))
  const mockSupabaseInsert = vi.fn(() => ({ select: mockSupabaseSelect }))
  const mockFrom = vi.fn(() => ({ insert: mockSupabaseInsert }))

  return { mockSupabaseInsert, mockSupabaseSingle, mockFrom }
})

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ insert: mockSupabaseInsert })) },
  isSupabaseConfigured: false,
}))

// ---------------------------------------------------------------------------
// Import under test after mocks are registered
// ---------------------------------------------------------------------------

import { queueEvent, flushPendingEvents, getPendingCount } from '../../src/lib/offlineSync'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePendingEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    matchId: 'match-1',
    eventId: 'uuid-1',
    type: 'goal_2',
    teamId: 'home-team',
    quarter: 1,
    timeRemaining: 300,
    synced: false,
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('offlineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Re-wire default Dexie chain after clearAllMocks
    mockCount.mockResolvedValue(0)
    mockSortBy.mockResolvedValue([])
    mockEquals.mockReturnValue({ sortBy: mockSortBy, count: mockCount })
    mockWhere.mockReturnValue({ equals: mockEquals })
    mockAdd.mockResolvedValue(1)
    mockDbUpdate.mockResolvedValue(1)

    // Re-wire default Supabase chain
    mockSupabaseSingle.mockResolvedValue({ error: null })
  })

  // -------------------------------------------------------------------------
  // queueEvent
  // -------------------------------------------------------------------------
  describe('queueEvent', () => {
    it('stores event in IndexedDB with synced: false', async () => {
      await queueEvent({
        matchId: 'match-1',
        eventId: 'uuid-1',
        type: 'goal_2',
        teamId: 'home-team',
        quarter: 1,
        timeRemaining: 300,
      })

      expect(mockAdd).toHaveBeenCalledOnce()
      const added = mockAdd.mock.calls[0][0]
      expect(added.synced).toBe(false)
      expect(added.matchId).toBe('match-1')
      expect(added.eventId).toBe('uuid-1')
      expect(added.type).toBe('goal_2')
    })

    it('sets createdAt as an ISO string', async () => {
      await queueEvent({
        matchId: 'match-1',
        eventId: 'uuid-2',
        type: 'foul',
        teamId: 'away-team',
        quarter: 2,
        timeRemaining: 120,
      })

      const added = mockAdd.mock.calls[0][0]
      expect(() => new Date(added.createdAt).toISOString()).not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // flushPendingEvents
  // -------------------------------------------------------------------------
  describe('flushPendingEvents', () => {
    it('calls Supabase insert for each pending event', async () => {
      const events = [makePendingEvent({ id: 1 }), makePendingEvent({ id: 2, eventId: 'uuid-2' })]
      mockSortBy.mockResolvedValueOnce(events)

      await flushPendingEvents()

      // One insert per event
      expect(mockSupabaseInsert).toHaveBeenCalledTimes(2)
    })

    it('marks event as synced after successful Supabase insert', async () => {
      const event = makePendingEvent({ id: 1 })
      mockSortBy.mockResolvedValueOnce([event])
      mockSupabaseSingle.mockResolvedValueOnce({ error: null })

      await flushPendingEvents()

      expect(mockDbUpdate).toHaveBeenCalledWith(1, { synced: true })
    })

    it('silently skips duplicate event (error code 23505)', async () => {
      const event = makePendingEvent({ id: 3 })
      mockSortBy.mockResolvedValueOnce([event])
      mockSupabaseSingle.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key' } })

      await flushPendingEvents()

      // Should still mark as synced so it's not retried
      expect(mockDbUpdate).toHaveBeenCalledWith(3, { synced: true })
    })

    it('stops processing on unknown Supabase error', async () => {
      const events = [makePendingEvent({ id: 1 }), makePendingEvent({ id: 2, eventId: 'uuid-2' })]
      mockSortBy.mockResolvedValueOnce(events)
      // First event fails with a non-duplicate error
      mockSupabaseSingle.mockResolvedValueOnce({ error: { code: '500', message: 'server error' } })
      // Second event would succeed but should never be reached
      mockSupabaseSingle.mockResolvedValueOnce({ error: null })

      await flushPendingEvents()

      // Only one insert attempted, no update for either event
      expect(mockSupabaseInsert).toHaveBeenCalledTimes(1)
      expect(mockDbUpdate).not.toHaveBeenCalled()
    })

    it('is idempotent — second call with no pending events does nothing', async () => {
      mockSortBy.mockResolvedValue([])

      await flushPendingEvents()
      await flushPendingEvents()

      expect(mockSupabaseInsert).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // getPendingCount
  // -------------------------------------------------------------------------
  describe('getPendingCount', () => {
    it('returns count of unsynced events', async () => {
      mockCount.mockResolvedValueOnce(3)

      const count = await getPendingCount()

      expect(count).toBe(3)
    })

    it('returns 0 when no pending events', async () => {
      mockCount.mockResolvedValueOnce(0)

      const count = await getPendingCount()

      expect(count).toBe(0)
    })
  })
})
