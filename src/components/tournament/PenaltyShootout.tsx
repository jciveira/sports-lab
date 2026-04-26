import { useState } from 'react'
import { Check, X } from 'lucide-react'

interface PenaltyShootoutProps {
  homeTeamName: string
  awayTeamName: string
  onSubmit: (homeScore: number, awayScore: number) => Promise<void>
  onCancel: () => void
}

export function PenaltyShootout({ homeTeamName, awayTeamName, onSubmit, onCancel }: PenaltyShootoutProps) {
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [saving, setSaving] = useState(false)

  const isValid = homeScore !== awayScore // penalties must have a winner

  async function handleSubmit() {
    if (!isValid) return
    setSaving(true)
    try {
      await onSubmit(homeScore, awayScore)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex flex-col gap-4 p-6 rounded-2xl bg-hbl-surface border border-hbl-accent w-full max-w-sm">
        <h3 className="text-lg font-bold text-hbl-accent text-center">Tanda de penales</h3>
        <p className="text-xs text-hbl-text-muted text-center">El partido terminó empatado. Ingresa los resultados de penales.</p>

        <div className="flex items-center gap-4">
          <div className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs text-hbl-text-muted truncate max-w-[100px]">{homeTeamName}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
                className="w-10 h-10 rounded-lg bg-hbl-bg border border-hbl-border text-lg active:scale-90 transition-transform"
              >
                -
              </button>
              <span className="font-mono text-3xl font-bold text-hbl-score w-12 text-center">{homeScore}</span>
              <button
                onClick={() => setHomeScore(homeScore + 1)}
                className="w-10 h-10 rounded-lg bg-hbl-bg border border-hbl-border text-lg active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          </div>

          <span className="text-hbl-text-muted text-lg font-bold">—</span>

          <div className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs text-hbl-text-muted truncate max-w-[100px]">{awayTeamName}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
                className="w-10 h-10 rounded-lg bg-hbl-bg border border-hbl-border text-lg active:scale-90 transition-transform"
              >
                -
              </button>
              <span className="font-mono text-3xl font-bold text-hbl-score w-12 text-center">{awayScore}</span>
              <button
                onClick={() => setAwayScore(awayScore + 1)}
                className="w-10 h-10 rounded-lg bg-hbl-bg border border-hbl-border text-lg active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {!isValid && homeScore === awayScore && (homeScore > 0 || awayScore > 0) && (
          <p className="text-xs text-hbl-warning text-center">Los penales deben tener un ganador</p>
        )}

        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-hbl-text-muted hover:bg-hbl-surface-light"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !isValid}
            className="flex items-center gap-1 px-6 py-2 rounded-lg bg-hbl-accent text-hbl-bg text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
