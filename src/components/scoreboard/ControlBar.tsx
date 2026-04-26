import { useState } from 'react'
import { Play, Pause, Timer, AlertTriangle, SkipForward, Flag, XCircle, RotateCcw } from 'lucide-react'
import { useMatchStore } from '../../hooks/useMatchStore'

interface ControlBarProps {
  isOperator: boolean
  onExclusion: (team: 'home' | 'away') => void
  onCancel?: () => void
}

export function ControlBar({ isOperator, onExclusion, onCancel }: ControlBarProps) {
  const isRunning = useMatchStore((s) => s.isRunning)
  const toggleClock = useMatchStore((s) => s.toggleClock)
  const callTimeout = useMatchStore((s) => s.callTimeout)
  const nextHalf = useMatchStore((s) => s.nextHalf)
  const homeTimeouts = useMatchStore((s) => s.homeTimeoutsLeft)
  const awayTimeouts = useMatchStore((s) => s.awayTimeoutsLeft)
  const status = useMatchStore((s) => s.status)
  const currentHalf = useMatchStore((s) => s.currentHalf)
  const totalHalves = useMatchStore((s) => s.config.halves)

  const exclusions = useMatchStore((s) => s.exclusions)
  const clockSeconds = useMatchStore((s) => s.clockSeconds)
  const maxPerTeam = useMatchStore((s) => s.config.maxExclusionsPerTeam)
  const resetScore = useMatchStore((s) => s.resetScore)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  if (!isOperator) return null

  const isLastHalf = currentHalf >= totalHalves
  const canAdvance = status === 'paused' || status === 'halftime'
  const canCancel = status !== 'finished' && onCancel

  // Count active (not dismissed, not expired) exclusions per team
  const countActive = (team: string) =>
    exclusions.filter((e) => {
      if (e.team_id !== team) return false
      if (e.dismissed) return false
      if (e.half !== currentHalf) return false
      const elapsed = clockSeconds - e.start_time
      return elapsed < e.duration
    }).length

  const homeAtLimit = countActive('home') >= maxPerTeam
  const awayAtLimit = countActive('away') >= maxPerTeam

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-4 w-full max-w-xl">
      {/* Primary controls row */}
      <div className="flex items-center justify-center gap-3">
        {/* Play / Pause */}
        {status !== 'finished' && (
          <button
            onClick={toggleClock}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-hbl-surface-light border border-hbl-border flex items-center justify-center active:scale-90 transition-transform"
            aria-label={isRunning ? 'Pausar reloj' : 'Iniciar reloj'}
          >
            {isRunning ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-hbl-warning" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-hbl-accent" />
            )}
          </button>
        )}

        {/* Next Half / End Match */}
        {canAdvance && (
          <button
            onClick={nextHalf}
            className="h-12 px-4 sm:h-14 sm:px-5 rounded-full bg-hbl-surface-light border border-hbl-border flex items-center gap-2 active:scale-90 transition-transform"
            aria-label={isLastHalf ? 'Terminar partido' : 'Siguiente parte'}
          >
            {isLastHalf ? (
              <>
                <Flag className="w-5 h-5 text-hbl-clock" />
                <span className="text-sm font-medium">Terminar partido</span>
              </>
            ) : (
              <>
                <SkipForward className="w-5 h-5 text-hbl-accent" />
                <span className="text-sm font-medium">Siguiente parte</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Secondary controls row — only during active play */}
      {status !== 'finished' && (
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:justify-center sm:gap-3 sm:flex-wrap w-full">
          {/* Timeouts */}
          <button
            onClick={() => callTimeout('home')}
            disabled={homeTimeouts <= 0 || status !== 'running'}
            className="h-9 sm:h-10 px-2 sm:px-4 rounded-lg bg-hbl-surface-light border border-hbl-border text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-30 active:scale-95 transition-transform"
            aria-label="Tiempo muerto local"
          >
            <Timer className="w-4 h-4 text-hbl-team-home shrink-0" />
            <span className="truncate">TM Local ({homeTimeouts})</span>
          </button>
          <button
            onClick={() => callTimeout('away')}
            disabled={awayTimeouts <= 0 || status !== 'running'}
            className="h-9 sm:h-10 px-2 sm:px-4 rounded-lg bg-hbl-surface-light border border-hbl-border text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-30 active:scale-95 transition-transform"
            aria-label="Tiempo muerto visitante"
          >
            <Timer className="w-4 h-4 text-hbl-team-away shrink-0" />
            <span className="truncate">TM Visitante ({awayTimeouts})</span>
          </button>

          {/* Exclusions (2 min) */}
          <button
            onClick={() => onExclusion('home')}
            disabled={homeAtLimit}
            className="h-9 sm:h-10 px-2 sm:px-4 rounded-lg bg-hbl-surface-light border border-hbl-border text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-30 active:scale-95 transition-transform"
            aria-label="Exclusión local"
          >
            <AlertTriangle className="w-4 h-4 text-hbl-warning shrink-0" />
            <span className="truncate">2min Local{homeAtLimit ? ` (${maxPerTeam}/${maxPerTeam})` : ''}</span>
          </button>
          <button
            onClick={() => onExclusion('away')}
            disabled={awayAtLimit}
            className="h-9 sm:h-10 px-2 sm:px-4 rounded-lg bg-hbl-surface-light border border-hbl-border text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-30 active:scale-95 transition-transform"
            aria-label="Exclusión visitante"
          >
            <AlertTriangle className="w-4 h-4 text-hbl-warning shrink-0" />
            <span className="truncate">2min Visitante{awayAtLimit ? ` (${maxPerTeam}/${maxPerTeam})` : ''}</span>
          </button>
        </div>
      )}

      {/* Secondary actions — reset score + cancel match */}
      {status !== 'finished' && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="h-8 sm:h-10 px-3 sm:px-4 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 text-hbl-text-muted hover:text-hbl-warning transition-colors"
            aria-label="Reiniciar marcador"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Reiniciar</span>
          </button>
          {canCancel && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="h-8 sm:h-10 px-3 sm:px-4 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 text-hbl-text-muted hover:text-hbl-clock transition-colors"
              aria-label="Cancelar partido"
            >
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Cancelar</span>
            </button>
          )}
        </div>
      )}

      {/* Reset score confirmation dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-hbl-surface border border-hbl-border rounded-xl p-6 max-w-sm w-full flex flex-col gap-4">
            <h2 className="text-lg font-bold text-hbl-text">¿Reiniciar marcador a 0 – 0?</h2>
            <p className="text-sm text-hbl-text-muted">El reloj, parte, tiempos muertos y exclusiones no se verán afectados.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg bg-hbl-surface-light border border-hbl-border text-sm active:scale-95 transition-transform"
              >
                Mantener marcador
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false)
                  resetScore()
                }}
                className="px-4 py-2 rounded-lg bg-hbl-warning text-hbl-bg text-sm font-medium active:scale-95 transition-transform"
              >
                Reiniciar marcador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-hbl-surface border border-hbl-border rounded-xl p-6 max-w-sm w-full flex flex-col gap-4">
            <h2 className="text-lg font-bold text-hbl-text">¿Cancelar este partido?</h2>
            <p className="text-sm text-hbl-text-muted">Se perderán todos los datos del partido. Esto no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg bg-hbl-surface-light border border-hbl-border text-sm active:scale-95 transition-transform"
              >
                Seguir jugando
              </button>
              <button
                onClick={() => {
                  setShowCancelConfirm(false)
                  onCancel?.()
                }}
                className="px-4 py-2 rounded-lg bg-hbl-clock text-white text-sm font-medium active:scale-95 transition-transform"
              >
                Cancelar partido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
