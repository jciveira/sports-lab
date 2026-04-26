import { useState } from 'react'
import { Check, X } from 'lucide-react'

interface ManualScoreEntryProps {
  homeTeamName: string
  awayTeamName: string
  onSubmit: (homeScore: number, awayScore: number) => Promise<void>
  onCancel: () => void
  initialHome?: number
  initialAway?: number
}

export function ManualScoreEntry({ homeTeamName, awayTeamName, onSubmit, onCancel, initialHome = 0, initialAway = 0 }: ManualScoreEntryProps) {
  const [homeScore, setHomeScore] = useState(initialHome)
  const [awayScore, setAwayScore] = useState(initialAway)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    try {
      await onSubmit(homeScore, awayScore)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-3 rounded-lg bg-hbl-surface border border-hbl-accent">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-hbl-text-muted truncate max-w-[80px]">{homeTeamName}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
              className="w-8 h-8 rounded bg-hbl-bg border border-hbl-border text-center active:scale-90 transition-transform"
            >
              -
            </button>
            <span className="font-mono text-2xl font-bold text-hbl-score w-10 text-center">{homeScore}</span>
            <button
              onClick={() => setHomeScore(homeScore + 1)}
              className="w-8 h-8 rounded bg-hbl-bg border border-hbl-border text-center active:scale-90 transition-transform"
            >
              +
            </button>
          </div>
        </div>

        <span className="text-hbl-text-muted text-sm">—</span>

        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-hbl-text-muted truncate max-w-[80px]">{awayTeamName}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
              className="w-8 h-8 rounded bg-hbl-bg border border-hbl-border text-center active:scale-90 transition-transform"
            >
              -
            </button>
            <span className="font-mono text-2xl font-bold text-hbl-score w-10 text-center">{awayScore}</span>
            <button
              onClick={() => setAwayScore(awayScore + 1)}
              className="w-8 h-8 rounded bg-hbl-bg border border-hbl-border text-center active:scale-90 transition-transform"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors"
        >
          <X className="w-5 h-5 text-hbl-text-muted" />
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-hbl-accent text-hbl-bg text-sm font-medium disabled:opacity-60 active:scale-95 transition-transform"
        >
          <Check className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
