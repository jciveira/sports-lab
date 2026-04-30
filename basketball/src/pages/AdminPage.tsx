import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeamsStore } from '../stores/useTeamsStore'
import { useMatchesStore, type MatchWithDuration } from '../stores/useMatchesStore'
import { usePlayersStore } from '../stores/usePlayersStore'
import { useTournamentStore } from '../stores/useTournamentStore'
import type { Team, Match, Tournament, PlayerPosition, PlayerAttributes } from '../types'

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

function statusBadge(status: Match['status']) {
  const map: Record<Match['status'], { label: string; colour: string }> = {
    scheduled: { label: 'Programado', colour: 'text-bbl-team-home' },
    running: { label: 'En vivo', colour: 'text-bbl-score' },
    paused: { label: 'Pausado', colour: 'text-bbl-warning' },
    quarter_break: { label: 'Descanso', colour: 'text-bbl-warning' },
    finished: { label: 'Finalizado', colour: 'text-bbl-text-muted' },
  }
  const { label, colour } = map[status] ?? { label: status, colour: 'text-bbl-text-muted' }
  return <span className={`text-xs font-bold uppercase ${colour}`}>{label}</span>
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="px-3 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text hover:border-bbl-accent hover:text-bbl-accent transition-colors min-h-8 active:scale-95"
    >
      {copied ? '¡Copiado!' : 'Copiar URL'}
    </button>
  )
}

// ─── Roster section ──────────────────────────────────────────────────────────

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
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-bbl-accent uppercase tracking-widest">Plantilla</h2>

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
    </section>
  )
}

// ─── Team list + form ────────────────────────────────────────────────────────

function TeamsSection({ teams, loading }: { teams: Team[]; loading: boolean }) {
  const createTeam = useTeamsStore((s) => s.createTeam)
  const storeError = useTeamsStore((s) => s.error)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [badgeUrl, setBadgeUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setLocalError(null)
    const result = await createTeam(name.trim(), nickname.trim() || undefined, badgeUrl.trim() || undefined)
    setSubmitting(false)
    if (result) {
      setName('')
      setNickname('')
      setBadgeUrl('')
    } else {
      setLocalError(storeError ?? 'No se pudo crear el equipo')
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-bbl-accent uppercase tracking-widest">Equipos</h2>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 rounded-2xl bg-bbl-surface border border-bbl-border">
        <p className="text-xs uppercase tracking-widest text-bbl-text-muted">Nuevo equipo</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nombre del equipo *"
          className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
        />
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Apodo (opcional)"
          className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
        />
        <input
          type="url"
          value={badgeUrl}
          onChange={(e) => setBadgeUrl(e.target.value)}
          placeholder="URL del escudo (opcional)"
          className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
        />
        {localError && <p className="text-sm text-bbl-clock">{localError}</p>}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex items-center justify-center px-6 py-3 rounded-xl bg-bbl-accent text-bbl-bg font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Creando…' : 'Crear equipo'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Cargando…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Sin equipos. Crea el primero arriba.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {teams.map((team) => (
            <li key={team.id} className="flex items-center gap-3 p-3 rounded-xl bg-bbl-surface border border-bbl-border">
              {team.badge_url && (
                <img src={team.badge_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-bbl-text">{team.name}</p>
                {team.nickname && <p className="text-xs text-bbl-text-muted truncate">{team.nickname}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Match list + form ───────────────────────────────────────────────────────

function MatchesSection({ matches, teams, loading }: { matches: MatchWithDuration[]; teams: Team[]; loading: boolean }) {
  const createMatch = useMatchesStore((s) => s.createMatch)
  const storeError = useMatchesStore((s) => s.error)
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [quarterDuration, setQuarterDuration] = useState<8 | 10>(8)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!homeTeamId || !awayTeamId) return
    if (homeTeamId === awayTeamId) {
      setLocalError('Los equipos local y visitante deben ser diferentes')
      return
    }
    setSubmitting(true)
    setLocalError(null)
    const result = await createMatch(homeTeamId, awayTeamId, quarterDuration)
    setSubmitting(false)
    if (result) {
      setHomeTeamId('')
      setAwayTeamId('')
      setQuarterDuration(8)
    } else {
      setLocalError(storeError ?? 'No se pudo crear el partido')
    }
  }

  const viewerBase = `${window.location.origin}/match`

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-bbl-accent uppercase tracking-widest">Partidos</h2>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 rounded-2xl bg-bbl-surface border border-bbl-border">
        <p className="text-xs uppercase tracking-widest text-bbl-text-muted">Nuevo partido</p>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-bbl-text-muted">Equipo local</label>
          <select
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
          >
            <option value="">Seleccionar local</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-bbl-text-muted">Equipo visitante</label>
          <select
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
          >
            <option value="">Seleccionar visitante</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-bbl-text-muted">Duración del cuarto</label>
          <select
            value={quarterDuration}
            onChange={(e) => setQuarterDuration(Number(e.target.value) as 8 | 10)}
            className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
          >
            <option value={8}>8 minutos</option>
            <option value={10}>10 minutos</option>
          </select>
        </div>

        {localError && <p className="text-sm text-bbl-clock">{localError}</p>}

        <button
          type="submit"
          disabled={submitting || !homeTeamId || !awayTeamId || teams.length < 2}
          className="flex items-center justify-center px-6 py-3 rounded-xl bg-bbl-accent text-bbl-bg font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Creando…' : 'Crear partido'}
        </button>

        {teams.length < 2 && (
          <p className="text-xs text-bbl-text-muted text-center">Necesitas al menos 2 equipos para programar un partido.</p>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Cargando…</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Sin partidos. Crea el primero arriba.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match) => {
            const home = teams.find((t) => t.id === match.home_team_id)
            const away = teams.find((t) => t.id === match.away_team_id)
            const viewerUrl = `${viewerBase}/${match.id}/view`
            return (
              <li key={match.id} className="flex flex-col gap-2 p-3 rounded-xl bg-bbl-surface border border-bbl-border">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate text-bbl-text">
                    {home?.name ?? 'Desconocido'} vs {away?.name ?? 'Desconocido'}
                  </p>
                  {statusBadge(match.status)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-bbl-text-muted font-mono truncate">/match/{match.id}/view</span>
                  <CopyButton url={viewerUrl} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ─── Tournament section ───────────────────────────────────────────────────────

function tournamentStatusBadge(status: Tournament['status']) {
  const map: Record<Tournament['status'], { label: string; colour: string }> = {
    setup: { label: 'Setup', colour: 'text-bbl-team-home' },
    group_phase: { label: 'Fase de grupos', colour: 'text-bbl-score' },
    knockout: { label: 'Eliminatoria', colour: 'text-bbl-accent' },
    finished: { label: 'Finalizado', colour: 'text-bbl-text-muted' },
  }
  const { label, colour } = map[status] ?? { label: status, colour: 'text-bbl-text-muted' }
  return <span className={`text-xs font-bold uppercase ${colour}`}>{label}</span>
}

function TournamentSection({ teams }: { teams: Team[] }) {
  const tournaments = useTournamentStore((s) => s.tournaments)
  const tournamentTeams = useTournamentStore((s) => s.tournamentTeams)
  const tournamentMatches = useTournamentStore((s) => s.tournamentMatches)
  const currentTournament = useTournamentStore((s) => s.currentTournament)
  const loading = useTournamentStore((s) => s.loading)
  const storeError = useTournamentStore((s) => s.error)
  const fetchTournaments = useTournamentStore((s) => s.fetchTournaments)
  const createTournament = useTournamentStore((s) => s.createTournament)
  const loadTournament = useTournamentStore((s) => s.loadTournament)
  const addTeamToTournament = useTournamentStore((s) => s.addTeamToTournament)
  const generateGroupSchedule = useTournamentStore((s) => s.generateGroupSchedule)
  const generateKnockoutDraw = useTournamentStore((s) => s.generateKnockoutDraw)

  const [name, setName] = useState('')
  const [numTeams, setNumTeams] = useState(4)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addTeamId, setAddTeamId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    void fetchTournaments()
  }, [fetchTournaments])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setLocalError(null)
    const result = await createTournament(name.trim(), numTeams)
    setSubmitting(false)
    if (result) {
      setName('')
      setNumTeams(4)
    } else {
      setLocalError(storeError ?? 'No se pudo crear el torneo')
    }
  }

  async function handleExpand(tournament: Tournament) {
    if (expandedId === tournament.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(tournament.id)
    await loadTournament(tournament.id)
    setAddTeamId('')
  }

  async function handleAddTeam(tournamentId: string) {
    if (!addTeamId) return
    setActionLoading(true)
    await addTeamToTournament(tournamentId, addTeamId)
    setAddTeamId('')
    await loadTournament(tournamentId)
    setActionLoading(false)
  }

  async function handleGenerateSchedule(tournamentId: string) {
    setActionLoading(true)
    await generateGroupSchedule(tournamentId)
    await loadTournament(tournamentId)
    setActionLoading(false)
  }

  async function handleKnockoutDraw(tournamentId: string) {
    setActionLoading(true)
    await generateKnockoutDraw(tournamentId)
    await loadTournament(tournamentId)
    setActionLoading(false)
  }

  const enrolledCount = tournamentTeams.filter(
    (tt) => tt.tournament_id === expandedId,
  ).length

  void tournamentMatches // used indirectly via canKnockout logic

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-bbl-accent uppercase tracking-widest">Torneos</h2>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 rounded-2xl bg-bbl-surface border border-bbl-border">
        <p className="text-xs uppercase tracking-widest text-bbl-text-muted">Nuevo torneo</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nombre del torneo *"
          className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-bbl-text-muted">Número de equipos</label>
          <select
            value={numTeams}
            onChange={(e) => setNumTeams(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
          >
            {[4, 6, 8, 10, 12, 16].map((n) => (
              <option key={n} value={n}>{n} equipos</option>
            ))}
          </select>
        </div>
        {localError && <p className="text-sm text-bbl-clock">{localError}</p>}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex items-center justify-center px-6 py-3 rounded-xl bg-bbl-accent text-bbl-bg font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Creando…' : 'Crear torneo'}
        </button>
      </form>

      {loading && tournaments.length === 0 ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Cargando…</p>
      ) : tournaments.length === 0 ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Sin torneos todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tournaments.map((t) => {
            const isExpanded = expandedId === t.id
            const isCurrent = currentTournament?.id === t.id
            const enrolled = isCurrent
              ? tournamentTeams.filter((tt) => tt.tournament_id === t.id)
              : []

            const enrolledTeamIds = new Set(enrolled.map((tt) => tt.team_id))
            const availableTeams = teams.filter((team) => !enrolledTeamIds.has(team.id))

            const canGenerateSchedule =
              isCurrent &&
              currentTournament?.status === 'setup' &&
              enrolledCount >= currentTournament.num_teams

            const canKnockout =
              isCurrent &&
              currentTournament?.status === 'group_phase'

            return (
              <li key={t.id} className="flex flex-col rounded-xl bg-bbl-surface border border-bbl-border overflow-hidden">
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-bbl-text">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {tournamentStatusBadge(t.status)}
                      <span className="text-xs text-bbl-text-muted">{t.num_teams} equipos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/tournament/${t.id}`}
                      className="px-3 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text hover:border-bbl-accent hover:text-bbl-accent transition-colors"
                    >
                      Ver
                    </Link>
                    <button
                      onClick={() => void handleExpand(t)}
                      className="px-3 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text hover:border-bbl-accent hover:text-bbl-accent transition-colors"
                    >
                      {isExpanded ? 'Cerrar' : 'Gestionar'}
                    </button>
                  </div>
                </div>

                {isExpanded && isCurrent && (
                  <div className="flex flex-col gap-3 px-3 pb-3 border-t border-bbl-border pt-3">
                    {storeError && (
                      <p className="text-sm text-bbl-clock">{storeError}</p>
                    )}

                    <div>
                      <p className="text-xs text-bbl-text-muted mb-1">
                        Inscritos ({enrolledCount}/{currentTournament?.num_teams ?? '?'})
                      </p>
                      {enrolled.length === 0 ? (
                        <p className="text-xs text-bbl-text-muted">Sin equipos inscritos.</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {enrolled.map((tt) => {
                            const team = teams.find((tm) => tm.id === tt.team_id)
                            return (
                              <li key={tt.id} className="text-sm text-bbl-text px-2 py-1 bg-bbl-surface-light rounded-lg">
                                {team?.name ?? tt.team_id}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    {currentTournament?.status === 'setup' && (
                      <div className="flex gap-2">
                        <select
                          value={addTeamId}
                          onChange={(e) => setAddTeamId(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text text-sm focus:outline-none focus:border-bbl-accent min-h-10"
                        >
                          <option value="">Añadir equipo…</option>
                          {availableTeams.map((team) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => void handleAddTeam(t.id)}
                          disabled={!addTeamId || actionLoading}
                          className="px-4 py-2 rounded-xl bg-bbl-accent text-bbl-bg text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform"
                        >
                          Añadir
                        </button>
                      </div>
                    )}

                    {canGenerateSchedule && (
                      <button
                        onClick={() => void handleGenerateSchedule(t.id)}
                        disabled={actionLoading}
                        className="flex items-center justify-center px-4 py-2 rounded-xl bg-bbl-score text-bbl-bg text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform"
                      >
                        {actionLoading ? 'Generando…' : 'Generar calendario de grupos'}
                      </button>
                    )}

                    {canKnockout && (
                      <button
                        onClick={() => void handleKnockoutDraw(t.id)}
                        disabled={actionLoading}
                        className="flex items-center justify-center px-4 py-2 rounded-xl bg-bbl-accent text-bbl-bg text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform"
                      >
                        {actionLoading ? 'Generando…' : 'Generar cuadro eliminatorio'}
                      </button>
                    )}

                    {(currentTournament?.status === 'knockout' || currentTournament?.status === 'finished') && (
                      <Link
                        to={`/tournament/${t.id}/bracket`}
                        className="flex items-center justify-center px-4 py-2 rounded-xl bg-bbl-surface-light border border-bbl-accent text-bbl-accent text-sm font-bold min-h-10 active:scale-95 transition-transform"
                      >
                        Ver cuadro →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ─── Admin page ──────────────────────────────────────────────────────────────

export function AdminPage() {
  const teams = useTeamsStore((s) => s.teams)
  const teamsLoading = useTeamsStore((s) => s.loading)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  const matches = useMatchesStore((s) => s.matches)
  const matchesLoading = useMatchesStore((s) => s.loading)
  const fetchMatches = useMatchesStore((s) => s.fetchMatches)

  useEffect(() => {
    void fetchTeams()
    void fetchMatches()
  }, [fetchTeams, fetchMatches])

  return (
    <div className="min-h-screen bg-bbl-bg text-bbl-text">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-bbl-accent">Admin</h1>
            <p className="text-xs text-bbl-text-muted mt-0.5">BasketballLab</p>
          </div>
        </div>

        <TeamsSection teams={teams} loading={teamsLoading} />
        <MatchesSection matches={matches} teams={teams} loading={matchesLoading} />
        <RosterSection teams={teams} />
        <TournamentSection teams={teams} />
      </div>
    </div>
  )
}
