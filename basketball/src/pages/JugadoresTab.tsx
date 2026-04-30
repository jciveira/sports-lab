import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTeamsStore } from '../stores/useTeamsStore'
import { usePlayersStore } from '../stores/usePlayersStore'

export function JugadoresTab() {
  const teams = useTeamsStore((s) => s.teams)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)
  const players = usePlayersStore((s) => s.players)
  const loading = usePlayersStore((s) => s.loading)
  const fetchPlayersForTeam = usePlayersStore((s) => s.fetchPlayersForTeam)

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  useEffect(() => {
    if (teams.length > 0) {
      void Promise.all(teams.map((t) => fetchPlayersForTeam(t.id)))
    }
  }, [teams, fetchPlayersForTeam])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold text-bbl-text">Jugadores</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-bbl-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && players.length === 0 && (
        <p className="text-sm text-bbl-text-muted text-center py-12">No hay jugadores todavía.</p>
      )}

      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const team = teams.find((t) => t.id === player.team_id)
          return (
            <li key={player.id}>
              <Link
                to={`/player/${player.id}/card`}
                className="flex items-center gap-4 p-4 rounded-xl bg-bbl-surface border border-bbl-border active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-bbl-accent flex items-center justify-center shrink-0">
                  <span className="text-bbl-bg font-black text-base">
                    {player.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-semibold text-bbl-text truncate">{player.display_name}</p>
                  <p className="text-xs text-bbl-text-muted">
                    #{player.number} · {player.position}{team ? ` · ${team.name}` : ''}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
