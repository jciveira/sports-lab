import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMatchesStore } from '../stores/useMatchesStore'
import { useTeamsStore } from '../stores/useTeamsStore'

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  running: { label: 'En vivo', className: 'text-bbl-clock font-bold animate-pulse' },
  paused: { label: 'Pausado', className: 'text-bbl-warning' },
  quarter_break: { label: 'Descanso', className: 'text-bbl-warning' },
  finished: { label: 'Finalizado', className: 'text-bbl-text-muted' },
  scheduled: { label: 'Programado', className: 'text-bbl-text-muted' },
}

export function PartidosTab() {
  const matches = useMatchesStore((s) => s.matches)
  const loading = useMatchesStore((s) => s.loading)
  const fetchMatches = useMatchesStore((s) => s.fetchMatches)
  const teams = useTeamsStore((s) => s.teams)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  useEffect(() => {
    void fetchMatches()
    void fetchTeams()
  }, [fetchMatches, fetchTeams])

  function teamName(id: string) {
    return teams.find((t) => t.id === id)?.name ?? '—'
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-bbl-text">Partidos</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-bbl-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && matches.length === 0 && (
        <p className="text-sm text-bbl-text-muted text-center py-12">No hay partidos todavía.</p>
      )}

      <ul className="flex flex-col gap-2">
        {matches.map((match) => {
          const { label, className } = STATUS_LABEL[match.status] ?? STATUS_LABEL.scheduled
          return (
            <li key={match.id}>
              <Link
                to={`/match/${match.id}/view`}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border active:scale-[0.98] transition-transform"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold text-bbl-text truncate">
                    {teamName(match.home_team_id)} <span className="text-bbl-text-muted font-normal">vs</span> {teamName(match.away_team_id)}
                  </p>
                  <p className={`text-xs ${className}`}>{label}</p>
                </div>
                {match.status !== 'scheduled' && (
                  <p className="text-lg font-bold tabular-nums text-bbl-score shrink-0">
                    {match.home_score} – {match.away_score}
                  </p>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
