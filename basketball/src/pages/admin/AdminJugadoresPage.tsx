import { useEffect, useState } from 'react'
import { useTeamsStore } from '../../stores/useTeamsStore'
import { usePlayersStore } from '../../stores/usePlayersStore'
import { CollapsibleSection } from '../../components/CollapsibleSection'
import type { Team, PlayerPosition, PlayerAttributes } from '../../types'

const POSITION_LABELS: Record<PlayerPosition, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
}

const ATTR_LABELS: Record<keyof PlayerAttributes, string> = {
  tiro: 'TIRO',
  pase: 'PASE',
  defensa: 'DEFENSA',
  fisico: 'FÍSICO',
  stamina: 'STAMINA',
  vision: 'VISIÓN',
}

const ATTR_KEYS = ['tiro', 'pase', 'defensa', 'fisico', 'stamina', 'vision'] as const

function RosterSection({ teams }: { teams: Team[] }) {
  const players = usePlayersStore((s) => s.players)
  const playersLoading = usePlayersStore((s) => s.loading)
  const playersError = usePlayersStore((s) => s.error)
  const fetchPlayersForTeam = usePlayersStore((s) => s.fetchPlayersForTeam)
  const addPlayer = usePlayersStore((s) => s.addPlayer)
  const removePlayer = usePlayersStore((s) => s.removePlayer)
  const updatePlayerAttributes = usePlayersStore((s) => s.updatePlayerAttributes)

  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PlayerPosition>('PG')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const [editingAttrsFor, setEditingAttrsFor] = useState<string | null>(null)
  const [attrValues, setAttrValues] = useState<Record<string, string>>({})
  const [attrSaving, setAttrSaving] = useState(false)

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedTeamId) {
      void fetchPlayersForTeam(selectedTeamId)
    } else {
      usePlayersStore.setState({ players: [] })
    }
  }, [selectedTeamId, fetchPlayersForTeam])

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeamId || !displayName.trim() || !number) return
    const jerseyNumber = parseInt(number, 10)
    if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      setLocalError('El dorsal debe estar entre 1 y 99')
      return
    }
    setSubmitting(true)
    setLocalError(null)
    const result = await addPlayer(selectedTeamId, displayName.trim(), jerseyNumber, position)
    setSubmitting(false)
    if (result) {
      setDisplayName('')
      setNumber('')
      setPosition('PG')
    } else {
      setLocalError(playersError ?? 'No se pudo añadir el jugador')
    }
  }

  function startEditAttrs(playerId: string) {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    const defaults = player.attributes ?? { tiro: 0, pase: 0, defensa: 0, fisico: 0, stamina: 0, vision: 0 }
    setAttrValues(Object.fromEntries(ATTR_KEYS.map((k) => [k, String(defaults[k])])))
    setEditingAttrsFor(playerId)
  }

  async function handleSaveAttrs(playerId: string) {
    const attrs: PlayerAttributes = {
      tiro: Math.min(99, Math.max(0, parseInt(attrValues.tiro ?? '0', 10) || 0)),
      pase: Math.min(99, Math.max(0, parseInt(attrValues.pase ?? '0', 10) || 0)),
      defensa: Math.min(99, Math.max(0, parseInt(attrValues.defensa ?? '0', 10) || 0)),
      fisico: Math.min(99, Math.max(0, parseInt(attrValues.fisico ?? '0', 10) || 0)),
      stamina: Math.min(99, Math.max(0, parseInt(attrValues.stamina ?? '0', 10) || 0)),
      vision: Math.min(99, Math.max(0, parseInt(attrValues.vision ?? '0', 10) || 0)),
    }
    setAttrSaving(true)
    await updatePlayerAttributes(playerId, attrs)
    setAttrSaving(false)
    setEditingAttrsFor(null)
  }

  async function handleRemove(playerId: string) {
    if (confirmRemoveId !== playerId) {
      setConfirmRemoveId(playerId)
      return
    }
    await removePlayer(playerId)
    setConfirmRemoveId(null)
  }

  return (
    <CollapsibleSection title="Plantilla">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-bbl-text-muted uppercase tracking-widest">Seleccionar equipo</label>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
        >
          <option value="">— elige un equipo —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {selectedTeamId && (
        <>
          <form onSubmit={handleAddPlayer} className="flex flex-col gap-3 p-4 rounded-2xl bg-bbl-surface border border-bbl-border">
            <p className="text-xs uppercase tracking-widest text-bbl-text-muted">Añadir jugador</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Nombre + inicial (ej. Juan G.)"
              className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
                min={1}
                max={99}
                placeholder="# (1–99)"
                className="w-28 px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
              />
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                className="flex-1 px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
              >
                {(Object.entries(POSITION_LABELS) as [PlayerPosition, string][]).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
            {localError && <p className="text-sm text-bbl-clock">{localError}</p>}
            <button
              type="submit"
              disabled={submitting || !displayName.trim() || !number}
              className="flex items-center justify-center px-6 py-3 rounded-xl bg-bbl-accent text-bbl-bg font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
            >
              {submitting ? 'Añadiendo…' : 'Añadir jugador'}
            </button>
          </form>

          {playersLoading ? (
            <p className="text-sm text-bbl-text-muted text-center py-4">Cargando…</p>
          ) : players.length === 0 ? (
            <p className="text-sm text-bbl-text-muted text-center py-4">Sin jugadores. Añade el primero arriba.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {players.map((player) => (
                <li key={player.id} className="flex flex-col gap-2 p-3 rounded-xl bg-bbl-surface border border-bbl-border">
                  <div className="flex items-center gap-3">
                    <span className="text-bbl-accent font-mono font-bold text-sm w-8 shrink-0">#{player.number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-bbl-text">{player.display_name}</p>
                      <p className="text-xs text-bbl-text-muted">{POSITION_LABELS[player.position]}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEditAttrs(player.id)}
                        className="px-2 py-1 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text hover:border-bbl-accent hover:text-bbl-accent transition-colors min-h-8"
                      >
                        Attrs
                      </button>
                      <button
                        onClick={() => void handleRemove(player.id)}
                        className={`px-2 py-1 rounded-lg border text-xs transition-colors min-h-8 ${
                          confirmRemoveId === player.id
                            ? 'bg-bbl-clock/20 border-bbl-clock text-bbl-clock'
                            : 'bg-bbl-surface-light border-bbl-border text-bbl-text-muted hover:border-bbl-clock hover:text-bbl-clock'
                        }`}
                      >
                        {confirmRemoveId === player.id ? '¿Confirmar?' : 'Eliminar'}
                      </button>
                    </div>
                  </div>

                  {editingAttrsFor === player.id && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-bbl-border">
                      <div className="grid grid-cols-2 gap-2">
                        {ATTR_KEYS.map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <label className="text-xs text-bbl-text-muted uppercase w-16 shrink-0">{ATTR_LABELS[key]}</label>
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={attrValues[key] ?? '0'}
                              onChange={(e) => setAttrValues((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-2 py-1 rounded-lg bg-bbl-surface-light border border-bbl-border text-bbl-text text-sm focus:outline-none focus:border-bbl-accent"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleSaveAttrs(player.id)}
                          disabled={attrSaving}
                          className="flex-1 px-4 py-2 rounded-xl bg-bbl-accent text-bbl-bg font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                        >
                          {attrSaving ? 'Guardando…' : 'Guardar atributos'}
                        </button>
                        <button
                          onClick={() => setEditingAttrsFor(null)}
                          className="px-4 py-2 rounded-xl bg-bbl-surface-light border border-bbl-border text-sm text-bbl-text-muted hover:text-bbl-text transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </CollapsibleSection>
  )
}

export function AdminJugadoresPage() {
  const teams = useTeamsStore((s) => s.teams)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  return (
    <div className="min-h-screen bg-bbl-bg text-bbl-text">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        <RosterSection teams={teams} />
      </div>
    </div>
  )
}
