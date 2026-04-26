import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy, Users } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { listTournaments } from '../lib/tournaments'
import type { DbTournament } from '../lib/database.types'

function statusBadge(status: string) {
  switch (status) {
    case 'group_stage':
      return <span className="text-[10px] font-bold uppercase text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">En curso</span>
    case 'knockouts':
      return <span className="text-[10px] font-bold uppercase text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Eliminatorias</span>
    case 'finished':
      return <span className="text-[10px] font-bold uppercase text-hbl-text-muted bg-hbl-surface px-2 py-0.5 rounded-full">Finalizado</span>
    default:
      return null
  }
}

export function TournamentsPage() {
  const [tournaments, setTournaments] = useState<DbTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const all = await listTournaments()
        // Hide drafts from public view
        setTournaments(all.filter((t) => t.status !== 'draft'))
        setError(null)
      } catch {
        setError('No se pudieron cargar los torneos')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-4 gap-4">
      <BackButton to="/" />

      <div className="flex flex-col items-center gap-1 pt-2">
        <h1 className="text-2xl font-bold text-hbl-accent">Torneos</h1>
        <p className="text-xs text-hbl-text-muted">Descubre torneos y consulta resultados</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-hbl-accent" />
        </div>
      )}

      {error && <p className="text-hbl-clock text-sm">{error}</p>}

      {!loading && !error && tournaments.length === 0 && (
        <p className="text-hbl-text-muted text-sm py-12">No hay torneos disponibles</p>
      )}

      {!loading && !error && tournaments.length > 0 && (
        <div className="w-full max-w-lg flex flex-col gap-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              to={`/tournament/${t.id}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-hbl-surface border border-hbl-border hover:border-hbl-accent transition-colors active:scale-[0.98]"
            >
              <Trophy className="w-5 h-5 text-hbl-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{t.name}</span>
                  {statusBadge(t.status)}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-hbl-text-muted">
                    <Users className="w-3 h-3" />{t.num_teams} equipos
                  </span>
                  {(t.category || t.gender) && (
                    <span className="text-xs text-hbl-text-muted">
                      {[t.category, t.gender].filter(Boolean).join(' ')}
                    </span>
                  )}
                  {t.date && (
                    <span className="text-xs text-hbl-text-muted">
                      {new Date(t.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
