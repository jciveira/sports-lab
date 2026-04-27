import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { queueEvent, flushPendingEvents } from '../lib/offlineSync'
import type { Match, MatchEvent, EventType } from '../types'

// Quarter duration in seconds (8 min default)
const QUARTER_SECONDS = 8 * 60
const TIMEOUTS_PER_HALF = 2
const FOUL_BONUS_THRESHOLD = 5

interface MatchStoreState {
  match: Match | null
  events: MatchEvent[]
  claimed: boolean
  clockRunning: boolean
  timeRemaining: number  // seconds remaining in current quarter
  homeFouls: number
  awayFouls: number
  homeTimeouts: number
  awayTimeouts: number
  intervalId: ReturnType<typeof setInterval> | null

  // Actions
  loadMatch: (matchId: string) => Promise<void>
  claimScorekeeper: (matchId: string) => Promise<void>
  scoreGoal: (teamSide: 'home' | 'away', points: 1 | 2 | 3) => Promise<void>
  recordFoul: (teamSide: 'home' | 'away') => Promise<void>
  undoLastEvent: () => Promise<void>
  startClock: () => void
  pauseClock: () => void
  useTimeout: (teamSide: 'home' | 'away') => Promise<void>
  endQuarter: () => Promise<void>
  finishMatch: () => Promise<void>
  _tick: () => void
}

function eventTypeForPoints(points: 1 | 2 | 3): EventType {
  if (points === 2) return 'goal_2'
  if (points === 3) return 'goal_3'
  return 'freethrow'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchUpdate(matchId: string, patch: Record<string, unknown>): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from('matches') as any).update(patch).eq('id', matchId)
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  match: null,
  events: [],
  claimed: false,
  clockRunning: false,
  timeRemaining: QUARTER_SECONDS,
  homeFouls: 0,
  awayFouls: 0,
  homeTimeouts: TIMEOUTS_PER_HALF,
  awayTimeouts: TIMEOUTS_PER_HALF,
  intervalId: null,

  loadMatch: async (matchId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('matches') as any)
      .select('*')
      .eq('id', matchId)
      .single()

    if (error || !data) {
      console.error('Failed to load match', error)
      return
    }

    const match = data as Match
    set({ match, timeRemaining: QUARTER_SECONDS })

    // Load existing events for this match
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eventsData } = await (supabase.from('match_events') as any)
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })

    set({ events: (eventsData as MatchEvent[]) ?? [] })
  },

  claimScorekeeper: async (matchId) => {
    const deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('matches') as any)
      .update({ scorekeeper_claimed_by: deviceId })
      .eq('id', matchId)
      .is('scorekeeper_claimed_by', null)

    if (error) {
      console.error('Claim failed', error)
      return
    }

    set((state) => ({
      match: state.match ? { ...state.match, scorekeeper_claimed_by: deviceId } : null,
      claimed: true,
    }))
  },

  scoreGoal: async (teamSide, points) => {
    const { match, timeRemaining } = get()
    if (!match) return

    const type = eventTypeForPoints(points)
    const teamId = teamSide === 'home' ? match.home_team_id : match.away_team_id
    const scoreKey = teamSide === 'home' ? 'home_score' : 'away_score'
    const newScore = (teamSide === 'home' ? match.home_score : match.away_score) + points

    // Optimistic update
    set((state) => ({
      match: state.match ? { ...state.match, [scoreKey]: newScore } : null,
    }))

    // Update Supabase match score
    await matchUpdate(match.id, { [scoreKey]: newScore })

    // Queue event through offline layer
    const eventId = crypto.randomUUID()
    await queueEvent({ matchId: match.id, eventId, type, teamId, quarter: match.quarter, timeRemaining })
    if (navigator.onLine) {
      await flushPendingEvents()
    }
  },

  recordFoul: async (teamSide) => {
    const { match, timeRemaining } = get()
    if (!match) return

    const foulKey = teamSide === 'home' ? 'homeFouls' : 'awayFouls'
    const currentFouls = teamSide === 'home' ? get().homeFouls : get().awayFouls
    const teamId = teamSide === 'home' ? match.home_team_id : match.away_team_id

    set({ [foulKey]: currentFouls + 1 })

    const eventId = crypto.randomUUID()
    await queueEvent({ matchId: match.id, eventId, type: 'foul', teamId, quarter: match.quarter, timeRemaining })
    if (navigator.onLine) {
      await flushPendingEvents()
    }
  },

  undoLastEvent: async () => {
    const { match, events } = get()
    if (!match) return

    // Find most recent event in current quarter
    const currentQuarterEvents = events.filter((e) => e.quarter === match.quarter)
    if (currentQuarterEvents.length === 0) return

    const lastEvent = currentQuarterEvents[currentQuarterEvents.length - 1]

    // Delete from Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('match_events') as any).delete().eq('id', lastEvent.id)

    // Revert score if it was a scoring event
    if (lastEvent.type === 'goal_2' || lastEvent.type === 'goal_3' || lastEvent.type === 'freethrow') {
      const points = lastEvent.type === 'goal_2' ? 2 : lastEvent.type === 'goal_3' ? 3 : 1
      const isHome = lastEvent.team_id === match.home_team_id
      const scoreKey = isHome ? 'home_score' : 'away_score'
      const currentScore = isHome ? match.home_score : match.away_score
      const newScore = Math.max(0, currentScore - points)

      set((state) => ({
        match: state.match ? { ...state.match, [scoreKey]: newScore } : null,
        events: state.events.filter((e) => e.id !== lastEvent.id),
      }))

      await matchUpdate(match.id, { [scoreKey]: newScore })
    } else if (lastEvent.type === 'foul') {
      const isHome = lastEvent.team_id === match.home_team_id
      const foulKey = isHome ? 'homeFouls' : 'awayFouls'
      const currentFouls = isHome ? get().homeFouls : get().awayFouls

      set((state) => ({
        [foulKey]: Math.max(0, currentFouls - 1),
        events: state.events.filter((e) => e.id !== lastEvent.id),
      }))
    } else {
      set((state) => ({
        events: state.events.filter((e) => e.id !== lastEvent.id),
      }))
    }
  },

  startClock: () => {
    const { clockRunning, match } = get()
    if (clockRunning || !match) return

    const id = setInterval(() => {
      get()._tick()
    }, 1000)

    matchUpdate(match.id, { status: 'running' }).then(() => {})

    set({ clockRunning: true, intervalId: id, match: { ...match, status: 'running' } })
  },

  pauseClock: () => {
    const { clockRunning, intervalId, match } = get()
    if (!clockRunning || !match) return

    if (intervalId) clearInterval(intervalId)

    matchUpdate(match.id, { status: 'paused' }).then(() => {})

    set({ clockRunning: false, intervalId: null, match: { ...match, status: 'paused' } })
  },

  _tick: () => {
    const { timeRemaining } = get()
    if (timeRemaining <= 0) {
      get().pauseClock()
      return
    }
    set({ timeRemaining: timeRemaining - 1 })
  },

  useTimeout: async (teamSide) => {
    const { match, timeRemaining } = get()
    if (!match) return

    const timeoutKey = teamSide === 'home' ? 'homeTimeouts' : 'awayTimeouts'
    const remaining = teamSide === 'home' ? get().homeTimeouts : get().awayTimeouts
    if (remaining <= 0) return

    // Stop the clock
    get().pauseClock()

    const teamId = teamSide === 'home' ? match.home_team_id : match.away_team_id
    set({ [timeoutKey]: remaining - 1 })

    const eventId = crypto.randomUUID()
    await queueEvent({ matchId: match.id, eventId, type: 'timeout', teamId, quarter: match.quarter, timeRemaining })
    if (navigator.onLine) {
      await flushPendingEvents()
    }
  },

  endQuarter: async () => {
    const { match, timeRemaining, intervalId } = get()
    if (!match) return

    // Stop the clock
    if (intervalId) clearInterval(intervalId)

    // Queue quarter_end event
    const eventId = crypto.randomUUID()
    await queueEvent({ matchId: match.id, eventId, type: 'quarter_end', teamId: null, quarter: match.quarter, timeRemaining })
    if (navigator.onLine) {
      await flushPendingEvents()
    }

    const nextQuarter = match.quarter + 1
    const isHalftime = match.quarter === 2

    // Reset timeouts at halftime
    const timeoutReset = isHalftime
      ? { homeTimeouts: TIMEOUTS_PER_HALF, awayTimeouts: TIMEOUTS_PER_HALF }
      : {}

    const updatedMatch: Match = {
      ...match,
      quarter: nextQuarter,
      status: 'quarter_break',
    }

    await matchUpdate(match.id, { quarter: nextQuarter, status: 'quarter_break' })

    set({
      match: updatedMatch,
      clockRunning: false,
      intervalId: null,
      timeRemaining: QUARTER_SECONDS,
      homeFouls: 0,
      awayFouls: 0,
      ...timeoutReset,
    })
  },

  finishMatch: async () => {
    const { match, intervalId } = get()
    if (!match) return

    if (intervalId) clearInterval(intervalId)

    const now = new Date().toISOString()
    await matchUpdate(match.id, { status: 'finished', finished_at: now })

    set({
      match: { ...match, status: 'finished', finished_at: now },
      clockRunning: false,
      intervalId: null,
    })
  },
}))

export { FOUL_BONUS_THRESHOLD, QUARTER_SECONDS, TIMEOUTS_PER_HALF }
