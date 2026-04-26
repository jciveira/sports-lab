import { describe, it, expect, beforeEach } from 'vitest'
import { useMatchStore, computeClockSeconds } from '../../src/hooks/useMatchStore'
import type { Exclusion } from '../../src/types'

describe('syncMatchToServer guard', () => {
  beforeEach(() => {
    useMatchStore.getState().reset()
  })

  it('store state is accessible for sync payload', () => {
    // Verify the store fields that syncMatchToServer reads are all present
    useMatchStore.getState().toggleClock()
    useMatchStore.getState().incrementScore('home')

    const state = useMatchStore.getState()
    expect(state.homeScore).toBe(1)
    expect(state.awayScore).toBe(0)
    expect(state.status).toBe('running')
    expect(state.currentHalf).toBe(1)
    expect(state.clockSeconds).toBe(0)
    expect(state.homeTimeoutsLeft).toBe(1)
    expect(state.awayTimeoutsLeft).toBe(1)
  })

  it('useRealtimeMatch applies remote match state to store', () => {
    // Simulate what the realtime callback does
    const remoteState = {
      homeScore: 5,
      awayScore: 3,
      currentHalf: 2,
      clockSeconds: 900,
      homeTimeoutsLeft: 0,
      awayTimeoutsLeft: 1,
    }
    useMatchStore.setState(remoteState)

    const state = useMatchStore.getState()
    expect(state.homeScore).toBe(5)
    expect(state.awayScore).toBe(3)
    expect(state.currentHalf).toBe(2)
    expect(state.clockSeconds).toBe(900)
    expect(state.homeTimeoutsLeft).toBe(0)
    expect(state.awayTimeoutsLeft).toBe(1)
  })

  it('realtime status sync sets isRunning correctly', () => {
    // Simulate status update from realtime
    useMatchStore.setState({ status: 'running', isRunning: true })
    expect(useMatchStore.getState().isRunning).toBe(true)

    useMatchStore.setState({ status: 'paused', isRunning: false })
    expect(useMatchStore.getState().isRunning).toBe(false)

    useMatchStore.setState({ status: 'finished', isRunning: false })
    expect(useMatchStore.getState().isRunning).toBe(false)
  })
})

describe('_isRemoteUpdate flag (echo prevention)', () => {
  beforeEach(() => {
    useMatchStore.getState().reset()
  })

  it('_isRemoteUpdate defaults to false', () => {
    expect(useMatchStore.getState()._isRemoteUpdate).toBe(false)
  })

  it('_isRemoteUpdate resets to false after store reset', () => {
    useMatchStore.setState({ _isRemoteUpdate: true })
    useMatchStore.getState().reset()
    expect(useMatchStore.getState()._isRemoteUpdate).toBe(false)
  })

  it('subscriber sees _isRemoteUpdate=true during remote state application', () => {
    const flagValues: boolean[] = []

    const unsub = useMatchStore.subscribe(() => {
      flagValues.push(useMatchStore.getState()._isRemoteUpdate)
    })

    // Simulate applyRemoteState pattern from useRealtimeMatch
    useMatchStore.setState({ _isRemoteUpdate: true })
    useMatchStore.setState({ homeScore: 10 })
    useMatchStore.setState({ _isRemoteUpdate: false })

    unsub()

    // The subscriber fires 3 times:
    // 1. flag set to true → subscriber sees true
    // 2. homeScore set → subscriber sees true (flag still set)
    // 3. flag set to false → subscriber sees false
    expect(flagValues[0]).toBe(true)
    expect(flagValues[1]).toBe(true)
    expect(flagValues[2]).toBe(false)
  })

  it('subscriber sees _isRemoteUpdate=false for local actions', () => {
    const flagValues: boolean[] = []

    const unsub = useMatchStore.subscribe(() => {
      flagValues.push(useMatchStore.getState()._isRemoteUpdate)
    })

    useMatchStore.getState().incrementScore('home')
    useMatchStore.getState().toggleClock()

    unsub()

    // All local actions should have _isRemoteUpdate=false
    expect(flagValues.every((v) => v === false)).toBe(true)
  })

  it('scorekeeper subscriber pattern skips sync on remote updates (no echo loop)', () => {
    let syncCallCount = 0

    // Mirror the fixed MatchPage subscriber: also skip when _isRemoteUpdate just cleared (true→false)
    const unsub = useMatchStore.subscribe((state, prevState) => {
      if (state._isRemoteUpdate) return
      if (prevState._isRemoteUpdate && !state._isRemoteUpdate) return // flag just cleared — not real data
      syncCallCount++
    })

    // Simulate remote update (echo from server)
    useMatchStore.setState({ _isRemoteUpdate: true })
    useMatchStore.setState({ homeScore: 5, awayScore: 3 })
    useMatchStore.setState({ _isRemoteUpdate: false })

    // Remote update must trigger ZERO syncs — no echo loop
    const remoteTriggeredSyncs = syncCallCount
    syncCallCount = 0

    // Local action must still sync
    useMatchStore.getState().incrementScore('home')
    expect(syncCallCount).toBe(1)

    unsub()

    expect(remoteTriggeredSyncs).toBe(0) // echo loop is broken
  })

  it('subscriber skips only the flag-clear setState, not subsequent real actions', () => {
    let syncCallCount = 0

    const unsub = useMatchStore.subscribe((state, prevState) => {
      if (state._isRemoteUpdate) return
      if (prevState._isRemoteUpdate && !state._isRemoteUpdate) return
      syncCallCount++
    })

    // Remote update (should produce 0 syncs)
    useMatchStore.setState({ _isRemoteUpdate: true })
    useMatchStore.setState({ homeScore: 2 })
    useMatchStore.setState({ _isRemoteUpdate: false })
    expect(syncCallCount).toBe(0)

    // Two local actions immediately after (should each produce 1 sync)
    useMatchStore.getState().incrementScore('home')
    useMatchStore.getState().toggleClock()
    expect(syncCallCount).toBe(2)

    unsub()
  })

  it('stat_tracker subscriber pattern never calls sync', () => {
    let syncCalled = false
    const isScorekeeper = false // stat_tracker role

    const unsub = useMatchStore.subscribe(() => {
      // Mirror MatchPage subscriber: stat_tracker exits early
      if (!isScorekeeper) return
      syncCalled = true
    })

    // Local action — stat_tracker still shouldn't sync
    useMatchStore.getState().incrementScore('home')
    expect(syncCalled).toBe(false)

    // Remote update — also shouldn't sync
    useMatchStore.setState({ _isRemoteUpdate: true })
    useMatchStore.setState({ awayScore: 5 })
    useMatchStore.setState({ _isRemoteUpdate: false })
    expect(syncCalled).toBe(false)

    unsub()
  })

  it('all roles receive clock timestamps from remote and compute clockSeconds', () => {
    // New model: all roles apply clock_started_at + clock_seconds_base from server
    // and compute clockSeconds — no role skips clock updates
    useMatchStore.setState({ clockSeconds: 100, clockSecondsBase: 100, clockStartedAt: null })

    // Simulate what the realtime handler does (same for admin, scorekeeper, viewer)
    const clockBase = 150
    const clockStarted = null // paused
    const stateUpdate: Record<string, unknown> = {
      homeScore: 3,
      awayScore: 2,
      clockSecondsBase: clockBase,
      clockStartedAt: clockStarted,
      clockSeconds: clockBase, // computeClockSeconds(150, null) = 150
    }
    useMatchStore.setState(stateUpdate)

    // All roles see the same computed clock
    expect(useMatchStore.getState().clockSeconds).toBe(150)
    expect(useMatchStore.getState().clockSecondsBase).toBe(150)
    expect(useMatchStore.getState().clockStartedAt).toBeNull()
    expect(useMatchStore.getState().homeScore).toBe(3)
  })

  it('computeClockSeconds: returns base when not running', () => {
    expect(computeClockSeconds(300, null)).toBe(300)
  })

  it('computeClockSeconds: adds elapsed time when running', () => {
    const twoSecondsAgo = new Date(Date.now() - 2000).toISOString()
    const result = computeClockSeconds(100, twoSecondsAgo)
    expect(result).toBeGreaterThanOrEqual(102)
    expect(result).toBeLessThanOrEqual(103) // allow 1s tolerance
  })

  it('remote exclusion event adds exclusion to store', () => {
    // Simulate what the realtime handler does when it receives an exclusion event
    const store = useMatchStore.getState()
    const newExclusion: Exclusion = {
      player_id: '',
      team_id: 'home',
      start_time: 60,
      duration: store.config.exclusionDurationSeconds,
      half: 1,
    }

    // Apply using the same pattern as applyRemoteState
    useMatchStore.setState({ _isRemoteUpdate: true })
    useMatchStore.setState({ exclusions: [...store.exclusions, newExclusion] })
    useMatchStore.setState({ _isRemoteUpdate: false })

    const updated = useMatchStore.getState()
    expect(updated.exclusions).toHaveLength(1)
    expect(updated.exclusions[0].team_id).toBe('home')
    expect(updated.exclusions[0].start_time).toBe(60)
  })

  it('remote exclusion dedup: does not add duplicate exclusion', () => {
    // Add exclusion locally first (scorekeeper scenario)
    useMatchStore.getState().addExclusion({
      player_id: '',
      team_id: 'away',
      start_time: 120,
      duration: 120,
      half: 1,
    })
    expect(useMatchStore.getState().exclusions).toHaveLength(1)

    // Simulate realtime echo — same exclusion comes back from DB
    const store = useMatchStore.getState()
    const alreadyExists = store.exclusions.some(
      (e) => e.team_id === 'away' && e.half === 1 && e.start_time === 120 && !e.dismissed,
    )
    expect(alreadyExists).toBe(true)
    // Handler would skip adding — exclusions stays at 1
    expect(store.exclusions).toHaveLength(1)
  })

  it('remote exclusion_end event dismisses matching exclusion', () => {
    // Add exclusion first
    useMatchStore.getState().addExclusion({
      player_id: '',
      team_id: 'home',
      start_time: 30,
      duration: 120,
      half: 1,
    })

    // Simulate realtime exclusion_end event
    const store = useMatchStore.getState()
    const exclusions = store.exclusions.map((e) => {
      if (e.team_id === 'home' && e.half === 1 && e.start_time === 30 && !e.dismissed) {
        return { ...e, dismissed: true }
      }
      return e
    })

    useMatchStore.setState({ _isRemoteUpdate: true })
    useMatchStore.setState({ exclusions })
    useMatchStore.setState({ _isRemoteUpdate: false })

    const updated = useMatchStore.getState()
    expect(updated.exclusions).toHaveLength(1)
    expect(updated.exclusions[0].dismissed).toBe(true)
  })

  it('exclusion hydration from DB events reconstructs state', () => {
    // Simulate what MatchPage does on initial load: build exclusions from events
    const exclusionEvents = [
      { type: 'exclusion', team_id: 'home', half: 1, minute: 30, player_id: null },
      { type: 'exclusion', team_id: 'away', half: 1, minute: 45, player_id: null },
      { type: 'exclusion_end', team_id: 'home', half: 1, minute: 30, player_id: null },
    ]

    const dismissedKeys = new Set<string>()
    for (const evt of exclusionEvents) {
      if (evt.type === 'exclusion_end') {
        dismissedKeys.add(`${evt.team_id}:${evt.half}:${evt.minute}`)
      }
    }

    const exclusions: Exclusion[] = []
    for (const evt of exclusionEvents) {
      if (evt.type === 'exclusion') {
        const key = `${evt.team_id}:${evt.half}:${evt.minute}`
        exclusions.push({
          player_id: evt.player_id ?? '',
          team_id: evt.team_id ?? '',
          start_time: evt.minute,
          duration: 120,
          half: evt.half,
          dismissed: dismissedKeys.has(key),
        })
      }
    }

    useMatchStore.setState({ exclusions })

    const state = useMatchStore.getState()
    expect(state.exclusions).toHaveLength(2)
    expect(state.exclusions[0].dismissed).toBe(true) // home was dismissed
    expect(state.exclusions[1].dismissed).toBeFalsy() // away still active
  })

  it('store holds homeTeamId and awayTeamId, both null by default', () => {
    const state = useMatchStore.getState()
    expect(state.homeTeamId).toBeNull()
    expect(state.awayTeamId).toBeNull()
  })

  it('homeTeamId / awayTeamId are set via setState and cleared on reset', () => {
    useMatchStore.setState({ homeTeamId: 'uuid-home-1', awayTeamId: 'uuid-away-1' })
    expect(useMatchStore.getState().homeTeamId).toBe('uuid-home-1')
    expect(useMatchStore.getState().awayTeamId).toBe('uuid-away-1')

    useMatchStore.getState().reset()
    expect(useMatchStore.getState().homeTeamId).toBeNull()
    expect(useMatchStore.getState().awayTeamId).toBeNull()
  })

  it('UUID→team mapping: home team UUID maps to "home", away to "away"', () => {
    const HOME_UUID = 'aaaaaaaa-0000-0000-0000-000000000001'
    const AWAY_UUID = 'bbbbbbbb-0000-0000-0000-000000000002'
    useMatchStore.setState({ homeTeamId: HOME_UUID, awayTeamId: AWAY_UUID })

    // Simulate the mapping logic from useRealtimeMatch exclusion handler
    function mapTeamId(uuid: string | null): string {
      const { homeTeamId, awayTeamId } = useMatchStore.getState()
      return uuid === homeTeamId ? 'home' : uuid === awayTeamId ? 'away' : (uuid ?? '')
    }

    expect(mapTeamId(HOME_UUID)).toBe('home')
    expect(mapTeamId(AWAY_UUID)).toBe('away')
    expect(mapTeamId(null)).toBe('')
    expect(mapTeamId('unknown-uuid')).toBe('unknown-uuid')
  })

  it('remote exclusion with UUID team_id maps to correct side and deduplicates', () => {
    const HOME_UUID = 'aaaaaaaa-0000-0000-0000-000000000001'
    useMatchStore.setState({ homeTeamId: HOME_UUID, awayTeamId: 'bbbbbbbb-0000-0000-0000-000000000002' })

    // Scorekeeper adds exclusion locally (team_id = 'home')
    useMatchStore.getState().addExclusion({
      player_id: '', team_id: 'home', start_time: 300, duration: 120, half: 1,
    })
    expect(useMatchStore.getState().exclusions).toHaveLength(1)

    // Simulate realtime echo: DB sends back the UUID form
    const store = useMatchStore.getState()
    const teamSide = HOME_UUID === store.homeTeamId ? 'home'
      : HOME_UUID === store.awayTeamId ? 'away'
      : HOME_UUID
    const alreadyExists = store.exclusions.some(
      (e) => e.team_id === teamSide && e.half === 1 && e.start_time === 300 && !e.dismissed,
    )
    expect(teamSide).toBe('home')
    expect(alreadyExists).toBe(true) // dedup fires correctly — no duplicate added
    expect(store.exclusions).toHaveLength(1)
  })

  describe('role-based remote state filtering (score flicker prevention)', () => {
    // Simulate the role-based filtering logic from useRealtimeMatch's realtime handler.
    // Scorers (scorekeeper/admin) own score/timeout fields locally — remote must not overwrite them.
    // All roles always apply clock fields from remote.

    function simulateRemoteUpdate(role: 'scorekeeper' | 'admin' | 'viewer' | 'stat_tracker', remoteScore: number) {
      const isScorer = role === 'scorekeeper' || role === 'admin'

      // Clock — always apply
      useMatchStore.setState({ _isRemoteUpdate: true })
      useMatchStore.setState({ clockSecondsBase: 500, clockStartedAt: null, clockSeconds: 500 })
      useMatchStore.setState({ _isRemoteUpdate: false })

      // Score — only non-scorers apply
      if (!isScorer) {
        useMatchStore.setState({ _isRemoteUpdate: true })
        useMatchStore.setState({ homeScore: remoteScore })
        useMatchStore.setState({ _isRemoteUpdate: false })
      }
    }

    it('scorekeeper: remote update does not overwrite local optimistic score', () => {
      useMatchStore.getState().incrementScore('home') // local: homeScore = 1
      expect(useMatchStore.getState().homeScore).toBe(1)

      simulateRemoteUpdate('scorekeeper', 0) // server echoes stale value 0

      // Scorekeeper's local value must be preserved
      expect(useMatchStore.getState().homeScore).toBe(1)
      // But clock is still applied
      expect(useMatchStore.getState().clockSecondsBase).toBe(500)
    })

    it('admin: remote update does not overwrite local optimistic score', () => {
      useMatchStore.getState().incrementScore('away')
      expect(useMatchStore.getState().awayScore).toBe(1)

      simulateRemoteUpdate('admin', 0)

      expect(useMatchStore.getState().awayScore).toBe(1)
    })

    it('viewer: remote update applies score from server', () => {
      useMatchStore.setState({ homeScore: 0 })
      simulateRemoteUpdate('viewer', 7)
      expect(useMatchStore.getState().homeScore).toBe(7)
    })

    it('stat_tracker: remote update applies score from server', () => {
      useMatchStore.setState({ homeScore: 0 })
      simulateRemoteUpdate('stat_tracker', 4)
      expect(useMatchStore.getState().homeScore).toBe(4)
    })

    it('all roles receive clock update from remote regardless of role', () => {
      for (const role of ['scorekeeper', 'admin', 'viewer', 'stat_tracker'] as const) {
        useMatchStore.getState().reset()
        simulateRemoteUpdate(role, 0)
        expect(useMatchStore.getState().clockSecondsBase).toBe(500)
      }
    })
  })

  it('debounce pattern batches rapid state changes', async () => {
    let syncCount = 0
    let syncTimer: ReturnType<typeof setTimeout> | null = null

    const unsub = useMatchStore.subscribe(() => {
      if (useMatchStore.getState()._isRemoteUpdate) return
      if (syncTimer) clearTimeout(syncTimer)
      syncTimer = setTimeout(() => { syncCount++ }, 300)
    })

    // Rapid local actions
    useMatchStore.getState().incrementScore('home')
    useMatchStore.getState().incrementScore('home')
    useMatchStore.getState().incrementScore('away')

    // No sync yet (still within debounce window)
    expect(syncCount).toBe(0)

    // Wait for debounce to fire
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(syncCount).toBe(1) // batched into single sync

    unsub()
    if (syncTimer) clearTimeout(syncTimer)
  })
})
