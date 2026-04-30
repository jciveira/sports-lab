import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeamsStore } from '../../stores/useTeamsStore'
import { useTournamentStore } from '../../stores/useTournamentStore'
import { CollapsibleSection } from '../../components/CollapsibleSection'
import type { Team, Tournament } from '../../types'

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

  void tournamentMatches

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
    </CollapsibleSection>
  )
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
