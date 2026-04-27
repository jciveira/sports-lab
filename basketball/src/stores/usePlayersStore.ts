import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Player, PlayerPosition, PlayerAttributes } from '../types'

// Use untyped client access to avoid strict Database generic issues at insert/update time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const MAX_SQUAD_SIZE = 12

interface PlayersState {
  players: Player[]
  loading: boolean
  error: string | null
  fetchPlayersForTeam: (teamId: string) => Promise<void>
  addPlayer: (
    teamId: string,
    displayName: string,
    number: number,
    position: PlayerPosition,
  ) => Promise<Player | null>
  updatePlayerAttributes: (playerId: string, attributes: PlayerAttributes) => Promise<boolean>
  removePlayer: (playerId: string) => Promise<boolean>
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
  players: [],
  loading: false,
  error: null,

  async fetchPlayersForTeam(teamId) {
    if (!isSupabaseConfigured) return
    set({ loading: true, error: null })
    try {
      const { data, error } = await db
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('number', { ascending: true })
      if (error) throw new Error(error.message as string)
      set({ players: (data as Player[]) ?? [] })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch players' })
    } finally {
      set({ loading: false })
    }
  },

  async addPlayer(teamId, displayName, number, position) {
    if (!isSupabaseConfigured) return null
    set({ error: null })

    const current = get().players
    // Duplicate jersey number check
    if (current.some((p) => p.number === number)) {
      set({ error: `Jersey #${number} is already taken in this team` })
      return null
    }
    // Max squad size check
    if (current.length >= MAX_SQUAD_SIZE) {
      set({ error: `Squad is full (max ${MAX_SQUAD_SIZE} players)` })
      return null
    }

    try {
      const { data, error } = await db
        .from('players')
        .insert({
          team_id: teamId,
          display_name: displayName,
          number,
          position,
          avatar_url: null,
          attributes: null,
        })
        .select()
        .single()
      if (error) throw new Error(error.message as string)
      const player = data as Player
      set({ players: [...current, player].sort((a, b) => a.number - b.number) })
      return player
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add player' })
      return null
    }
  },

  async updatePlayerAttributes(playerId, attributes) {
    if (!isSupabaseConfigured) return false
    set({ error: null })
    try {
      const { error } = await db
        .from('players')
        .update({ attributes })
        .eq('id', playerId)
      if (error) throw new Error(error.message as string)
      set({
        players: get().players.map((p) =>
          p.id === playerId ? { ...p, attributes } : p,
        ),
      })
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update attributes' })
      return false
    }
  },

  async removePlayer(playerId) {
    if (!isSupabaseConfigured) return false
    set({ error: null })
    try {
      const { error } = await db
        .from('players')
        .delete()
        .eq('id', playerId)
      if (error) throw new Error(error.message as string)
      set({ players: get().players.filter((p) => p.id !== playerId) })
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to remove player' })
      return false
    }
  },
}))
