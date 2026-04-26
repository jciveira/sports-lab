import { useState } from 'react'
import { Trophy, Medal, Pencil, AlertTriangle, Check, X, Clock, MapPin, EyeOff, Eye } from 'lucide-react'
import { TeamLogo } from '../ui/TeamPicker'
import { ManualScoreEntry } from './ManualScoreEntry'
import { PenaltyShootout } from './PenaltyShootout'
import { getKnockoutWinner } from '../../lib/tournament-utils'
import { useTournamentStore } from '../../hooks/useTournamentStore'
import { formatMatchDate, toDatetimeLocal } from '../../lib/matches'
import type { DbMatch, DbTeam, DbVenue } from '../../lib/database.types'

const PHASE_ORDER: Record<string, number> = {
  quarter: 0,
  semi: 1,
  third_place: 2,
  final: 2,
}

interface BracketViewProps {
  matches: DbMatch[]
  teamsMap: Map<string, DbTeam>
  isAdmin?: boolean
  venues?: DbVenue[]
  onMarkNotPlayed?: (matchId: string, notPlayed: boolean) => void
  onAssignVenue?: (matchId: string, venueId: string | null) => Promise<void>
  onUpdateSchedule?: (matchId: string, startsAt: string | null) => Promise<void>
}

export function BracketView({ matches, teamsMap, isAdmin = false, venues = [], onMarkNotPlayed, onAssignVenue, onUpdateSchedule }: BracketViewProps) {
  const quarters = matches.filter((m) => m.phase === 'quarter')
  const semis = matches.filter((m) => m.phase === 'semi')
  const thirdPlace = matches.find((m) => m.phase === 'third_place')
  const final = matches.find((m) => m.phase === 'final')

  if (semis.length === 0 && quarters.length === 0) return null

  const finalWinner = final ? getKnockoutWinner(final) : null
  const thirdPlaceWinner = thirdPlace ? getKnockoutWinner(thirdPlace) : null

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="text-sm font-bold uppercase tracking-widest text-hbl-text-muted">Fase de eliminación</h3>

      {/* Final */}
      {final && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-hbl-text-muted uppercase">Final</span>
          <KnockoutMatchRow match={final} teamsMap={teamsMap} label="Final" isAdmin={isAdmin} allMatches={matches} venue={venues.find((v) => v.id === final.venue_id)} venues={venues} onMarkNotPlayed={onMarkNotPlayed} onAssignVenue={onAssignVenue} onUpdateSchedule={onUpdateSchedule} />
        </div>
      )}

      {/* 3rd Place */}
      {thirdPlace && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-hbl-text-muted uppercase">Tercer puesto</span>
          <KnockoutMatchRow match={thirdPlace} teamsMap={teamsMap} label="3er puesto" isAdmin={isAdmin} allMatches={matches} venue={venues.find((v) => v.id === thirdPlace.venue_id)} venues={venues} onMarkNotPlayed={onMarkNotPlayed} onAssignVenue={onAssignVenue} onUpdateSchedule={onUpdateSchedule} />
        </div>
      )}

      {/* Semifinals */}
      {semis.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-hbl-text-muted uppercase">Semifinales</span>
          {semis.map((match, i) => (
            <KnockoutMatchRow key={match.id} match={match} teamsMap={teamsMap} label={`Semi ${i + 1}`} isAdmin={isAdmin} allMatches={matches} venue={venues.find((v) => v.id === match.venue_id)} venues={venues} onMarkNotPlayed={onMarkNotPlayed} onAssignVenue={onAssignVenue} onUpdateSchedule={onUpdateSchedule} />
          ))}
        </div>
      )}

      {/* Quarterfinals */}
      {quarters.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-hbl-text-muted uppercase">Cuartos de final</span>
          {quarters.map((match, i) => (
            <KnockoutMatchRow key={match.id} match={match} teamsMap={teamsMap} label={`CF ${i + 1}`} isAdmin={isAdmin} allMatches={matches} venue={venues.find((v) => v.id === match.venue_id)} venues={venues} onMarkNotPlayed={onMarkNotPlayed} onAssignVenue={onAssignVenue} onUpdateSchedule={onUpdateSchedule} />
          ))}
        </div>
      )}

      {/* Podium */}
      {finalWinner && (
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-hbl-surface border border-hbl-accent">
          <span className="text-xs text-hbl-text-muted uppercase text-center">Podio</span>
          <PodiumRow position={1} teamId={finalWinner} teamsMap={teamsMap} />
          <PodiumRow
            position={2}
            teamId={final ? (finalWinner === final.home_team_id ? final.away_team_id : final.home_team_id) : null}
            teamsMap={teamsMap}
          />
          {thirdPlaceWinner && (
            <PodiumRow position={3} teamId={thirdPlaceWinner} teamsMap={teamsMap} />
          )}
        </div>
      )}
    </div>
  )
}

function PodiumRow({ position, teamId, teamsMap }: { position: number; teamId: string | null; teamsMap: Map<string, DbTeam> }) {
  if (!teamId) return null
  const team = teamsMap.get(teamId)
  const colors = { 1: 'text-yellow-400', 2: 'text-gray-300', 3: 'text-amber-600' }

  return (
    <div className="flex items-center gap-3 px-2">
      <span className={`text-lg font-bold ${colors[position as keyof typeof colors]}`}>
        {position === 1 ? <Trophy className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
      </span>
      <span className={`text-sm font-bold ${colors[position as keyof typeof colors]}`}>{position}</span>
      <TeamLogo url={team?.badge_url} size={20} />
      <span className="text-sm font-medium">{team?.name ?? teamId}</span>
    </div>
  )
}

function KnockoutMatchRow({
  match,
  teamsMap,
  label: _label,
  isAdmin = false,
  allMatches = [],
  venue,
  venues = [],
  onMarkNotPlayed,
  onAssignVenue,
  onUpdateSchedule,
}: {
  match: DbMatch
  teamsMap: Map<string, DbTeam>
  label: string
  isAdmin?: boolean
  allMatches?: DbMatch[]
  venue?: DbVenue
  venues?: DbVenue[]
  onMarkNotPlayed?: (matchId: string, notPlayed: boolean) => void
  onAssignVenue?: (matchId: string, venueId: string | null) => Promise<void>
  onUpdateSchedule?: (matchId: string, startsAt: string | null) => Promise<void>
}) {
  const recordScore = useTournamentStore((s) => s.recordScore)
  const recordPenalties = useTournamentStore((s) => s.recordPenalties)
  const homeTeam = teamsMap.get(match.home_team_id)
  const awayTeam = teamsMap.get(match.away_team_id)
  const isFinished = match.status === 'finished'
  const isNotPlayed = match.not_played
  const isTied = isFinished && match.home_score === match.away_score
  const hasPenalties = match.penalty_home_score != null && match.penalty_away_score != null
  const winner = getKnockoutWinner(match)
  const [editing, setEditing] = useState(false)
  const [showPenalties, setShowPenalties] = useState(false)
  const [showDownstreamWarning, setShowDownstreamWarning] = useState(false)
  const [editDate, setEditDate] = useState(false)
  const [dateValue, setDateValue] = useState(match.starts_at ? toDatetimeLocal(match.starts_at) : '')
  const [savingDate, setSavingDate] = useState(false)
  const needsPenalties = isTied && !hasPenalties && !isNotPlayed
  const formattedDate = formatMatchDate(match.starts_at)

  function hasDownstreamFinished(): boolean {
    const myOrder = PHASE_ORDER[match.phase ?? ''] ?? -1
    if (myOrder < 0) return false
    return allMatches.some(
      (m) =>
        m.tournament_category_id === match.tournament_category_id &&
        (PHASE_ORDER[m.phase ?? ''] ?? -1) > myOrder &&
        m.status === 'finished',
    )
  }

  async function handleSaveDate() {
    if (!onUpdateSchedule) return
    setSavingDate(true)
    try {
      const iso = dateValue ? new Date(dateValue).toISOString() : null
      await onUpdateSchedule(match.id, iso)
      setEditDate(false)
    } finally {
      setSavingDate(false)
    }
  }

  if (editing) {
    return (
      <ManualScoreEntry
        homeTeamName={homeTeam?.name ?? 'Local'}
        awayTeamName={awayTeam?.name ?? 'Visitante'}
        initialHome={match.home_score ?? 0}
        initialAway={match.away_score ?? 0}
        onSubmit={async (h, a) => {
          await recordScore(match.id, h, a)
          setEditing(false)
          if (hasDownstreamFinished()) setShowDownstreamWarning(true)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className={`flex flex-col gap-1 ${isNotPlayed ? 'opacity-50' : ''}`}>
      <div
        onClick={() => {
          if (!isFinished && !isNotPlayed) setEditing(true)
          else if (needsPenalties) setShowPenalties(true)
        }}
        className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg bg-hbl-surface border text-sm w-full ${
          needsPenalties ? 'border-hbl-warning cursor-pointer' : isFinished || isNotPlayed ? 'border-hbl-border' : 'border-hbl-border hover:border-hbl-accent cursor-pointer'
        }`}
      >
        <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${isNotPlayed ? 'line-through' : ''}`}>
          <TeamLogo url={homeTeam?.badge_url} size={16} />
          <span className={`truncate max-w-[80px] ${winner === match.home_team_id ? 'font-bold text-hbl-accent' : ''}`}>
            {homeTeam?.name ?? '?'}
          </span>
        </div>

        <div className="flex flex-col items-center min-w-[70px]">
          <span className={`font-mono text-base font-bold ${isFinished && !isNotPlayed ? 'text-hbl-score' : 'text-hbl-text-muted'}`}>
            {isFinished && !isNotPlayed ? `${match.home_score} - ${match.away_score}` : 'vs'}
          </span>
          {hasPenalties && (
            <span className="text-[10px] text-hbl-warning">
              pen: {match.penalty_home_score} - {match.penalty_away_score}
            </span>
          )}
          {needsPenalties && (
            <span className="text-[10px] text-hbl-warning animate-pulse">toca para penales</span>
          )}
        </div>

        <div className={`flex items-center gap-1.5 flex-1 min-w-0 justify-end ${isNotPlayed ? 'line-through' : ''}`}>
          <span className={`truncate max-w-[80px] text-right ${winner === match.away_team_id ? 'font-bold text-hbl-accent' : ''}`}>
            {awayTeam?.name ?? '?'}
          </span>
          <TeamLogo url={awayTeam?.badge_url} size={16} />
        </div>

        {isAdmin && isFinished && !isNotPlayed && (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true) }}
            className="absolute top-1.5 right-1.5 p-1 rounded text-hbl-text-muted hover:text-hbl-accent transition-colors"
            aria-label="Editar resultado"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Date row */}
      {(formattedDate || (isAdmin && onUpdateSchedule && !editDate)) && (
        <div className="flex items-center gap-2 px-1">
          {formattedDate && (
            <span className="flex items-center gap-1 text-[10px] text-hbl-accent">
              <Clock className="w-3 h-3" />{formattedDate}
            </span>
          )}
          {isAdmin && onUpdateSchedule && !editDate && (
            <button
              onClick={() => setEditDate(true)}
              className="ml-auto p-1 rounded hover:bg-hbl-surface-light transition-colors"
              aria-label="Editar fecha y hora"
            >
              <Clock className="w-3 h-3 text-hbl-text-muted" />
            </button>
          )}
        </div>
      )}

      {isAdmin && onUpdateSchedule && editDate && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="datetime-local"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded-lg bg-hbl-surface border border-hbl-accent text-xs text-hbl-text focus:outline-none"
          />
          <button onClick={handleSaveDate} disabled={savingDate} className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Guardar fecha">
            <Check className="w-3.5 h-3.5 text-hbl-accent" />
          </button>
          <button onClick={() => setEditDate(false)} className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Cancelar">
            <X className="w-3.5 h-3.5 text-hbl-text-muted" />
          </button>
        </div>
      )}

      {/* Venue select (admin editable) */}
      {isAdmin && onAssignVenue && venues.length > 0 && (
        <select
          value={match.venue_id ?? ''}
          onChange={(e) => onAssignVenue(match.id, e.target.value || null)}
          className="w-full px-2 py-1 rounded-lg bg-hbl-bg border border-hbl-border text-xs text-hbl-text-muted focus:outline-none focus:border-hbl-accent"
        >
          <option value="">Sin sede</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}

      {/* Venue chip (read-only, viewer or admin without onAssignVenue) */}
      {!isNotPlayed && venue?.address && !(isAdmin && onAssignVenue && venues.length > 0) && (
        <div className="px-1">
          <VenueChip venue={venue} />
        </div>
      )}

      {/* Downstream warning */}
      {showDownstreamWarning && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-hbl-warning/10 border border-hbl-warning/30 text-xs text-hbl-warning">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>El siguiente partido puede verse afectado — revísalo manualmente.</span>
        </div>
      )}

      {/* Not-played toggle */}
      {isAdmin && onMarkNotPlayed && (
        <button
          onClick={() => onMarkNotPlayed(match.id, !isNotPlayed)}
          className={`flex items-center gap-1.5 self-start px-2 py-1 rounded text-[10px] transition-colors ${
            isNotPlayed
              ? 'text-hbl-accent hover:text-hbl-text'
              : 'text-hbl-text-muted hover:text-hbl-clock'
          }`}
          aria-label={isNotPlayed ? 'Restaurar partido' : 'Marcar como no jugado'}
        >
          {isNotPlayed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {isNotPlayed ? 'Restaurar' : 'No jugado'}
        </button>
      )}

      {showPenalties && (
        <PenaltyShootout
          homeTeamName={homeTeam?.name ?? 'Local'}
          awayTeamName={awayTeam?.name ?? 'Visitante'}
          onSubmit={async (ph, pa) => {
            await recordPenalties(match.id, ph, pa)
            setShowPenalties(false)
          }}
          onCancel={() => setShowPenalties(false)}
        />
      )}
    </div>
  )
}

function VenueChip({ venue }: { venue: DbVenue }) {
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address!)}`
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
