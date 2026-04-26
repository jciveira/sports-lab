import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Trophy, Loader2, MapPin, Lock } from 'lucide-react'
import { useTournamentStore } from '../hooks/useTournamentStore'
import { calculateStandings, getKnockoutWinner } from '../lib/tournament-utils'
import { formatMatchDate, sortByStartsAt } from '../lib/matches'
import { TeamLogo } from '../components/ui/TeamPicker'
import type { DbMatch, DbTeam, DbVenue } from '../lib/database.types'
import type { MatchResult, StandingsRow } from '../lib/tournament-utils'

export function ViewerTournamentPage() {
  const { id } = useParams<{ id: string }>()
  const { tournament, categories, matches, teamsMap, venues, loading, error, fetchTournament } = useTournamentStore()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (id) fetchTournament(id)
  }, [id, fetchTournament])

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories, activeCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-hbl-bg">
        <Loader2 className="w-6 h-6 animate-spin text-hbl-accent" />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-4">
        <p className="text-hbl-clock">{error ?? 'Torneo no encontrado'}</p>
        <Link to="/torneos" className="text-hbl-accent text-sm">Volver a torneos</Link>
      </div>
    )
  }

  const activeCat = categories.find((c) => c.id === activeCategory)
  const catMatches = matches.filter((m) => m.tournament_category_id === activeCategory && !m.not_played)

  const finalMatch = catMatches.find((m) => m.phase === 'final')
  const thirdPlaceMatch = catMatches.find((m) => m.phase === 'third_place')
  const semiMatches = catMatches.filter((m) => m.phase === 'semi')
  const quarterMatches = catMatches.filter((m) => m.phase === 'quarter')
  const hasKnockouts = finalMatch || thirdPlaceMatch || semiMatches.length > 0 || quarterMatches.length > 0

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-4 gap-4">
      <Link to="/torneos" className="absolute top-4 left-4 text-hbl-text-muted hover:text-hbl-text transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      {/* Header */}
      <div className="flex flex-col items-center gap-1 pt-2">
        <Trophy className="w-6 h-6 text-hbl-accent" />
        <h1 className="text-2xl font-bold text-hbl-accent">{tournament.name}</h1>
        {tournament.date && (
          <p className="text-xs text-hbl-text-muted">{new Date(tournament.date + 'T00:00:00').toLocaleDateString()}</p>
        )}
        {tournament.status === 'finished' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-hbl-surface border border-hbl-border text-xs text-hbl-text-muted">
            <Lock className="w-3 h-3" />
            Finalizado
          </span>
        )}
      </div>

      {/* Category tabs — hidden when only one category */}
      {categories.length > 1 && (
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                cat.id === activeCategory
                  ? 'bg-hbl-accent text-hbl-bg'
                  : 'bg-hbl-surface border border-hbl-border text-hbl-text-muted hover:border-hbl-accent'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Venues section — hidden when no venues */}
      {venues.length > 0 && <ViewerVenuesSection venues={venues} />}

      {/* Knockout phases in reverse order: Final → 3rd → Semis → Quarters */}
      {hasKnockouts && (
        <div className="w-full max-w-lg flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-hbl-text-muted">Fase de eliminación</h3>

          {(finalMatch || thirdPlaceMatch) && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-hbl-text-muted uppercase">Final</span>
              {finalMatch && <ReadOnlyKnockoutRow match={finalMatch} teamsMap={teamsMap} label="Final" venue={venues.find((v) => v.id === finalMatch.venue_id)} />}
              {thirdPlaceMatch && <ReadOnlyKnockoutRow match={thirdPlaceMatch} teamsMap={teamsMap} label="3er puesto" venue={venues.find((v) => v.id === thirdPlaceMatch.venue_id)} />}
            </div>
          )}

          {semiMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-hbl-text-muted uppercase">Semifinales</span>
              {sortByStartsAt(semiMatches).map((match, i) => (
                <ReadOnlyKnockoutRow key={match.id} match={match} teamsMap={teamsMap} label={`Semi ${i + 1}`} venue={venues.find((v) => v.id === match.venue_id)} />
              ))}
            </div>
          )}

          {quarterMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-hbl-text-muted uppercase">Cuartos de final</span>
              {sortByStartsAt(quarterMatches).map((match, i) => (
                <ReadOnlyKnockoutRow key={match.id} match={match} teamsMap={teamsMap} label={`CF ${i + 1}`} venue={venues.find((v) => v.id === match.venue_id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Group standings + matches */}
      {activeCat && sortDominicosFirst(activeCat.groups, (g) =>
        g.teamIds.some((id) => isDominicos(teamsMap.get(id)?.name ?? ''))
      ).map((group) => {
        const grpMatches = catMatches.filter((m) => m.tournament_group_id === group.id)
        const finishedResults: MatchResult[] = grpMatches
          .filter((m) => m.status === 'finished')
          .map(toResult)
        const standings = calculateStandings(group.teamIds, finishedResults)

        return (
          <div key={group.id} className="w-full max-w-lg flex flex-col gap-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-hbl-text-muted">
              Grupo {group.label}
            </h3>

            <StandingsTable standings={standings} teamsMap={teamsMap} />

            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Partidos</span>
              {sortByStartsAt(grpMatches).map((match) => (
                <ReadOnlyMatchRow key={match.id} match={match} teamsMap={teamsMap} venue={venues.find((v) => v.id === match.venue_id)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function isDominicos(name: string): boolean {
  return name.toLowerCase().includes('dominicos')
}

function sortDominicosFirst<T>(items: T[], hasDominicos: (item: T) => boolean): T[] {
  return [...items].sort((a, b) => (hasDominicos(a) ? 0 : 1) - (hasDominicos(b) ? 0 : 1))
}

function toResult(m: DbMatch): MatchResult {
  return { homeTeamId: m.home_team_id, awayTeamId: m.away_team_id, homeScore: m.home_score, awayScore: m.away_score }
}

function StandingsTable({ standings, teamsMap }: { standings: StandingsRow[]; teamsMap: Map<string, DbTeam> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-hbl-text-muted uppercase">
            <th className="text-left py-1 px-2">#</th>
            <th className="text-left py-1 px-2">Equipo</th>
            <th className="text-center py-1 px-1">P</th>
            <th className="text-center py-1 px-1">G</th>
            <th className="text-center py-1 px-1">E</th>
            <th className="text-center py-1 px-1">P</th>
            <th className="text-center py-1 px-1">GF</th>
            <th className="text-center py-1 px-1">GC</th>
            <th className="text-center py-1 px-1">DG</th>
            <th className="text-center py-1 px-1 text-hbl-accent">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const team = teamsMap.get(row.teamId)
            const isQualifying = i < 2
            return (
              <tr key={row.teamId} className={`border-t border-hbl-border ${isQualifying ? 'bg-hbl-accent/5' : ''}`}>
                <td className="py-2 px-2 text-hbl-text-muted">{i + 1}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo url={team?.badge_url} size={18} />
                    <span className="truncate max-w-[120px]">{team?.name ?? row.teamId}</span>
                  </div>
                </td>
                <td className="text-center py-2 px-1">{row.played}</td>
                <td className="text-center py-2 px-1">{row.won}</td>
                <td className="text-center py-2 px-1">{row.drawn}</td>
                <td className="text-center py-2 px-1">{row.lost}</td>
                <td className="text-center py-2 px-1">{row.goalsFor}</td>
                <td className="text-center py-2 px-1">{row.goalsAgainst}</td>
                <td className="text-center py-2 px-1">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="text-center py-2 px-1 font-bold text-hbl-accent">{row.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VenueChip({ venue }: { venue: DbVenue }) {
  if (venue.address) {
    const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] text-hbl-accent hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[120px]">{venue.name}</span>
      </a>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-hbl-text-muted">
      <MapPin className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[120px]">{venue.name}</span>
    </span>
  )
}

function ReadOnlyMatchRow({ match, teamsMap, venue }: { match: DbMatch; teamsMap: Map<string, DbTeam>; venue?: DbVenue }) {
  const homeTeam = teamsMap.get(match.home_team_id)
  const awayTeam = teamsMap.get(match.away_team_id)
  const isFinished = match.status === 'finished'
  const formattedDate = formatMatchDate(match.starts_at)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm w-full">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <TeamLogo url={homeTeam?.badge_url} size={16} />
            <span className="truncate max-w-[80px]">{homeTeam?.name ?? '?'}</span>
          </div>
          <span className={`font-mono text-base font-bold min-w-[60px] text-center ${isFinished ? 'text-hbl-score' : 'text-hbl-text-muted'}`}>
            {isFinished ? `${match.home_score} - ${match.away_score}` : 'vs'}
          </span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="truncate max-w-[80px] text-right">{awayTeam?.name ?? '?'}</span>
            <TeamLogo url={awayTeam?.badge_url} size={16} />
          </div>
        </div>
        {formattedDate && (
          <span className="flex items-center gap-1 text-[10px] text-hbl-accent">
            <Clock className="w-3 h-3" />{formattedDate}
          </span>
        )}
      </div>
      {venue && (
        <div className="px-3">
          <VenueChip venue={venue} />
        </div>
      )}
    </div>
  )
}

function ViewerVenuesSection({ venues }: { venues: DbVenue[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full max-w-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-hbl-text-muted hover:text-hbl-accent transition-colors"
      >
        <MapPin className="w-3.5 h-3.5" />
        Sedes ({venues.length})
      </button>

      {open && (
        <div className="flex flex-col gap-2 mt-2">
          {venues.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border">
              <MapPin className="w-3.5 h-3.5 text-hbl-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{v.name}</p>
                {v.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-hbl-accent hover:underline"
                  >
                    {v.address}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReadOnlyKnockoutRow({ match, teamsMap, label, venue }: { match: DbMatch; teamsMap: Map<string, DbTeam>; label: string; venue?: DbVenue }) {
  const homeTeam = teamsMap.get(match.home_team_id)
  const awayTeam = teamsMap.get(match.away_team_id)
  const isFinished = match.status === 'finished'
  const winner = getKnockoutWinner(match)
  const hasPenalties = match.penalty_home_score != null && match.penalty_away_score != null
  const formattedDate = formatMatchDate(match.starts_at)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-hbl-surface border border-hbl-border text-sm w-full">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-hbl-text-muted w-12 shrink-0">{label}</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <TeamLogo url={homeTeam?.badge_url} size={16} />
            <span className={`truncate max-w-[80px] ${winner === match.home_team_id ? 'font-bold text-hbl-accent' : ''}`}>
              {homeTeam?.name ?? '?'}
            </span>
          </div>
          <div className="flex flex-col items-center min-w-[70px]">
            <span className={`font-mono text-base font-bold ${isFinished ? 'text-hbl-score' : 'text-hbl-text-muted'}`}>
              {isFinished ? `${match.home_score} - ${match.away_score}` : 'vs'}
            </span>
            {hasPenalties && (
              <span className="text-[10px] text-hbl-warning">
                pen: {match.penalty_home_score} - {match.penalty_away_score}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className={`truncate max-w-[80px] text-right ${winner === match.away_team_id ? 'font-bold text-hbl-accent' : ''}`}>
              {awayTeam?.name ?? '?'}
            </span>
            <TeamLogo url={awayTeam?.badge_url} size={16} />
          </div>
        </div>
        {formattedDate && (
          <span className="flex items-center gap-1 text-[10px] text-hbl-accent">
            <Clock className="w-3 h-3" />{formattedDate}
          </span>
        )}
      </div>
      {venue && (
        <div className="px-3">
          <VenueChip venue={venue} />
        </div>
      )}
    </div>
  )
}
