import { useEffect, useState } from 'react'

import { Loader2, Trash2, Check, X, CheckCircle, Clock, Radio, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { listMatchesWithTeams, deleteMatch } from '../lib/matches'
import { isSupabaseConfigured } from '../lib/supabase'
import { TeamLogo } from '../components/ui/TeamPicker'
import type { MatchWithTeams } from '../lib/matches'

function statusBadge(status: string) {
  switch (status) {
    case 'running':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-400"><Radio className="w-3 h-3" />En juego</span>
    case 'paused':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-400"><Clock className="w-3 h-3" />Pausado</span>
    case 'halftime':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-400"><Clock className="w-3 h-3" />Descanso</span>
    case 'finished':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-hbl-text-muted"><CheckCircle className="w-3 h-3" />Finalizado</span>
    case 'scheduled':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-400"><Calendar className="w-3 h-3" />Programado</span>
    default:
      return null
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function MatchRow({ match, onDelete }: { match: MatchWithTeams; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-hbl-surface border border-hbl-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <TeamLogo url={match.homeTeamLogo} size={18} />
          <span className="text-sm font-medium truncate max-w-[80px]">{match.homeTeamName}</span>
          <span className="text-xs text-hbl-text-muted">vs</span>
          <span className="text-sm font-medium truncate max-w-[80px]">{match.awayTeamName}</span>
          <TeamLogo url={match.awayTeamLogo} size={18} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {statusBadge(match.status)}
          {(match.status === 'finished' || match.status === 'running' || match.status === 'paused' || match.status === 'halftime') && (
            <span className="text-xs text-hbl-text-muted font-mono">{match.home_score} – {match.away_score}</span>
          )}
          <span className="text-[10px] text-hbl-text-muted">{formatDate(match.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={onDelete} className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Confirmar eliminar">
              <Check className="w-4 h-4 text-hbl-clock" />
            </button>
            <button onClick={() => setConfirmDelete(false)} className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Cancelar eliminar">
              <X className="w-4 h-4 text-hbl-text-muted" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Eliminar partido">
            <Trash2 className="w-4 h-4 text-hbl-text-muted" />
          </button>
        )}
      </div>
    </div>
  )
}

function MatchList({ matches, onDelete }: { matches: MatchWithTeams[]; onDelete: (id: string) => void }) {
  const [pastExpanded, setPastExpanded] = useState(false)
  const activeMatches = matches.filter((m) => m.status !== 'finished')
  const pastMatches = matches.filter((m) => m.status === 'finished')

  return (
    <>
      {activeMatches.map((match) => (
        <MatchRow key={match.id} match={match} onDelete={() => onDelete(match.id)} />
      ))}

      {pastMatches.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setPastExpanded((v) => !v)}
            className="flex items-center gap-2 text-sm text-hbl-text-muted hover:text-hbl-text transition-colors py-1"
            aria-expanded={pastExpanded}
          >
            {pastExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {pastMatches.length} {pastMatches.length === 1 ? 'partido anterior' : 'partidos anteriores'}
          </button>

          {pastExpanded && pastMatches.map((match) => (
            <MatchRow key={match.id} match={match} onDelete={() => onDelete(match.id)} />
          ))}
        </div>
      )}
    </>
  )
}

export function AdminMatchesPage() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadMatches() {
    try {
      const data = await listMatchesWithTeams(true)
      setMatches(data)
      setError(null)
    } catch {
      setError('No se pudieron cargar los partidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSupabaseConfigured) loadMatches()
    else setLoading(false)
  }, [])

  async function handleDelete(matchId: string) {
    try {
      await deleteMatch(matchId)
      setMatches((prev) => prev.filter((m) => m.id !== matchId))
    } catch {
      setError('Error al eliminar el partido')
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <BackButton to="/" />
        <h1 className="text-3xl font-bold text-hbl-accent">Partidos</h1>
        <p className="text-hbl-text-muted text-sm text-center max-w-xs">
          Supabase no está configurado.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-6 gap-6">
      <BackButton to="/" />

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold text-hbl-accent">Partidos</h1>
        <p className="text-hbl-text-muted text-sm">Gestionar y eliminar partidos</p>
      </div>

      {error && <p className="text-sm text-hbl-clock">{error}</p>}

      <div className="flex flex-col gap-3 w-full max-w-md">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-hbl-accent" />
          </div>
        ) : matches.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">No hay partidos.</p>
        ) : (
          <MatchList matches={matches} onDelete={handleDelete} />
        )}
      </div>
    </div>
  )
}
