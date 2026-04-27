import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Team } from '../types'

// Use untyped client access to avoid strict Database generic issues at insert time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface TeamsState {
  teams: Team[]
  loading: boolean
  error: string | null
  fetchTeams: () => Promise<void>
  createTeam: (name: string, nickname?: string, badgeUrl?: string) => Promise<Team | null>
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  teams: [],
  loading: false,
  error: null,

  async fetchTeams() {
    if (!isSupabaseConfigured) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await db
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message as string)
      set({ teams: (data as Team[]) ?? [] })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch teams' })
    } finally {
      set({ loading: false })
    }
  },

  async createTeam(name, nickname, badgeUrl) {
    if (!isSupabaseConfigured) return null
    set({ error: null })
    try {
      const { data, error } = await db
        .from('teams')
        .insert({
          name,
          nickname: nickname ?? null,
          badge_url: badgeUrl ?? null,
          city_district: null,
        })
        .select()
        .single()
      if (error) throw new Error(error.message as string)
      const team = data as Team
      set({ teams: [team, ...get().teams] })
      return team
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create team' })
      return null
    }
  },
}))
