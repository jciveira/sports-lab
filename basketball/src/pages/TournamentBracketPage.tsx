import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Clock, Trophy, Medal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTournamentStore } from '../stores/useTournamentStore'
import { useTeamsStore } from '../stores/useTeamsStore'
import { BackButton } from '../components/BackButton'
import { formatMatchDate } from '../lib/matches'
import type { TournamentMatch, Match, Venue, Team } from '../types'

const ADMIN_SESSION_KEY = 'bbl_admin_auth'

const PHASE_LABELS: Record<TournamentMatch['phase'], string> = {
  group: 'Grupos',
  qf: 'Cuartos',
  sf: 'Semifinales',
  final: 'Final',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function VenueChip({ venue }: { venue: Venue }) {
  if (venue.address) {
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] text-bbl-accent hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[120px]">{venue.name}</span>
      </a>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-bbl-text-muted">
      <MapPin className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[120px]">{venue.name}</span>
    </span>
  )
}

function BracketSlot({
  tm,
  homeTeam,
  awayTeam,
  match,
  venue,
  isAdmin,
  advancingId,
  onAdvance,
}: {
  tm: TournamentMatch
  homeTeam: Team | undefined
  awayTeam: Team | undefined
  match: Match | undefined
  venue: Venue | undefined
  isAdmin: boolean
  advancingId: string | null
  onAdvance: (tmId: string, teamId: string) => void
}) {
  const homeName = homeTeam?.name ?? (tm.home_team_id ? '?' : 'TBD')
  const awayName = awayTeam?.name ?? (tm.away_team_id ? '?' : 'TBD')
  const isFinished = match?.status === 'finished'
  const isNotPlayed = match?.not_played ?? false

  const homeScore = isFinished && !isNotPlayed ? String(match!.home_score) : '–'
  const awayScore = isFinished && !isNotPlayed ? String(match!.away_score) : '–'

  const homeWins = isFinished && !isNotPlayed && match!.home_score > match!.away_score
  const awayWins = isFinished && !isNotPlayed && match!.away_score > match!.home_score

  const formattedDate = tm.home_team_id && tm.away_team_id && match?.scheduled_at
    ? formatMatchDate(match.scheduled_at)
    : null

  const canAdvance = isAdmin && isFinished && !isNotPlayed && tm.home_team_id && tm.away_team_id

  return (
    <div className={`flex flex-col gap-1 min-w-[160px] ${isNotPlayed ? 'opacity-50' : ''}`}>
      {/* Home row */}
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-t-lg border border-bbl-border ${
          homeWins ? 'bg-bbl-accent/10 border-bbl-accent/50' : 'bg-bbl-surface'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {homeTeam?.badge_url && (
            <img src={homeTeam.badge_url} alt="" className="w-4 h-4 object-contain rounded-sm shrink-0" />
          )}
          <span
            className={`text-sm font-semibold truncate max-w-[90px] ${
              homeWins ? 'text-bbl-accent' : isNotPlayed ? 'text-bbl-text-muted line-through' : 'text-bbl-text'
            }`}
          >
            {homeName}
          </span>
        </div>
        <span className={`text-sm font-bold tabular-nums shrink-0 ${homeWins ? 'text-bbl-accent' : 'text-bbl-text'}`}>
          {homeScore}
        </span>
      </div>

      {/* Away row */}
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-b-lg border border-t-0 border-bbl-border ${
          awayWins ? 'bg-bbl-accent/10 border-bbl-accent/50' : 'bg-bbl-surface/50'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {awayTeam?.badge_url && (
            <img src={awayTeam.badge_url} alt="" className="w-4 h-4 object-contain rounded-sm shrink-0" />
          )}
          <span
            className={`text-sm font-semibold truncate max-w-[90px] ${
              awayWins ? 'text-bbl-accent' : isNotPlayed ? 'text-bbl-text-muted line-through' : 'text-bbl-text-muted'
            }`}
          >
            {awayName}
          </span>
        </div>
        <span className={`text-sm font-bold tabular-nums shrink-0 ${awayWins ? 'text-bbl-accent' : 'text-bbl-text-muted'}`}>
          {awayScore}
        </span>
      </div>

      {/* Date + venue chips */}
      {formattedDate && (
        <div className="flex items-center gap-1 px-1">
          <Clock className="w-3 h-3 shrink-0 text-bbl-accent" />
          <span className="text-[10px] text-bbl-accent">{formattedDate}</span>
        </div>
      )}
      {venue && !isNotPlayed && (
        <div className="px-1">
          <VenueChip venue={venue} />
        </div>
      )}

      {/* Admin advance buttons */}
      {canAdvance && (
        <div className="flex gap-1 mt-0.5">
          {[tm.home_team_id!, tm.away_team_id!].map((teamId) => {
            const tName = teamId === tm.home_team_id ? homeName : awayName
            return (
              <button
                key={teamId}
                disabled={advancingId === tm.id}
                onClick={() => onAdvance(tm.id, teamId)}
                className="flex-1 px-2 py-1 rounded-lg bg-bbl-accent/10 border border-bbl-accent/40 text-bbl-accent text-xs font-semibold truncate disabled:opacity-40 active:scale-95 transition-transform min-h-8"
              >
                {advancingId === tm.id ? '…' : `Ganador: ${tName}`}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PodiumRow({
  position,
  team,
}: {
  position: number
  team: Team | undefined
}) {
  if (!team) return null
  const colors: Record<number, string> = { 1: 'text-yellow-400', 2: 'text-gray-300', 3: 'text-amber-600' }
  const color = colors[position] ?? 'text-bbl-text-muted'
  return (
    <div className="flex items-center gap-3 px-2">
      <span className={`${color}`}>
        {position === 1 ? <Trophy className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
      </span>
      <span className={`text-sm font-bold ${color}`}>{position}</span>
      {team.badge_url && (
        <img src={team.badge_url} alt="" className="w-5 h-5 object-contain rounded-sm shrink-0" />
      )}
      <span className="text-sm font-medium text-bbl-text">{team.name}</span>
    </div>
  )
}

export function TournamentBracketPage() {
  const { id } = useParams<{ id: string }>()
  const loadTournament = useTournamentStore((s) => s.loadTournament)
  const fetchVenues = useTournamentStore((s) => s.fetchVenues)
  const currentTournament = useTournamentStore((s) => s.currentTournament)
  const tournamentMatches = useTournamentStore((s) => s.tournamentMatches)
  const venues = useTournamentStore((s) => s.venues)
  const advanceWinner = useTournamentStore((s) => s.advanceWinner)
  const loading = useTournamentStore((s) => s.loading)
  const error = useTournamentStore((s) => s.error)

  const teams = useTeamsStore((s) => s.teams)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  const isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  const [advancingId, setAdvancingId] = useState<string | null>(null)
  const [linkedMatches, setLinkedMatches] = useState<Map<string, Match>>(new Map())

  useEffect(() => {
    if (!id) return
    void loadTournament(id)
    void fetchTeams()
    void fetchVenues(id)
  }, [id, loadTournament, fetchTeams, fetchVenues])

  // Fetch actual match records for tournament matches that have a match_id
  useEffect(() => {
    const matchIds = tournamentMatches.map((tm) => tm.match_id).filter((mid): mid is string => mid != null)
    if (matchIds.length === 0) return
    void db
      .from('matches')
      .select('*')
      .in('id', matchIds)
      .then(({ data }: { data: Match[] | null }) => {
        if (!data) return
        setLinkedMatches(new Map(data.map((m) => [m.id, m])))
      })
  }, [tournamentMatches])

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

  function getTeam(teamId: string | null): Team | undefined {
    if (!teamId) return undefined
    return teams.find((t) => t.id === teamId)
  }

  // Determine podium from the final match
  const finalTm = knockoutMatches.find((tm) => tm.phase === 'final')
  const finalMatch = finalTm?.match_id ? linkedMatches.get(finalTm.match_id) : undefined
  const showPodium =
    finalMatch?.status === 'finished' &&
    !finalMatch.not_played &&
    finalTm?.home_team_id &&
    finalTm?.away_team_id

  const goldTeamId = showPodium
    ? finalMatch!.home_score > finalMatch!.away_score
      ? finalTm!.home_team_id
      : finalTm!.away_team_id
    : null
  const silverTeamId = showPodium
    ? goldTeamId === finalTm!.home_team_id
      ? finalTm!.away_team_id
      : finalTm!.home_team_id
    : null

  async function handleAdvance(tmId: string, teamId: string) {
    setAdvancingId(tmId)
    await advanceWinner(tmId, teamId)
    await loadTournament(id!)
    setAdvancingId(null)
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
          <>
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
                          const match = tm.match_id ? linkedMatches.get(tm.match_id) : undefined
                          const venue = venues.find((v) => v.id === match?.venue_id)
                          return (
                            <BracketSlot
                              key={tm.id}
                              tm={tm}
                              homeTeam={getTeam(tm.home_team_id)}
                              awayTeam={getTeam(tm.away_team_id)}
                              match={match}
                              venue={venue}
                              isAdmin={isAdmin}
                              advancingId={advancingId}
                              onAdvance={handleAdvance}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {showPodium && (
              <div className="max-w-2xl mx-auto w-full">
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-bbl-surface border border-bbl-accent">
                  <span className="text-xs text-bbl-text-muted uppercase text-center tracking-widest">Podio</span>
                  <PodiumRow position={1} team={getTeam(goldTeamId)} />
                  <PodiumRow position={2} team={getTeam(silverTeamId)} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
