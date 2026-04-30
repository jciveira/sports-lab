import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTournamentStore, computeStandingsByGroup } from '../stores/useTournamentStore'
import type { StandingRow } from '../stores/useTournamentStore'
import { useTeamsStore } from '../stores/useTeamsStore'
import { BackButton } from '../components/BackButton'
import { CollapsibleSection } from '../components/CollapsibleSection'
import type { Match, Tournament } from '../types'

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-bbl-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-bbl-text-muted uppercase tracking-wider border-b border-bbl-border">
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Equipo</th>
            <th className="text-center px-3 py-2">P</th>
            <th className="text-center px-3 py-2">G</th>
            <th className="text-center px-3 py-2">D</th>
            <th className="text-center px-3 py-2">Pts</th>
            <th className="text-center px-3 py-2">DP</th>
            <th className="text-center px-3 py-2">PF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.team.id} className="border-b border-bbl-border last:border-0">
              <td className="px-3 py-2 text-bbl-text-muted tabular-nums">{i + 1}</td>
              <td className="px-3 py-2 font-semibold text-bbl-text">{row.team.name}</td>
              <td className="px-3 py-2 text-center tabular-nums text-bbl-text">{row.played}</td>
              <td className="px-3 py-2 text-center tabular-nums text-bbl-score">{row.wins}</td>
              <td className="px-3 py-2 text-center tabular-nums text-bbl-clock">{row.losses}</td>
              <td className="px-3 py-2 text-center tabular-nums font-bold text-bbl-accent">{row.points}</td>
              <td className="px-3 py-2 text-center tabular-nums text-bbl-text">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
              <td className="px-3 py-2 text-center tabular-nums text-bbl-text">{row.gf}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function statusBadge(status: Tournament['status']) {
  const map: Record<Tournament['status'], { label: string; colour: string }> = {
    setup: { label: 'Setup', colour: 'text-bbl-team-home' },
    group_phase: { label: 'Fase de grupos', colour: 'text-bbl-score' },
    knockout: { label: 'Eliminatoria', colour: 'text-bbl-accent' },
    finished: { label: 'Finalizado', colour: 'text-bbl-text-muted' },
  }
  const { label, colour } = map[status] ?? { label: status, colour: 'text-bbl-text-muted' }
  return (
    <span className={`text-xs font-bold uppercase tracking-widest ${colour}`}>{label}</span>
  )
}

export function TournamentPage() {
  const { id } = useParams<{ id: string }>()
  const loadTournament = useTournamentStore((s) => s.loadTournament)
  const currentTournament = useTournamentStore((s) => s.currentTournament)
  const tournamentTeams = useTournamentStore((s) => s.tournamentTeams)
  const tournamentMatches = useTournamentStore((s) => s.tournamentMatches)
  const loading = useTournamentStore((s) => s.loading)
  const error = useTournamentStore((s) => s.error)

  const teams = useTeamsStore((s) => s.teams)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  const [groupMatches, setGroupMatches] = useState<Match[]>([])

  useEffect(() => {
    if (!id) return
    void loadTournament(id)
    void fetchTeams()
  }, [id, loadTournament, fetchTeams])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const matchIds = tournamentMatches
      .filter((tm) => tm.phase === 'group' && tm.match_id)
      .map((tm) => tm.match_id!)
    if (matchIds.length === 0) {
      setGroupMatches([])
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyDb = supabase as any
    void anyDb
      .from('matches')
      .select('*')
      .in('id', matchIds)
      .then(({ data }: { data: Match[] | null }) => {
        setGroupMatches((data as Match[]) ?? [])
      })
  }, [tournamentMatches])

  useEffect(() => {
    if (!isSupabaseConfigured || !id) return
    const channel = supabase
      .channel(`tournament-matches-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => {
        void loadTournament(id)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [id, loadTournament])

  if (loading) {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex items-center justify-center">
        <BackButton to="/torneos" />
        <div className="w-10 h-10 border-4 border-bbl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !currentTournament) {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex items-center justify-center">
        <BackButton to="/torneos" />
        <p className="text-bbl-clock text-lg">{error ?? 'Torneo no encontrado.'}</p>
      </div>
    )
  }

  const groupStandings = computeStandingsByGroup(teams, groupMatches, tournamentTeams)

  const showGroups =
    currentTournament.status === 'group_phase' ||
    currentTournament.status === 'knockout' ||
    currentTournament.status === 'finished'

  const showSchedule = currentTournament.status === 'group_phase'

  const showBracketLink =
    currentTournament.status === 'knockout' || currentTournament.status === 'finished'

  return (
    <div className="relative min-h-screen bg-bbl-bg text-bbl-text">
      <BackButton to="/torneos" />
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1 pt-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-bbl-accent">{currentTournament.name}</h1>
            {statusBadge(currentTournament.status)}
          </div>
          <p className="text-xs text-bbl-text-muted">{currentTournament.num_teams} equipos · {currentTournament.format}</p>
        </div>

        {showBracketLink && (
          <Link
            to={`/tournament/${currentTournament.id}/bracket`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-bbl-accent text-bbl-bg font-bold min-h-12 active:scale-95 transition-transform self-start"
          >
            Ver cuadro eliminatorio →
          </Link>
        )}

        {showGroups && groupStandings.map(({ groupName, rows }) => {
          const label = groupName ? `Grupo ${groupName}` : 'Clasificación'
          const groupTeamIds = new Set(
            tournamentTeams
              .filter((tt) => tt.group_name === groupName)
              .map((tt) => tt.team_id)
          )
          const groupTournamentMatches = showSchedule
            ? tournamentMatches.filter(
                (tm) =>
                  tm.phase === 'group' &&
                  tm.home_team_id !== null &&
                  tm.away_team_id !== null &&
                  groupTeamIds.has(tm.home_team_id!) &&
                  groupTeamIds.has(tm.away_team_id!)
              )
            : []

          return (
            <div key={groupName ?? '__all__'} className="flex flex-col gap-3">
              <CollapsibleSection title={label} titleClassName="text-lg font-bold text-bbl-accent uppercase tracking-widest">
                {rows.length === 0 ? (
                  <p className="text-sm text-bbl-text-muted text-center py-4">Sin resultados todavía.</p>
                ) : (
                  <StandingsTable rows={rows} />
                )}
              </CollapsibleSection>

              {showSchedule && (
                <CollapsibleSection
                  title="Calendario"
                  defaultOpen={false}
                  titleClassName="text-sm font-semibold text-bbl-text-muted"
                >
                  {groupTournamentMatches.length === 0 ? (
                    <p className="text-sm text-bbl-text-muted text-center py-2">Calendario no generado aún.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {groupTournamentMatches.map((tm) => {
                        const homeTeam = teams.find((t) => t.id === tm.home_team_id)
                        const awayTeam = teams.find((t) => t.id === tm.away_team_id)
                        const liveMatch = groupMatches.find((m) => m.id === tm.match_id)
                        const score =
                          liveMatch && liveMatch.status !== 'scheduled'
                            ? `${liveMatch.home_score} – ${liveMatch.away_score}`
                            : 'vs'
                        const isFinished = liveMatch?.status === 'finished'
                        return (
                          <li
                            key={tm.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bbl-surface border border-bbl-border"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate text-bbl-text">
                                {homeTeam?.name ?? 'TBD'}{' '}
                                <span className={isFinished ? 'text-bbl-accent' : 'text-bbl-text-muted'}>
                                  {score}
                                </span>{' '}
                                {awayTeam?.name ?? 'TBD'}
                              </p>
                              {isFinished && (
                                <p className="text-xs text-bbl-text-muted mt-0.5">Final</p>
                              )}
                            </div>
                            {tm.match_id && (
                              <Link
                                to={`/match/${tm.match_id}/view`}
                                className="px-3 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text hover:border-bbl-accent hover:text-bbl-accent transition-colors whitespace-nowrap"
                              >
                                {liveMatch?.status === 'running' ? 'En vivo →' : 'Ver →'}
                              </Link>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CollapsibleSection>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
