import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTournamentStore } from '../stores/useTournamentStore'
import { useTeamsStore } from '../stores/useTeamsStore'
import { BackButton } from '../components/BackButton'
import type { TournamentMatch } from '../types'

const ADMIN_SESSION_KEY = 'bbl_admin_auth'

const PHASE_LABELS: Record<TournamentMatch['phase'], string> = {
  group: 'Grupos',
  qf: 'Cuartos',
  sf: 'Semifinales',
  final: 'Final',
}

function BracketSlot({
  tm,
  teamName,
  opponentName,
  score,
  opponentScore,
  isWinner,
}: {
  tm: TournamentMatch
  teamName: string
  opponentName: string
  score: string
  opponentScore: string
  isWinner: boolean
}) {
  void tm
  return (
    <div className="flex flex-col gap-0.5 min-w-[140px]">
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-t-lg border border-bbl-border ${
          isWinner ? 'bg-bbl-accent/10 border-bbl-accent/50' : 'bg-bbl-surface'
        }`}
      >
        <span
          className={`text-sm font-semibold truncate max-w-[90px] ${
            isWinner ? 'text-bbl-accent' : 'text-bbl-text'
          }`}
        >
          {teamName}
        </span>
        <span className="text-sm font-bold tabular-nums text-bbl-text shrink-0">{score}</span>
      </div>
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-b-lg border border-t-0 border-bbl-border ${
          !isWinner && opponentName !== 'TBD' ? 'bg-bbl-surface/50' : 'bg-bbl-surface'
        }`}
      >
        <span className="text-sm font-semibold truncate max-w-[90px] text-bbl-text-muted">
          {opponentName}
        </span>
        <span className="text-sm font-bold tabular-nums text-bbl-text-muted shrink-0">{opponentScore}</span>
      </div>
    </div>
  )
}

export function TournamentBracketPage() {
  const { id } = useParams<{ id: string }>()
  const loadTournament = useTournamentStore((s) => s.loadTournament)
  const currentTournament = useTournamentStore((s) => s.currentTournament)
  const tournamentMatches = useTournamentStore((s) => s.tournamentMatches)
  const advanceWinner = useTournamentStore((s) => s.advanceWinner)
  const loading = useTournamentStore((s) => s.loading)
  const error = useTournamentStore((s) => s.error)

  const teams = useTeamsStore((s) => s.teams)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  const isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  const [advancingId, setAdvancingId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    void loadTournament(id)
    void fetchTeams()
  }, [id, loadTournament, fetchTeams])

  if (loading) {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex items-center justify-center">
        <BackButton />
        <div className="w-10 h-10 border-4 border-bbl-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !currentTournament) {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex items-center justify-center">
        <BackButton />
        <p className="text-bbl-clock text-lg">{error ?? 'Torneo no encontrado.'}</p>
      </div>
    )
  }

  const knockoutPhases: TournamentMatch['phase'][] = ['qf', 'sf', 'final']
  const knockoutMatches = tournamentMatches.filter((tm) => knockoutPhases.includes(tm.phase))

  const roundOrder: TournamentMatch['phase'][] = ['qf', 'sf', 'final']
  const roundsPresent = roundOrder.filter((phase) =>
    knockoutMatches.some((tm) => tm.phase === phase),
  )

  function teamName(teamId: string | null): string {
    if (!teamId) return 'TBD'
    return teams.find((t) => t.id === teamId)?.name ?? 'TBD'
  }

  return (
    <div className="relative min-h-screen bg-bbl-bg text-bbl-text">
      <BackButton to={`/tournament/${currentTournament.id}`} label={currentTournament.name} />
      <div className="px-4 py-8 flex flex-col gap-8">
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-1 pt-6">
          <h1 className="text-2xl font-bold text-bbl-accent">Cuadro eliminatorio</h1>
        </div>

        {knockoutMatches.length === 0 ? (
          <div className="max-w-2xl mx-auto w-full">
            <p className="text-sm text-bbl-text-muted text-center py-8">
              Cuadro no generado todavía.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max px-4">
              {roundsPresent.map((phase) => {
                const roundMatches = knockoutMatches
                  .filter((tm) => tm.phase === phase)
                  .sort((a, b) => a.match_slot - b.match_slot)

                return (
                  <div key={phase} className="flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-bbl-accent text-center mb-2">
                      {PHASE_LABELS[phase]}
                    </p>
                    <div className="flex flex-col gap-6 justify-around flex-1">
                      {roundMatches.map((tm) => {
                        const home = teamName(tm.home_team_id)
                        const away = teamName(tm.away_team_id)
                        const matchFinished = tm.match_id != null && tm.home_team_id != null && tm.away_team_id != null
                        return (
                          <div key={tm.id} className="flex flex-col gap-1">
                            <BracketSlot
                              tm={tm}
                              teamName={home}
                              opponentName={away}
                              score="–"
                              opponentScore="–"
                              isWinner={false}
                            />
                            {isAdmin && matchFinished && (
                              <div className="flex gap-1">
                                {[tm.home_team_id!, tm.away_team_id!].map((teamId) => (
                                  <button
                                    key={teamId}
                                    disabled={advancingId === tm.id}
                                    onClick={async () => {
                                      setAdvancingId(tm.id)
                                      await advanceWinner(tm.id, teamId)
                                      await loadTournament(id!)
                                      setAdvancingId(null)
                                    }}
                                    className="flex-1 px-2 py-1 rounded-lg bg-bbl-accent/10 border border-bbl-accent/40 text-bbl-accent text-xs font-semibold truncate disabled:opacity-40 active:scale-95 transition-transform min-h-8"
                                  >
                                    {advancingId === tm.id ? '…' : `Ganador: ${teamName(teamId)}`}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
