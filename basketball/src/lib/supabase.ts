import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Team, Player, Match, MatchEvent } from '../types'

// Database shape for Supabase typed client
export interface Database {
  public: {
    Tables: {
      teams: {
        Row: Team
        Insert: Omit<Team, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Team, 'id'>>
      }
      players: {
        Row: Player
        Insert: Omit<Player, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Player, 'id'>>
      }
      matches: {
        Row: Match
        Insert: Omit<Match, 'id' | 'created_at' | 'time_remaining_seconds'> & { id?: string; created_at?: string; time_remaining_seconds?: number | null }
        Update: Partial<Omit<Match, 'id'>>
      }
      match_events: {
        Row: MatchEvent
        Insert: Omit<MatchEvent, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<MatchEvent, 'id'>>
      }
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : createClient<Database>('http://localhost:0', 'dummy')
