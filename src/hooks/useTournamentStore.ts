import { create } from 'zustand'
import type { DbTournament, DbMatch, DbTeam, DbVenue } from '../lib/database.types'
import * as api from '../lib/tournaments'
import { getTeamsForIds } from '../lib/tournaments'
import * as venueApi from '../lib/venues'
import { updateMatchSchedule } from '../lib/matches'
import { setTournamentStatus } from '../lib/tournaments'

interface CategoryData {
  id: string
  tournament_id: string
  name: string
  groups: Array<{
    id: string
    category_id: string
    label: string
    teamIds: string[]
  }>
}

interface TournamentState {
  tournament: DbTournament | null
  categories: CategoryData[]
  matches: DbMatch[]
  teamsMap: Map<string, DbTeam>
  venues: DbVenue[]
  loading: boolean
  error: string | null

  fetchTournament: (id: string) => Promise<void>
  recordScore: (matchId: string, homeScore: number, awayScore: number) => Promise<void>
  recordPenalties: (matchId: string, penaltyHome: number, penaltyAway: number) => Promise<void>
  generateKnockouts: (categoryId: string, pairings: { phase: string; matches: Array<{ homeTeamId: string; awayTeamId: string }> }) => Promise<void>
  generateFinals: (categoryId: string, semi1Winner: string, semi1Loser: string, semi2Winner: string, semi2Loser: string) => Promise<void>
  deleteTournament: (tournamentId: string) => Promise<void>
  closeTournament: (tournamentId: string) => Promise<void>
  reopenTournament: (tournamentId: string) => Promise<void>
  updateSchedule: (matchId: string, startsAt: string | null) => Promise<void>
  addVenue: (name: string, address?: string) => Promise<void>
  editVenue: (id: string, name: string, address?: string) => Promise<void>
  removeVenue: (id: string) => Promise<void>
  assignVenue: (matchId: string, venueId: string | null) => Promise<void>
  markNotPlayed: (matchId: string, notPlayed: boolean) => Promise<void>
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournament: null,
  categories: [],
  matches: [],
  teamsMap: new Map(),
  venues: [],
  loading: false,
  error: null,

  fetchTournament: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const data = await api.getTournament(id)
      // Collect all team IDs from groups
      const teamIds = new Set<string>()
      for (const cat of data.categories) {
        for (const grp of cat.groups) {
          for (const tid of grp.teamIds) teamIds.add(tid)
        }
      }
      // Also from matches
      for (const m of data.matches) {
        teamIds.add(m.home_team_id)
        teamIds.add(m.away_team_id)
      }

      const teams = await getTeamsForIds(Array.from(teamIds))
      const teamsMap = new Map(teams.map((t) => [t.id, t]))

      const venues = await venueApi.getVenuesByTournament(id)

      set({
        tournament: data.tournament,
        categories: data.categories,
        matches: data.matches,
        teamsMap,
        venues,
        loading: false,
      })
    } catch {
      set({ error: 'Failed to load tournament', loading: false })
    }
  },

  recordScore: async (matchId, homeScore, awayScore) => {
    await api.recordManualScore(matchId, homeScore, awayScore)
    set({
      matches: get().matches.map((m) =>
        m.id === matchId
          ? { ...m, home_score: homeScore, away_score: awayScore, status: 'finished', source: 'manual' as const }
          : m,
      ),
    })
  },

  recordPenalties: async (matchId, penaltyHome, penaltyAway) => {
    await api.recordPenaltyResult(matchId, penaltyHome, penaltyAway)
    set({
      matches: get().matches.map((m) =>
        m.id === matchId
          ? { ...m, penalty_home_score: penaltyHome, penalty_away_score: penaltyAway }
          : m,
      ),
    })
  },

  updateSchedule: async (matchId, startsAt) => {
    await updateMatchSchedule(matchId, startsAt)
    set({
      matches: get().matches.map((m) =>
        m.id === matchId ? { ...m, starts_at: startsAt } : m,
      ),
    })
  },

  generateKnockouts: async (categoryId, pairings) => {
    const t = get().tournament
    if (!t) return
    await api.generateKnockoutMatches(t.id, categoryId, pairings)
    // Refetch to get the new matches
    await get().fetchTournament(t.id)
  },

  generateFinals: async (categoryId, semi1Winner, semi1Loser, semi2Winner, semi2Loser) => {
    const t = get().tournament
    if (!t) return
    await api.generateFinalMatches(t.id, categoryId, semi1Winner, semi1Loser, semi2Winner, semi2Loser)
    await get().fetchTournament(t.id)
  },

  deleteTournament: async (tournamentId) => {
    await api.deleteTournament(tournamentId)
    set({ tournament: null, categories: [], matches: [], teamsMap: new Map(), venues: [] })
  },

  closeTournament: async (tournamentId) => {
    await setTournamentStatus(tournamentId, 'finished')
    set((state) => ({
      tournament: state.tournament ? { ...state.tournament, status: 'finished' } : null,
    }))
  },

  reopenTournament: async (tournamentId) => {
    await setTournamentStatus(tournamentId, 'group_stage')
    set((state) => ({
      tournament: state.tournament ? { ...state.tournament, status: 'group_stage' } : null,
    }))
  },

  addVenue: async (name, address) => {
    const t = get().tournament
    if (!t) return
    const venue = await venueApi.createVenue(t.id, name, address)
    set({ venues: [...get().venues, venue] })
  },

  editVenue: async (id, name, address) => {
    await venueApi.updateVenue(id, name, address)
    set({
      venues: get().venues.map((v) => (v.id === id ? { ...v, name, address: address ?? null } : v)),
    })
  },

  removeVenue: async (id) => {
    await venueApi.deleteVenue(id)
    set({ venues: get().venues.filter((v) => v.id !== id) })
  },

  assignVenue: async (matchId, venueId) => {
    await venueApi.assignMatchVenue(matchId, venueId)
    set({
      matches: get().matches.map((m) => (m.id === matchId ? { ...m, venue_id: venueId } : m)),
    })
  },

  markNotPlayed: async (matchId, notPlayed) => {
    await api.markMatchNotPlayed(matchId, notPlayed)
    set({
      matches: get().matches.map((m) => (m.id === matchId ? { ...m, not_played: notPlayed } : m)),
    })
  },
}))
