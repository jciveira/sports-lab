import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeamsStore } from '../../stores/useTeamsStore'
import { useTournamentStore } from '../../stores/useTournamentStore'
import { useMatchesStore } from '../../stores/useMatchesStore'
import { CollapsibleSection } from '../../components/CollapsibleSection'
import type { Team, Tournament, Match, Venue } from '../../types'

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

// ─── Venues sub-section ───────────────────────────────────────────────────────

function VenuesSection({ tournamentId, venues }: { tournamentId: string; venues: Venue[] }) {
  const addVenue = useTournamentStore((s) => s.addVenue)
  const removeVenue = useTournamentStore((s) => s.removeVenue)
  const fetchVenues = useTournamentStore((s) => s.fetchVenues)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  useEffect(() => {
    void fetchVenues(tournamentId)
  }, [tournamentId, fetchVenues])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    await addVenue(tournamentId, name.trim(), address.trim() || undefined)
    setSubmitting(false)
    setName('')
    setAddress('')
  }

  async function handleRemove(venueId: string) {
    if (confirmRemoveId !== venueId) { setConfirmRemoveId(venueId); return }
    await removeVenue(venueId)
    setConfirmRemoveId(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-bbl-text-muted">Pistas</p>
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nombre de pista *"
          className="w-full px-3 py-2 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent text-sm min-h-10"
        />
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección (opcional)"
          className="w-full px-3 py-2 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent text-sm min-h-10"
        />
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="px-4 py-2 rounded-xl bg-bbl-accent text-bbl-bg text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Añadiendo…' : 'Añadir pista'}
        </button>
      </form>
      {venues.length > 0 && (
        <ul className="flex flex-col gap-1">
          {venues.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-bbl-surface-light border border-bbl-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-bbl-text truncate">{v.name}</p>
                {v.address && <p className="text-xs text-bbl-text-muted truncate">{v.address}</p>}
              </div>
              <button
                onClick={() => void handleRemove(v.id)}
                className={`px-2 py-1 rounded-lg border text-xs transition-colors min-h-8 shrink-0 ${
                  confirmRemoveId === v.id
                    ? 'bg-bbl-clock/20 border-bbl-clock text-bbl-clock'
                    : 'bg-bbl-surface border-bbl-border text-bbl-text-muted hover:border-bbl-clock hover:text-bbl-clock'
                }`}
              >
                {confirmRemoveId === v.id ? '¿Confirmar?' : 'Eliminar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Match row with venue/time/score/not-played ───────────────────────────────

function TournamentMatchRow({
  match,
  teams,
  venues,
}: {
  match: Match
  teams: Team[]
  venues: Venue[]
}) {
  const updateMatch = useMatchesStore((s) => s.updateMatch)
  const home = teams.find((t) => t.id === match.home_team_id)
  const away = teams.find((t) => t.id === match.away_team_id)
  const assignedVenue = venues.find((v) => v.id === match.venue_id)

  const [venueId, setVenueId] = useState(match.venue_id ?? '')
  const [scheduledAt, setScheduledAt] = useState(
    match.scheduled_at ? match.scheduled_at.slice(0, 16) : '',
  )
  const [savingSchedule, setSavingSchedule] = useState(false)

  const [editingScore, setEditingScore] = useState(false)
  const [homeScore, setHomeScore] = useState(String(match.home_score))
  const [awayScore, setAwayScore] = useState(String(match.away_score))
  const [savingScore, setSavingScore] = useState(false)

  const [togglingNotPlayed, setTogglingNotPlayed] = useState(false)

  async function handleSaveSchedule() {
    setSavingSchedule(true)
    await updateMatch(match.id, {
      venue_id: venueId || null,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    })
    setSavingSchedule(false)
  }

  async function handleSaveScore(e: React.FormEvent) {
    e.preventDefault()
    const h = parseInt(homeScore, 10)
    const a = parseInt(awayScore, 10)
    if (isNaN(h) || isNaN(a)) return
    setSavingScore(true)
    await updateMatch(match.id, { home_score: h, away_score: a, status: 'finished' })
    setSavingScore(false)
    setEditingScore(false)
  }

  async function handleToggleNotPlayed() {
    setTogglingNotPlayed(true)
    await updateMatch(match.id, {
      not_played: !match.not_played,
      home_score: 0,
      away_score: 0,
    })
    setTogglingNotPlayed(false)
  }

  return (
    <li className={`flex flex-col gap-2 p-3 rounded-xl border ${match.not_played ? 'bg-bbl-surface/40 border-bbl-border/40 opacity-60' : 'bg-bbl-surface border-bbl-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-semibold truncate ${match.not_played ? 'line-through text-bbl-text-muted' : 'text-bbl-text'}`}>
          {home?.name ?? '?'} vs {away?.name ?? '?'}
        </p>
        <span className="text-xs font-bold tabular-nums text-bbl-text-muted shrink-0">
          {match.home_score}–{match.away_score}
        </span>
      </div>

      {assignedVenue && (
        <p className="text-xs text-bbl-accent">{assignedVenue.name}</p>
      )}

      {/* Venue + time assignment */}
      {venues.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-bbl-text text-xs focus:outline-none focus:border-bbl-accent min-h-9"
            >
              <option value="">Sin pista</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-bbl-text text-xs focus:outline-none focus:border-bbl-accent min-h-9"
            />
          </div>
          <button
            onClick={() => void handleSaveSchedule()}
            disabled={savingSchedule}
            className="px-3 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text hover:border-bbl-accent hover:text-bbl-accent disabled:opacity-40 transition-colors min-h-8"
          >
            {savingSchedule ? 'Guardando…' : 'Guardar pista/horario'}
          </button>
        </div>
      )}

      {/* Score override */}
      {(match.status === 'finished' || match.not_played) && !editingScore && (
        <button
          onClick={() => { setHomeScore(String(match.home_score)); setAwayScore(String(match.away_score)); setEditingScore(true) }}
          className="px-3 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text hover:border-bbl-accent hover:text-bbl-accent transition-colors min-h-8"
        >
          Editar resultado
        </button>
      )}
      {editingScore && (
        <form onSubmit={handleSaveScore} className="flex items-center gap-2">
          <input
            type="number"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            min={0}
            className="w-16 px-2 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-bbl-text text-sm text-center focus:outline-none focus:border-bbl-accent min-h-9"
          />
          <span className="text-bbl-text-muted text-sm">–</span>
          <input
            type="number"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            min={0}
            className="w-16 px-2 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-bbl-text text-sm text-center focus:outline-none focus:border-bbl-accent min-h-9"
          />
          <button type="submit" disabled={savingScore} className="flex-1 px-3 py-1.5 rounded-lg bg-bbl-accent text-bbl-bg text-xs font-bold disabled:opacity-40 active:scale-95 transition-transform min-h-9">
            {savingScore ? '…' : 'Guardar'}
          </button>
          <button type="button" onClick={() => setEditingScore(false)} className="px-3 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text-muted min-h-9">
            ✕
          </button>
        </form>
      )}

      {/* Not-played toggle */}
      <button
        onClick={() => void handleToggleNotPlayed()}
        disabled={togglingNotPlayed}
        className={`px-3 py-1.5 rounded-lg border text-xs transition-colors min-h-8 ${
          match.not_played
            ? 'bg-bbl-warning/20 border-bbl-warning text-bbl-warning'
            : 'bg-bbl-surface-light border-bbl-border text-bbl-text-muted hover:border-bbl-warning hover:text-bbl-warning'
        }`}
      >
        {togglingNotPlayed ? '…' : match.not_played ? 'Marcar como jugado' : 'No jugado'}
      </button>
    </li>
  )
}

// ─── Tournament section ───────────────────────────────────────────────────────

function TournamentSection({ teams }: { teams: Team[] }) {
  const tournaments = useTournamentStore((s) => s.tournaments)
  const tournamentTeams = useTournamentStore((s) => s.tournamentTeams)
  const tournamentMatches = useTournamentStore((s) => s.tournamentMatches)
  const currentTournament = useTournamentStore((s) => s.currentTournament)
  const venues = useTournamentStore((s) => s.venues)
  const loading = useTournamentStore((s) => s.loading)
  const storeError = useTournamentStore((s) => s.error)
  const fetchTournaments = useTournamentStore((s) => s.fetchTournaments)
  const createTournament = useTournamentStore((s) => s.createTournament)
  const loadTournament = useTournamentStore((s) => s.loadTournament)
  const addTeamToTournament = useTournamentStore((s) => s.addTeamToTournament)
  const generateGroupSchedule = useTournamentStore((s) => s.generateGroupSchedule)
  const generateKnockoutDraw = useTournamentStore((s) => s.generateKnockoutDraw)
  const deleteTournament = useTournamentStore((s) => s.deleteTournament)
  const updateTournamentStatus = useTournamentStore((s) => s.updateTournamentStatus)

  const [name, setName] = useState('')
  const [numTeams, setNumTeams] = useState(4)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addTeamId, setAddTeamId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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

  async function handleDelete(tournamentId: string) {
    if (confirmDeleteId !== tournamentId) { setConfirmDeleteId(tournamentId); return }
    setActionLoading(true)
    await deleteTournament(tournamentId)
    setConfirmDeleteId(null)
    setExpandedId(null)
    setActionLoading(false)
  }

  async function handleClose(tournamentId: string) {
    setActionLoading(true)
    await updateTournamentStatus(tournamentId, 'finished')
    setActionLoading(false)
  }

  const enrolledCount = tournamentTeams.filter(
    (tt) => tt.tournament_id === expandedId,
  ).length

  const groupMatches = tournamentMatches.filter((tm) => tm.phase === 'group')

  return (
    <CollapsibleSection title="Torneos">
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
                  <div className="flex flex-col gap-4 px-3 pb-3 border-t border-bbl-border pt-3">
                    {storeError && <p className="text-sm text-bbl-clock">{storeError}</p>}

                    {/* Enrolled teams */}
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

                    {/* Add team */}
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

                    {/* Venues */}
                    <VenuesSection tournamentId={t.id} venues={venues} />

                    {/* Group schedule matches with venue/time/score/not-played */}
                    {groupMatches.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-bbl-text-muted">Partidos de grupo</p>
                        <ul className="flex flex-col gap-2">
                          {groupMatches
                            .filter((tm) => tm.match_id != null)
                            .map((tm) => {
                              // Find the actual match from matches store — we need to look it up
                              return (
                                <TournamentMatchRowById
                                  key={tm.id}
                                  matchId={tm.match_id!}
                                  teams={teams}
                                  venues={venues}
                                />
                              )
                            })}
                        </ul>
                      </div>
                    )}

                    {/* Generate schedule / knockout */}
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

                    {/* Close tournament */}
                    {currentTournament?.status === 'knockout' && (
                      <button
                        onClick={() => void handleClose(t.id)}
                        disabled={actionLoading}
                        className="flex items-center justify-center px-4 py-2 rounded-xl bg-bbl-surface-light border border-bbl-text-muted text-bbl-text-muted text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform"
                      >
                        {actionLoading ? '…' : 'Cerrar torneo'}
                      </button>
                    )}

                    {/* Delete tournament */}
                    <button
                      onClick={() => void handleDelete(t.id)}
                      disabled={actionLoading}
                      className={`flex items-center justify-center px-4 py-2 rounded-xl border text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform ${
                        confirmDeleteId === t.id
                          ? 'bg-bbl-clock/20 border-bbl-clock text-bbl-clock'
                          : 'bg-bbl-surface-light border-bbl-border text-bbl-text-muted hover:border-bbl-clock hover:text-bbl-clock'
                      }`}
                    >
                      {confirmDeleteId === t.id ? '¿Eliminar definitivamente?' : 'Eliminar torneo'}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </CollapsibleSection>
  )
}

// Wrapper that fetches the match from the matches store by id
function TournamentMatchRowById({
  matchId,
  teams,
  venues,
}: {
  matchId: string
  teams: Team[]
  venues: Venue[]
}) {
  const matches = useMatchesStore((s) => s.matches)
  const fetchMatches = useMatchesStore((s) => s.fetchMatches)

  useEffect(() => {
    if (matches.length === 0) void fetchMatches()
  }, [matches.length, fetchMatches])

  const match = matches.find((m) => m.id === matchId) as Match | undefined
  if (!match) return null

  return <TournamentMatchRow match={match} teams={teams} venues={venues} />
}

export function AdminTorneosPage() {
  const teams = useTeamsStore((s) => s.teams)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  return (
    <div className="min-h-screen bg-bbl-bg text-bbl-text">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        <TournamentSection teams={teams} />
      </div>
    </div>
  )
}
