import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { Trophy, Loader2, Trash2, MapPin, Plus, Pencil, Check, X, Clock, EyeOff, Eye, Lock, LockOpen } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { formatMatchDate, sortByStartsAt, toDatetimeLocal } from '../lib/matches'
import { useTournamentStore } from '../hooks/useTournamentStore'
import { calculateStandings, generateNGroupKnockoutPairings, getKnockoutWinner, getKnockoutLoser } from '../lib/tournament-utils'
import { TeamLogo } from '../components/ui/TeamPicker'
import { ManualScoreEntry } from '../components/tournament/ManualScoreEntry'
import { BracketView } from '../components/tournament/BracketView'
import type { DbMatch, DbTeam, DbVenue } from '../lib/database.types'
import type { MatchResult, StandingsRow } from '../lib/tournament-utils'

export function TournamentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state } = useLocation()
  const isAdmin = !!(state as { isAdmin?: boolean } | null)?.isAdmin
  const { tournament, categories, matches, teamsMap, venues, loading, error, fetchTournament, generateKnockouts, generateFinals, deleteTournament, closeTournament, reopenTournament, addVenue, editVenue, removeVenue, assignVenue, updateSchedule, markNotPlayed } = useTournamentStore()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

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
        <p className="text-hbl-text-muted">Cargando torneo...</p>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-4">
        <p className="text-hbl-clock">{error ?? 'Torneo no encontrado'}</p>
        <Link to="/" className="text-hbl-accent text-sm">Volver al inicio</Link>
      </div>
    )
  }

  const activeCat = categories.find((c) => c.id === activeCategory)
  const catMatches = matches.filter((m) => m.tournament_category_id === activeCategory)
  const knockoutMatches = catMatches.filter((m) => m.phase === 'quarter' || m.phase === 'semi' || m.phase === 'third_place' || m.phase === 'final')
  const sortedKnockoutMatches = sortByStartsAt(knockoutMatches)
  const hasKnockouts = knockoutMatches.length > 0

  // Check if all group matches are done for this category
  const groupMatches = catMatches.filter((m) => m.phase === 'group')
  const allGroupsDone = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'finished')

  // Compute standings per group for bracket generation
  let canGenerateKnockouts = false
  let allGroupStandings: StandingsRow[][] = []

  if (activeCat && allGroupsDone && !hasKnockouts) {
    allGroupStandings = activeCat.groups.map((group) => {
      const grpMatches = catMatches.filter((m) => m.tournament_group_id === group.id && m.status === 'finished')
      return calculateStandings(group.teamIds, grpMatches.map(toResult))
    })
    canGenerateKnockouts = allGroupStandings.length >= 2
  }

  // Check if both semis are done but no final/3rd place exists yet
  const semiMatches = catMatches.filter((m) => m.phase === 'semi')
  const allSemisDone = semiMatches.length === 2 && semiMatches.every((m) => m.status === 'finished')
  const hasFinals = catMatches.some((m) => m.phase === 'final' || m.phase === 'third_place')
  const canGenerateFinals = allSemisDone && !hasFinals && semiMatches.every((m) => getKnockoutWinner(m) !== null)

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-4 gap-4">
      <BackButton to="/" />

      {/* Delete button — top right */}
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="absolute top-4 right-4 text-hbl-text-muted hover:text-red-400 transition-colors"
        aria-label="Eliminar torneo"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-hbl-bg border border-hbl-border p-5 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-red-400 text-center">Eliminar torneo</h2>
            <p className="text-sm text-hbl-text-muted text-center">
              Se eliminarán todos los partidos, categorías y grupos de <strong className="text-hbl-text">{tournament.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-hbl-text-muted hover:text-hbl-text"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await deleteTournament(tournament.id)
                    navigate('/tournaments')
                  } catch {
                    setDeleting(false)
                    setShowDeleteConfirm(false)
                  }
                }}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-500 text-white font-bold text-sm disabled:opacity-60 active:scale-95 transition-transform"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {isAdmin && (
          <button
            onClick={async () => {
              setTogglingStatus(true)
              try {
                if (tournament.status === 'finished') {
                  await reopenTournament(tournament.id)
                } else {
                  await closeTournament(tournament.id)
                }
              } finally {
                setTogglingStatus(false)
              }
            }}
            disabled={togglingStatus}
            className="flex items-center gap-1.5 mt-1 px-3 py-1 rounded-lg text-xs text-hbl-text-muted hover:text-hbl-text border border-hbl-border hover:border-hbl-accent/40 transition-colors disabled:opacity-50"
            aria-label={tournament.status === 'finished' ? 'Reabrir torneo' : 'Cerrar torneo'}
          >
            {tournament.status === 'finished' ? (
              <><LockOpen className="w-3 h-3" />Reabrir</>
            ) : (
              <><Lock className="w-3 h-3" />Cerrar torneo</>
            )}
          </button>
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

      {/* Venues section — admin only */}
      {isAdmin && (
        <VenuesSection
          venues={venues}
          matches={matches}
          onAdd={addVenue}
          onEdit={editVenue}
          onDelete={removeVenue}
        />
      )}

      {/* Group standings + matches */}
      {activeCat && [...activeCat.groups].sort((a, b) => {
        const aDom = a.teamIds.some((id) => isDominicos(teamsMap.get(id)?.name ?? '')) ? 0 : 1
        const bDom = b.teamIds.some((id) => isDominicos(teamsMap.get(id)?.name ?? '')) ? 0 : 1
        return aDom - bDom
      }).map((group) => {
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
                <MatchRow key={match.id} match={match} teamsMap={teamsMap} isAdmin={isAdmin} venues={venues} onAssignVenue={assignVenue} onUpdateSchedule={updateSchedule} onMarkNotPlayed={markNotPlayed} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Generate Knockouts button */}
      {canGenerateKnockouts && activeCategory && (
        <GenerateKnockoutsButton
          categoryId={activeCategory}
          groupStandings={allGroupStandings}
          teamsMap={teamsMap}
          onGenerate={generateKnockouts}
        />
      )}

      {/* Generate Finals button */}
      {canGenerateFinals && activeCategory && (
        <GenerateFinalsButton
          categoryId={activeCategory}
          semiMatches={semiMatches}
          onGenerate={generateFinals}
        />
      )}

      {/* Knockout bracket */}
      {hasKnockouts && (
        <div className="w-full max-w-lg">
          <BracketView
            matches={sortedKnockoutMatches}
            teamsMap={teamsMap}
            isAdmin={isAdmin}
            venues={venues}
            onMarkNotPlayed={isAdmin ? markNotPlayed : undefined}
            onAssignVenue={isAdmin ? assignVenue : undefined}
            onUpdateSchedule={isAdmin ? updateSchedule : undefined}
          />
        </div>
      )}
    </div>
  )
}

function isDominicos(name: string): boolean {
  return name.toLowerCase().includes('dominicos')
}


function toResult(m: DbMatch): MatchResult {
  return { homeTeamId: m.home_team_id, awayTeamId: m.away_team_id, homeScore: m.home_score, awayScore: m.away_score }
}

function GenerateKnockoutsButton({ categoryId, groupStandings, teamsMap, onGenerate }: {
  categoryId: string
  groupStandings: StandingsRow[][]
  teamsMap: Map<string, DbTeam>
  onGenerate: (categoryId: string, pairings: { phase: string; matches: Array<{ homeTeamId: string; awayTeamId: string }> }) => Promise<void>
}) {
  const [generating, setGenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [editablePairings, setEditablePairings] = useState<Array<{ homeTeamId: string; awayTeamId: string }>>([])
  const [selectedSlot, setSelectedSlot] = useState<{ matchIndex: number; side: 'home' | 'away' } | null>(null)

  const result = generateNGroupKnockoutPairings(groupStandings)
  if (!result) return null

  const getTeamName = (id: string) => teamsMap.get(id)?.name ?? id
  const phaseLabel = result.phase === 'quarter' ? 'Cuartos de final' : 'Semifinales'
  const phaseSingularLabel = result.phase === 'quarter' ? 'Cuarto de final' : 'Semifinal'

  function openConfirm() {
    setEditablePairings(result!.pairings.map((p) => ({ ...p })))
    setSelectedSlot(null)
    setShowConfirm(true)
  }

  function handleSlotTap(matchIndex: number, side: 'home' | 'away') {
    if (!selectedSlot) {
      setSelectedSlot({ matchIndex, side })
      return
    }
    // Tapping the same slot again deselects
    if (selectedSlot.matchIndex === matchIndex && selectedSlot.side === side) {
      setSelectedSlot(null)
      return
    }
    // Swap the two team slots
    const newPairings = editablePairings.map((p) => ({ ...p }))
    const getTeamId = (mi: number, s: 'home' | 'away') =>
      s === 'home' ? newPairings[mi].homeTeamId : newPairings[mi].awayTeamId
    const setTeamId = (mi: number, s: 'home' | 'away', id: string) => {
      if (s === 'home') newPairings[mi].homeTeamId = id
      else newPairings[mi].awayTeamId = id
    }
    const aId = getTeamId(selectedSlot.matchIndex, selectedSlot.side)
    const bId = getTeamId(matchIndex, side)
    setTeamId(selectedSlot.matchIndex, selectedSlot.side, bId)
    setTeamId(matchIndex, side, aId)
    setEditablePairings(newPairings)
    setSelectedSlot(null)
  }

  async function handleConfirm() {
    setGenerating(true)
    try {
      await onGenerate(categoryId, { phase: result!.phase, matches: editablePairings })
      setShowConfirm(false)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <div className="w-full max-w-lg flex flex-col gap-3 p-4 rounded-xl bg-hbl-surface border border-hbl-accent">
        <h3 className="text-sm font-bold text-hbl-accent text-center">¡Todos los partidos de grupo completados!</h3>
        <p className="text-xs text-hbl-text-muted text-center">Listo para generar eliminatorias:</p>
        <div className="text-xs text-center space-y-1">
          {result.pairings.map((p, i) => (
            <p key={i}>
              {phaseSingularLabel} {i + 1}: <strong>{getTeamName(p.homeTeamId)}</strong> vs <strong>{getTeamName(p.awayTeamId)}</strong>
            </p>
          ))}
        </div>
        <button
          onClick={openConfirm}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold active:scale-95 transition-transform"
        >
          <Trophy className="w-4 h-4" />
          {`Generar ${phaseLabel}`}
        </button>
      </div>

      {showConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-pairings-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-hbl-bg border border-hbl-border p-5 flex flex-col gap-4">
            <h2 id="confirm-pairings-title" className="text-base font-bold text-hbl-accent text-center">Confirmar emparejamientos</h2>
            <p className="text-xs text-hbl-text-muted text-center">
              Toca un equipo para seleccionarlo, luego toca otro para intercambiarlos.
            </p>

            <div className="flex flex-col gap-3">
              {editablePairings.map((pairing, i) => {
                const homeSelected = selectedSlot?.matchIndex === i && selectedSlot?.side === 'home'
                const awaySelected = selectedSlot?.matchIndex === i && selectedSlot?.side === 'away'
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-hbl-text-muted text-center uppercase tracking-widest">
                      {phaseSingularLabel} {i + 1}
                    </span>
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => handleSlotTap(i, 'home')}
                        aria-label={`${getTeamName(pairing.homeTeamId)}${homeSelected ? ' (seleccionado)' : ''}`}
                        aria-pressed={homeSelected}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold text-center transition-all border-2 ${
                          homeSelected
                            ? 'border-hbl-accent bg-hbl-accent/15 text-hbl-accent'
                            : 'border-hbl-border bg-hbl-surface text-hbl-text hover:border-hbl-accent/60'
                        }`}
                      >
                        {getTeamName(pairing.homeTeamId)}
                      </button>
                      <span className="text-xs text-hbl-text-muted font-mono">vs</span>
                      <button
                        onClick={() => handleSlotTap(i, 'away')}
                        aria-label={`${getTeamName(pairing.awayTeamId)}${awaySelected ? ' (seleccionado)' : ''}`}
                        aria-pressed={awaySelected}
                        className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold text-center transition-all border-2 ${
                          awaySelected
                            ? 'border-hbl-accent bg-hbl-accent/15 text-hbl-accent'
                            : 'border-hbl-border bg-hbl-surface text-hbl-text hover:border-hbl-accent/60'
                        }`}
                      >
                        {getTeamName(pairing.awayTeamId)}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setShowConfirm(false); setSelectedSlot(null) }}
                disabled={generating}
                className="px-4 py-2 text-sm text-hbl-text-muted hover:text-hbl-text"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-hbl-accent text-hbl-bg font-bold text-sm disabled:opacity-60 active:scale-95 transition-transform"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                {generating ? 'Generando...' : 'Confirmar y generar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function GenerateFinalsButton({ categoryId, semiMatches, onGenerate }: {
  categoryId: string
  semiMatches: DbMatch[]
  onGenerate: (categoryId: string, semi1Winner: string, semi1Loser: string, semi2Winner: string, semi2Loser: string) => Promise<void>
}) {
  const [generating, setGenerating] = useState(false)

  const semi1 = semiMatches[0]
  const semi2 = semiMatches[1]
  const semi1Winner = getKnockoutWinner(semi1)
  const semi1Loser = getKnockoutLoser(semi1)
  const semi2Winner = getKnockoutWinner(semi2)
  const semi2Loser = getKnockoutLoser(semi2)

  if (!semi1Winner || !semi1Loser || !semi2Winner || !semi2Loser) return null

  async function handleGenerate() {
    setGenerating(true)
    try {
      await onGenerate(categoryId, semi1Winner!, semi1Loser!, semi2Winner!, semi2Loser!)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="w-full max-w-lg flex flex-col gap-3 p-4 rounded-xl bg-hbl-surface border border-hbl-accent">
      <h3 className="text-sm font-bold text-hbl-accent text-center">¡Ambas semifinales decididas!</h3>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold disabled:opacity-60 active:scale-95 transition-transform"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
        {generating ? 'Generando...' : 'Generar 3er puesto + Final'}
      </button>
    </div>
  )
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

function MatchRow({ match, teamsMap, isAdmin, venues, onAssignVenue, onUpdateSchedule, onMarkNotPlayed }: {
  match: DbMatch
  teamsMap: Map<string, DbTeam>
  isAdmin: boolean
  venues: DbVenue[]
  onAssignVenue: (matchId: string, venueId: string | null) => Promise<void>
  onUpdateSchedule: (matchId: string, startsAt: string | null) => Promise<void>
  onMarkNotPlayed: (matchId: string, notPlayed: boolean) => Promise<void>
}) {
  const recordScore = useTournamentStore((s) => s.recordScore)
  const homeTeam = teamsMap.get(match.home_team_id)
  const awayTeam = teamsMap.get(match.away_team_id)
  const isFinished = match.status === 'finished'
  const [editing, setEditing] = useState(false)
  const [editDate, setEditDate] = useState(false)
  const [dateValue, setDateValue] = useState(match.starts_at ? toDatetimeLocal(match.starts_at) : '')
  const [savingDate, setSavingDate] = useState(false)
  const formattedDate = formatMatchDate(match.starts_at)

  async function handleSaveDate() {
    setSavingDate(true)
    try {
      const iso = dateValue ? new Date(dateValue).toISOString() : null
      await onUpdateSchedule(match.id, iso)
      setEditDate(false)
    } finally { setSavingDate(false) }
  }

  if (editing) {
    return (
      <ManualScoreEntry
        homeTeamName={homeTeam?.name ?? 'Local'}
        awayTeamName={awayTeam?.name ?? 'Visitante'}
        initialHome={match.home_score ?? 0}
        initialAway={match.away_score ?? 0}
        onSubmit={async (homeScore, awayScore) => {
          await recordScore(match.id, homeScore, awayScore)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const isNotPlayed = match.not_played

  return (
    <div className={`flex flex-col gap-1 ${isNotPlayed ? 'opacity-50' : ''}`}>
      <div
        onClick={() => { if (!isFinished && isAdmin && !isNotPlayed) setEditing(true) }}
        className={`relative flex flex-col gap-1 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm w-full text-left ${
          !isFinished && isAdmin && !isNotPlayed ? 'hover:border-hbl-accent cursor-pointer' : isFinished ? 'opacity-80' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${isNotPlayed ? 'line-through' : ''}`}>
            <TeamLogo url={homeTeam?.badge_url} size={16} />
            <span className="truncate max-w-[80px]">{homeTeam?.name ?? '?'}</span>
          </div>
          <span className={`font-mono text-base font-bold min-w-[60px] text-center ${isFinished && !isNotPlayed ? 'text-hbl-score' : 'text-hbl-text-muted'}`}>
            {isFinished && !isNotPlayed ? `${match.home_score} - ${match.away_score}` : 'vs'}
          </span>
          <div className={`flex items-center gap-1.5 flex-1 min-w-0 justify-end ${isNotPlayed ? 'line-through' : ''}`}>
            <span className="truncate max-w-[80px] text-right">{awayTeam?.name ?? '?'}</span>
            <TeamLogo url={awayTeam?.badge_url} size={16} />
          </div>
          {isAdmin && isFinished && !isNotPlayed && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true) }}
              className="p-1 rounded text-hbl-text-muted hover:text-hbl-accent transition-colors"
              aria-label="Editar resultado"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
        {(formattedDate || (isAdmin && !editDate)) && (
          <div className="flex items-center gap-2">
            {formattedDate && (
              <span className="flex items-center gap-1 text-[10px] text-hbl-accent">
                <Clock className="w-3 h-3" />{formattedDate}
              </span>
            )}
            {isAdmin && !editDate && (
              <button
                onClick={(e) => { e.stopPropagation(); setEditDate(true) }}
                className="ml-auto p-1 rounded hover:bg-hbl-surface-light transition-colors"
                aria-label="Editar fecha y hora"
              >
                <Clock className="w-3 h-3 text-hbl-text-muted" />
              </button>
            )}
          </div>
        )}
      </div>
      {isAdmin && editDate && (
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
      {isAdmin && venues.length > 0 && (
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
      {isAdmin && (
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
      {!isNotPlayed && (() => {
        const venue = venues.find((v) => v.id === match.venue_id)
        return venue?.address ? <div className="px-1"><VenueChip venue={venue} /></div> : null
      })()}
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

function VenuesSection({ venues, matches, onAdd, onEdit, onDelete }: {
  venues: DbVenue[]
  matches: DbMatch[]
  onAdd: (name: string, address?: string) => Promise<void>
  onEdit: (id: string, name: string, address?: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addAddress, setAddAddress] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleAdd() {
    if (!addName.trim()) return
    setAdding(true)
    try {
      await onAdd(addName.trim(), addAddress.trim() || undefined)
      setAddName('')
      setAddAddress('')
    } finally {
      setAdding(false)
    }
  }

  function startEdit(v: DbVenue) {
    setEditingId(v.id)
    setEditName(v.name)
    setEditAddress(v.address ?? '')
    setDeleteError(null)
  }

  async function handleEdit() {
    if (!editingId || !editName.trim()) return
    setSaving(true)
    try {
      await onEdit(editingId, editName.trim(), editAddress.trim() || undefined)
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const inUse = matches.filter((m) => m.venue_id === id)
    if (inUse.length > 0) {
      setDeleteError(`Esta sede está asignada a ${inUse.length} partido${inUse.length > 1 ? 's' : ''}. Reasígnalos antes de eliminar.`)
      return
    }
    setDeleteError(null)
    await onDelete(id)
  }

  return (
    <div className="w-full max-w-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-hbl-text-muted hover:text-hbl-accent transition-colors w-full text-left"
      >
        <MapPin className="w-3.5 h-3.5" />
        Sedes ({venues.length})
      </button>

      {open && (
        <div className="flex flex-col gap-2 mt-2">
          {venues.length === 0 && (
            <p className="text-xs text-hbl-text-muted py-2">No hay sedes — añade una para etiquetar partidos con ubicaciones</p>
          )}

          {deleteError && (
            <p className="text-xs text-hbl-clock">{deleteError}</p>
          )}

          {venues.map((v) => (
            <div key={v.id} className="flex flex-col gap-1">
              {editingId === v.id ? (
                <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-accent">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre *"
                    className="w-full px-2 py-1 rounded bg-hbl-bg border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
                  />
                  <input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Dirección (opcional)"
                    className="w-full px-2 py-1 rounded bg-hbl-bg border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={saving}
                      className="p-1 text-hbl-text-muted hover:text-hbl-text"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleEdit}
                      disabled={saving || !editName.trim()}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-hbl-accent text-hbl-bg text-xs font-medium disabled:opacity-60"
                    >
                      <Check className="w-3 h-3" />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border">
                  <MapPin className="w-3.5 h-3.5 text-hbl-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.name}</p>
                    {v.address && <p className="text-xs text-hbl-text-muted truncate">{v.address}</p>}
                  </div>
                  <button onClick={() => startEdit(v)} aria-label={`Editar ${v.name}`} className="p-1 text-hbl-text-muted hover:text-hbl-accent transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(v.id)} aria-label={`Eliminar ${v.name}`} className="p-1 text-hbl-text-muted hover:text-hbl-clock transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add new venue */}
          <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border">
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Nombre de la sede *"
              className="w-full px-2 py-1 rounded bg-hbl-bg border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
            />
            <input
              value={addAddress}
              onChange={(e) => setAddAddress(e.target.value)}
              placeholder="Dirección (opcional)"
              className="w-full px-2 py-1 rounded bg-hbl-bg border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !addName.trim()}
              className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg bg-hbl-accent text-hbl-bg text-xs font-medium disabled:opacity-60 active:scale-95 transition-transform"
            >
              {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {adding ? 'Añadiendo...' : 'Añadir sede'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
