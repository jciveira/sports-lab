import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTournamentStore, computeStandings } from '../stores/useTournamentStore'
import { useTeamsStore } from '../stores/useTeamsStore'
import type { Match, Tournament } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: Tournament['status']) {
  const map: Record<Tournament['status'], { label: string; colour: string }> = {
    setup: { label: 'Setup', colour: 'text-blue-400' },
    group_phase: { label: 'Group Phase', colour: 'text-green-400' },
    knockout: { label: 'Knockout', colour: 'text-orange-400' },
    finished: { label: 'Finished', colour: 'text-gray-500' },
  }
  const { label, colour } = map[status] ?? { label: status, colour: 'text-gray-400' }
  return (
    <span className={`text-xs font-bold uppercase tracking-widest ${colour}`}>{label}</span>
  )
}

// ─── TournamentPage ──────────────────────────────────────────────────────────

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

  // Fetch group-phase match results from the matches table
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

  // Realtime subscription: re-fetch when a match finishes
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !currentTournament) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-lg">{error ?? 'Tournament not found.'}</p>
      </div>
    )
  }

  const standings = computeStandings(teams, groupMatches, tournamentTeams)

  const showStandings =
    currentTournament.status === 'group_phase' ||
    currentTournament.status === 'knockout' ||
    currentTournament.status === 'finished'

  const showSchedule = currentTournament.status === 'group_phase'

  const showBracketLink =
    currentTournament.status === 'knockout' || currentTournament.status === 'finished'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-orange-400">{currentTournament.name}</h1>
            {statusBadge(currentTournament.status)}
          </div>
          <p className="text-xs text-gray-500">{currentTournament.num_teams} teams · {currentTournament.format}</p>
        </div>

        {showBracketLink && (
          <Link
            to={`/tournament/${currentTournament.id}/bracket`}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-orange-400 text-gray-950 font-bold min-h-12 active:scale-95 transition-transform self-start"
          >
            View Knockout Bracket →
          </Link>
        )}

        {/* Standings table */}
        {showStandings && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-orange-400 uppercase tracking-widest">Standings</h2>
            {standings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No results yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Team</th>
                      <th className="text-center px-3 py-2">P</th>
                      <th className="text-center px-3 py-2">W</th>
                      <th className="text-center px-3 py-2">L</th>
                      <th className="text-center px-3 py-2">Pts</th>
                      <th className="text-center px-3 py-2">GD</th>
                      <th className="text-center px-3 py-2">GF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr key={row.team.id} className="border-b border-gray-800 last:border-0">
                        <td className="px-3 py-2 text-gray-500 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold">{row.team.name}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-gray-300">{row.played}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-green-400">{row.wins}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-red-400">{row.losses}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-bold text-orange-400">{row.points}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-gray-300">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-gray-300">{row.gf}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Match schedule */}
        {showSchedule && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-orange-400 uppercase tracking-widest">Schedule</h2>
            {tournamentMatches.filter((tm) => tm.phase === 'group').length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Schedule not yet generated.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {tournamentMatches
                  .filter((tm) => tm.phase === 'group')
                  .map((tm) => {
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
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {homeTeam?.name ?? 'TBD'}{' '}
                            <span className={isFinished ? 'text-orange-400' : 'text-gray-500'}>
                              {score}
                            </span>{' '}
                            {awayTeam?.name ?? 'TBD'}
                          </p>
                          {isFinished && (
                            <p className="text-xs text-gray-500 mt-0.5">Final</p>
                          )}
                        </div>
                        {tm.match_id && (
                          <Link
                            to={`/match/${tm.match_id}/view`}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-orange-400 hover:text-orange-400 transition-colors whitespace-nowrap"
                          >
                            {liveMatch?.status === 'running' ? 'Live →' : 'View →'}
                          </Link>
                        )}
                      </li>
                    )
                  })}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
