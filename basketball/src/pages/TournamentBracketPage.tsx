import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTournamentStore } from '../stores/useTournamentStore'
import { useTeamsStore } from '../stores/useTeamsStore'
import type { TournamentMatch } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<TournamentMatch['phase'], string> = {
  group: 'Group',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final: 'Final',
}

// ─── BracketSlot ─────────────────────────────────────────────────────────────

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
  void tm // used implicitly
  return (
    <div className="flex flex-col gap-0.5 min-w-[140px]">
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-t-lg border border-gray-700 ${
          isWinner ? 'bg-orange-400/10 border-orange-400/50' : 'bg-gray-900'
        }`}
      >
        <span
          className={`text-sm font-semibold truncate max-w-[90px] ${
            isWinner ? 'text-orange-400' : 'text-gray-200'
          }`}
        >
          {teamName}
        </span>
        <span className="text-sm font-bold tabular-nums text-gray-200 shrink-0">{score}</span>
      </div>
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-b-lg border border-t-0 border-gray-700 ${
          !isWinner && opponentName !== 'TBD' ? 'bg-gray-900/50' : 'bg-gray-900'
        }`}
      >
        <span className="text-sm font-semibold truncate max-w-[90px] text-gray-400">
          {opponentName}
        </span>
        <span className="text-sm font-bold tabular-nums text-gray-400 shrink-0">{opponentScore}</span>
      </div>
    </div>
  )
}

// ─── TournamentBracketPage ───────────────────────────────────────────────────

export function TournamentBracketPage() {
  const { id } = useParams<{ id: string }>()
  const loadTournament = useTournamentStore((s) => s.loadTournament)
  const currentTournament = useTournamentStore((s) => s.currentTournament)
  const tournamentMatches = useTournamentStore((s) => s.tournamentMatches)
  const loading = useTournamentStore((s) => s.loading)
  const error = useTournamentStore((s) => s.error)

  const teams = useTeamsStore((s) => s.teams)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  useEffect(() => {
    if (!id) return
    void loadTournament(id)
    void fetchTeams()
  }, [id, loadTournament, fetchTeams])

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

  // Get only knockout matches
  const knockoutPhases: TournamentMatch['phase'][] = ['qf', 'sf', 'final']
  const knockoutMatches = tournamentMatches.filter((tm) => knockoutPhases.includes(tm.phase))

  // Group by phase in order
  const roundOrder: TournamentMatch['phase'][] = ['qf', 'sf', 'final']
  const roundsPresent = roundOrder.filter((phase) =>
    knockoutMatches.some((tm) => tm.phase === phase),
  )

  function teamName(teamId: string | null): string {
    if (!teamId) return 'TBD'
    return teams.find((t) => t.id === teamId)?.name ?? 'TBD'
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto w-full flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Link
              to={`/tournament/${currentTournament.id}`}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              ← {currentTournament.name}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-orange-400">Knockout Bracket</h1>
        </div>

        {knockoutMatches.length === 0 ? (
          <div className="max-w-2xl mx-auto w-full">
            <p className="text-sm text-gray-500 text-center py-8">
              Knockout draw not yet generated.
            </p>
          </div>
        ) : (
          /* Horizontally scrollable bracket */
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max px-4">
              {roundsPresent.map((phase) => {
                const roundMatches = knockoutMatches
                  .filter((tm) => tm.phase === phase)
                  .sort((a, b) => a.match_slot - b.match_slot)

                return (
                  <div key={phase} className="flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-400 text-center mb-2">
                      {PHASE_LABELS[phase]}
                    </p>
                    <div className="flex flex-col gap-6 justify-around flex-1">
                      {roundMatches.map((tm) => {
                        const home = teamName(tm.home_team_id)
                        const away = teamName(tm.away_team_id)

                        // We don't have match score here unless match_id is linked
                        // For now show "–" as placeholder score when no match_id
                        const homeScore = '–'
                        const awayScore = '–'
                        const isHomeWinner = false
                        const isAwayWinner = false
                        void isAwayWinner

                        return (
                          <BracketSlot
                            key={tm.id}
                            tm={tm}
                            teamName={home}
                            opponentName={away}
                            score={homeScore}
                            opponentScore={awayScore}
                            isWinner={isHomeWinner}
                          />
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
