import { useMatchStore } from '../../hooks/useMatchStore'

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const ORDINALS = ['1er', '2do', '3er', '4to', '5to', '6to']

export function ClockDisplay() {
  const clockSeconds = useMatchStore((s) => s.clockSeconds)
  const currentHalf = useMatchStore((s) => s.currentHalf)
  const totalHalves = useMatchStore((s) => s.config.halves)

  const halfLabel = `${ORDINALS[currentHalf - 1] ?? `${currentHalf}to`} tiempo`

  return (
    <div className="flex flex-col items-center">
      <span className="font-score text-hbl-clock tracking-wider leading-none" style={{ fontSize: 'calc(var(--hbl-score-scale, 1) * clamp(1.875rem, 6vw, 4.5rem))' }}>
        {formatClock(clockSeconds)}
      </span>
      <span className="text-[10px] sm:text-sm text-hbl-text-muted uppercase tracking-widest mt-0.5">
        {halfLabel} ({currentHalf}/{totalHalves})
      </span>
    </div>
  )
}
