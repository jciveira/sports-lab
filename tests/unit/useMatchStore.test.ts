import { describe, it, expect, beforeEach } from 'vitest'
import { useMatchStore, getActiveExclusionsForTeam, computeClockSeconds } from '../../src/hooks/useMatchStore'
import { DEFAULT_CONFIG } from '../../src/lib/rules'

function getState() {
  return useMatchStore.getState()
}

function act(fn: (s: ReturnType<typeof useMatchStore.getState>) => void) {
  fn(getState())
}

describe('useMatchStore', () => {
  beforeEach(() => {
    getState().reset()
  })

  describe('initial state', () => {
    it('starts with zero scores', () => {
      expect(getState().homeScore).toBe(0)
      expect(getState().awayScore).toBe(0)
    })

    it('starts in scheduled status', () => {
      expect(getState().status).toBe('scheduled')
    })

    it('starts with clock at 0, not running, half 1', () => {
      expect(getState().clockSeconds).toBe(0)
      expect(getState().isRunning).toBe(false)
      expect(getState().currentHalf).toBe(1)
    })

    it('starts with default config', () => {
      expect(getState().config).toEqual(DEFAULT_CONFIG)
    })

    it('starts with correct timeouts from config', () => {
      expect(getState().homeTimeoutsLeft).toBe(DEFAULT_CONFIG.timeoutsPerHalf)
      expect(getState().awayTimeoutsLeft).toBe(DEFAULT_CONFIG.timeoutsPerHalf)
    })

    it('starts with _isRemoteUpdate false', () => {
      expect(getState()._isRemoteUpdate).toBe(false)
    })
  })

  describe('scoring', () => {
    it('increments home score', () => {
      getState().incrementScore('home')
      expect(getState().homeScore).toBe(1)
      expect(getState().awayScore).toBe(0)
    })

    it('increments away score', () => {
      getState().incrementScore('away')
      expect(getState().awayScore).toBe(1)
      expect(getState().homeScore).toBe(0)
    })

    it('decrements home score', () => {
      getState().incrementScore('home')
      getState().incrementScore('home')
      getState().decrementScore('home')
      expect(getState().homeScore).toBe(1)
    })

    it('does not decrement below zero', () => {
      getState().decrementScore('home')
      expect(getState().homeScore).toBe(0)
    })

    it('handles multiple increments', () => {
      for (let i = 0; i < 15; i++) getState().incrementScore('home')
      expect(getState().homeScore).toBe(15)
    })
  })

  describe('clock', () => {
    it('toggleClock starts the clock and sets status to running', () => {
      getState().toggleClock()
      expect(getState().isRunning).toBe(true)
      expect(getState().status).toBe('running')
    })

    it('toggleClock again pauses the clock', () => {
      getState().toggleClock()
      getState().toggleClock()
      expect(getState().isRunning).toBe(false)
      expect(getState().status).toBe('paused')
    })

    it('tick increments clock when running', () => {
      getState().toggleClock()
      getState().tick()
      expect(getState().clockSeconds).toBe(1)
    })

    it('tick does nothing when not running', () => {
      getState().tick()
      expect(getState().clockSeconds).toBe(0)
    })

    it('multiple ticks accumulate', () => {
      getState().toggleClock()
      for (let i = 0; i < 60; i++) getState().tick()
      expect(getState().clockSeconds).toBe(60)
    })
  })

  describe('halves', () => {
    it('nextHalf advances to half 2 with default 2-half config', () => {
      getState().toggleClock() // start
      getState().toggleClock() // pause
      getState().nextHalf()
      expect(getState().currentHalf).toBe(2)
      expect(getState().clockSeconds).toBe(0)
      expect(getState().isRunning).toBe(false)
      expect(getState().status).toBe('halftime')
    })

    it('nextHalf resets timeouts for new half', () => {
      getState().toggleClock()
      getState().callTimeout('home')
      expect(getState().homeTimeoutsLeft).toBe(0)
      getState().nextHalf()
      expect(getState().homeTimeoutsLeft).toBe(DEFAULT_CONFIG.timeoutsPerHalf)
    })

    it('nextHalf clears activeTimeout', () => {
      getState().toggleClock()
      getState().callTimeout('home')
      expect(getState().activeTimeout).toBe('home')
      getState().nextHalf()
      expect(getState().activeTimeout).toBeNull()
    })

    it('finishing match clears activeTimeout', () => {
      getState().toggleClock()
      getState().callTimeout('away')
      getState().nextHalf() // half 2
      getState().toggleClock()
      getState().callTimeout('home')
      getState().nextHalf() // past final → finished
      expect(getState().status).toBe('finished')
      expect(getState().activeTimeout).toBeNull()
    })

    it('nextHalf past final half ends the match', () => {
      // Default is 2 halves
      getState().nextHalf() // go to half 2
      getState().nextHalf() // try to go past
      expect(getState().status).toBe('finished')
      expect(getState().isRunning).toBe(false)
    })

    it('handles 4-half config (mini format)', () => {
      getState().setConfig({ halves: 4 })
      getState().nextHalf()
      expect(getState().currentHalf).toBe(2)
      getState().nextHalf()
      expect(getState().currentHalf).toBe(3)
      getState().nextHalf()
      expect(getState().currentHalf).toBe(4)
      getState().nextHalf() // past the last
      expect(getState().status).toBe('finished')
    })
  })

  describe('config', () => {
    it('setConfig updates config when scheduled', () => {
      getState().setConfig({ halfDurationMinutes: 25 })
      expect(getState().config.halfDurationMinutes).toBe(25)
    })

    it('setConfig is locked during play', () => {
      getState().toggleClock() // status = running
      getState().setConfig({ halfDurationMinutes: 30 })
      expect(getState().config.halfDurationMinutes).toBe(DEFAULT_CONFIG.halfDurationMinutes)
    })

    it('setConfig updates timeout count', () => {
      getState().setConfig({ timeoutsPerHalf: 3 })
      expect(getState().homeTimeoutsLeft).toBe(3)
      expect(getState().awayTimeoutsLeft).toBe(3)
    })

    it('partial config preserves other fields', () => {
      getState().setConfig({ halves: 4 })
      expect(getState().config.halfDurationMinutes).toBe(DEFAULT_CONFIG.halfDurationMinutes)
      expect(getState().config.halves).toBe(4)
    })
  })

  describe('timeouts', () => {
    it('callTimeout decrements and pauses', () => {
      getState().toggleClock() // running
      getState().callTimeout('home')
      expect(getState().homeTimeoutsLeft).toBe(0) // default is 1
      expect(getState().isRunning).toBe(false)
      expect(getState().status).toBe('paused')
    })

    it('callTimeout does nothing when no timeouts left', () => {
      getState().toggleClock()
      getState().callTimeout('home')
      getState().toggleClock() // resume
      getState().callTimeout('home') // no timeouts left
      expect(getState().homeTimeoutsLeft).toBe(0)
      // Should still be running since the second call was a no-op
      expect(getState().isRunning).toBe(true)
    })

    it('home and away timeouts are independent', () => {
      getState().toggleClock()
      getState().callTimeout('home')
      expect(getState().homeTimeoutsLeft).toBe(0)
      expect(getState().awayTimeoutsLeft).toBe(1)
    })

    it('callTimeout sets activeTimeout to the calling team', () => {
      getState().toggleClock()
      getState().callTimeout('away')
      expect(getState().activeTimeout).toBe('away')
    })

    it('toggleClock clears activeTimeout when resuming', () => {
      getState().toggleClock() // running
      getState().callTimeout('home') // paused with timeout
      expect(getState().activeTimeout).toBe('home')
      getState().toggleClock() // resume
      expect(getState().activeTimeout).toBeNull()
    })

    it('activeTimeout is null initially', () => {
      expect(getState().activeTimeout).toBeNull()
    })
  })

  describe('exclusions', () => {
    it('addExclusion adds to the list', () => {
      getState().addExclusion({
        player_id: 'p1',
        team_id: 'home',
        start_time: 30,
        duration: 120,
        half: 1,
      })
      expect(getState().exclusions).toHaveLength(1)
      expect(getState().exclusions[0].player_id).toBe('p1')
    })

    it('multiple exclusions accumulate', () => {
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 30, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p2', team_id: 'away', start_time: 45, duration: 120, half: 1 })
      expect(getState().exclusions).toHaveLength(2)
    })

    it('blocks addExclusion when team reaches maxExclusionsPerTeam', () => {
      // Default max is 3
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p2', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p3', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      // 4th should be blocked
      getState().addExclusion({ player_id: 'p4', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      expect(getState().exclusions).toHaveLength(3)
    })

    it('allows exclusion for different team even when one team is at limit', () => {
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p2', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p3', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      // Away team should still be allowed
      getState().addExclusion({ player_id: 'p4', team_id: 'away', start_time: 0, duration: 120, half: 1 })
      expect(getState().exclusions).toHaveLength(4)
    })

    it('allows new exclusion after previous ones expire', () => {
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p2', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p3', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      // Advance clock past expiry
      useMatchStore.setState({ clockSeconds: 130 })
      // Now all 3 are expired — should allow a new one
      getState().addExclusion({ player_id: 'p4', team_id: 'home', start_time: 130, duration: 120, half: 1 })
      expect(getState().exclusions).toHaveLength(4)
    })

    it('allows new exclusion after dismissing one', () => {
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p2', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p3', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      // Dismiss one
      getState().dismissExclusion(0)
      // Now should allow a new one
      getState().addExclusion({ player_id: 'p4', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      expect(getState().exclusions).toHaveLength(4)
      expect(getState().exclusions[0].dismissed).toBe(true)
    })

    it('dismissExclusion marks exclusion as dismissed', () => {
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().dismissExclusion(0)
      expect(getState().exclusions[0].dismissed).toBe(true)
    })

    it('dismissExclusion does not affect other exclusions', () => {
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p2', team_id: 'home', start_time: 10, duration: 120, half: 1 })
      getState().dismissExclusion(0)
      expect(getState().exclusions[0].dismissed).toBe(true)
      expect(getState().exclusions[1].dismissed).toBeUndefined()
    })

    it('getActiveExclusionsForTeam returns only active non-dismissed exclusions', () => {
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().addExclusion({ player_id: 'p2', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().dismissExclusion(0)
      const active = getActiveExclusionsForTeam('home')
      expect(active).toHaveLength(1)
      expect(active[0].player_id).toBe('p2')
    })
  })

  describe('setStatus', () => {
    it('sets status and syncs isRunning', () => {
      getState().setStatus('running')
      expect(getState().status).toBe('running')
      expect(getState().isRunning).toBe(true)
    })

    it('sets paused status and stops running', () => {
      getState().setStatus('running')
      getState().setStatus('paused')
      expect(getState().isRunning).toBe(false)
    })
  })

  describe('reset', () => {
    it('resets everything to initial state', () => {
      getState().toggleClock()
      getState().incrementScore('home')
      getState().incrementScore('away')
      getState().addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 })
      getState().reset()

      expect(getState().homeScore).toBe(0)
      expect(getState().awayScore).toBe(0)
      expect(getState().clockSeconds).toBe(0)
      expect(getState().isRunning).toBe(false)
      expect(getState().status).toBe('scheduled')
      expect(getState().exclusions).toHaveLength(0)
      expect(getState().currentHalf).toBe(1)
    })
  })

  describe('resetScore', () => {
    it('resets both scores to zero', () => {
      act((s) => s.incrementScore('home'))
      act((s) => s.incrementScore('home'))
      act((s) => s.incrementScore('away'))
      expect(getState().homeScore).toBe(2)
      expect(getState().awayScore).toBe(1)
      act((s) => s.resetScore())
      expect(getState().homeScore).toBe(0)
      expect(getState().awayScore).toBe(0)
    })

    it('does not affect clock', () => {
      act((s) => s.toggleClock())
      act((s) => s.tick())
      act((s) => s.tick())
      act((s) => s.incrementScore('home'))
      const clockBefore = getState().clockSeconds
      act((s) => s.resetScore())
      expect(getState().clockSeconds).toBe(clockBefore)
    })

    it('does not affect half or status', () => {
      act((s) => s.toggleClock())
      act((s) => s.incrementScore('home'))
      const halfBefore = getState().currentHalf
      const statusBefore = getState().status
      act((s) => s.resetScore())
      expect(getState().currentHalf).toBe(halfBefore)
      expect(getState().status).toBe(statusBefore)
    })

    it('does not affect timeouts', () => {
      act((s) => s.toggleClock())
      act((s) => s.callTimeout('home'))
      const homeTOBefore = getState().homeTimeoutsLeft
      const awayTOBefore = getState().awayTimeoutsLeft
      act((s) => s.resetScore())
      expect(getState().homeTimeoutsLeft).toBe(homeTOBefore)
      expect(getState().awayTimeoutsLeft).toBe(awayTOBefore)
    })

    it('does not affect exclusions', () => {
      act((s) => s.toggleClock())
      act((s) => s.addExclusion({ player_id: 'p1', team_id: 'home', start_time: 0, duration: 120, half: 1 }))
      act((s) => s.resetScore())
      expect(getState().exclusions).toHaveLength(1)
    })
  })

  describe('server clock (clockSecondsBase + clockStartedAt)', () => {
    it('toggleClock start sets clockStartedAt and keeps clockSecondsBase', () => {
      getState().toggleClock() // start
      expect(getState().isRunning).toBe(true)
      expect(getState().clockStartedAt).not.toBeNull()
      expect(getState().clockSecondsBase).toBe(0)
    })

    it('toggleClock pause freezes clockSecondsBase and clears clockStartedAt', () => {
      getState().toggleClock() // start
      getState().toggleClock() // pause
      expect(getState().isRunning).toBe(false)
      expect(getState().clockStartedAt).toBeNull()
      // clockSecondsBase reflects elapsed (0 or 1 in a fast test)
      expect(getState().clockSecondsBase).toBeGreaterThanOrEqual(0)
      expect(getState().clockSeconds).toBe(getState().clockSecondsBase)
    })

    it('nextHalf resets clockSecondsBase and clockStartedAt to zero/null', () => {
      getState().toggleClock() // start
      getState().toggleClock() // pause
      getState().nextHalf()
      expect(getState().clockSecondsBase).toBe(0)
      expect(getState().clockStartedAt).toBeNull()
      expect(getState().clockSeconds).toBe(0)
    })

    it('callTimeout freezes clock and clears clockStartedAt', () => {
      getState().toggleClock() // start
      getState().callTimeout('home')
      expect(getState().isRunning).toBe(false)
      expect(getState().clockStartedAt).toBeNull()
      expect(getState().clockSeconds).toBe(getState().clockSecondsBase)
    })

    it('reset clears clockSecondsBase and clockStartedAt', () => {
      getState().toggleClock()
      useMatchStore.setState({ clockSecondsBase: 300, clockStartedAt: new Date().toISOString() })
      getState().reset()
      expect(getState().clockSecondsBase).toBe(0)
      expect(getState().clockStartedAt).toBeNull()
      expect(getState().clockSeconds).toBe(0)
    })

    it('computeClockSeconds returns base when paused (no startedAt)', () => {
      expect(computeClockSeconds(300, null)).toBe(300)
      expect(computeClockSeconds(0, null)).toBe(0)
    })

    it('computeClockSeconds adds elapsed time since start', () => {
      const twoSecondsAgo = new Date(Date.now() - 2000).toISOString()
      const result = computeClockSeconds(100, twoSecondsAgo)
      expect(result).toBeGreaterThanOrEqual(102)
      expect(result).toBeLessThanOrEqual(103)
    })

    it('admin joining does not reset clock: hydration sets clockSeconds from timestamps', () => {
      // Simulate: admin opens page, store hydrated from DB with running clock at 450s
      const clockBase = 400
      const startedAt = new Date(Date.now() - 50_000).toISOString() // 50s ago
      useMatchStore.setState({
        clockSecondsBase: clockBase,
        clockStartedAt: startedAt,
        clockSeconds: computeClockSeconds(clockBase, startedAt),
        isRunning: true,
        status: 'running',
      })
      const clockSeconds = getState().clockSeconds
      // Clock should be ~450, not 0
      expect(clockSeconds).toBeGreaterThanOrEqual(449)
      expect(clockSeconds).toBeLessThanOrEqual(452)
    })
  })
})
