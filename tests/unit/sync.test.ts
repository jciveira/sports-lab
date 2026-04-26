import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/lib/offline'
import { queueEvent, getUnsyncedCount, saveMatchStateLocally, restoreMatchState } from '../../src/lib/sync'
import { useMatchStore } from '../../src/hooks/useMatchStore'

describe('sync queue', () => {
  beforeEach(async () => {
    await db.events.clear()
    await db.matchState.clear()
  })

  it('queueEvent stores event with synced=false', async () => {
    await queueEvent('match-1', {
      type: 'goal',
      teamId: 'team-a',
      minute: 5,
      half: 1,
    })

    const events = await db.events.where({ matchId: 'match-1' }).toArray()
    expect(events).toHaveLength(1)
    expect(events[0].synced).toBe(false)
    expect(events[0].type).toBe('goal')
    expect(events[0].createdAt).toBeDefined()
  })

  it('queueEvent handles events without optional fields', async () => {
    await queueEvent('match-1', {
      type: 'halftime',
      minute: 20,
      half: 1,
    })

    const events = await db.events.where({ matchId: 'match-1' }).toArray()
    expect(events).toHaveLength(1)
    expect(events[0].teamId).toBeUndefined()
    expect(events[0].playerId).toBeUndefined()
  })

  it('getUnsyncedCount returns correct count', async () => {
    await db.events.bulkAdd([
      { matchId: 'match-1', type: 'goal', minute: 1, half: 1, synced: false, createdAt: '2026-01-01T00:00:00Z' },
      { matchId: 'match-1', type: 'goal', minute: 5, half: 1, synced: false, createdAt: '2026-01-01T00:01:00Z' },
      { matchId: 'match-1', type: 'goal', minute: 10, half: 1, synced: true, createdAt: '2026-01-01T00:02:00Z' },
    ])

    const count = await getUnsyncedCount('match-1')
    expect(count).toBe(2)
  })

  it('getUnsyncedCount returns 0 for no events', async () => {
    const count = await getUnsyncedCount('match-1')
    expect(count).toBe(0)
  })

  it('multiple events queue in order', async () => {
    await queueEvent('match-1', { type: 'goal', teamId: 'a', minute: 1, half: 1 })
    await queueEvent('match-1', { type: 'timeout', teamId: 'b', minute: 3, half: 1 })
    await queueEvent('match-1', { type: 'exclusion', teamId: 'a', minute: 7, half: 1 })

    const events = await db.events.where({ matchId: 'match-1' }).sortBy('createdAt')
    expect(events).toHaveLength(3)
    expect(events[0].type).toBe('goal')
    expect(events[1].type).toBe('timeout')
    expect(events[2].type).toBe('exclusion')
  })
})

describe('saveMatchStateLocally', () => {
  beforeEach(async () => {
    await db.matchState.clear()
    useMatchStore.getState().reset()
  })

  it('saves current Zustand state to IndexedDB', async () => {
    useMatchStore.setState({
      homeScore: 5,
      awayScore: 3,
      status: 'running',
      currentHalf: 2,
      clockSeconds: 450,
      homeTimeoutsLeft: 0,
      awayTimeoutsLeft: 1,
    })

    await saveMatchStateLocally('match-1')

    const stored = await db.matchState.get('match-1')
    expect(stored).toBeDefined()
    expect(stored!.homeScore).toBe(5)
    expect(stored!.awayScore).toBe(3)
    expect(stored!.status).toBe('running')
    expect(stored!.currentHalf).toBe(2)
    expect(stored!.clockSeconds).toBe(450)
    expect(stored!.homeTimeoutsLeft).toBe(0)
    expect(stored!.awayTimeoutsLeft).toBe(1)
    expect(stored!.updatedAt).toBeDefined()
  })

  it('overwrites previous snapshot for same matchId', async () => {
    useMatchStore.setState({ homeScore: 1 })
    await saveMatchStateLocally('match-1')

    useMatchStore.setState({ homeScore: 10 })
    await saveMatchStateLocally('match-1')

    const stored = await db.matchState.get('match-1')
    expect(stored!.homeScore).toBe(10)
  })
})

describe('restoreMatchState', () => {
  beforeEach(async () => {
    await db.matchState.clear()
    useMatchStore.getState().reset()
  })

  it('restores IndexedDB snapshot into Zustand store', async () => {
    await db.matchState.put({
      matchId: 'match-1',
      homeScore: 7,
      awayScore: 4,
      status: 'halftime',
      currentHalf: 2,
      clockSeconds: 0,
      homeTimeoutsLeft: 1,
      awayTimeoutsLeft: 0,
      updatedAt: '2026-01-01T00:30:00Z',
    })

    const found = await restoreMatchState('match-1')
    expect(found).toBe(true)

    const state = useMatchStore.getState()
    expect(state.homeScore).toBe(7)
    expect(state.awayScore).toBe(4)
    expect(state.status).toBe('halftime')
    expect(state.currentHalf).toBe(2)
    expect(state.clockSeconds).toBe(0)
    expect(state.homeTimeoutsLeft).toBe(1)
    expect(state.awayTimeoutsLeft).toBe(0)
  })

  it('returns false when no snapshot exists', async () => {
    const found = await restoreMatchState('nonexistent')
    expect(found).toBe(false)
  })

  it('does not modify store when no snapshot exists', async () => {
    useMatchStore.setState({ homeScore: 99 })
    await restoreMatchState('nonexistent')
    expect(useMatchStore.getState().homeScore).toBe(99)
  })
})
