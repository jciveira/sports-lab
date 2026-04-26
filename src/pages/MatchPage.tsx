import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, Play, Calendar } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { getMatch } from '../lib/matches'
import { supabase } from '../lib/supabase'
import { getSession, saveSession, clearSession, verifySession } from '../lib/session'
import { releaseRole, claimScorekeeperByName, isScorekeeperTimedOut } from '../lib/access'
import { saveMatchStateLocally, restoreMatchState } from '../lib/sync'
import { useMatchStore } from '../hooks/useMatchStore'
import { useRealtimeMatch, syncMatchToServer } from '../hooks/useRealtimeMatch'
import { computeClockSeconds } from '../hooks/useMatchStore'
import { useConnectionStatus } from '../hooks/useConnectionStatus'
import { Scoreboard } from '../components/scoreboard/Scoreboard'
import type { DbMatch } from '../lib/database.types'
import type { MatchStatus, Exclusion } from '../types'

export function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<DbMatch | null>(null)
  const [homeTeamName, setHomeTeamName] = useState('Local')
  const [awayTeamName, setAwayTeamName] = useState('Visitante')
  const [homeTeamLogo, setHomeTeamLogo] = useState<string | null>(null)
  const [awayTeamLogo, setAwayTeamLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionInvalid, setSessionInvalid] = useState<string | null>(null)
  const [scorekeeperClaimed, setScorekeeperClaimed] = useState(true) // assume claimed until loaded
  const [scorekeeperName, setScorekeeperName] = useState<string | null>(null)
  const [scorekeeperLastActiveAt, setScorekeeperLastActiveAt] = useState<string | null>(null)

  const session = getSession()
  const isAdmin = session?.role === 'admin'
  // Operators have a session with scorekeeper/stat_tracker role.
  // No session = direct viewer access (code-free from Game Center).
  const isNativeOperator = session?.role === 'scorekeeper' || session?.role === 'stat_tracker'
  const isNativeScorekeeper = session?.role === 'scorekeeper'

  const status = useMatchStore((s) => s.status)

  // Connection status + offline sync
  const connection = useConnectionStatus({ matchId: matchId ?? null })

  // Stable callback ref for scorekeeper realtime updates
  const handleScorekeeperChange = useCallback(
    (claimedBy: string | null, name: string | null, lastActiveAt: string | null) => {
      const claimedAndActive = !!claimedBy && !isScorekeeperTimedOut(lastActiveAt)
      setScorekeeperClaimed(claimedAndActive)
      setScorekeeperName(name)
      setScorekeeperLastActiveAt(lastActiveAt)
    },
    [],
  )

  // Subscribe to realtime updates
  useRealtimeMatch(matchId ?? null, session?.role, handleScorekeeperChange)

  // Admin always has full operator and scoring rights — no displacement logic
  const isOperator = isAdmin || isNativeOperator
  const isScorekeeper = isAdmin || isNativeScorekeeper

  useEffect(() => {
    if (!matchId) return

    async function load() {
      try {
        const dbMatch = await getMatch(matchId!)

        if (!dbMatch) {
          // Try offline recovery — restore from IndexedDB
          const restored = await restoreMatchState(matchId!)
          if (restored) {
            setMatch({ id: matchId } as DbMatch)
            setLoading(false)
            return
          }
          setError('Partido no encontrado')
          setLoading(false)
          return
        }
        setMatch(dbMatch)
        // Role is free if unclaimed OR if the existing claim has timed out
        const claimedAndActive = !!dbMatch.scorekeeper_claimed_by &&
          !isScorekeeperTimedOut(dbMatch.scorekeeper_last_active_at)
        setScorekeeperClaimed(claimedAndActive)
        setScorekeeperName(dbMatch.scorekeeper_name ?? null)
        setScorekeeperLastActiveAt(dbMatch.scorekeeper_last_active_at ?? null)

        // Hydrate the store with the match's config and state
        useMatchStore.setState({
          config: {
            halves: dbMatch.config_halves,
            halfDurationMinutes: dbMatch.config_half_duration_minutes,
            timeoutsPerHalf: dbMatch.config_timeouts_per_half,
            timeoutDurationSeconds: 60,
            exclusionDurationSeconds: dbMatch.config_exclusion_duration_seconds,
            maxExclusionsPerTeam: 3,
            playersOnCourt: 7,
            maxSquadSize: 14,
          },
          homeScore: dbMatch.home_score,
          awayScore: dbMatch.away_score,
          status: dbMatch.status as MatchStatus,
          isRunning: dbMatch.status === 'running',
          currentHalf: dbMatch.current_half,
          clockSecondsBase: dbMatch.clock_seconds_base ?? 0,
          clockStartedAt: dbMatch.clock_started_at ?? null,
          clockSeconds: computeClockSeconds(
            dbMatch.clock_seconds_base ?? 0,
            dbMatch.clock_started_at ?? null,
          ),
          homeTimeoutsLeft: dbMatch.home_timeouts_left,
          awayTimeoutsLeft: dbMatch.away_timeouts_left,
          homeTeamId: dbMatch.home_team_id,
          awayTeamId: dbMatch.away_team_id,
        })

        // Hydrate active exclusions from match_events
        const { data: exclusionEvents } = await supabase
          .from('match_events')
          .select('*')
          .eq('match_id', matchId!)
          .in('type', ['exclusion', 'exclusion_end'])
          .order('created_at', { ascending: true })

        if (exclusionEvents && exclusionEvents.length > 0) {
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
              const teamSide = evt.team_id === dbMatch.home_team_id ? 'home'
                : evt.team_id === dbMatch.away_team_id ? 'away'
                : (evt.team_id ?? '')
              exclusions.push({
                player_id: evt.player_id ?? '',
                team_id: teamSide,
                start_time: evt.minute,
                duration: dbMatch.config_exclusion_duration_seconds,
                half: evt.half,
                dismissed: dismissedKeys.has(key),
              })
            }
          }
          useMatchStore.setState({ exclusions })
        }

        // Fetch team names + logos
        const { data: homeTeam } = await supabase
          .from('teams')
          .select('name, badge_url')
          .eq('id', dbMatch.home_team_id)
          .single()
        const { data: awayTeam } = await supabase
          .from('teams')
          .select('name, badge_url')
          .eq('id', dbMatch.away_team_id)
          .single()

        if (homeTeam) { setHomeTeamName(homeTeam.name); setHomeTeamLogo(homeTeam.badge_url) }
        if (awayTeam) { setAwayTeamName(awayTeam.name); setAwayTeamLogo(awayTeam.badge_url) }
      } catch {
        // Network failure — try offline recovery
        const restored = await restoreMatchState(matchId!)
        if (restored) {
          setMatch({ id: matchId } as DbMatch)
        } else {
          setError('No se pudo cargar el partido (sin conexión, sin datos locales)')
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [matchId])

  // Verify stored operator session is still valid (admin skips — no claim to check)
  useEffect(() => {
    if (!session || !isNativeOperator) return
    verifySession(session).then((result) => {
      if (!result.valid) {
        clearSession()
        const messages: Record<string, string> = {
          reassigned: 'Tu rol fue reasignado a otro operador',
          finished: 'El partido ya terminó',
          not_found: 'Partido no encontrado',
        }
        setSessionInvalid(messages[result.reason])
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReleaseRole() {
    if (!session || !matchId) return
    // Admin has no claimed DB role — just clear session
    if (session.role !== 'admin') {
      await releaseRole(matchId, session.role as 'scorekeeper' | 'stat_tracker', session.sessionId)
    }
    clearSession()
    navigate('/')
  }

  // Periodic timeout check — if scorekeeper's heartbeat goes stale, free the role in UI
  const scorekeeperLastActiveAtRef = useRef(scorekeeperLastActiveAt)
  scorekeeperLastActiveAtRef.current = scorekeeperLastActiveAt
  useEffect(() => {
    if (!scorekeeperClaimed) return
    const interval = setInterval(() => {
      if (isScorekeeperTimedOut(scorekeeperLastActiveAtRef.current)) {
        setScorekeeperClaimed(false)
        setScorekeeperName(null)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [scorekeeperClaimed])

  // Claim scorekeeper role by display name — used by viewer claim prompt
  async function handleClaimScorekeeper(displayName: string): Promise<boolean> {
    if (!matchId) return false
    const sessionId = saveSession(matchId, 'scorekeeper', displayName)
    const success = await claimScorekeeperByName(matchId, sessionId, displayName, isAdmin)
    if (!success) {
      // Roll back — discard the optimistic session we saved
      clearSession()
      // Snap UI to "claimed" so the prompt disappears immediately.
      // DB rejected the claim → role is genuinely taken; the realtime
      // subscription will correct the state if the claim later expires.
      setScorekeeperClaimed(true)
    }
    return success
  }

  // Save state locally + sync to server on every store change
  // - IndexedDB save: all operators (scorekeeper + stat_tracker + admin)
  // - Supabase sync: scorekeeper/admin only, skipped for remote echoes
  useEffect(() => {
    if (!matchId || !isOperator || loading) return

    let syncTimer: ReturnType<typeof setTimeout> | null = null

    const unsub = useMatchStore.subscribe((state, prevState) => {
      // Always save to IndexedDB (works offline)
      saveMatchStateLocally(matchId)

      // Only scorekeeper/admin pushes match state to DB
      if (!isScorekeeper) return

      // Skip re-syncing state that came from a realtime update (echo prevention).
      // Also skip when _isRemoteUpdate just cleared (true→false): that setState
      // carries no new data and would create an echo loop back to the DB.
      if (state._isRemoteUpdate) return
      if (prevState._isRemoteUpdate && !state._isRemoteUpdate) return

      // Debounce server sync to batch rapid state changes (e.g. quick score taps)
      if (syncTimer) clearTimeout(syncTimer)
      syncTimer = setTimeout(() => syncMatchToServer(matchId), 300)
    })

    return () => {
      unsub()
      if (syncTimer) clearTimeout(syncTimer)
    }
  }, [matchId, isOperator, isScorekeeper, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-hbl-bg">
        <Loader2 className="w-8 h-8 animate-spin text-hbl-accent" />
      </div>
    )
  }

  if (sessionInvalid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg gap-4 p-6">
        <p className="text-hbl-clock text-center">{sessionInvalid}</p>
        <Link to="/" className="flex items-center gap-2 text-hbl-accent">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg gap-4">
        <p className="text-hbl-clock">{error ?? 'Partido no encontrado'}</p>
        <Link to="/" className="flex items-center gap-2 text-hbl-accent">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </div>
    )
  }

  // Show "Ready to Start" screen if match hasn't started and user is operator
  if (status === 'scheduled' && isOperator) {
    const config = useMatchStore.getState().config
    return (
      <div className="relative flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <BackButton to="/" />
        <h1 className="text-2xl sm:text-3xl font-bold text-hbl-accent">Listo para empezar</h1>
        <p className="text-hbl-text-muted text-sm">El partido está configurado — toca Empezar cuando estés listo</p>

        {/* Teams */}
        <div className="flex items-center justify-center gap-4 w-full max-w-sm">
          <span className="text-lg font-semibold text-hbl-team-home truncate">{homeTeamName}</span>
          <span className="text-hbl-text-muted">vs</span>
          <span className="text-lg font-semibold text-hbl-team-away truncate">{awayTeamName}</span>
        </div>

        {/* Config summary */}
        <div className="flex flex-col gap-3 w-full max-w-sm bg-hbl-surface rounded-xl border border-hbl-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-hbl-text-muted">Formato</span>
            <span className="font-medium">{config.halves} × {config.halfDurationMinutes} min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-hbl-text-muted">Tiempos muertos por parte</span>
            <span className="font-medium">{config.timeoutsPerHalf}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-hbl-text-muted">Duración de exclusión</span>
            <span className="font-medium">{config.exclusionDurationSeconds / 60} min</span>
          </div>
        </div>

        <button
          onClick={() => {
            useMatchStore.getState().setStatus('paused')
            if (matchId) {
              saveMatchStateLocally(matchId)
              syncMatchToServer(matchId)
            }
          }}
          className="flex items-center gap-3 px-8 py-4 rounded-xl bg-hbl-accent text-hbl-bg font-bold text-lg active:scale-95 transition-transform"
        >
          <Play className="w-6 h-6" />
          Empezar partido
        </button>
      </div>
    )
  }

  // Show "Pending" screen for viewers when match hasn't started yet
  if (status === 'scheduled' && !isOperator) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <BackButton to="/games" />
        <Calendar className="w-12 h-12 text-hbl-accent" />
        <h1 className="text-2xl sm:text-3xl font-bold text-hbl-accent">Partido pendiente</h1>

        <div className="flex items-center justify-center gap-4 w-full max-w-sm">
          <span className="text-lg font-semibold text-hbl-team-home truncate">{homeTeamName}</span>
          <span className="text-hbl-text-muted">vs</span>
          <span className="text-lg font-semibold text-hbl-team-away truncate">{awayTeamName}</span>
        </div>

        <p className="text-hbl-text-muted text-sm text-center">
          El partido aún no ha empezado. Vuelve cuando comience para seguirlo en directo.
        </p>
      </div>
    )
  }

  return (
    <Scoreboard
      homeTeamName={homeTeamName}
      awayTeamName={awayTeamName}
      homeTeamLogo={homeTeamLogo}
      awayTeamLogo={awayTeamLogo}
      isOperator={isOperator}
      isScorekeeper={isScorekeeper}
      scorekeeperClaimed={scorekeeperClaimed}
      scorekeeperName={scorekeeperName}
      matchId={matchId}
      connectionState={connection.state}
      pendingCount={connection.pendingCount}
      onReleaseRole={isOperator ? handleReleaseRole : undefined}
      onClaimScorekeeper={!isOperator ? handleClaimScorekeeper : undefined}
    />
  )
}
