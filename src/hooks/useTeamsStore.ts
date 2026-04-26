import { create } from 'zustand'
import type { DbTeam } from '../lib/database.types'
import * as teamsApi from '../lib/teams'

interface TeamsState {
  teams: DbTeam[]
  loading: boolean
  error: string | null

  fetch: () => Promise<void>
  add: (team: { name: string; badge_url?: string; nickname?: string; city_district?: string; category?: string; gender?: string; region?: string }) => Promise<DbTeam>
  update: (id: string, updates: Partial<Pick<DbTeam, 'name' | 'badge_url' | 'nickname' | 'city_district' | 'category' | 'gender' | 'region'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  teams: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const teams = await teamsApi.listTeams()
      set({ teams, loading: false })
    } catch {
      set({ error: 'Failed to load teams', loading: false })
    }
  },

  add: async (team) => {
    const created = await teamsApi.createTeam(team)
    set({ teams: [...get().teams, created].sort((a, b) => a.name.localeCompare(b.name)) })
    return created
  },

  update: async (id, updates) => {
    const updated = await teamsApi.updateTeam(id, updates)
    set({ teams: get().teams.map((t) => (t.id === id ? updated : t)) })
  },

  remove: async (id) => {
    try {
      await teamsApi.deleteTeam(id)
      set({ teams: get().teams.filter((t) => t.id !== id) })
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === '23503') {
        set({ error: 'Este equipo tiene partidos asignados. Elimínalo de los partidos antes de borrarlo.' })
      } else {
        set({ error: 'No se pudo eliminar el equipo' })
      }
    }
  },
}))
