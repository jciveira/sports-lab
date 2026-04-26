import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { DbPlayer } from '../../lib/database.types'

const ROLE_LABELS: Record<string, string> = {
  GK: 'Portero',
  LW: 'Ext. Izq.',
  RW: 'Ext. Der.',
  LB: 'Lat. Izq.',
  RB: 'Lat. Der.',
  CB: 'Central',
  PV: 'Pivote',
}

interface SquadPickerProps {
  teamId: string
  teamName: string
  selected: string[]
  onChange: (playerIds: string[]) => void
}

export function SquadPicker({ teamId, teamName, selected, onChange }: SquadPickerProps) {
  const [players, setPlayers] = useState<DbPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const fetchRoster = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('players')
      .select()
      .eq('team_id', teamId)
      .order('number', { ascending: true })

    const roster = data ?? []
    setPlayers(roster)

    // Initialize selection: available & not injured are checked by default
    if (roster.length > 0) {
      const defaultSelected = roster
        .filter((p) => p.available && !p.injured)
        .map((p) => p.id)
      onChange(defaultSelected)
    }

    setLoading(false)
  }, [teamId]) // onChange intentionally excluded — only want to set defaults on fetch

  useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  function handleToggle(playerId: string) {
    if (selected.includes(playerId)) {
      onChange(selected.filter((id) => id !== playerId))
    } else {
      onChange([...selected, playerId])
    }
  }

  function handleSelectAll() {
    onChange(players.map((p) => p.id))
  }

  function handleDeselectAll() {
    onChange([])
  }

  if (loading) {
    return (
      <div className="text-sm text-hbl-text-muted text-center py-2">
        Cargando plantilla...
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-hbl-surface border border-hbl-border">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm text-hbl-text-muted">
          Sin plantilla — <a href="/admin/equipos" className="text-hbl-accent hover:underline">añade jugadores en Equipos</a>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-3 rounded-xl bg-hbl-surface border border-hbl-border text-sm"
      >
        <span>
          <span className="font-medium">{teamName}</span>
          <span className="text-hbl-text-muted ml-2">
            {selected.length}/{players.length} convocados
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-hbl-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-hbl-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-1 pl-1">
          <div className="flex items-center justify-end gap-2 py-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-hbl-accent hover:underline"
            >
              Todos
            </button>
            <span className="text-xs text-hbl-text-muted">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-xs text-hbl-text-muted hover:underline"
            >
              Ninguno
            </button>
          </div>

          {players.map((player) => {
            const checked = selected.includes(player.id)
            const isInjured = player.injured
            const isUnavailable = !player.available && !player.injured

            return (
              <label
                key={player.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-hbl-surface-light transition-colors ${
                  isInjured || isUnavailable ? 'opacity-60' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggle(player.id)}
                  className="w-4 h-4 rounded border-hbl-border accent-hbl-accent shrink-0"
                />
                <span className="w-7 h-7 rounded-md bg-hbl-accent/10 flex items-center justify-center text-xs font-bold text-hbl-accent shrink-0">
                  {player.number}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{player.display_name}</span>
                  <span className="text-xs text-hbl-text-muted">
                    {ROLE_LABELS[player.role] ?? player.role}
                    {isInjured && <span className="ml-1 text-hbl-clock">· Lesionado</span>}
                    {isUnavailable && <span className="ml-1 text-amber-400">· No disponible</span>}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
