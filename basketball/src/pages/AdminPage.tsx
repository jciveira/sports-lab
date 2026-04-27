import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useTeamsStore } from '../stores/useTeamsStore'
import { useMatchesStore, type MatchWithDuration } from '../stores/useMatchesStore'
import type { Team, Match } from '../types'

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
      </div>
    </div>
  )
}
