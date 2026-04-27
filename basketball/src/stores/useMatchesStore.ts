import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Match } from '../types'

// Use untyped client access to avoid strict Database generic issues at insert time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface MatchWithDuration extends Match {
  quarter_duration: 8 | 10
}

interface MatchesState {
  matches: MatchWithDuration[]
  loading: boolean
  error: string | null
  fetchMatches: () => Promise<void>
  createMatch: (homeTeamId: string, awayTeamId: string, quarterDuration: 8 | 10) => Promise<MatchWithDuration | null>
}

export const useMatchesStore = create<MatchesState>((set, get) => ({
  matches: [],
  loading: false,
  error: null,

  async fetchMatches() {
    if (!isSupabaseConfigured) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await db
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message as string)
      // quarter_duration not yet in DB — default to 8 for fetched matches
      const matches: MatchWithDuration[] = ((data as Match[]) ?? []).map((m) => ({ ...m, quarter_duration: 8 as const }))
      set({ matches })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch matches' })
    } finally {
      set({ loading: false })
    }
  },

  async createMatch(homeTeamId, awayTeamId, quarterDuration) {
    if (!isSupabaseConfigured) return null
    set({ error: null })
    try {
      const { data, error } = await db
        .from('matches')
        .insert({
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_score: 0,
          away_score: 0,
          status: 'scheduled',
          quarter: 1,
          tournament_id: null,
          phase: null,
          scorekeeper_claimed_by: null,
          started_at: null,
          finished_at: null,
        })
        .select()
        .single()
      if (error) throw new Error(error.message as string)
      const enriched: MatchWithDuration = { ...(data as Match), quarter_duration: quarterDuration }
      set({ matches: [enriched, ...get().matches] })
      return enriched
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create match' })
      return null
    }
  },
}))
