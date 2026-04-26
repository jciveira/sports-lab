import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trophy, Users } from 'lucide-react'
import { listTournaments } from '../lib/tournaments'
import type { DbTournament } from '../lib/database.types'

export function TournamentsTab() {
  const [tournaments, setTournaments] = useState<DbTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const all = await listTournaments()
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

  const enCurso = tournaments.filter((t) => t.status === 'group_stage' || t.status === 'knockouts')
  const proximos = tournaments.filter((t) => t.status !== 'group_stage' && t.status !== 'knockouts' && t.status !== 'finished')
  const finalizados = tournaments.filter((t) => t.status === 'finished')

  return (
    <div className="flex flex-col p-4 gap-6 pb-4">
      <h1 className="text-2xl font-bold text-hbl-accent pt-2">Torneos</h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-hbl-accent" />
        </div>
      )}

      {error && <p className="text-hbl-clock text-sm">{error}</p>}

      {!loading && !error && (
        <>
          <Section title="🔴 En curso" tournaments={enCurso} emptyText="No hay torneos en curso" />
          <Section title="📅 Próximos" tournaments={proximos} emptyText="No hay torneos próximos" />
          <Section title="✅ Finalizados" tournaments={finalizados} emptyText="No hay torneos finalizados" />
        </>
      )}
    </div>
  )
}

function Section({ title, tournaments, emptyText }: { title: string; tournaments: DbTournament[]; emptyText: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase tracking-widest text-hbl-text-muted">{title}</h2>
      {tournaments.length === 0 ? (
        <p className="text-xs text-hbl-text-muted py-2 pl-1">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TournamentCard({ tournament: t }: { tournament: DbTournament }) {
  return (
    <Link
      to={`/torneos/${t.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-hbl-surface border border-hbl-border hover:border-hbl-accent transition-colors active:scale-[0.98]"
    >
      <Trophy className="w-5 h-5 text-hbl-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">{t.name}</span>
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
  )
}
