import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { UserPlus, UserMinus, Heart, HeartCrack } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { usePlayersStore } from '../hooks/usePlayersStore'
import { useTeamsStore } from '../hooks/useTeamsStore'
import { isSupabaseConfigured } from '../lib/supabase'
import { TeamLogo } from '../components/ui/TeamPicker'
import type { DbPlayer } from '../lib/database.types'

const ROLE_LABELS: Record<string, string> = {
  GK: 'Portero',
  LW: 'Ext. Izq.',
  RW: 'Ext. Der.',
  LB: 'Lat. Izq.',
  RB: 'Lat. Der.',
  CB: 'Central',
  PV: 'Pivote',
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export function RosterPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { players, loading, error, fetch: fetchPlayers, update } = usePlayersStore()
  const { teams, fetch: fetchTeams } = useTeamsStore()
  const [showPool, setShowPool] = useState(false)

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchPlayers()
      fetchTeams()
    }
  }, [fetchPlayers, fetchTeams])

  const team = teams.find((t) => t.id === teamId)
  const roster = players.filter((p) => p.team_id === teamId).sort((a, b) => a.number - b.number)
  const unassigned = players.filter((p) => p.team_id === null)

  async function handleAssign(playerId: string) {
    await update(playerId, { team_id: teamId! })
  }

  async function handleRemove(playerId: string) {
    await update(playerId, { team_id: null })
  }

  async function toggleAvailable(player: DbPlayer) {
    await update(player.id, { available: !player.available })
  }

  async function toggleInjured(player: DbPlayer) {
    const newInjured = !player.injured
    // Injured players are automatically unavailable
    await update(player.id, {
      injured: newInjured,
      ...(newInjured ? { available: false } : {}),
    })
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <BackButton to="/admin/equipos" />
        <h1 className="text-3xl font-bold text-hbl-accent">Plantilla</h1>
        <p className="text-hbl-text-muted text-sm text-center max-w-xs">
          Supabase no está configurado.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-6 gap-6">
      <BackButton to="/admin/equipos" />

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          {team && <TeamLogo url={team.badge_url} size={32} />}
          <h1 className="text-3xl font-bold text-hbl-accent">
            {team?.name ?? 'Equipo'}
          </h1>
        </div>
        <p className="text-hbl-text-muted text-sm">Gestiona la plantilla</p>
      </div>

      {error && <p className="text-sm text-hbl-clock">{error}</p>}

      <div className="flex flex-col gap-3 w-full max-w-md">
        {loading && roster.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">Cargando plantilla...</p>
        ) : roster.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">Sin jugadores asignados. Añade jugadores desde la lista disponible.</p>
        ) : (
          roster.map((player) => (
            <RosterPlayerRow
              key={player.id}
              player={player}
              onRemove={() => handleRemove(player.id)}
              onToggleAvailable={() => toggleAvailable(player)}
              onToggleInjured={() => toggleInjured(player)}
            />
          ))
        )}
      </div>

      {showPool ? (
        <div className="flex flex-col gap-3 w-full max-w-md">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase tracking-widest text-hbl-text-muted font-medium">
              Jugadores sin equipo ({unassigned.length})
            </span>
            <button onClick={() => setShowPool(false)} className="text-xs text-hbl-text-muted hover:text-hbl-text">
              Cerrar
            </button>
          </div>
          {unassigned.length === 0 ? (
            <p className="text-sm text-hbl-text-muted text-center py-4">No hay jugadores sin equipo.</p>
          ) : (
            unassigned.map((player) => (
              <UnassignedPlayerRow key={player.id} player={player} onAssign={() => handleAssign(player.id)} />
            ))
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowPool(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold active:scale-95 transition-transform"
        >
          <UserPlus className="w-5 h-5" />
          Añadir jugador
        </button>
      )}
    </div>
  )
}

function RosterPlayerRow({ player, onRemove, onToggleAvailable, onToggleInjured }: {
  player: DbPlayer
  onRemove: () => void
  onToggleAvailable: () => void
  onToggleInjured: () => void
}) {
  const dimmed = !player.available || player.injured

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-hbl-surface border border-hbl-border ${dimmed ? 'opacity-50' : ''}`}>
      <span className="w-8 h-8 rounded-lg bg-hbl-accent/10 flex items-center justify-center text-sm font-bold text-hbl-accent shrink-0">
        {player.number}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{player.display_name}</p>
        <p className="text-xs text-hbl-text-muted">
          {roleLabel(player.role)}
          {player.injured && <span className="ml-1 text-hbl-clock">· Lesionado</span>}
          {!player.available && !player.injured && <span className="ml-1 text-amber-400">· No disponible</span>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleInjured}
          title={player.injured ? 'Marcar como sano' : 'Marcar como lesionado'}
          className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {player.injured ? (
            <HeartCrack className="w-4 h-4 text-hbl-clock" />
          ) : (
            <Heart className="w-4 h-4 text-hbl-text-muted" />
          )}
        </button>
        <button
          onClick={onToggleAvailable}
          title={player.available ? 'Marcar no disponible' : 'Marcar disponible'}
          className={`px-2 py-1 rounded-lg text-xs font-medium min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
            player.available
              ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
              : 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'
          }`}
        >
          {player.available ? 'OK' : 'No'}
        </button>
        <button
          onClick={onRemove}
          title="Quitar del equipo"
          className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <UserMinus className="w-4 h-4 text-hbl-text-muted" />
        </button>
      </div>
    </div>
  )
}

function UnassignedPlayerRow({ player, onAssign }: { player: DbPlayer; onAssign: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-hbl-surface border border-hbl-border">
      <span className="w-8 h-8 rounded-lg bg-hbl-accent/10 flex items-center justify-center text-sm font-bold text-hbl-accent shrink-0">
        {player.number}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{player.display_name}</p>
        <p className="text-xs text-hbl-text-muted">{roleLabel(player.role)}</p>
      </div>
      <button
        onClick={onAssign}
        title="Asignar al equipo"
        className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <UserPlus className="w-4 h-4 text-hbl-accent" />
      </button>
    </div>
  )
}
