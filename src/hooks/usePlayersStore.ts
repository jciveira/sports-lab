import { create } from 'zustand'
import type { DbPlayer } from '../lib/database.types'
import * as playersApi from '../lib/players'

interface PlayersState {
  players: DbPlayer[]
  loading: boolean
  error: string | null

  fetch: () => Promise<void>
  add: (player: { team_id: string | null; display_name: string; number: number; role: string }) => Promise<DbPlayer>
  update: (id: string, updates: Partial<Pick<DbPlayer, 'display_name' | 'number' | 'role' | 'team_id' | 'available' | 'injured' | 'ratings' | 'card_type' | 'avatar_url'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
  players: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const players = await playersApi.listPlayers()
      set({ players, loading: false })
    } catch {
      set({ error: 'Failed to load players', loading: false })
    }
  },

  add: async (player) => {
    const created = await playersApi.createPlayer(player)
    set({ players: [...get().players, created].sort((a, b) => (a.team_id ?? '').localeCompare(b.team_id ?? '') || a.number - b.number) })
    return created
  },

  update: async (id, updates) => {
    const updated = await playersApi.updatePlayer(id, updates)
    set({
      players: get().players.map((p) => (p.id === id ? updated : p))
        .sort((a, b) => (a.team_id ?? '').localeCompare(b.team_id ?? '') || a.number - b.number),
    })
  },

  remove: async (id) => {
    await playersApi.deletePlayer(id)
    set({ players: get().players.filter((p) => p.id !== id) })
  },
}))
