import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Tournament, TournamentTeam, TournamentMatch, Team, Match } from '../types'

// Use untyped client access to avoid strict Database generic issues at insert time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ─── Standings ───────────────────────────────────────────────────────────────

export interface StandingRow {
  team: Team
  played: number
  wins: number
  losses: number
  points: number
  gf: number
  ga: number
  gd: number
}

export function computeStandings(
  teams: Team[],
  matches: Match[],
  tournamentTeams: TournamentTeam[],
): StandingRow[] {
  const enrolledIds = new Set(tournamentTeams.map((tt) => tt.team_id))
  const enrolledTeams = teams.filter((t) => enrolledIds.has(t.id))

  const rowMap = new Map<string, StandingRow>()
  for (const team of enrolledTeams) {
    rowMap.set(team.id, { team, played: 0, wins: 0, losses: 0, points: 0, gf: 0, ga: 0, gd: 0 })
  }

  for (const match of matches) {
    if (match.status !== 'finished') continue
    const home = rowMap.get(match.home_team_id)
    const away = rowMap.get(match.away_team_id)
    if (!home || !away) continue

    home.played += 1
    away.played += 1
    home.gf += match.home_score
    home.ga += match.away_score
    away.gf += match.away_score
    away.ga += match.home_score

    if (match.home_score > match.away_score) {
      home.wins += 1
      home.points += 2
      away.losses += 1
    } else {
      away.wins += 1
      away.points += 2
      home.losses += 1
    }
  }

  for (const row of rowMap.values()) {
    row.gd = row.gf - row.ga
  }

  const rows = Array.from(rowMap.values())
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })
  return rows
}

// ─── Round-robin schedule generator ─────────────────────────────────────────

/**
 * Classic round-robin "rotate" algorithm.
 * Returns pairs [homeIdx, awayIdx] referencing indices in `teamIds`.
 */
export function generateRoundRobinPairs(teamIds: string[]): Array<[string, string]> {
  const n = teamIds.length
  const ids = [...teamIds]
  // If odd, add a dummy bye
  const hasBye = n % 2 !== 0
  if (hasBye) ids.push('__bye__')

  const size = ids.length
  const rounds = size - 1
  const pairs: Array<[string, string]> = []

  const pinned = ids[0]
  const rotating = ids.slice(1)

  for (let r = 0; r < rounds; r++) {
    const round = [pinned, ...rotating]
    const half = size / 2
    for (let i = 0; i < half; i++) {
      const home = round[i]
      const away = round[size - 1 - i]
      if (home !== '__bye__' && away !== '__bye__') {
        pairs.push([home, away])
      }
    }
    // Rotate: last element goes to index 1
    rotating.unshift(rotating.pop()!)
  }

  return pairs
}

// ─── Knockout bracket helper ──────────────────────────────────────────────────

/**
 * Given N teams: if N <= 4 → SF + Final; if 5-8 → QF + SF + Final
 * Returns the rounds array in order: e.g. ['qf','sf','final'] or ['sf','final']
 */
export function bracketRounds(numTeams: number): Array<TournamentMatch['phase']> {
  if (numTeams <= 4) return ['sf', 'final']
  return ['qf', 'sf', 'final']
}

/**
 * Number of slots in each round given total teams.
 */
export function slotsPerRound(numTeams: number): Record<string, number> {
  if (numTeams <= 4) return { sf: 2, final: 1 }
  return { qf: 4, sf: 2, final: 1 }
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface TournamentState {
  tournaments: Tournament[]
  currentTournament: Tournament | null
  tournamentTeams: TournamentTeam[]
  tournamentMatches: TournamentMatch[]
  loading: boolean
  error: string | null

  fetchTournaments: () => Promise<void>
  createTournament: (name: string, numTeams: number) => Promise<Tournament | null>
  loadTournament: (id: string) => Promise<void>
  addTeamToTournament: (tournamentId: string, teamId: string) => Promise<boolean>
  generateGroupSchedule: (tournamentId: string) => Promise<boolean>
  generateKnockoutDraw: (tournamentId: string) => Promise<boolean>
  advanceWinner: (tournamentMatchId: string, winnerTeamId: string) => Promise<void>
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  currentTournament: null,
  tournamentTeams: [],
  tournamentMatches: [],
  loading: false,
  error: null,

  async fetchTournaments() {
    if (!isSupabaseConfigured) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await db
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message as string)
      set({ tournaments: (data as Tournament[]) ?? [] })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch tournaments' })
    } finally {
      set({ loading: false })
    }
  },

  async createTournament(name, numTeams) {
    if (!isSupabaseConfigured) return null
    set({ error: null })
    try {
      const { data, error } = await db
        .from('tournaments')
        .insert({
          name,
          format: 'group_knockout',
          num_teams: numTeams,
          status: 'setup',
          viewer_code: null,
        })
        .select()
        .single()
      if (error) throw new Error(error.message as string)
      const tournament = data as Tournament
      set({ tournaments: [tournament, ...get().tournaments] })
      return tournament
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create tournament' })
      return null
    }
  },

  async loadTournament(id) {
    if (!isSupabaseConfigured) return
    set({ loading: true, error: null })
    try {
      const [tRes, ttRes, tmRes] = await Promise.all([
        db.from('tournaments').select('*').eq('id', id).single(),
        db.from('tournament_teams').select('*').eq('tournament_id', id),
        db.from('tournament_matches').select('*').eq('tournament_id', id).order('round_index').order('match_slot'),
      ])
      if (tRes.error) throw new Error(tRes.error.message as string)
      if (ttRes.error) throw new Error(ttRes.error.message as string)
      if (tmRes.error) throw new Error(tmRes.error.message as string)
      set({
        currentTournament: tRes.data as Tournament,
        tournamentTeams: (ttRes.data as TournamentTeam[]) ?? [],
        tournamentMatches: (tmRes.data as TournamentMatch[]) ?? [],
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load tournament' })
    } finally {
      set({ loading: false })
    }
  },

  async addTeamToTournament(tournamentId, teamId) {
    if (!isSupabaseConfigured) return false
    set({ error: null })
    try {
      const { data, error } = await db
        .from('tournament_teams')
        .insert({ tournament_id: tournamentId, team_id: teamId, group_name: null })
        .select()
        .single()
      if (error) throw new Error(error.message as string)
      const entry = data as TournamentTeam
      set({ tournamentTeams: [...get().tournamentTeams, entry] })
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add team to tournament' })
      return false
    }
  },

  async generateGroupSchedule(tournamentId) {
    if (!isSupabaseConfigured) return false
    set({ error: null })
    try {
      const { tournamentTeams } = get()
      const teamIds = tournamentTeams
        .filter((tt) => tt.tournament_id === tournamentId)
        .map((tt) => tt.team_id)

      const pairs = generateRoundRobinPairs(teamIds)
      const inserts = pairs.map(([homeId, awayId], idx) => ({
        tournament_id: tournamentId,
        phase: 'group' as const,
        round_index: idx,
        match_slot: 0,
        home_team_id: homeId,
        away_team_id: awayId,
        match_id: null,
      }))

      const { data, error } = await db
        .from('tournament_matches')
        .insert(inserts)
        .select()
      if (error) throw new Error(error.message as string)

      // Update tournament status to group_phase
      const { error: upErr } = await db
        .from('tournaments')
        .update({ status: 'group_phase' })
        .eq('id', tournamentId)
      if (upErr) throw new Error(upErr.message as string)

      const newMatches = (data as TournamentMatch[]) ?? []
      set({
        tournamentMatches: [...get().tournamentMatches, ...newMatches],
        currentTournament: get().currentTournament
          ? { ...get().currentTournament!, status: 'group_phase' }
          : null,
        tournaments: get().tournaments.map((t) =>
          t.id === tournamentId ? { ...t, status: 'group_phase' } : t,
        ),
      })
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to generate group schedule' })
      return false
    }
  },

  async generateKnockoutDraw(tournamentId) {
    if (!isSupabaseConfigured) return false
    set({ error: null })
    try {
      const { tournamentTeams, tournamentMatches } = get()

      // We need standings — fetch the actual match results from matches table
      const groupTmIds = tournamentMatches
        .filter((tm) => tm.tournament_id === tournamentId && tm.phase === 'group' && tm.match_id)
        .map((tm) => tm.match_id!)

      let finishedMatches: Match[] = []
      if (groupTmIds.length > 0) {
        const { data: mData } = await db
          .from('matches')
          .select('*')
          .in('id', groupTmIds)
          .eq('status', 'finished')
        finishedMatches = (mData as Match[]) ?? []
      }

      const enrolled = tournamentTeams.filter((tt) => tt.tournament_id === tournamentId)
      const numTeams = enrolled.length

      // We need team objects to compute standings — fetch them
      const teamIds = enrolled.map((tt) => tt.team_id)
      const { data: teamsData } = await db.from('teams').select('*').in('id', teamIds)
      const teams = (teamsData as Team[]) ?? []

      const standings = computeStandings(teams, finishedMatches, enrolled)
      const rounds = bracketRounds(numTeams)
      const slots = slotsPerRound(numTeams)

      const inserts: Array<{
        tournament_id: string
        phase: TournamentMatch['phase']
        round_index: number
        match_slot: number
        home_team_id: string | null
        away_team_id: string | null
        match_id: null
      }> = []

      rounds.forEach((phase, roundIdx) => {
        const count = slots[phase] ?? 0
        for (let slot = 0; slot < count; slot++) {
          // For the first round, seed teams from standings
          let homeId: string | null = null
          let awayId: string | null = null
          if (roundIdx === 0) {
            // Seed: 1 vs last, 2 vs second-last, etc.
            const topIdx = slot
            const botIdx = standings.length - 1 - slot
            homeId = standings[topIdx]?.team.id ?? null
            awayId = standings[botIdx]?.team.id ?? null
          }
          inserts.push({
            tournament_id: tournamentId,
            phase,
            round_index: roundIdx,
            match_slot: slot,
            home_team_id: homeId,
            away_team_id: awayId,
            match_id: null,
          })
        }
      })

      const { data, error } = await db
        .from('tournament_matches')
        .insert(inserts)
        .select()
      if (error) throw new Error(error.message as string)

      // Update tournament status to knockout
      const { error: upErr } = await db
        .from('tournaments')
        .update({ status: 'knockout' })
        .eq('id', tournamentId)
      if (upErr) throw new Error(upErr.message as string)

      const newMatches = (data as TournamentMatch[]) ?? []
      set({
        tournamentMatches: [...get().tournamentMatches, ...newMatches],
        currentTournament: get().currentTournament
          ? { ...get().currentTournament!, status: 'knockout' }
          : null,
        tournaments: get().tournaments.map((t) =>
          t.id === tournamentId ? { ...t, status: 'knockout' } : t,
        ),
      })
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to generate knockout draw' })
      return false
    }
  },

  async advanceWinner(tournamentMatchId, winnerTeamId) {
    if (!isSupabaseConfigured) return
    set({ error: null })
    try {
      const { tournamentMatches } = get()
      const tm = tournamentMatches.find((m) => m.id === tournamentMatchId)
      if (!tm) return

      const rounds = bracketRounds(get().currentTournament?.num_teams ?? 8)

      // Determine the next round
      const currentRoundIdx = rounds.indexOf(tm.phase)
      if (currentRoundIdx === -1) return

      const isFinal = tm.phase === 'final'
      if (isFinal) {
        // Tournament is finished
        const tournamentId = tm.tournament_id
        const { error: upErr } = await db
          .from('tournaments')
          .update({ status: 'finished' })
          .eq('id', tournamentId)
        if (upErr) throw new Error(upErr.message as string)
        set({
          currentTournament: get().currentTournament
            ? { ...get().currentTournament!, status: 'finished' }
            : null,
          tournaments: get().tournaments.map((t) =>
            t.id === tournamentId ? { ...t, status: 'finished' } : t,
          ),
        })
        return
      }

      // Find the next round's match slot to fill
      const nextPhase = rounds[currentRoundIdx + 1]
      // slot in next round = floor(tm.match_slot / 2)
      const nextSlot = Math.floor(tm.match_slot / 2)
      // Even slot fills home_team_id, odd fills away_team_id
      const isHome = tm.match_slot % 2 === 0

      const nextTm = tournamentMatches.find(
        (m) => m.tournament_id === tm.tournament_id && m.phase === nextPhase && m.match_slot === nextSlot,
      )
      if (!nextTm) return

      const updatePayload = isHome
        ? { home_team_id: winnerTeamId }
        : { away_team_id: winnerTeamId }

      const { data, error } = await db
        .from('tournament_matches')
        .update(updatePayload)
        .eq('id', nextTm.id)
        .select()
        .single()
      if (error) throw new Error(error.message as string)

      const updated = data as TournamentMatch
      set({
        tournamentMatches: tournamentMatches.map((m) => (m.id === updated.id ? updated : m)),
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to advance winner' })
    }
  },
}))
