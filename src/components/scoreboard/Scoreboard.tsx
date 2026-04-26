import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, LogOut, DoorOpen, UserCheck, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClockDisplay } from './ClockDisplay'
import { ScorePanel } from './ScorePanel'
import { ControlBar } from './ControlBar'
import { ExclusionDisplay } from './ExclusionDisplay'
import { ConnectionStatus } from '../ui/ConnectionStatus'
import { useMatchStore, computeClockSeconds } from '../../hooks/useMatchStore'
import { scorekeeperHeartbeat } from '../../lib/access'
import { getSession } from '../../lib/session'
import { deleteMatch } from '../../lib/matches'
import { queueEvent, syncEvents } from '../../lib/sync'
import type { ConnectionState } from '../../hooks/useConnectionStatus'
import type { Exclusion } from '../../types'

interface ScoreboardProps {
  homeTeamName?: string
  awayTeamName?: string
  homeTeamLogo?: string | null
  awayTeamLogo?: string | null
  isOperator?: boolean
  isScorekeeper?: boolean
  scorekeeperClaimed?: boolean
  scorekeeperName?: string | null
  matchId?: string
  connectionState?: ConnectionState
  pendingCount?: number
  onReleaseRole?: () => void
  onClaimScorekeeper?: (displayName: string) => Promise<boolean>
}

export function Scoreboard({
  homeTeamName = 'Local',
  awayTeamName = 'Visitante',
  homeTeamLogo,
  awayTeamLogo,
  isOperator = false,
  isScorekeeper = false,
  scorekeeperClaimed = true,
  scorekeeperName,
  matchId,
  connectionState,
  pendingCount = 0,
  onReleaseRole,
  onClaimScorekeeper,
}: ScoreboardProps) {
  const tick = useMatchStore((s) => s.tick)
  const isRunning = useMatchStore((s) => s.isRunning)
  const status = useMatchStore((s) => s.status)
  const clockSeconds = useMatchStore((s) => s.clockSeconds)
  const currentHalf = useMatchStore((s) => s.currentHalf)
  const config = useMatchStore((s) => s.config)
  const activeTimeout = useMatchStore((s) => s.activeTimeout)
  const addExclusion = useMatchStore((s) => s.addExclusion)
  const reset = useMatchStore((s) => s.reset)
  const navigate = useNavigate()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Release role toast
  const [showReleaseToast, setShowReleaseToast] = useState(false)

  // Scorekeeper claim prompt state (for viewers, name-based — no code required)
  const [showClaimPrompt, setShowClaimPrompt] = useState(false)
  const [claimName, setClaimName] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  // Re-sync clock from server timestamps on mount.
  // Prevents stale display when navigating to an active match (store may have old clockSeconds).
  useEffect(() => {
    const { clockSecondsBase, clockStartedAt } = useMatchStore.getState()
    useMatchStore.setState({ clockSeconds: computeClockSeconds(clockSecondsBase, clockStartedAt) })
  }, [])

  // Clock tick every second — all roles run a local interval for smooth display.
  // The interval never writes to DB; it only increments clockSeconds for UI smoothness.
  // On every realtime update, clockSeconds is recomputed from server timestamps.
  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, tick])

  function handleExclusion(team: 'home' | 'away') {
    const exclusion: Exclusion = {
      player_id: '',
      team_id: team,
      start_time: clockSeconds,
      duration: config.exclusionDurationSeconds,
      half: currentHalf,
    }
    addExclusion(exclusion)

    // Sync exclusion event to DB so viewers receive it via realtime.
    // Use the actual team UUID (not 'home'/'away') to satisfy the FK constraint.
    if (matchId) {
      const { homeTeamId, awayTeamId } = useMatchStore.getState()
      const teamId = team === 'home' ? homeTeamId : awayTeamId
      queueEvent(matchId, {
        type: 'exclusion',
        teamId: teamId ?? undefined,
        minute: clockSeconds,
        half: currentHalf,
      }).then(() => syncEvents(matchId))
    }
  }

  function handleDismissExclusion(exclusion: Exclusion, index: number) {
    useMatchStore.getState().dismissExclusion(index)

    if (matchId) {
      const { homeTeamId, awayTeamId } = useMatchStore.getState()
      const teamId = exclusion.team_id === 'home' ? homeTeamId : awayTeamId
      queueEvent(matchId, {
        type: 'exclusion_end',
        teamId: teamId ?? undefined,
        minute: exclusion.start_time,
        half: exclusion.half,
      }).then(() => syncEvents(matchId))
    }
  }

  // Heartbeat — sends "I'm alive" to Supabase every 30s while acting as scorekeeper
  useEffect(() => {
    if (!isScorekeeper || !matchId) return
    const session = getSession()
    if (!session) return

    const interval = setInterval(() => {
      scorekeeperHeartbeat(matchId, session.sessionId)
    }, 30_000)

    return () => clearInterval(interval)
  }, [isScorekeeper, matchId])

  async function handleClaimScorekeeper() {
    const name = claimName.trim()
    if (!name) {
      setClaimError('Introduce tu nombre')
      return
    }
    if (!onClaimScorekeeper) return
    setClaimLoading(true)
    setClaimError(null)
    try {
      const success = await onClaimScorekeeper(name)
      if (!success) {
        setClaimError('El rol de anotador ya está ocupado')
      } else {
        window.location.reload()
      }
    } catch {
      setClaimError('Error al reclamar el rol — intenta de nuevo')
    } finally {
      setClaimLoading(false)
    }
  }

  return (
    <div className="relative flex flex-col items-center min-h-dvh bg-hbl-bg p-2 pt-10 sm:p-4 sm:pt-12 pb-[max(0.5rem,env(safe-area-inset-bottom))] gap-2 sm:gap-4 overflow-y-auto overflow-x-hidden">
      {/* Back / Leave button */}
      {isOperator ? (
        <Link
          to="/"
          className="absolute top-4 left-4 z-10 text-hbl-text-muted hover:text-hbl-text transition-colors"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      ) : (
        <Link
          to="/"
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-xs text-hbl-text-muted hover:text-hbl-clock transition-colors"
          aria-label="Salir del partido"
        >
          <DoorOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Salir del partido</span>
        </Link>
      )}


      {/* Dominicos crest watermark */}
      <div
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.07] invert"
        style={{ backgroundImage: 'url(/icons/icon-512.png)' }}
        aria-hidden="true"
      />

      {/* Status badge + connection */}
      <div className="flex items-center justify-between w-full max-w-xl px-2">
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <span className="w-2 h-2 rounded-full bg-hbl-accent animate-pulse" />
          )}
          <span className="text-xs uppercase tracking-widest text-hbl-text-muted">
            {status === 'halftime' ? 'Descanso' : status === 'running' ? 'en juego' : status === 'paused' ? 'pausado' : status === 'finished' ? 'finalizado' : status}
          </span>
        </div>
        {connectionState && (
          <ConnectionStatus state={connectionState} pendingCount={pendingCount} />
        )}
      </div>

      {/* Clock */}
      <ClockDisplay />

      {/* Timeout banner — visible to all users */}
      {activeTimeout && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-hbl-warning/15 border border-hbl-warning/30">
          <Timer className="w-4 h-4 text-hbl-warning" />
          <span className="text-sm font-medium text-hbl-warning">
            Tiempo Muerto — {activeTimeout === 'home' ? homeTeamName : awayTeamName}
          </span>
        </div>
      )}

      {/* Scores */}
      <div className="flex items-center justify-center gap-3 sm:gap-12 w-full max-w-xl">
        <ScorePanel
          team="home"
          teamName={homeTeamName}
          teamLogo={homeTeamLogo}
          color="var(--color-hbl-team-home)"
          isOperator={isOperator}
        />
        <span className="text-xl sm:text-3xl text-hbl-text-muted font-light">vs</span>
        <ScorePanel
          team="away"
          teamName={awayTeamName}
          teamLogo={awayTeamLogo}
          color="var(--color-hbl-team-away)"
          isOperator={isOperator}
        />
      </div>

      {/* Exclusion timers */}
      <div className="flex items-start justify-center gap-3 sm:gap-8 w-full max-w-xl">
        <ExclusionDisplay team="home" teamColor="var(--color-hbl-team-home)" isOperator={isOperator} onDismiss={isOperator ? handleDismissExclusion : undefined} />
        <ExclusionDisplay team="away" teamColor="var(--color-hbl-team-away)" isOperator={isOperator} onDismiss={isOperator ? handleDismissExclusion : undefined} />
      </div>

      {/* Controls (scorekeeper only) */}
      <ControlBar
        isOperator={isOperator}
        onExclusion={handleExclusion}
        onCancel={async () => {
          if (matchId) {
            try {
              await deleteMatch(matchId)
            } catch (err) {
              console.error('[cancel] failed to delete match:', err)
            }
          }
          reset()
          navigate('/')
        }}
      />

      {/* Release role — visible ghost button, operators only, hidden when finished */}
      {isOperator && onReleaseRole && status !== 'finished' && (
        <button
          onClick={() => {
            setShowReleaseToast(true)
            onReleaseRole()
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-hbl-border text-sm text-hbl-text-muted hover:border-hbl-clock hover:text-hbl-clock active:scale-95 transition-all"
          aria-label="Soltar el marcador"
        >
          <LogOut className="w-4 h-4" />
          Soltar el marcador
        </button>
      )}

      {/* Scorekeeper status widget — all roles, hidden when finished */}
      {status !== 'finished' && (
        <div className="w-full max-w-xl">
          {scorekeeperClaimed && scorekeeperName ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm text-hbl-text-muted">
              <UserCheck className="w-4 h-4 text-hbl-accent shrink-0" />
              <span>Anotado por <span className="text-hbl-text font-medium">{scorekeeperName}</span></span>
            </div>
          ) : scorekeeperClaimed ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm text-hbl-text-muted">
              <UserCheck className="w-4 h-4 text-hbl-accent shrink-0" />
              <span>Anotador activo</span>
            </div>
          ) : onClaimScorekeeper ? (
            // Viewer: tappable claim flow
            !showClaimPrompt ? (
              <button
                onClick={() => setShowClaimPrompt(true)}
                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-hbl-accent/10 border border-hbl-accent/30 text-sm text-hbl-accent active:scale-95 transition-transform"
              >
                <UserCheck className="w-4 h-4" />
                Ser anotador
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2 w-full p-4 rounded-xl bg-hbl-surface border border-hbl-border">
                <p className="text-sm text-hbl-text-muted">¿Cómo te llaman?</p>
                <input
                  type="text"
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClaimScorekeeper()}
                  placeholder="Tu nombre"
                  maxLength={30}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-center text-lg text-hbl-text placeholder:text-hbl-text-muted/40 placeholder:text-base focus:outline-none focus:border-hbl-accent transition-colors"
                />
                {claimError && (
                  <p className="text-xs text-hbl-clock">{claimError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowClaimPrompt(false); setClaimName(''); setClaimError(null) }}
                    className="px-4 py-2 rounded-lg text-sm text-hbl-text-muted hover:text-hbl-text transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleClaimScorekeeper}
                    disabled={claimLoading || claimName.trim().length === 0}
                    className="px-4 py-2 rounded-lg bg-hbl-accent text-hbl-bg text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    {claimLoading ? 'Uniéndose...' : 'Anotar'}
                  </button>
                </div>
              </div>
            )
          ) : (
            // Admin / operator: informational badge
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm text-hbl-text-muted">
              <UserCheck className="w-4 h-4 opacity-40 shrink-0" />
              <span>Anotador: disponible</span>
            </div>
          )}
        </div>
      )}

      {/* Finished state — visible to all users */}
      {status === 'finished' && (
        <Link
          to="/"
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-hbl-surface border border-hbl-border text-sm active:scale-95 transition-transform"
        >
          <Home className="w-4 h-4" />
          Volver al inicio
        </Link>
      )}

      {/* Release role toast */}
      {showReleaseToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-hbl-surface border border-hbl-border shadow-lg text-sm text-hbl-text">
          <LogOut className="w-4 h-4 text-hbl-accent shrink-0" />
          Marcador liberado
        </div>
      )}
    </div>
  )
}
