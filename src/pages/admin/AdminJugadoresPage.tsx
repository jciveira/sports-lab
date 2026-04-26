import { useEffect, useState } from 'react'
import { PlusCircle, Search } from 'lucide-react'
import { usePlayersStore } from '../../hooks/usePlayersStore'
import { useTeamsStore } from '../../hooks/useTeamsStore'
import { isSupabaseConfigured } from '../../lib/supabase'
import { TeamLogo } from '../../components/ui/TeamPicker'
import {
  PlayerRow,
  PlayerEditRow,
  PlayerCreateForm,
} from '../PlayersPage'
import type { DbPlayer } from '../../lib/database.types'

export function AdminJugadoresPage() {
  const { players, loading, error, fetch } = usePlayersStore()
  const { teams, fetch: fetchTeams } = useTeamsStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetch()
      fetchTeams()
    }
  }, [fetch, fetchTeams])

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
        <h1 className="text-lg font-bold text-hbl-text">Jugadores</h1>
        <p className="text-sm text-hbl-text-muted">
          Supabase no está configurado. Establece{' '}
          <code className="text-hbl-text">VITE_SUPABASE_URL</code> y{' '}
          <code className="text-hbl-text">VITE_SUPABASE_ANON_KEY</code> para gestionar jugadores.
        </p>
      </div>
    )
  }

  const q = search.trim().toLowerCase()
  const filteredPlayers = q
    ? players.filter((p) => {
        const team = teams.find((t) => t.id === p.team_id)
        return (
          p.display_name.toLowerCase().includes(q) ||
          (team?.name ?? '').toLowerCase().includes(q)
        )
      })
    : players

  // Group by team
  const teamMap = new Map<string, { team: typeof teams[0] | undefined; players: DbPlayer[] }>()
  for (const player of filteredPlayers) {
    const key = player.team_id ?? '__unassigned__'
    if (!teamMap.has(key)) {
      teamMap.set(key, {
        team: player.team_id ? teams.find((t) => t.id === player.team_id) : undefined,
        players: [],
      })
    }
    teamMap.get(key)!.players.push(player)
  }
  const groups = [...teamMap.values()].sort((a, b) =>
    (a.team?.name ?? '').localeCompare(b.team?.name ?? ''),
  )

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-hbl-text">Jugadores</h1>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-hbl-accent text-hbl-bg text-sm font-medium active:scale-95 transition-transform"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo jugador
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hbl-text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o equipo…"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
        />
      </div>

      {error && <p className="text-sm text-hbl-clock">{error}</p>}

      {showCreate && (
        <PlayerCreateForm
          onCreated={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="flex flex-col gap-5">
        {loading && players.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">Cargando jugadores...</p>
        ) : filteredPlayers.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">
            {q ? 'Sin resultados.' : 'No hay jugadores aún.'}
          </p>
        ) : (
          groups.map(({ team, players: teamPlayers }) => (
            <div key={team?.id ?? 'unknown'} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <TeamLogo url={team?.badge_url} size={20} />
                <span className="text-xs uppercase tracking-widest text-hbl-text-muted font-medium">
                  {team?.name ?? 'Equipo desconocido'}
                </span>
              </div>
              {teamPlayers.map((player) =>
                editingId === player.id ? (
                  <PlayerEditRow
                    key={player.id}
                    player={player}
                    onSave={async (updates) => {
                      await usePlayersStore.getState().update(player.id, updates)
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    onEdit={() => setEditingId(player.id)}
                    onDelete={() => usePlayersStore.getState().remove(player.id)}
                  />
                ),
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
