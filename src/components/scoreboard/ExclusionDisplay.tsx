import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useMatchStore } from '../../hooks/useMatchStore'
import type { Exclusion } from '../../types'

function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return '0:00'
  const m = Math.floor(remainingSeconds / 60)
  const s = remainingSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function ExclusionTimer({
  exclusion,
  clockSeconds,
  globalIndex,
  isOperator,
  onDismiss,
}: {
  exclusion: Exclusion
  clockSeconds: number
  globalIndex: number
  isOperator: boolean
  onDismiss?: (exclusion: Exclusion, index: number) => void
}) {
  const dismissExclusion = useMatchStore((s) => s.dismissExclusion)
  const elapsed = clockSeconds - exclusion.start_time
  const remaining = exclusion.duration - elapsed

  if (remaining <= 0 || exclusion.dismissed) return null

  const pct = (elapsed / exclusion.duration) * 100

  function handleDismiss() {
    if (onDismiss) {
      onDismiss(exclusion, globalIndex)
    } else {
      dismissExclusion(globalIndex)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hbl-warning/10 border border-hbl-warning/30">
      <AlertTriangle className="w-3.5 h-3.5 text-hbl-warning shrink-0" />
      <div className="flex-1 h-1.5 rounded-full bg-hbl-surface-light overflow-hidden">
        <div
          className="h-full bg-hbl-warning rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-hbl-warning tabular-nums min-w-[32px] text-right">
        {formatCountdown(remaining)}
      </span>
      {isOperator && (
        <button
          onClick={handleDismiss}
          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-hbl-warning/20 active:scale-90 transition-all"
          aria-label="Descartar exclusión"
        >
          <X className="w-3 h-3 text-hbl-warning" />
        </button>
      )}
    </div>
  )
}

interface ExclusionDisplayProps {
  team: 'home' | 'away'
  teamColor: string
  isOperator?: boolean
  onDismiss?: (exclusion: Exclusion, index: number) => void
}

export function ExclusionDisplay({ team, teamColor, isOperator = false, onDismiss }: ExclusionDisplayProps) {
  const exclusions = useMatchStore((s) => s.exclusions)
  const clockSeconds = useMatchStore((s) => s.clockSeconds)
  const currentHalf = useMatchStore((s) => s.currentHalf)
  const maxPerTeam = useMatchStore((s) => s.config.maxExclusionsPerTeam)
  const [, forceUpdate] = useState(0)

  // Force re-render every second to update countdowns
  const isRunning = useMatchStore((s) => s.isRunning)
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  // Active exclusions for this team in current half (not dismissed, not expired)
  const activeExclusions: { exclusion: Exclusion; globalIndex: number }[] = []
  exclusions.forEach((e, i) => {
    if (e.team_id !== team) return
    if (e.half !== currentHalf) return
    if (e.dismissed) return
    const elapsed = clockSeconds - e.start_time
    if (elapsed >= e.duration) return
    activeExclusions.push({ exclusion: e, globalIndex: i })
  })

  if (activeExclusions.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[160px] sm:max-w-[180px]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest" style={{ color: teamColor }}>
          Exclusiones
        </span>
        <span className="text-[11px] text-hbl-text-muted">
          {activeExclusions.length}/{maxPerTeam} activas
        </span>
      </div>
      {activeExclusions.map(({ exclusion, globalIndex }) => (
        <ExclusionTimer
          key={`${exclusion.team_id}-${exclusion.start_time}-${globalIndex}`}
          exclusion={exclusion}
          clockSeconds={clockSeconds}
          globalIndex={globalIndex}
          isOperator={isOperator}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
