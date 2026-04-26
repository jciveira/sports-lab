import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePlayersStore } from '../../src/hooks/usePlayersStore'
import type { DbPlayer } from '../../src/lib/database.types'

// Mock the Supabase-backed API
vi.mock('../../src/lib/players', () => ({
  listPlayers: vi.fn(),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  deletePlayer: vi.fn(),
}))

import * as playersApi from '../../src/lib/players'

function makePlayer(overrides: Partial<DbPlayer> = {}): DbPlayer {
  return {
    id: 'p1',
    team_id: 'team-a',
    display_name: 'Test Player',
    number: 1,
    role: 'CB',
    avatar_url: null,
    strengths: [],
    available: true,
    injured: false,
    ratings: null,
    card_type: 'base',
    created_at: '',
    ...overrides,
  }
}

describe('usePlayersStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePlayersStore.setState({
      players: [],
      loading: false,
      error: null,
    })
  })

  it('fetches and stores players', async () => {
    const players = [makePlayer({ id: 'p1', number: 7 }), makePlayer({ id: 'p2', number: 3 })]
    vi.mocked(playersApi.listPlayers).mockResolvedValue(players)

    await usePlayersStore.getState().fetch()

    expect(usePlayersStore.getState().players).toEqual(players)
    expect(usePlayersStore.getState().loading).toBe(false)
  })

  it('sets error on fetch failure', async () => {
    vi.mocked(playersApi.listPlayers).mockRejectedValue(new Error('Network'))

    await usePlayersStore.getState().fetch()

    expect(usePlayersStore.getState().error).toBe('Failed to load players')
    expect(usePlayersStore.getState().loading).toBe(false)
  })

  it('add sorts players with null team_id without crashing', async () => {
    const existing = makePlayer({ id: 'p1', team_id: null, number: 5 })
    usePlayersStore.setState({ players: [existing] })

    const newPlayer = makePlayer({ id: 'p2', team_id: 'team-a', number: 3 })
    vi.mocked(playersApi.createPlayer).mockResolvedValue(newPlayer)

    await usePlayersStore.getState().add({ team_id: 'team-a', display_name: 'New', number: 3, role: 'GK' })

    const players = usePlayersStore.getState().players
    expect(players).toHaveLength(2)
    // Null team_id sorts to beginning (empty string)
    expect(players[0].id).toBe('p1') // null team_id → ''
    expect(players[1].id).toBe('p2') // 'team-a'
  })

  it('update sorts players with null team_id without crashing', async () => {
    const p1 = makePlayer({ id: 'p1', team_id: 'team-a', number: 7 })
    const p2 = makePlayer({ id: 'p2', team_id: 'team-b', number: 3 })
    usePlayersStore.setState({ players: [p1, p2] })

    // Simulate removing p1 from team (setting team_id to null)
    const updated = { ...p1, team_id: null }
    vi.mocked(playersApi.updatePlayer).mockResolvedValue(updated)

    await usePlayersStore.getState().update('p1', { team_id: null })

    const players = usePlayersStore.getState().players
    expect(players).toHaveLength(2)
    expect(players[0].team_id).toBeNull() // null sorts first
    expect(players[1].team_id).toBe('team-b')
  })

  it('update handles available and injured fields', async () => {
    const p1 = makePlayer({ id: 'p1', available: true, injured: false })
    usePlayersStore.setState({ players: [p1] })

    const updated = { ...p1, injured: true, available: false }
    vi.mocked(playersApi.updatePlayer).mockResolvedValue(updated)

    await usePlayersStore.getState().update('p1', { injured: true, available: false })

    const player = usePlayersStore.getState().players[0]
    expect(player.injured).toBe(true)
    expect(player.available).toBe(false)
  })

  it('remove deletes player from state', async () => {
    const p1 = makePlayer({ id: 'p1' })
    const p2 = makePlayer({ id: 'p2', number: 2 })
    usePlayersStore.setState({ players: [p1, p2] })

    vi.mocked(playersApi.deletePlayer).mockResolvedValue(undefined)

    await usePlayersStore.getState().remove('p1')

    expect(usePlayersStore.getState().players).toHaveLength(1)
    expect(usePlayersStore.getState().players[0].id).toBe('p2')
  })

  it('update handles ratings and card_type fields', async () => {
    const p1 = makePlayer({ id: 'p1' })
    usePlayersStore.setState({ players: [p1] })

    const ratings = { tiro: 80, pase: 70, defensa: 90, fisico: 60, stamina: 85, vision_de_juego: 75 }
    const updated = { ...p1, ratings, card_type: 'toty' as const }
    vi.mocked(playersApi.updatePlayer).mockResolvedValue(updated)

    await usePlayersStore.getState().update('p1', { ratings, card_type: 'toty' })

    const player = usePlayersStore.getState().players[0]
    expect(player.ratings).toEqual(ratings)
    expect(player.card_type).toBe('toty')
  })

  it('sorts by team_id then by number on add', async () => {
    const p1 = makePlayer({ id: 'p1', team_id: 'team-b', number: 1 })
    const p2 = makePlayer({ id: 'p2', team_id: 'team-a', number: 10 })
    usePlayersStore.setState({ players: [p1, p2] })

    const newPlayer = makePlayer({ id: 'p3', team_id: 'team-a', number: 5 })
    vi.mocked(playersApi.createPlayer).mockResolvedValue(newPlayer)

    await usePlayersStore.getState().add({ team_id: 'team-a', display_name: 'X', number: 5, role: 'LW' })

    const players = usePlayersStore.getState().players
    // team-a players first (sorted by number), then team-b
    expect(players.map(p => p.id)).toEqual(['p3', 'p2', 'p1']) // team-a #5, team-a #10, team-b #1
  })
})
