import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Supabase mock — vi.hoisted so variables are available when vi.mock factory runs
// ---------------------------------------------------------------------------

const { mockFrom, mockInsert, mockUpdate, mockDelete, mockSingle, mockEq, mockOrder } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockOrder = vi.fn(async () => ({ data: [], error: null }))

  const mockEq = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle, eq: mockEq, order: mockOrder }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockDelete = vi.fn(() => ({ eq: mockEq }))

  // Default eq chain
  mockEq.mockReturnValue({
    single: mockSingle,
    eq: mockEq,
    order: mockOrder,
    select: mockSelect,
  })

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
  }))

  return { mockFrom, mockInsert, mockUpdate, mockDelete, mockSingle, mockEq, mockOrder }
})

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: mockFrom },
  isSupabaseConfigured: true,
}))

// ---------------------------------------------------------------------------
// Import store after mock
// ---------------------------------------------------------------------------

import { usePlayersStore } from '../../src/stores/usePlayersStore'
import type { Player, PlayerAttributes } from '../../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    team_id: 'team-1',
    display_name: 'Juan G.',
    number: 10,
    position: 'PG',
    avatar_url: null,
    attributes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeAttributes(overrides: Partial<PlayerAttributes> = {}): PlayerAttributes {
  return {
    tiro: 75,
    pase: 80,
    defensa: 70,
    fisico: 65,
    stamina: 85,
    vision: 90,
    ...overrides,
  }
}

function resetStore() {
  usePlayersStore.setState({ players: [], loading: false, error: null })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStore()
  vi.clearAllMocks()
})

describe('usePlayersStore', () => {

  // ── fetchPlayersForTeam ────────────────────────────────────────────────────

  describe('fetchPlayersForTeam', () => {
    it('populates players array from Supabase', async () => {
      const list = [makePlayer({ id: 'p1', number: 5 }), makePlayer({ id: 'p2', number: 10 })]

      // Mock chain: .from().select().eq().order()
      mockOrder.mockResolvedValueOnce({ data: list, error: null })
      mockEq.mockReturnValueOnce({ order: mockOrder })
      const mockSelectChain = vi.fn(() => ({ eq: mockEq }))
      mockFrom.mockReturnValueOnce({ select: mockSelectChain, insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq })

      await usePlayersStore.getState().fetchPlayersForTeam('team-1')

      expect(usePlayersStore.getState().players).toHaveLength(2)
      expect(usePlayersStore.getState().players[0].id).toBe('p1')
    })

    it('handles empty results', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })
      mockEq.mockReturnValueOnce({ order: mockOrder })
      const mockSelectChain = vi.fn(() => ({ eq: mockEq }))
      mockFrom.mockReturnValueOnce({ select: mockSelectChain, insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq })

      await usePlayersStore.getState().fetchPlayersForTeam('team-1')

      expect(usePlayersStore.getState().players).toHaveLength(0)
      expect(usePlayersStore.getState().error).toBeNull()
    })
  })

  // ── addPlayer ─────────────────────────────────────────────────────────────

  describe('addPlayer', () => {
    it('adds a player to the store on success', async () => {
      const newPlayer = makePlayer({ id: 'p-new', number: 7 })
      mockSingle.mockResolvedValueOnce({ data: newPlayer, error: null })
      const mockSelectChain = vi.fn(() => ({ single: mockSingle }))
      mockInsert.mockReturnValueOnce({ select: mockSelectChain })
      mockFrom.mockReturnValueOnce({ select: vi.fn(), insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq })

      const result = await usePlayersStore.getState().addPlayer('team-1', 'Juan G.', 7, 'PG')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('p-new')
      expect(usePlayersStore.getState().players).toHaveLength(1)
    })

    it('returns null and sets error on duplicate jersey number', async () => {
      // Pre-seed store with a player wearing #10
      usePlayersStore.setState({ players: [makePlayer({ number: 10 })] })

      const result = await usePlayersStore.getState().addPlayer('team-1', 'Pedro M.', 10, 'SG')

      expect(result).toBeNull()
      expect(usePlayersStore.getState().error).toContain('#10')
      // No new DB call should have been made
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('returns null and sets error when squad is full (12 players)', async () => {
      const fullRoster = Array.from({ length: 12 }, (_, i) =>
        makePlayer({ id: `p-${i}`, number: i + 1 }),
      )
      usePlayersStore.setState({ players: fullRoster })

      const result = await usePlayersStore.getState().addPlayer('team-1', 'Extra E.', 99, 'C')

      expect(result).toBeNull()
      expect(usePlayersStore.getState().error).toContain('12')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('returns null and sets error on Supabase insert error', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'insert error' } })
      const mockSelectChain = vi.fn(() => ({ single: mockSingle }))
      mockInsert.mockReturnValueOnce({ select: mockSelectChain })
      mockFrom.mockReturnValueOnce({ select: vi.fn(), insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq })

      const result = await usePlayersStore.getState().addPlayer('team-1', 'Carlos R.', 5, 'SF')

      expect(result).toBeNull()
      expect(usePlayersStore.getState().error).toBe('insert error')
    })
  })

  // ── removePlayer ──────────────────────────────────────────────────────────

  describe('removePlayer', () => {
    it('removes player from store on success', async () => {
      usePlayersStore.setState({ players: [makePlayer({ id: 'p-del', number: 5 })] })

      mockEq.mockResolvedValueOnce({ error: null })
      mockDelete.mockReturnValueOnce({ eq: mockEq })
      mockFrom.mockReturnValueOnce({ select: vi.fn(), insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq })

      const result = await usePlayersStore.getState().removePlayer('p-del')

      expect(result).toBe(true)
      expect(usePlayersStore.getState().players).toHaveLength(0)
    })

    it('returns false and sets error on Supabase delete error', async () => {
      usePlayersStore.setState({ players: [makePlayer({ id: 'p-err' })] })

      mockEq.mockResolvedValueOnce({ error: { message: 'delete failed' } })
      mockDelete.mockReturnValueOnce({ eq: mockEq })
      mockFrom.mockReturnValueOnce({ select: vi.fn(), insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq })

      const result = await usePlayersStore.getState().removePlayer('p-err')

      expect(result).toBe(false)
      expect(usePlayersStore.getState().error).toBe('delete failed')
      expect(usePlayersStore.getState().players).toHaveLength(1)
    })
  })

  // ── updatePlayerAttributes ────────────────────────────────────────────────

  describe('updatePlayerAttributes', () => {
    it('updates attributes in store on success', async () => {
      const player = makePlayer({ id: 'p-attr', attributes: null })
      usePlayersStore.setState({ players: [player] })

      const newAttrs = makeAttributes()
      mockEq.mockResolvedValueOnce({ error: null })
      mockUpdate.mockReturnValueOnce({ eq: mockEq })
      mockFrom.mockReturnValueOnce({ select: vi.fn(), insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq })

      const result = await usePlayersStore.getState().updatePlayerAttributes('p-attr', newAttrs)

      expect(result).toBe(true)
      const updated = usePlayersStore.getState().players.find((p) => p.id === 'p-attr')
      expect(updated?.attributes?.tiro).toBe(75)
      expect(updated?.attributes?.vision).toBe(90)
    })

    it('returns false and sets error on Supabase update error', async () => {
      const player = makePlayer({ id: 'p-fail' })
      usePlayersStore.setState({ players: [player] })

      mockEq.mockResolvedValueOnce({ error: { message: 'update error' } })
      mockUpdate.mockReturnValueOnce({ eq: mockEq })
      mockFrom.mockReturnValueOnce({ select: vi.fn(), insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq })

      const result = await usePlayersStore.getState().updatePlayerAttributes('p-fail', makeAttributes())

      expect(result).toBe(false)
      expect(usePlayersStore.getState().error).toBe('update error')
    })
  })
})
