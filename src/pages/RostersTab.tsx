import { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Users, Shield, ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useTeamsStore } from '../hooks/useTeamsStore'
import { usePlayersStore } from '../hooks/usePlayersStore'
import { computeMedia } from '../lib/ratings'
import { getPlayerAvatarUrl } from '../lib/players'
import { TEAM_REGIONS } from '../lib/database.types'
import type { DbTeam } from '../lib/database.types'

function PlayerAvatarThumb({ path, name }: { path: string | null; name: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPlayerAvatarUrl(path).then((url) => { if (!cancelled) setSrc(url) })
    return () => { cancelled = true }
  }, [path])

  if (src) {
    return <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
  }
  return (
    <div className="w-10 h-10 rounded-full bg-hbl-accent/10 flex items-center justify-center shrink-0">
      <Shield className="w-5 h-5 text-hbl-accent opacity-40" />
    </div>
  )
}

type View = 'teams' | 'roster'

export function RostersTab() {
  const { teams, loading: teamsLoading, fetch: fetchTeams } = useTeamsStore()
  const { players, loading: playersLoading, fetch: fetchPlayers } = usePlayersStore()

  const [view, setView] = useState<View>('teams')
  const [selectedTeam, setSelectedTeam] = useState<DbTeam | null>(null)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  const autoExpandDone = useRef(false)

  useEffect(() => {
    fetchTeams()
    fetchPlayers()
  }, [fetchTeams, fetchPlayers])

  const loading = teamsLoading || playersLoading

  // Auto-expand the region with the most teams on first load
  useEffect(() => {
    if (autoExpandDone.current || loading || teams.length === 0) return
    autoExpandDone.current = true
    const counts = new Map<string, number>()
    for (const t of teams) {
      if (t.region) counts.set(t.region, (counts.get(t.region) ?? 0) + 1)
    }
    let max = 0
    let topRegion = ''
    for (const [r, count] of counts) {
      if (count > max) { max = count; topRegion = r }
    }
    if (topRegion) setExpandedRegions(new Set([topRegion]))
  }, [loading, teams])

  const regionGroups = useMemo(() => {
    const map = new Map<string, DbTeam[]>()
    for (const team of teams) {
      if (!team.region) continue
      const arr = map.get(team.region) ?? []
      arr.push(team)
      map.set(team.region, arr)
    }
    return TEAM_REGIONS.filter((r) => map.has(r)).map((r) => ({ region: r, teams: map.get(r)! }))
  }, [teams])

  function toggleRegion(region: string) {
    setExpandedRegions((prev) => {
      const next = new Set(prev)
      if (next.has(region)) next.delete(region)
      else next.add(region)
      return next
    })
  }

  function selectTeam(team: DbTeam) {
    setSelectedTeam(team)
    setView('roster')
  }

  function goBack() {
    setView('teams')
    setSelectedTeam(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <p className="text-sm text-hbl-text-muted">Cargando...</p>
      </div>
    )
  }

  // ── Roster view ──────────────────────────────────────────────────────────
  if (view === 'roster' && selectedTeam) {
    const rosterPlayers = players
      .filter((p) => p.team_id === selectedTeam.id)
      .sort((a, b) => a.number - b.number)

    return (
      <div className="flex flex-col min-h-[60dvh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button
            onClick={goBack}
            aria-label="Volver a equipos"
            className="p-1.5 -ml-1.5 rounded-lg text-hbl-text-muted hover:text-hbl-text transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            {selectedTeam.badge_url ? (
              <img
                src={selectedTeam.badge_url}
                alt={selectedTeam.name}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-hbl-accent/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-hbl-accent opacity-50" />
              </div>
            )}
            <h1 className="text-lg font-bold text-hbl-text truncate">{selectedTeam.name}</h1>
          </div>
        </div>

        {/* Roster list */}
        {rosterPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
            <Users className="w-10 h-10 text-hbl-accent opacity-30" />
            <p className="text-sm text-hbl-text-muted">Sin jugadores en este equipo</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-4 pb-6">
            {rosterPlayers.map((player) => {
              const media = computeMedia(player.ratings)
              return (
                <Link
                  key={player.id}
                  to={`/player/${player.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border hover:border-hbl-accent/40 transition-colors"
                >
                  {/* Avatar */}
                  <PlayerAvatarThumb path={player.avatar_url} name={player.display_name} />

                  {/* Name + number */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-hbl-text truncate">{player.display_name}</p>
                    <p className="text-xs text-hbl-text-muted">#{player.number}</p>
                  </div>

                  {/* Overall rating */}
                  {media !== null && (
                    <span className="text-lg font-black text-hbl-accent shrink-0">{media}</span>
                  )}

                  <ChevronRight className="w-4 h-4 text-hbl-text-muted shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Team grid view ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[60dvh]">
      <h1 className="text-lg font-bold text-hbl-text px-4 pt-5 pb-4">Plantillas</h1>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
          <Users className="w-10 h-10 text-hbl-accent opacity-30" />
          <p className="text-sm text-hbl-text-muted">No hay equipos</p>
        </div>
      ) : (
        <div className="flex flex-col px-4 pb-6">
          {regionGroups.map(({ region, teams: regionTeams }) => (
            <div key={region}>
              <button
                onClick={() => toggleRegion(region)}
                aria-expanded={expandedRegions.has(region)}
                className="flex items-center gap-2 w-full py-3 text-sm font-semibold text-hbl-text hover:text-hbl-accent transition-colors"
              >
                {expandedRegions.has(region)
                  ? <ChevronDown className="w-4 h-4 shrink-0" />
                  : <ChevronRight className="w-4 h-4 shrink-0" />}
                <span>{region}</span>
                <span className="ml-auto text-xs text-hbl-text-muted font-normal">{regionTeams.length}</span>
              </button>

              {expandedRegions.has(region) && (
                <div className="grid grid-cols-2 gap-3 pb-3">
                  {regionTeams.map((team) => {
                    const playerCount = players.filter((p) => p.team_id === team.id).length
                    return (
                      <button
                        key={team.id}
                        onClick={() => selectTeam(team)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-hbl-surface border transition-colors text-center ${
                          playerCount > 0
                            ? 'border-hbl-border hover:border-hbl-accent/40 opacity-100'
                            : 'border-hbl-border/50 opacity-60'
                        }`}
                      >
                        {team.badge_url ? (
                          <img src={team.badge_url} alt={team.name} className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-hbl-accent/10 flex items-center justify-center">
                            <Shield className="w-7 h-7 text-hbl-accent opacity-40" />
                          </div>
                        )}
                        <p className="text-sm font-semibold text-hbl-text leading-tight line-clamp-2">{team.name}</p>
                        {(team.category || team.gender) && (
                          <p className="text-[10px] text-hbl-text-muted uppercase tracking-wide leading-tight">
                            {[team.category, team.gender].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <p className="text-[11px] text-hbl-accent font-medium">
                          {playerCount} {playerCount === 1 ? 'jugador' : 'jugadores'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
