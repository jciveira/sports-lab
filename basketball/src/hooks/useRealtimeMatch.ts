import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Match, Team } from '../types'

export interface RealtimeMatchState {
  match: Match | null
  homeTeam: Team | null
  awayTeam: Team | null
  homeFouls: number
  awayFouls: number
  loading: boolean
  error: string | null
  isReconnecting: boolean
}

async function fetchFoulCount(
  matchId: string,
  teamId: string,
  quarter: number,
): Promise<number> {
  const { count, error } = await supabase
    .from('match_events')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .eq('team_id', teamId)
    .eq('type', 'foul')
    .eq('quarter', quarter)

  if (error) return 0
  return count ?? 0
}

async function fetchFouls(
  match: Match,
): Promise<{ homeFouls: number; awayFouls: number }> {
  const [homeFouls, awayFouls] = await Promise.all([
    fetchFoulCount(match.id, match.home_team_id, match.quarter),
    fetchFoulCount(match.id, match.away_team_id, match.quarter),
  ])
  return { homeFouls, awayFouls }
}

export function useRealtimeMatch(matchId: string | undefined): RealtimeMatchState {
  const [match, setMatch] = useState<Match | null>(null)
  const [homeTeam, setHomeTeam] = useState<Team | null>(null)
  const [awayTeam, setAwayTeam] = useState<Team | null>(null)
  const [homeFouls, setHomeFouls] = useState(0)
  const [awayFouls, setAwayFouls] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshFouls = useCallback(async (m: Match) => {
    const fouls = await fetchFouls(m)
    setHomeFouls(fouls.homeFouls)
    setAwayFouls(fouls.awayFouls)
  }, [])

  const subscribeToMatch = useCallback(
    (id: string, currentMatch: Match) => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }

      const channel = supabase
        .channel(`basketball:match:${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `id=eq.${id}`,
          },
          async (payload) => {
            const updated = payload.new as Match
            setMatch(updated)
            setIsReconnecting(false)
            await refreshFouls(updated)
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setIsReconnecting(true)
            reconnectTimerRef.current = setTimeout(() => {
              subscribeToMatch(id, currentMatch)
            }, 3000)
          } else if (status === 'SUBSCRIBED') {
            setIsReconnecting(false)
          }
        })

      channelRef.current = channel
    },
    [refreshFouls],
  )

  useEffect(() => {
    if (!matchId) {
      setLoading(false)
      return
    }

    // Capture as non-undefined for use inside async callbacks
    const id: string = matchId
    let cancelled = false

    async function loadMatch() {
      setLoading(true)
      setError(null)

      if (!isSupabaseConfigured) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }

      const { data: rawMatch, error: matchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return
      if (matchErr || !rawMatch) {
        setError(matchErr?.message ?? 'Match not found.')
        setLoading(false)
        return
      }

      // Cast to Match so TypeScript knows the shape
      const matchData = rawMatch as unknown as Match

      const [homeResult, awayResult] = await Promise.all([
        supabase.from('teams').select('*').eq('id', matchData.home_team_id).single(),
        supabase.from('teams').select('*').eq('id', matchData.away_team_id).single(),
      ])

      if (cancelled) return

      setMatch(matchData)
      setHomeTeam((homeResult.data as unknown as Team | null) ?? null)
      setAwayTeam((awayResult.data as unknown as Team | null) ?? null)

      const fouls = await fetchFouls(matchData)
      if (cancelled) return
      setHomeFouls(fouls.homeFouls)
      setAwayFouls(fouls.awayFouls)
      setLoading(false)

      subscribeToMatch(id, matchData)
    }

    loadMatch()

    return () => {
      cancelled = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  return { match, homeTeam, awayTeam, homeFouls, awayFouls, loading, error, isReconnecting }
}
