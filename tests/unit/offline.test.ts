import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db, type LocalMatchEvent, type LocalMatchState, type LocalBugReport } from '../../src/lib/offline'

describe('offline database', () => {
  beforeEach(async () => {
    await db.events.clear()
    await db.matchState.clear()
    await db.bugReports.clear()
  })

  describe('events table', () => {
    it('stores and retrieves a match event', async () => {
      const event: Omit<LocalMatchEvent, 'id'> = {
        matchId: 'match-1',
        type: 'goal',
        teamId: 'team-a',
        minute: 5,
        half: 1,
        synced: false,
        createdAt: new Date().toISOString(),
      }

      const id = await db.events.add(event)
      const stored = await db.events.get(id)

      expect(stored).toBeDefined()
      expect(stored!.type).toBe('goal')
      expect(stored!.synced).toBe(false)
      expect(stored!.matchId).toBe('match-1')
    })

    it('queries unsynced events by matchId', async () => {
      await db.events.bulkAdd([
        { matchId: 'match-1', type: 'goal', minute: 1, half: 1, synced: false, createdAt: '2026-01-01T00:00:00Z' },
        { matchId: 'match-1', type: 'goal', minute: 5, half: 1, synced: true, createdAt: '2026-01-01T00:01:00Z' },
        { matchId: 'match-2', type: 'goal', minute: 3, half: 1, synced: false, createdAt: '2026-01-01T00:02:00Z' },
      ])

      const unsynced = await db.events
        .where('matchId').equals('match-1')
        .filter((e) => !e.synced)
        .toArray()

      expect(unsynced).toHaveLength(1)
      expect(unsynced[0].minute).toBe(1)
    })

    it('marks event as synced', async () => {
      const id = await db.events.add({
        matchId: 'match-1',
        type: 'timeout',
        minute: 10,
        half: 1,
        synced: false,
        createdAt: new Date().toISOString(),
      })

      await db.events.update(id, { synced: true })
      const updated = await db.events.get(id)

      expect(updated!.synced).toBe(true)
    })
  })

  describe('matchState table', () => {
    it('stores and retrieves match state', async () => {
      const state: LocalMatchState = {
        matchId: 'match-1',
        homeScore: 3,
        awayScore: 2,
        status: 'running',
        currentHalf: 1,
        clockSeconds: 600,
        homeTimeoutsLeft: 1,
        awayTimeoutsLeft: 0,
        updatedAt: new Date().toISOString(),
      }

      await db.matchState.put(state)
      const stored = await db.matchState.get('match-1')

      expect(stored).toBeDefined()
      expect(stored!.homeScore).toBe(3)
      expect(stored!.awayScore).toBe(2)
      expect(stored!.status).toBe('running')
    })

    it('overwrites existing state with put', async () => {
      await db.matchState.put({
        matchId: 'match-1',
        homeScore: 1,
        awayScore: 0,
        status: 'running',
        currentHalf: 1,
        clockSeconds: 100,
        homeTimeoutsLeft: 1,
        awayTimeoutsLeft: 1,
        updatedAt: '2026-01-01T00:00:00Z',
      })

      await db.matchState.put({
        matchId: 'match-1',
        homeScore: 5,
        awayScore: 3,
        status: 'halftime',
        currentHalf: 2,
        clockSeconds: 0,
        homeTimeoutsLeft: 1,
        awayTimeoutsLeft: 1,
        updatedAt: '2026-01-01T00:30:00Z',
      })

      const stored = await db.matchState.get('match-1')
      expect(stored!.homeScore).toBe(5)
      expect(stored!.status).toBe('halftime')
      expect(stored!.currentHalf).toBe(2)
    })

    it('returns undefined for nonexistent match', async () => {
      const stored = await db.matchState.get('nonexistent')
      expect(stored).toBeUndefined()
    })
  })

  describe('bugReports table', () => {
    it('stores and retrieves a bug report', async () => {
      const report: Omit<LocalBugReport, 'id'> = {
        description: 'Clock freezes at halftime',
        pageUrl: 'http://localhost:5173/scoreboard',
        userAgent: 'Mozilla/5.0 Test',
        synced: false,
        createdAt: new Date().toISOString(),
      }

      const id = await db.bugReports.add(report)
      const stored = await db.bugReports.get(id)

      expect(stored).toBeDefined()
      expect(stored!.description).toBe('Clock freezes at halftime')
      expect(stored!.synced).toBe(false)
      expect(stored!.pageUrl).toBe('http://localhost:5173/scoreboard')
    })

    it('queries unsynced bug reports', async () => {
      await db.bugReports.bulkAdd([
        { description: 'Bug 1', pageUrl: '/', userAgent: 'UA', synced: false, createdAt: '2026-01-01T00:00:00Z' },
        { description: 'Bug 2', pageUrl: '/', userAgent: 'UA', synced: true, createdAt: '2026-01-01T00:01:00Z' },
        { description: 'Bug 3', pageUrl: '/', userAgent: 'UA', synced: false, createdAt: '2026-01-01T00:02:00Z' },
      ])

      const unsynced = await db.bugReports
        .filter((r) => !r.synced)
        .toArray()

      expect(unsynced).toHaveLength(2)
    })

    it('stores and retrieves screenshotUrl field', async () => {
      const id = await db.bugReports.add({
        description: 'Layout broken on iPhone',
        pageUrl: 'http://localhost:5173/scoreboard',
        userAgent: 'Mozilla/5.0 Test',
        screenshotUrl: 'https://storage.example.com/bug-screenshots/123.jpg',
        synced: false,
        createdAt: new Date().toISOString(),
      })

      const stored = await db.bugReports.get(id)
      expect(stored!.screenshotUrl).toBe('https://storage.example.com/bug-screenshots/123.jpg')
    })

    it('stores bug report without screenshotUrl', async () => {
      const id = await db.bugReports.add({
        description: 'No screenshot bug',
        pageUrl: '/',
        userAgent: 'UA',
        synced: false,
        createdAt: new Date().toISOString(),
      })

      const stored = await db.bugReports.get(id)
      expect(stored!.screenshotUrl).toBeUndefined()
    })

    it('marks bug report as synced', async () => {
      const id = await db.bugReports.add({
        description: 'Test bug',
        pageUrl: '/',
        userAgent: 'UA',
        synced: false,
        createdAt: new Date().toISOString(),
      })

      await db.bugReports.update(id, { synced: true })
      const updated = await db.bugReports.get(id)

      expect(updated!.synced).toBe(true)
    })
  })
})
