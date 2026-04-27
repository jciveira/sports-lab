import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTeamsStore } from '../stores/useTeamsStore'
import { useMatchesStore, type MatchWithDuration } from '../stores/useMatchesStore'
import { usePlayersStore } from '../stores/usePlayersStore'
import { useTournamentStore } from '../stores/useTournamentStore'
import type { Team, Match, Tournament, PlayerPosition, PlayerAttributes } from '../types'

// ─── Position helpers ────────────────────────────────────────────────────────

const POSITION_LABELS: Record<PlayerPosition, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
}

const ATTR_LABELS: Record<keyof PlayerAttributes, string> = {
  tiro: 'TIRO',
  pase: 'PASE',
  defensa: 'DEFENSA',
  fisico: 'FÍSICO',
  stamina: 'STAMINA',
  vision: 'VISIÓN',
}

const ATTR_KEYS = ['tiro', 'pase', 'defensa', 'fisico', 'stamina', 'vision'] as const

// ─── helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: Match['status']) {
  const map: Record<Match['status'], { label: string; colour: string }> = {
    scheduled: { label: 'Scheduled', colour: 'text-blue-400' },
    running: { label: 'Live', colour: 'text-green-400' },
    paused: { label: 'Paused', colour: 'text-yellow-400' },
    quarter_break: { label: 'Quarter break', colour: 'text-yellow-400' },
    finished: { label: 'Finished', colour: 'text-gray-500' },
  }
  const { label, colour } = map[status] ?? { label: status, colour: 'text-gray-400' }
  return <span className={`text-xs font-bold uppercase ${colour}`}>{label}</span>
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-orange-400 hover:text-orange-400 transition-colors min-h-8 active:scale-95"
    >
      {copied ? 'Copied!' : 'Copy viewer URL'}
    </button>
  )
}

// ─── Roster section ──────────────────────────────────────────────────────────

function RosterSection({ teams }: { teams: Team[] }) {
  const players = usePlayersStore((s) => s.players)
  const playersLoading = usePlayersStore((s) => s.loading)
  const playersError = usePlayersStore((s) => s.error)
  const fetchPlayersForTeam = usePlayersStore((s) => s.fetchPlayersForTeam)
  const addPlayer = usePlayersStore((s) => s.addPlayer)
  const removePlayer = usePlayersStore((s) => s.removePlayer)
  const updatePlayerAttributes = usePlayersStore((s) => s.updatePlayerAttributes)

  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PlayerPosition>('PG')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Attribute editing state
  const [editingAttrsFor, setEditingAttrsFor] = useState<string | null>(null)
  const [attrValues, setAttrValues] = useState<Record<string, string>>({})
  const [attrSaving, setAttrSaving] = useState(false)

  // Removal confirmation
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedTeamId) {
      void fetchPlayersForTeam(selectedTeamId)
    } else {
      usePlayersStore.setState({ players: [] })
    }
  }, [selectedTeamId, fetchPlayersForTeam])

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeamId || !displayName.trim() || !number) return
    const jerseyNumber = parseInt(number, 10)
    if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      setLocalError('Jersey number must be between 1 and 99')
      return
    }
    setSubmitting(true)
    setLocalError(null)
    const result = await addPlayer(selectedTeamId, displayName.trim(), jerseyNumber, position)
    setSubmitting(false)
    if (result) {
      setDisplayName('')
      setNumber('')
      setPosition('PG')
    } else {
      setLocalError(playersError ?? 'Could not add player')
    }
  }

  function startEditAttrs(playerId: string) {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    const defaults = player.attributes ?? { tiro: 0, pase: 0, defensa: 0, fisico: 0, stamina: 0, vision: 0 }
    setAttrValues(Object.fromEntries(ATTR_KEYS.map((k) => [k, String(defaults[k])])))
    setEditingAttrsFor(playerId)
  }

  async function handleSaveAttrs(playerId: string) {
    const attrs: PlayerAttributes = {
      tiro: Math.min(99, Math.max(0, parseInt(attrValues.tiro ?? '0', 10) || 0)),
      pase: Math.min(99, Math.max(0, parseInt(attrValues.pase ?? '0', 10) || 0)),
      defensa: Math.min(99, Math.max(0, parseInt(attrValues.defensa ?? '0', 10) || 0)),
      fisico: Math.min(99, Math.max(0, parseInt(attrValues.fisico ?? '0', 10) || 0)),
      stamina: Math.min(99, Math.max(0, parseInt(attrValues.stamina ?? '0', 10) || 0)),
      vision: Math.min(99, Math.max(0, parseInt(attrValues.vision ?? '0', 10) || 0)),
    }
    setAttrSaving(true)
    await updatePlayerAttributes(playerId, attrs)
    setAttrSaving(false)
    setEditingAttrsFor(null)
  }

  async function handleRemove(playerId: string) {
    if (confirmRemoveId !== playerId) {
      setConfirmRemoveId(playerId)
      return
    }
    await removePlayer(playerId)
    setConfirmRemoveId(null)
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-orange-400 uppercase tracking-widest">Roster</h2>

      {/* Team selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 uppercase tracking-widest">Select team</label>
        <select
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-orange-400 min-h-12"
        >
          <option value="">— choose a team —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {selectedTeamId && (
        <>
          {/* Add player form */}
          <form onSubmit={handleAddPlayer} className="flex flex-col gap-3 p-4 rounded-2xl bg-gray-900 border border-gray-800">
            <p className="text-xs uppercase tracking-widest text-gray-400">Add player</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Nombre + inicial (e.g. Juan G.)"
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 min-h-12"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
                min={1}
                max={99}
                placeholder="# (1–99)"
                className="w-28 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 min-h-12"
              />
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-orange-400 min-h-12"
              >
                {(Object.entries(POSITION_LABELS) as [PlayerPosition, string][]).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
            {localError && <p className="text-sm text-red-400">{localError}</p>}
            <button
              type="submit"
              disabled={submitting || !displayName.trim() || !number}
              className="flex items-center justify-center px-6 py-3 rounded-xl bg-orange-400 text-gray-950 font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
            >
              {submitting ? 'Adding…' : 'Add player'}
            </button>
          </form>

          {/* Player list */}
          {playersLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading…</p>
          ) : players.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No players yet. Add the first one above.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {players.map((player) => (
                <li key={player.id} className="flex flex-col gap-2 p-3 rounded-xl bg-gray-900 border border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="text-orange-400 font-mono font-bold text-sm w-8 shrink-0">#{player.number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{player.display_name}</p>
                      <p className="text-xs text-gray-400">{POSITION_LABELS[player.position]}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEditAttrs(player.id)}
                        className="px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-orange-400 hover:text-orange-400 transition-colors min-h-8"
                      >
                        Attrs
                      </button>
                      <button
                        onClick={() => void handleRemove(player.id)}
                        className={`px-2 py-1 rounded-lg border text-xs transition-colors min-h-8 ${
                          confirmRemoveId === player.id
                            ? 'bg-red-950 border-red-700 text-red-400'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400'
                        }`}
                      >
                        {confirmRemoveId === player.id ? 'Confirm?' : 'Remove'}
                      </button>
                    </div>
                  </div>

                  {/* Inline attribute editor */}
                  {editingAttrsFor === player.id && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-gray-800">
                      <div className="grid grid-cols-2 gap-2">
                        {ATTR_KEYS.map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <label className="text-xs text-gray-400 uppercase w-16 shrink-0">{ATTR_LABELS[key]}</label>
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={attrValues[key] ?? '0'}
                              onChange={(e) => setAttrValues((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-orange-400"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleSaveAttrs(player.id)}
                          disabled={attrSaving}
                          className="flex-1 px-4 py-2 rounded-xl bg-orange-400 text-gray-950 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                        >
                          {attrSaving ? 'Saving…' : 'Save attributes'}
                        </button>
                        <button
                          onClick={() => setEditingAttrsFor(null)}
                          className="px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

// ─── Team list + form ────────────────────────────────────────────────────────

function TeamsSection({ teams, loading }: { teams: Team[]; loading: boolean }) {
  const createTeam = useTeamsStore((s) => s.createTeam)
  const storeError = useTeamsStore((s) => s.error)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [badgeUrl, setBadgeUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setLocalError(null)
    const result = await createTeam(name.trim(), nickname.trim() || undefined, badgeUrl.trim() || undefined)
    setSubmitting(false)
    if (result) {
      setName('')
      setNickname('')
      setBadgeUrl('')
    } else {
      setLocalError(storeError ?? 'Could not create team')
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-orange-400 uppercase tracking-widest">Teams</h2>

      {/* Create team form */}
      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 rounded-2xl bg-gray-900 border border-gray-800">
        <p className="text-xs uppercase tracking-widest text-gray-400">New team</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Team name *"
          className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 min-h-12"
        />
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nickname (optional)"
          className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 min-h-12"
        />
        <input
          type="url"
          value={badgeUrl}
          onChange={(e) => setBadgeUrl(e.target.value)}
          placeholder="Badge URL (optional)"
          className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 min-h-12"
        />
        {localError && <p className="text-sm text-red-400">{localError}</p>}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex items-center justify-center px-6 py-3 rounded-xl bg-orange-400 text-gray-950 font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Creating…' : 'Create team'}
        </button>
      </form>

      {/* Team list */}
      {loading ? (
        <p className="text-sm text-gray-500 text-center py-4">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No teams yet. Create your first team above.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {teams.map((team) => (
            <li key={team.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800">
              {team.badge_url && (
                <img src={team.badge_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{team.name}</p>
                {team.nickname && <p className="text-xs text-gray-400 truncate">{team.nickname}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Match list + form ───────────────────────────────────────────────────────

function MatchesSection({ matches, teams, loading }: { matches: MatchWithDuration[]; teams: Team[]; loading: boolean }) {
  const createMatch = useMatchesStore((s) => s.createMatch)
  const storeError = useMatchesStore((s) => s.error)
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [quarterDuration, setQuarterDuration] = useState<8 | 10>(8)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!homeTeamId || !awayTeamId) return
    if (homeTeamId === awayTeamId) {
      setLocalError('Home and away teams must be different')
      return
    }
    setSubmitting(true)
    setLocalError(null)
    const result = await createMatch(homeTeamId, awayTeamId, quarterDuration)
    setSubmitting(false)
    if (result) {
      setHomeTeamId('')
      setAwayTeamId('')
      setQuarterDuration(8)
    } else {
      setLocalError(storeError ?? 'Could not create match')
    }
  }

  const viewerBase = `${window.location.origin}/match`

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-orange-400 uppercase tracking-widest">Matches</h2>

      {/* Create match form */}
      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 rounded-2xl bg-gray-900 border border-gray-800">
        <p className="text-xs uppercase tracking-widest text-gray-400">New match</p>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Home team</label>
          <select
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-orange-400 min-h-12"
          >
            <option value="">Select home team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Away team</label>
          <select
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-orange-400 min-h-12"
          >
            <option value="">Select away team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Quarter duration</label>
          <select
            value={quarterDuration}
            onChange={(e) => setQuarterDuration(Number(e.target.value) as 8 | 10)}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-orange-400 min-h-12"
          >
            <option value={8}>8 minutes</option>
            <option value={10}>10 minutes</option>
          </select>
        </div>

        {localError && <p className="text-sm text-red-400">{localError}</p>}

        <button
          type="submit"
          disabled={submitting || !homeTeamId || !awayTeamId || teams.length < 2}
          className="flex items-center justify-center px-6 py-3 rounded-xl bg-orange-400 text-gray-950 font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Creating…' : 'Create match'}
        </button>

        {teams.length < 2 && (
          <p className="text-xs text-gray-500 text-center">Create at least 2 teams before scheduling a match.</p>
        )}
      </form>

      {/* Match list */}
      {loading ? (
        <p className="text-sm text-gray-500 text-center py-4">Loading…</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No matches yet. Create your first match above.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match) => {
            const home = teams.find((t) => t.id === match.home_team_id)
            const away = teams.find((t) => t.id === match.away_team_id)
            const viewerUrl = `${viewerBase}/${match.id}/view`
            return (
              <li key={match.id} className="flex flex-col gap-2 p-3 rounded-xl bg-gray-900 border border-gray-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">
                    {home?.name ?? 'Unknown'} vs {away?.name ?? 'Unknown'}
                  </p>
                  {statusBadge(match.status)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 font-mono truncate">/match/{match.id}/view</span>
                  <CopyButton url={viewerUrl} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ─── Tournament status badge ──────────────────────────────────────────────────

function tournamentStatusBadge(status: Tournament['status']) {
  const map: Record<Tournament['status'], { label: string; colour: string }> = {
    setup: { label: 'Setup', colour: 'text-blue-400' },
    group_phase: { label: 'Group Phase', colour: 'text-green-400' },
    knockout: { label: 'Knockout', colour: 'text-orange-400' },
    finished: { label: 'Finished', colour: 'text-gray-500' },
  }
  const { label, colour } = map[status] ?? { label: status, colour: 'text-gray-400' }
  return <span className={`text-xs font-bold uppercase ${colour}`}>{label}</span>
}

// ─── Tournament section ───────────────────────────────────────────────────────

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
      setLocalError(storeError ?? 'Could not create tournament')
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

  const allGroupFinished =
    currentTournament?.status === 'group_phase' &&
    tournamentMatches
      .filter((tm) => tm.tournament_id === expandedId && tm.phase === 'group')
      .every((tm) => !tm.match_id) === false
      ? false // If no match_id, not started yet so not all finished
      : false // Simplified: enable button when status is group_phase and admin clicks

  void allGroupFinished // suppress unused warning — we use a simpler heuristic below

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-orange-400 uppercase tracking-widest">Tournaments</h2>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 rounded-2xl bg-gray-900 border border-gray-800">
        <p className="text-xs uppercase tracking-widest text-gray-400">New tournament</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Tournament name *"
          className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 min-h-12"
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Number of teams</label>
          <select
            value={numTeams}
            onChange={(e) => setNumTeams(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-orange-400 min-h-12"
          >
            {[4, 6, 8, 10, 12, 16].map((n) => (
              <option key={n} value={n}>{n} teams</option>
            ))}
          </select>
        </div>
        {localError && <p className="text-sm text-red-400">{localError}</p>}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex items-center justify-center px-6 py-3 rounded-xl bg-orange-400 text-gray-950 font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Creating…' : 'Create tournament'}
        </button>
      </form>

      {/* Tournament list */}
      {loading && tournaments.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Loading…</p>
      ) : tournaments.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No tournaments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tournaments.map((t) => {
            const isExpanded = expandedId === t.id
            const isCurrent = currentTournament?.id === t.id
            const enrolled = isCurrent
              ? tournamentTeams.filter((tt) => tt.tournament_id === t.id)
              : []

            // Teams already enrolled
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
              <li key={t.id} className="flex flex-col rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {tournamentStatusBadge(t.status)}
                      <span className="text-xs text-gray-500">{t.num_teams} teams</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/tournament/${t.id}`}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-orange-400 hover:text-orange-400 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => void handleExpand(t)}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:border-orange-400 hover:text-orange-400 transition-colors"
                    >
                      {isExpanded ? 'Collapse' : 'Manage'}
                    </button>
                  </div>
                </div>

                {/* Expanded management panel */}
                {isExpanded && isCurrent && (
                  <div className="flex flex-col gap-3 px-3 pb-3 border-t border-gray-800 pt-3">
                    {/* Error */}
                    {storeError && (
                      <p className="text-sm text-red-400">{storeError}</p>
                    )}

                    {/* Enrolled teams */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Enrolled ({enrolledCount}/{currentTournament?.num_teams ?? '?'})
                      </p>
                      {enrolled.length === 0 ? (
                        <p className="text-xs text-gray-600">No teams enrolled yet.</p>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {enrolled.map((tt) => {
                            const team = teams.find((tm) => tm.id === tt.team_id)
                            return (
                              <li key={tt.id} className="text-sm text-gray-300 px-2 py-1 bg-gray-800 rounded-lg">
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
                          className="flex-1 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-orange-400 min-h-10"
                        >
                          <option value="">Add a team…</option>
                          {availableTeams.map((team) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => void handleAddTeam(t.id)}
                          disabled={!addTeamId || actionLoading}
                          className="px-4 py-2 rounded-xl bg-orange-400 text-gray-950 text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {/* Generate schedule */}
                    {canGenerateSchedule && (
                      <button
                        onClick={() => void handleGenerateSchedule(t.id)}
                        disabled={actionLoading}
                        className="flex items-center justify-center px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform"
                      >
                        {actionLoading ? 'Generating…' : 'Generate Group Schedule'}
                      </button>
                    )}

                    {/* Generate knockout draw */}
                    {canKnockout && (
                      <button
                        onClick={() => void handleKnockoutDraw(t.id)}
                        disabled={actionLoading}
                        className="flex items-center justify-center px-4 py-2 rounded-xl bg-orange-400 text-gray-950 text-sm font-bold min-h-10 disabled:opacity-40 active:scale-95 transition-transform"
                      >
                        {actionLoading ? 'Generating…' : 'Generate Knockout Draw'}
                      </button>
                    )}

                    {/* Bracket link */}
                    {(currentTournament?.status === 'knockout' || currentTournament?.status === 'finished') && (
                      <Link
                        to={`/tournament/${t.id}/bracket`}
                        className="flex items-center justify-center px-4 py-2 rounded-xl bg-gray-800 border border-orange-400 text-orange-400 text-sm font-bold min-h-10 active:scale-95 transition-transform"
                      >
                        View Bracket →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ─── Admin page ──────────────────────────────────────────────────────────────

export function AdminPage() {
  const navigate = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)

  const teams = useTeamsStore((s) => s.teams)
  const teamsLoading = useTeamsStore((s) => s.loading)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  const matches = useMatchesStore((s) => s.matches)
  const matchesLoading = useMatchesStore((s) => s.loading)
  const fetchMatches = useMatchesStore((s) => s.fetchMatches)

  useEffect(() => {
    async function checkAuth() {
      if (!isSupabaseConfigured) {
        setAuthChecked(true)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        navigate('/login')
        return
      }
      setAuthChecked(true)
      void fetchTeams()
      void fetchMatches()
    }
    void checkAuth()
  }, [navigate, fetchTeams, fetchMatches])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Checking auth…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">Admin</h1>
            <p className="text-xs text-gray-500 mt-0.5">BasketballLab</p>
          </div>
          {isSupabaseConfigured && (
            <button
              onClick={() => void handleSignOut()}
              className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors min-h-10 active:scale-95"
            >
              Sign out
            </button>
          )}
        </div>

        {!isSupabaseConfigured && (
          <div className="p-4 rounded-xl bg-yellow-950 border border-yellow-800 text-yellow-300 text-sm">
            Supabase is not configured. Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> to enable data persistence.
          </div>
        )}

        <TeamsSection teams={teams} loading={teamsLoading} />
        <MatchesSection matches={matches} teams={teams} loading={matchesLoading} />
        <RosterSection teams={teams} />
        <TournamentSection teams={teams} />
      </div>
    </div>
  )
}
