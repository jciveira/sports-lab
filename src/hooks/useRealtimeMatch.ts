import { useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useMatchStore, computeClockSeconds } from './useMatchStore'
import type { DbMatch, DbMatchEvent } from '../lib/database.types'
import type { MatchStatus, AccessRole, Exclusion } from '../types'

/**
 * Apply remote state to the store, wrapped with the _isRemoteUpdate flag
 * so the sync subscriber in MatchPage knows to skip re-pushing.
 */
function applyRemoteState(partial: Record<string, unknown>) {
  useMatchStore.setState({ _isRemoteUpdate: true })
  useMatchStore.setState(partial)
  useMatchStore.setState({ _isRemoteUpdate: false })
}

/**
 * Subscribes to real-time changes on a match.
 * All roles compute the clock from server-side timestamps — no role has clock authority.
 * - onScorekeeperChange: called when scorekeeper_claimed_by or scorekeeper_name changes
 */
export function useRealtimeMatch(
  matchId: string | null,
  role?: AccessRole,
  onScorekeeperChange?: (claimedBy: string | null, name: string | null, lastActiveAt: string | null) => void,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const roleRef = useRef(role)
  roleRef.current = role
  const onScorekeeperChangeRef = useRef(onScorekeeperChange)
  onScorekeeperChangeRef.current = onScorekeeperChange

  useEffect(() => {
    if (!matchId || !isSupabaseConfigured) return

    const channel = supabase
      .channel(`match:${matchId}`)
      // Listen for match state changes (score, status, clock, etc.)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as DbMatch
          const store = useMatchStore.getState()

          // Notify about scorekeeper field changes (claim/release/heartbeat)
          if (onScorekeeperChangeRef.current) {
            onScorekeeperChangeRef.current(
              row.scorekeeper_claimed_by,
              row.scorekeeper_name ?? null,
              row.scorekeeper_last_active_at ?? null,
            )
          }

          // Detect timeout: if timeout count dropped and status changed to paused
          const homeTimeoutUsed = row.home_timeouts_left < store.homeTimeoutsLeft
          const awayTimeoutUsed = row.away_timeouts_left < store.awayTimeoutsLeft
          const becamePaused = row.status === 'paused' && store.status !== 'paused'
          let activeTimeout: 'home' | 'away' | null = store.activeTimeout
          if (becamePaused && homeTimeoutUsed) {
            activeTimeout = 'home'
          } else if (becamePaused && awayTimeoutUsed) {
            activeTimeout = 'away'
          } else if (row.status === 'running' && store.status !== 'running') {
            activeTimeout = null
          }

          // Status changes — apply for all roles
          if (row.status !== store.status) {
            applyRemoteState({
              status: row.status as MatchStatus,
              isRunning: row.status === 'running',
            })
          }

          const isScorer = roleRef.current === 'scorekeeper' || roleRef.current === 'admin'

          // Clock timestamps — all roles apply from remote (server is authoritative)
          const clockBase = row.clock_seconds_base ?? 0
          const clockStarted = row.clock_started_at ?? null
          applyRemoteState({
            clockSecondsBase: clockBase,
            clockStartedAt: clockStarted,
            clockSeconds: computeClockSeconds(clockBase, clockStarted),
          })

          // Score, half, timeouts — only non-scorers apply from remote.
          // Scorers own these fields locally; remote updates would overwrite optimistic state
          // (causing flicker or silent goal loss when a heartbeat arrives mid-debounce).
          if (!isScorer) {
            applyRemoteState({
              homeScore: row.home_score,
              awayScore: row.away_score,
              currentHalf: row.current_half,
              homeTimeoutsLeft: row.home_timeouts_left,
              awayTimeoutsLeft: row.away_timeouts_left,
              activeTimeout,
            })
          }
        },
      )
      // Listen for new match events (goals, exclusions, etc.)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const event = payload.new as DbMatchEvent
          console.debug('[realtime] new event:', event.type, event)

          const store = useMatchStore.getState()

          if (event.type === 'exclusion') {
            // Map UUID team_id → 'home'/'away' side used by ExclusionDisplay
            const teamSide = event.team_id === store.homeTeamId ? 'home'
              : event.team_id === store.awayTeamId ? 'away'
              : (event.team_id ?? '')

            // Dedup: skip if we already have this exclusion locally
            const alreadyExists = store.exclusions.some(
              (e) =>
                e.team_id === teamSide &&
                e.half === event.half &&
                e.start_time === event.minute &&
                !e.dismissed,
            )
            if (!alreadyExists) {
              const newExclusion: Exclusion = {
                player_id: event.player_id ?? '',
                team_id: teamSide,
                start_time: event.minute,
                duration: store.config.exclusionDurationSeconds,
                half: event.half,
              }
              applyRemoteState({
                exclusions: [...store.exclusions, newExclusion],
              })
            }
          }

          if (event.type === 'exclusion_end') {
            // Map UUID team_id → 'home'/'away' side
            const teamSide = event.team_id === store.homeTeamId ? 'home'
              : event.team_id === store.awayTeamId ? 'away'
              : (event.team_id ?? '')

            // Find and dismiss matching exclusion
            const exclusions = store.exclusions.map((e) => {
              if (
                e.team_id === teamSide &&
                e.half === event.half &&
                e.start_time === event.minute &&
                !e.dismissed
              ) {
                return { ...e, dismissed: true }
              }
              return e
            })
            applyRemoteState({ exclusions })
          }
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [matchId])
}

/**
 * Push local match state to Supabase.
 * Called by the scorekeeper after each action (score change, clock toggle, etc.)
 */
export async function syncMatchToServer(matchId: string) {
  if (!isSupabaseConfigured) return
  const state = useMatchStore.getState()

  const { error } = await supabase
    .from('matches')
    .update({
      home_score: state.homeScore,
      away_score: state.awayScore,
      status: state.status,
      current_half: state.currentHalf,
      clock_seconds_base: state.clockSecondsBase,
      clock_started_at: state.clockStartedAt,
      home_timeouts_left: state.homeTimeoutsLeft,
      away_timeouts_left: state.awayTimeoutsLeft,
      started_at: state.status === 'running' ? new Date().toISOString() : undefined,
      finished_at: state.status === 'finished' ? new Date().toISOString() : undefined,
    })
    .eq('id', matchId)

  if (error) console.error('[sync] failed to push match state:', error)
}
