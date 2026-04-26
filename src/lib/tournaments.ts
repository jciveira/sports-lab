import { supabase } from './supabase'
import type {
  DbTournament,
  DbMatch,
} from './database.types'
import { generateRoundRobinFixtures } from './tournament-utils'
import { DEFAULT_CONFIG } from './rules'

/** Create a tournament with categories and groups, then generate fixtures */
export async function createTournament(params: {
  name: string
  date: string
  category?: string
  gender?: string
  categories: Array<{
    name: string
    groups: Array<{
      label: string
      teamIds: string[]
    }>
  }>
}): Promise<string> {
  // Count total teams across all categories/groups
  const totalTeams = params.categories.reduce(
    (sum, cat) => sum + cat.groups.reduce((gs, g) => gs + g.teamIds.length, 0),
    0,
  )

  // 1. Create tournament (unique constraint on lower(trim(name)))
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      name: params.name.trim(),
      date: params.date,
      num_teams: totalTeams,
      category: params.category ?? null,
      gender: params.gender ?? null,
    })
    .select()
    .single()
  if (tErr) {
    if (tErr.code === '23505') {
      throw new Error(`Ya existe un torneo con el nombre "${params.name.trim()}"`)
    }
    throw tErr
  }

  for (const cat of params.categories) {
    // 2. Create category
    const { data: category, error: cErr } = await supabase
      .from('tournament_categories')
      .insert({ tournament_id: tournament.id, name: cat.name })
      .select()
      .single()
    if (cErr) throw cErr

    for (const grp of cat.groups) {
      // 3. Create group
      const { data: group, error: gErr } = await supabase
        .from('tournament_groups')
        .insert({ category_id: category.id, label: grp.label })
        .select()
        .single()
      if (gErr) throw gErr

      // 4. Assign teams
      const teamInserts = grp.teamIds.map((teamId) => ({
        group_id: group.id,
        team_id: teamId,
      }))
      const { error: gtErr } = await supabase
        .from('tournament_group_teams')
        .insert(teamInserts)
      if (gtErr) throw gtErr

      // 5. Generate round-robin fixtures
      const fixtures = generateRoundRobinFixtures(grp.teamIds)
      const matchInserts = fixtures.map((f) => ({
        home_team_id: f.homeTeamId,
        away_team_id: f.awayTeamId,
        tournament_id: tournament.id,
        tournament_category_id: category.id,
        tournament_group_id: group.id,
        phase: 'group' as const,
        group_label: grp.label,
        source: 'manual' as const, // default to manual, switch to live when launched
        config_halves: DEFAULT_CONFIG.halves,
        config_half_duration_minutes: DEFAULT_CONFIG.halfDurationMinutes,
        config_timeouts_per_half: DEFAULT_CONFIG.timeoutsPerHalf,
        config_exclusion_duration_seconds: DEFAULT_CONFIG.exclusionDurationSeconds,
        home_timeouts_left: DEFAULT_CONFIG.timeoutsPerHalf,
        away_timeouts_left: DEFAULT_CONFIG.timeoutsPerHalf,
      }))
      const { error: mErr } = await supabase.from('matches').insert(matchInserts)
      if (mErr) throw mErr
    }
  }

  // Move tournament to group_stage
  await supabase.from('tournaments').update({ status: 'group_stage' }).eq('id', tournament.id)

  return tournament.id
}

/** Fetch a tournament with all nested data */
export async function getTournament(id: string) {
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select()
    .eq('id', id)
    .maybeSingle()
  if (tErr) throw tErr
  if (!tournament) return { tournament: null, categories: [], matches: [] }

  const { data: categories } = await supabase
    .from('tournament_categories')
    .select()
    .eq('tournament_id', id)
    .order('name')

  const { data: matches } = await supabase
    .from('matches')
    .select()
    .eq('tournament_id', id)
    .order('created_at')

  const categoryData = []
  for (const cat of categories ?? []) {
    const { data: groups } = await supabase
      .from('tournament_groups')
      .select()
      .eq('category_id', cat.id)
      .order('label')

    const groupData = []
    for (const grp of groups ?? []) {
      const { data: groupTeams } = await supabase
        .from('tournament_group_teams')
        .select()
        .eq('group_id', grp.id)

      groupData.push({
        ...grp,
        teamIds: (groupTeams ?? []).map((gt) => gt.team_id),
      })
    }

    categoryData.push({
      ...cat,
      groups: groupData,
    })
  }

  return {
    tournament: tournament as DbTournament,
    categories: categoryData,
    matches: (matches ?? []) as DbMatch[],
  }
}

/** List all tournaments */
export async function listTournaments(): Promise<DbTournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select()
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DbTournament[]
}

/** Update a match score manually (for manual entry) */
export async function recordManualScore(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished',
      source: 'manual',
      finished_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  if (error) throw error
}

/** Generate knockout matches for a category. Supports both 2-group semis and N-group brackets. */
export async function generateKnockoutMatches(
  tournamentId: string,
  categoryId: string,
  pairings: {
    phase: string
    matches: Array<{ homeTeamId: string; awayTeamId: string }>
  },
): Promise<void> {
  const baseMatch = {
    tournament_id: tournamentId,
    tournament_category_id: categoryId,
    tournament_group_id: null,
    group_label: null,
    source: 'manual' as const,
    config_halves: DEFAULT_CONFIG.halves,
    config_half_duration_minutes: DEFAULT_CONFIG.halfDurationMinutes,
    config_timeouts_per_half: DEFAULT_CONFIG.timeoutsPerHalf,
    config_exclusion_duration_seconds: DEFAULT_CONFIG.exclusionDurationSeconds,
    home_timeouts_left: DEFAULT_CONFIG.timeoutsPerHalf,
    away_timeouts_left: DEFAULT_CONFIG.timeoutsPerHalf,
  }

  const matchInserts = pairings.matches.map((p) => ({
    ...baseMatch,
    phase: pairings.phase,
    home_team_id: p.homeTeamId,
    away_team_id: p.awayTeamId,
  }))

  const { error } = await supabase.from('matches').insert(matchInserts)
  if (error) throw error
}

/** Generate 3rd place + final matches once both semis are decided */
export async function generateFinalMatches(
  tournamentId: string,
  categoryId: string,
  semi1Winner: string,
  semi1Loser: string,
  semi2Winner: string,
  semi2Loser: string,
): Promise<void> {
  const baseMatch = {
    tournament_id: tournamentId,
    tournament_category_id: categoryId,
    tournament_group_id: null,
    group_label: null,
    source: 'manual' as const,
    config_halves: DEFAULT_CONFIG.halves,
    config_half_duration_minutes: DEFAULT_CONFIG.halfDurationMinutes,
    config_timeouts_per_half: DEFAULT_CONFIG.timeoutsPerHalf,
    config_exclusion_duration_seconds: DEFAULT_CONFIG.exclusionDurationSeconds,
    home_timeouts_left: DEFAULT_CONFIG.timeoutsPerHalf,
    away_timeouts_left: DEFAULT_CONFIG.timeoutsPerHalf,
  }

  const { error } = await supabase.from('matches').insert([
    { ...baseMatch, phase: 'third_place', home_team_id: semi1Loser, away_team_id: semi2Loser },
    { ...baseMatch, phase: 'final', home_team_id: semi1Winner, away_team_id: semi2Winner },
  ])
  if (error) throw error
}

/** Record penalty shootout result for a knockout match */
export async function recordPenaltyResult(
  matchId: string,
  penaltyHomeScore: number,
  penaltyAwayScore: number,
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      penalty_home_score: penaltyHomeScore,
      penalty_away_score: penaltyAwayScore,
    })
    .eq('id', matchId)
  if (error) throw error
}

/** Update basic tournament attributes */
export async function updateTournament(
  id: string,
  updates: { name?: string; date?: string | null; category?: string | null; gender?: string | null },
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.date !== undefined) payload.date = updates.date || null
  if (updates.category !== undefined) payload.category = updates.category || null
  if (updates.gender !== undefined) payload.gender = updates.gender || null

  const { error } = await supabase.from('tournaments').update(payload).eq('id', id)
  if (error) {
    if (error.code === '23505') throw new Error('Ya existe un torneo con ese nombre')
    throw error
  }
}

/** Close or reopen a tournament by setting its status */
export async function setTournamentStatus(id: string, status: 'finished' | 'group_stage'): Promise<void> {
  const { error } = await supabase.from('tournaments').update({ status }).eq('id', id)
  if (error) throw error
}

/** Delete a tournament and all its associated data (cascades via FK) */
export async function deleteTournament(tournamentId: string): Promise<void> {
  // Delete matches first (FK to tournament is SET NULL, not CASCADE)
  const { error: mErr } = await supabase
    .from('matches')
    .delete()
    .eq('tournament_id', tournamentId)
  if (mErr) throw mErr

  // Tournament categories + groups cascade automatically
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)
  if (error) throw error
}

/** Mark a match as not played (hidden from public) or restore it */
export async function markMatchNotPlayed(matchId: string, notPlayed: boolean): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ not_played: notPlayed })
    .eq('id', matchId)
  if (error) throw error
}

/** Fetch all teams (for team picker during tournament creation) */
export async function getTeamsForIds(teamIds: string[]) {
  if (teamIds.length === 0) return []
  const { data, error } = await supabase
    .from('teams')
    .select()
    .in('id', teamIds)
  if (error) throw error
  return data ?? []
}

