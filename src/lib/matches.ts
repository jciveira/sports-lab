import { supabase } from './supabase'
import type { MatchConfig } from './rules'
import type { DbMatch, DbMatchEvent, DbTeam, TeamGender } from './database.types'
import type { MatchStatus } from '../types'

/** Create or find a team by name */
export async function findOrCreateTeam(name: string): Promise<DbTeam> {
  // Check if team already exists
  const { data: existing } = await supabase
    .from('teams')
    .select()
    .eq('name', name)
    .single()

  if (existing) return existing

  const { data, error } = await supabase
    .from('teams')
    .insert({ name })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Create a new match with the given config */
export async function createMatch(
  homeTeamId: string,
  awayTeamId: string,
  config: MatchConfig,
  tournamentId?: string,
  squads?: { home?: string[]; away?: string[] },
  startsAt?: string,
): Promise<DbMatch> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      tournament_id: tournamentId ?? null,
      config_halves: config.halves,
      config_half_duration_minutes: config.halfDurationMinutes,
      config_timeouts_per_half: config.timeoutsPerHalf,
      config_exclusion_duration_seconds: config.exclusionDurationSeconds,
      home_timeouts_left: config.timeoutsPerHalf,
      away_timeouts_left: config.timeoutsPerHalf,
      home_squad: squads?.home ?? null,
      away_squad: squads?.away ?? null,
      starts_at: startsAt ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Set or clear the scheduled start time for a match */
export async function updateMatchSchedule(matchId: string, startsAt: string | null): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ starts_at: startsAt })
    .eq('id', matchId)
  if (error) throw error
}

/** Format starts_at for display: "jue 02 abr · 09:30" */
export function formatMatchDate(startsAt: string | null | undefined): string | null {
  if (!startsAt) return null
  const d = new Date(startsAt)
  const day = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

/** Sort matches by starts_at asc, nulls last */
export function sortByStartsAt<T extends Pick<DbMatch, 'starts_at'>>(matches: T[]): T[] {
  return [...matches].sort((a, b) => {
    if (!a.starts_at && !b.starts_at) return 0
    if (!a.starts_at) return 1
    if (!b.starts_at) return -1
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  })
}

/** Convert a UTC ISO string to the value format expected by datetime-local inputs */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/** Fetch a match by ID */
export async function getMatch(matchId: string): Promise<DbMatch | null> {
  const { data, error } = await supabase
    .from('matches')
    .select()
    .eq('id', matchId)
    .single()

  if (error) return null
  return data
}

/** Fetch a match by operator access code (scorekeeper or stat_tracker) */
export async function getMatchByCode(code: string): Promise<{ match: DbMatch; role: 'scorekeeper' | 'stat_tracker' } | null> {
  // Check scorekeeper code
  const { data: skMatch } = await supabase
    .from('matches')
    .select()
    .eq('scorekeeper_code', code)
    .single()
  if (skMatch) return { match: skMatch, role: 'scorekeeper' }

  // Check stat tracker code
  const { data: stMatch } = await supabase
    .from('matches')
    .select()
    .eq('stat_tracker_code', code)
    .single()
  if (stMatch) return { match: stMatch, role: 'stat_tracker' }

  return null
}

/** Update match state (score, status, clock, half, timeouts) */
export async function updateMatchState(
  matchId: string,
  updates: Partial<Pick<DbMatch,
    'home_score' | 'away_score' | 'status' | 'current_half' | 'clock_seconds' |
    'home_timeouts_left' | 'away_timeouts_left' | 'started_at' | 'finished_at'
  >>,
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', matchId)

  if (error) throw error
}

/** Push a match event */
export async function pushMatchEvent(
  matchId: string,
  event: {
    type: string
    team_id?: string
    player_id?: string
    related_event_id?: string
    minute: number
    half: number
  },
): Promise<DbMatchEvent> {
  const { data, error } = await supabase
    .from('match_events')
    .insert({ match_id: matchId, ...event })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Get all events for a match */
export async function getMatchEvents(matchId: string): Promise<DbMatchEvent[]> {
  const { data, error } = await supabase
    .from('match_events')
    .select()
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Delete a match and its associated events */
export async function deleteMatch(matchId: string): Promise<void> {
  // Delete match_events first (FK constraint)
  const { error: eventsError } = await supabase
    .from('match_events')
    .delete()
    .eq('match_id', matchId)

  if (eventsError) throw eventsError

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)

  if (error) throw error
}

/** Activate a scheduled match — transitions to 'paused' (ready for scorekeeper) */
export async function activateMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ status: 'paused' as MatchStatus })
    .eq('id', matchId)
    .eq('status', 'scheduled')

  if (error) throw error
}

/** Finish a match from admin (safety net) — works from any status except already finished */
export async function finishMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ status: 'finished' as MatchStatus, finished_at: new Date().toISOString() })
    .eq('id', matchId)
    .neq('status', 'finished')

  if (error) throw error
}

/** Set final score and finish (Flow A: direct result entry, no scorekeeper) */
export async function setMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished' as MatchStatus,
      finished_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  if (error) throw error
}

/** Check and auto-activate matches whose starts_at is within 30 minutes */
export async function autoActivateMatches(): Promise<number> {
  const cutoff = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('matches')
    .update({ status: 'paused' as MatchStatus })
    .eq('status', 'scheduled')
    .not('starts_at', 'is', null)
    .lte('starts_at', cutoff)
    .select('id')

  if (error) throw error
  return data?.length ?? 0
}

/** List matches with optional status filter */
export async function listMatches(status?: MatchStatus): Promise<DbMatch[]> {
  let query = supabase.from('matches').select().order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}


/** Match with resolved team names/logos for display */
export interface MatchWithTeams extends DbMatch {
  homeTeamName: string
  awayTeamName: string
  homeTeamLogo: string | null
  awayTeamLogo: string | null
  gender: TeamGender | null
  tournamentName: string | null
}

/** Fetch all matches with team names resolved. Set includeAll to include tournament matches. */
export async function listMatchesWithTeams(includeAll = false): Promise<MatchWithTeams[]> {
  let query = supabase.from('matches').select().order('created_at', { ascending: false })
  if (!includeAll) query = query.is('tournament_id', null)
  const { data: matches, error } = await query

  if (error) throw error
  if (!matches || matches.length === 0) return []

  // Collect unique team IDs
  const teamIds = [...new Set(matches.flatMap((m) => [m.home_team_id, m.away_team_id]))]
  const { data: teams } = await supabase.from('teams').select().in('id', teamIds)
  const teamsMap = new Map((teams ?? []).map((t) => [t.id, t]))

  // Collect unique tournament IDs
  const tournamentIds = [...new Set(matches.map((m) => m.tournament_id).filter((id): id is string => id != null))]
  const tournamentsMap = new Map<string, string>()
  if (tournamentIds.length > 0) {
    const { data: tournaments } = await supabase.from('tournaments').select('id, name').in('id', tournamentIds)
    for (const t of tournaments ?? []) tournamentsMap.set(t.id, t.name)
  }

  return matches.map((m) => {
    const homeGender = teamsMap.get(m.home_team_id)?.gender ?? null
    const awayGender = teamsMap.get(m.away_team_id)?.gender ?? null
    const gender: TeamGender | null = homeGender === awayGender ? homeGender : null
    return {
      ...m,
      homeTeamName: teamsMap.get(m.home_team_id)?.name ?? 'Unknown',
      awayTeamName: teamsMap.get(m.away_team_id)?.name ?? 'Unknown',
      homeTeamLogo: teamsMap.get(m.home_team_id)?.badge_url ?? null,
      awayTeamLogo: teamsMap.get(m.away_team_id)?.badge_url ?? null,
      gender,
      tournamentName: m.tournament_id ? (tournamentsMap.get(m.tournament_id) ?? null) : null,
    }
  })
}
