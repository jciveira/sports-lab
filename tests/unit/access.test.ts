import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase — no live DB calls
const mockSelect = vi.fn()
const mockUpdate = vi.fn()

// Recursive chainable eq that supports .eq().eq().eq()... and terminates with .single() or .is()
function chainableEq(resolvedData: unknown, resolvedError: unknown = null): Record<string, unknown> {
  const eq = (_col: string, _val: string): Record<string, unknown> => ({
    eq,
    single: () => Promise.resolve({ data: resolvedData, error: resolvedError }),
    is: (_c: string, _v: null) => ({
      select: () => ({
        single: () => Promise.resolve({ data: resolvedData, error: resolvedError }),
      }),
    }),
  })
  return { eq }
}

function buildQuery(resolvedData: unknown, resolvedError: unknown = null) {
  return {
    select: (..._args: unknown[]) => chainableEq(resolvedData, resolvedError),
    update: (payload: unknown) => {
      mockUpdate(payload)
      return chainableEq(resolvedData, resolvedError)
    },
  }
}

let mockFromImpl: (table: string) => ReturnType<typeof buildQuery>

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockSelect(table)
      return mockFromImpl(table)
    },
  },
  isSupabaseConfigured: true,
}))

describe('access module (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('releaseRole', () => {
    it('nulls claimed_by, name, and last_active_at for scorekeeper', async () => {
      mockFromImpl = () => buildQuery(null)

      const { releaseRole } = await import('../../src/lib/access')
      await releaseRole('match-1', 'scorekeeper', 'session-1')

      expect(mockUpdate).toHaveBeenCalledWith({
        scorekeeper_claimed_by: null,
        scorekeeper_name: null,
        scorekeeper_last_active_at: null,
      })
    })

    it('nulls only claimed_by for stat_tracker', async () => {
      mockFromImpl = () => buildQuery(null)

      const { releaseRole } = await import('../../src/lib/access')
      await releaseRole('match-1', 'stat_tracker', 'session-1')

      expect(mockUpdate).toHaveBeenCalledWith({ stat_tracker_claimed_by: null })
    })
  })

  describe('isScorekeeperTimedOut', () => {
    it('returns false when lastActiveAt is null', async () => {
      const { isScorekeeperTimedOut } = await import('../../src/lib/access')
      expect(isScorekeeperTimedOut(null)).toBe(false)
    })

    it('returns false when heartbeat is recent (< 2 min)', async () => {
      const { isScorekeeperTimedOut } = await import('../../src/lib/access')
      const recent = new Date(Date.now() - 60_000).toISOString() // 1 min ago
      expect(isScorekeeperTimedOut(recent)).toBe(false)
    })

    it('returns true when heartbeat is stale (> 2 min)', async () => {
      const { isScorekeeperTimedOut } = await import('../../src/lib/access')
      const stale = new Date(Date.now() - 3 * 60_000).toISOString() // 3 min ago
      expect(isScorekeeperTimedOut(stale)).toBe(true)
    })
  })

  describe('claimScorekeeperByName', () => {
    it('returns true when unclaimed slot is successfully taken', async () => {
      const fakeMatch = { id: 'match-1', scorekeeper_claimed_by: 'session-1' }
      mockFromImpl = () => buildQuery(fakeMatch)

      const { claimScorekeeperByName } = await import('../../src/lib/access')
      const result = await claimScorekeeperByName('match-1', 'session-1', 'Mateo')

      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ scorekeeper_name: 'Mateo', scorekeeper_claimed_by: 'session-1' }),
      )
    })

    it('returns true with force=true regardless of existing claim', async () => {
      const fakeMatch = { id: 'match-1', scorekeeper_claimed_by: 'session-1' }
      mockFromImpl = () => buildQuery(fakeMatch)

      const { claimScorekeeperByName } = await import('../../src/lib/access')
      const result = await claimScorekeeperByName('match-1', 'session-1', 'Admin', true)

      expect(result).toBe(true)
    })
  })

  describe('scorekeeperHeartbeat', () => {
    it('updates last_active_at for the owning session', async () => {
      mockFromImpl = () => buildQuery(null)

      const { scorekeeperHeartbeat } = await import('../../src/lib/access')
      await scorekeeperHeartbeat('match-1', 'session-1')

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ scorekeeper_last_active_at: expect.any(String) }),
      )
    })
  })
})
