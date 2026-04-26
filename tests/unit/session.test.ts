import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveSession, getSession, clearSession, verifySession } from '../../src/lib/session'

// Mock supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}))

import { supabase } from '../../src/lib/supabase'

describe('session', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('saveSession', () => {
    it('saves scorekeeper session to sessionStorage (tab-scoped, not shared across tabs)', () => {
      const sessionId = saveSession('match-1', 'scorekeeper')
      expect(sessionId).toBeTruthy()

      const stored = sessionStorage.getItem('hbl_session')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.matchId).toBe('match-1')
      expect(parsed.role).toBe('scorekeeper')
      expect(parsed.sessionId).toBe(sessionId)

      // Should NOT be in localStorage (prevents cross-tab leaks)
      expect(localStorage.getItem('hbl_session')).toBeNull()
    })

    it('saves viewer session to sessionStorage', () => {
      saveSession('match-1', 'viewer')

      expect(sessionStorage.getItem('hbl_session')).toBeTruthy()
      expect(localStorage.getItem('hbl_session')).toBeNull()
    })

    it('saves admin to localStorage (PIN-authenticated, intentional persistence)', () => {
      saveSession('match-1', 'admin')

      expect(localStorage.getItem('hbl_session')).toBeTruthy()
      expect(sessionStorage.getItem('hbl_session')).toBeNull()
    })

    it('saves stat_tracker to localStorage', () => {
      saveSession('match-1', 'stat_tracker')

      expect(localStorage.getItem('hbl_session')).toBeTruthy()
      expect(sessionStorage.getItem('hbl_session')).toBeNull()
    })

    it('generates unique session IDs', () => {
      const id1 = saveSession('match-1', 'viewer')
      sessionStorage.clear()
      const id2 = saveSession('match-1', 'viewer')
      expect(id1).not.toBe(id2)
    })

    it('works for all role types', () => {
      for (const role of ['viewer', 'scorekeeper', 'stat_tracker', 'admin'] as const) {
        sessionStorage.clear()
        localStorage.clear()
        saveSession('match-1', role)
        const session = getSession()
        expect(session?.role).toBe(role)
      }
    })
  })

  describe('getSession', () => {
    it('returns null when no session exists', () => {
      expect(getSession()).toBeNull()
    })

    it('returns scorekeeper session from sessionStorage', () => {
      saveSession('match-42', 'scorekeeper')
      const session = getSession()
      expect(session).not.toBeNull()
      expect(session!.matchId).toBe('match-42')
      expect(session!.role).toBe('scorekeeper')
    })

    it('returns viewer session from sessionStorage', () => {
      saveSession('match-42', 'viewer')
      const session = getSession()
      expect(session).not.toBeNull()
      expect(session!.role).toBe('viewer')
    })

    it('prefers localStorage (admin) over sessionStorage (viewer) when both present', () => {
      // Simulate both having data (edge case — e.g. admin + viewer on same device)
      localStorage.setItem('hbl_session', JSON.stringify({ matchId: 'm1', role: 'admin', sessionId: 'op' }))
      sessionStorage.setItem('hbl_session', JSON.stringify({ matchId: 'm2', role: 'viewer', sessionId: 'vi' }))
      const session = getSession()
      expect(session!.role).toBe('admin')
    })

    it('returns null for corrupt data', () => {
      sessionStorage.setItem('hbl_session', 'not-json{{{')
      expect(getSession()).toBeNull()
    })
  })

  describe('clearSession', () => {
    it('removes session from both storages', () => {
      saveSession('match-1', 'scorekeeper')
      saveSession('match-2', 'viewer')
      clearSession()
      expect(getSession()).toBeNull()
      expect(localStorage.getItem('hbl_session')).toBeNull()
      expect(sessionStorage.getItem('hbl_session')).toBeNull()
    })
  })

  describe('verifySession', () => {
    function mockSupabaseSelect(data: Record<string, unknown> | null) {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(chain as never)
      return chain
    }

    it('returns valid when match exists and claim matches', async () => {
      mockSupabaseSelect({
        status: 'running',
        scorekeeper_claimed_by: 'session-123',
        stat_tracker_claimed_by: null,
      })

      const result = await verifySession({ matchId: 'm1', role: 'scorekeeper', sessionId: 'session-123' })
      expect(result).toEqual({ valid: true })
    })

    it('returns reassigned when someone else claimed the role', async () => {
      mockSupabaseSelect({
        status: 'running',
        scorekeeper_claimed_by: 'other-session',
        stat_tracker_claimed_by: null,
      })

      const result = await verifySession({ matchId: 'm1', role: 'scorekeeper', sessionId: 'session-123' })
      expect(result).toEqual({ valid: false, reason: 'reassigned' })
    })

    it('returns finished when match is over', async () => {
      mockSupabaseSelect({
        status: 'finished',
        scorekeeper_claimed_by: 'session-123',
        stat_tracker_claimed_by: null,
      })

      const result = await verifySession({ matchId: 'm1', role: 'scorekeeper', sessionId: 'session-123' })
      expect(result).toEqual({ valid: false, reason: 'finished' })
    })

    it('returns not_found when match does not exist', async () => {
      mockSupabaseSelect(null)

      const result = await verifySession({ matchId: 'm1', role: 'scorekeeper', sessionId: 'session-123' })
      expect(result).toEqual({ valid: false, reason: 'not_found' })
    })

    it('returns valid for viewer role regardless of claims', async () => {
      mockSupabaseSelect({
        status: 'running',
        scorekeeper_claimed_by: null,
        stat_tracker_claimed_by: null,
      })

      const result = await verifySession({ matchId: 'm1', role: 'viewer', sessionId: 'session-123' })
      expect(result).toEqual({ valid: true })
    })

    it('verifies stat_tracker claim correctly', async () => {
      mockSupabaseSelect({
        status: 'running',
        scorekeeper_claimed_by: null,
        stat_tracker_claimed_by: 'session-456',
      })

      const result = await verifySession({ matchId: 'm1', role: 'stat_tracker', sessionId: 'session-456' })
      expect(result).toEqual({ valid: true })
    })
  })
})
