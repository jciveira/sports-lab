import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTournamentStore } from '../stores/useTournamentStore'

const STATUS_LABEL: Record<string, string> = {
  setup: 'Configuración',
  group_phase: 'Fase de grupos',
  knockout: 'Eliminatoria',
  finished: 'Finalizado',
}

export function TorneosTab() {
  const tournaments = useTournamentStore((s) => s.tournaments)
  const loading = useTournamentStore((s) => s.loading)
  const fetchTournaments = useTournamentStore((s) => s.fetchTournaments)

  useEffect(() => {
    void fetchTournaments()
  }, [fetchTournaments])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-bbl-text">Torneos</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-bbl-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && tournaments.length === 0 && (
        <p className="text-sm text-bbl-text-muted text-center py-12">No hay torneos todavía.</p>
      )}

      <ul className="flex flex-col gap-2">
        {tournaments.map((t) => (
          <li key={t.id}>
            <Link
              to={`/tournament/${t.id}`}
              className="flex items-center justify-between gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border active:scale-[0.98] transition-transform"
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-bbl-text">{t.name}</p>
                <p className="text-xs text-bbl-text-muted">
                  {t.num_teams} equipos · {STATUS_LABEL[t.status] ?? t.status}
                </p>
              </div>
              <span className="text-bbl-text-muted text-sm">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
