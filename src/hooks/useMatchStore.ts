import { create } from 'zustand'
import type { MatchStatus, MatchEvent, Exclusion } from '../types'
import { DEFAULT_CONFIG, type MatchConfig } from '../lib/rules'

interface MatchState {
  // Config (set before game starts, locked during play)
  config: MatchConfig
  // Score
  homeScore: number
  awayScore: number
  // Clock
  clockSeconds: number
  clockSecondsBase: number
  clockStartedAt: string | null
  isRunning: boolean
  currentHalf: number
  status: MatchStatus
  // Exclusions (active 2-min penalties)
  exclusions: Exclusion[]
  // Events log
  events: MatchEvent[]
  // Timeouts remaining per half
  homeTimeoutsLeft: number
  awayTimeoutsLeft: number
  // Active timeout — which team called it (null = no timeout in progress)
  activeTimeout: 'home' | 'away' | null
  // Team UUIDs (set from DB on load; used to map 'home'/'away' ↔ real UUIDs when syncing events)
  homeTeamId: string | null
  awayTeamId: string | null
  // Transient flag: true while applying a remote realtime update.
  // Used by the sync subscriber to skip re-pushing echoed state.
  _isRemoteUpdate: boolean

  // Actions — Pre-game config
  setConfig: (config: Partial<MatchConfig>) => void

  // Actions — Scorekeeper
  incrementScore: (team: 'home' | 'away') => void
  decrementScore: (team: 'home' | 'away') => void
  toggleClock: () => void
  tick: () => void
  nextHalf: () => void
  setStatus: (status: MatchStatus) => void
  callTimeout: (team: 'home' | 'away') => void
  addExclusion: (exclusion: Exclusion) => void
  dismissExclusion: (index: number) => void
  resetScore: () => void
  reset: () => void
}

const INITIAL_STATE = {
  config: DEFAULT_CONFIG,
  homeScore: 0,
  awayScore: 0,
  clockSeconds: 0,
  clockSecondsBase: 0,
  clockStartedAt: null as string | null,
  isRunning: false,
  currentHalf: 1,
  status: 'scheduled' as MatchStatus,
  exclusions: [] as Exclusion[],
  events: [] as MatchEvent[],
  homeTimeoutsLeft: DEFAULT_CONFIG.timeoutsPerHalf,
  awayTimeoutsLeft: DEFAULT_CONFIG.timeoutsPerHalf,
  activeTimeout: null,
  homeTeamId: null,
  awayTeamId: null,
  _isRemoteUpdate: false,
}

export const useMatchStore = create<MatchState>((set) => ({
  ...INITIAL_STATE,

  setConfig: (partial) =>
    set((state) => {
      if (state.status !== 'scheduled') return {} // locked during play
      const config = { ...state.config, ...partial }
      return {
        config,
        homeTimeoutsLeft: config.timeoutsPerHalf,
        awayTimeoutsLeft: config.timeoutsPerHalf,
      }
    }),

  incrementScore: (team) =>
    set((state) => ({
      [team === 'home' ? 'homeScore' : 'awayScore']:
        (team === 'home' ? state.homeScore : state.awayScore) + 1,
    })),

  decrementScore: (team) =>
    set((state) => {
      const key = team === 'home' ? 'homeScore' : 'awayScore'
      const current = team === 'home' ? state.homeScore : state.awayScore
      return { [key]: Math.max(0, current - 1) }
    }),

  toggleClock: () =>
    set((state) => {
      const willRun = !state.isRunning
      if (willRun) {
        return {
          isRunning: true,
          status: 'running' as MatchStatus,
          activeTimeout: null,
          clockStartedAt: new Date().toISOString(),
        }
      }
      const elapsed = state.clockStartedAt
        ? Math.floor((Date.now() - new Date(state.clockStartedAt).getTime()) / 1000)
        : 0
      const newBase = state.clockSecondsBase + elapsed
      return {
        isRunning: false,
        status: 'paused' as MatchStatus,
        clockSecondsBase: newBase,
        clockStartedAt: null,
        clockSeconds: newBase,
      }
    }),

  tick: () =>
    set((state) => {
      if (!state.isRunning) return {}
      return { clockSeconds: state.clockSeconds + 1 }
    }),

  nextHalf: () =>
    set((state) => {
      const next = state.currentHalf + 1
      if (next > state.config.halves) {
        const elapsed = state.clockStartedAt
          ? Math.floor((Date.now() - new Date(state.clockStartedAt).getTime()) / 1000)
          : 0
        const finalSeconds = state.clockSecondsBase + elapsed
        return {
          status: 'finished' as MatchStatus,
          isRunning: false,
          activeTimeout: null,
          clockSecondsBase: finalSeconds,
          clockStartedAt: null,
          clockSeconds: finalSeconds,
        }
      }
      return {
        currentHalf: next,
        clockSeconds: 0,
        clockSecondsBase: 0,
        clockStartedAt: null,
        isRunning: false,
        status: 'halftime' as MatchStatus,
        homeTimeoutsLeft: state.config.timeoutsPerHalf,
        awayTimeoutsLeft: state.config.timeoutsPerHalf,
        activeTimeout: null,
      }
    }),

  setStatus: (status) => set({ status, isRunning: status === 'running' }),

  callTimeout: (team) =>
    set((state) => {
      const key = team === 'home' ? 'homeTimeoutsLeft' : 'awayTimeoutsLeft'
      const remaining = team === 'home' ? state.homeTimeoutsLeft : state.awayTimeoutsLeft
      if (remaining <= 0) return {}
      const elapsed = state.clockStartedAt
        ? Math.floor((Date.now() - new Date(state.clockStartedAt).getTime()) / 1000)
        : 0
      const newBase = state.clockSecondsBase + elapsed
      return {
        [key]: remaining - 1,
        isRunning: false,
        status: 'paused' as MatchStatus,
        activeTimeout: team,
        clockSecondsBase: newBase,
        clockStartedAt: null,
        clockSeconds: newBase,
      }
    }),

  addExclusion: (exclusion) =>
    set((state) => {
      const activeCount = state.exclusions.filter((e) => {
        if (e.team_id !== exclusion.team_id) return false
        if (e.dismissed) return false
        if (e.half !== state.currentHalf) return false
        const elapsed = state.clockSeconds - e.start_time
        return elapsed < e.duration
      }).length
      if (activeCount >= state.config.maxExclusionsPerTeam) return {}
      return { exclusions: [...state.exclusions, exclusion] }
    }),

  dismissExclusion: (index) =>
    set((state) => {
      const exclusions = state.exclusions.map((e, i) =>
        i === index ? { ...e, dismissed: true } : e
      )
      return { exclusions }
    }),

  resetScore: () => set({ homeScore: 0, awayScore: 0 }),

  reset: () => set(INITIAL_STATE),
}))

/**
 * Compute the current clock display value from server-side timestamps.
 * Used on mount and on every realtime update to keep all clients in sync.
 */
export function computeClockSeconds(base: number, startedAt: string | null): number {
  if (!startedAt) return base
  return base + Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
}

/** Get active (not dismissed, not expired) exclusions for a team */
export function getActiveExclusionsForTeam(team: string): Exclusion[] {
  const state = useMatchStore.getState()
  return state.exclusions.filter((e) => {
    if (e.team_id !== team) return false
    if (e.dismissed) return false
    if (e.half !== state.currentHalf) return false
    const elapsed = state.clockSeconds - e.start_time
    return elapsed < e.duration
  })
}
