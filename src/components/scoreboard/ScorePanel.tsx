import { Minus, Plus, Shield } from 'lucide-react'
import { useMatchStore } from '../../hooks/useMatchStore'

interface ScorePanelProps {
  team: 'home' | 'away'
  teamName: string
  teamLogo?: string | null
  color: string
  isOperator: boolean
}

export function ScorePanel({ team, teamName, teamLogo, color, isOperator }: ScorePanelProps) {
  const score = useMatchStore((s) => team === 'home' ? s.homeScore : s.awayScore)
  const increment = useMatchStore((s) => s.incrementScore)
  const decrement = useMatchStore((s) => s.decrementScore)

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-3 min-w-0 flex-1">
      <div className="flex items-center gap-1.5 sm:gap-2 max-w-full">
        {teamLogo ? (
          <img src={teamLogo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0" />
        ) : (
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-hbl-text-muted shrink-0" />
        )}
        <span className="text-sm sm:text-xl font-semibold truncate" style={{ color }}>
          {teamName}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {isOperator && (
          <button
            onClick={() => decrement(team)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-hbl-surface-light border border-hbl-border flex items-center justify-center active:scale-90 transition-transform shrink-0"
            aria-label={`Restar gol ${teamName}`}
          >
            <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        <span className="font-score text-hbl-score text-center leading-none" style={{ fontSize: 'calc(var(--hbl-score-scale, 1) * clamp(2.25rem, 10vw, 9rem))', minWidth: 'calc(var(--hbl-score-scale, 1) * clamp(2.5rem, 6vw, 6.25rem))' }}>
          {score}
        </span>
        {isOperator && (
          <button
            onClick={() => increment(team)}
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-hbl-accent/20 border-2 border-hbl-accent flex items-center justify-center active:scale-90 transition-transform shrink-0"
            aria-label={`Sumar gol ${teamName}`}
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-hbl-accent" />
          </button>
        )}
      </div>
    </div>
  )
}
