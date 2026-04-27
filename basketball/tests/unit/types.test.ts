import { describe, it, expect } from 'vitest'
import type {
  Team,
  Player,
  Match,
  MatchEvent,
  MatchStatus,
  PlayerPosition,
  EventType,
} from '../../src/types'

// === Structural correctness tests ===
// These tests verify that objects can be constructed matching each exported type
// and that all required fields are present and correctly typed.

describe('Team type', () => {
  it('accepts a fully-populated team object', () => {
    const team: Team = {
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      name: 'Red Hawks',
      nickname: 'Hawks',
      badge_url: 'https://example.com/badge.png',
      city_district: 'Barcelona Nord',
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(team.id).toBe('aaaaaaaa-0000-0000-0000-000000000001')
    expect(team.name).toBe('Red Hawks')
  })

  it('accepts a team with nullable fields set to null', () => {
    const team: Team = {
      id: 'aaaaaaaa-0000-0000-0000-000000000002',
      name: 'Blue Lions',
      nickname: null,
      badge_url: null,
      city_district: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(team.nickname).toBeNull()
    expect(team.badge_url).toBeNull()
  })
})

describe('Player type', () => {
  it('accepts a fully-populated player object', () => {
    const player: Player = {
      id: 'bbbbbbbb-0000-0000-0000-000000000001',
      team_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      display_name: 'Mateo R.',
      number: 10,
      position: 'PG',
      avatar_url: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(player.number).toBe(10)
    expect(player.position).toBe('PG')
  })

  it('accepts all valid PlayerPosition values', () => {
    const positions: PlayerPosition[] = ['PG', 'SG', 'SF', 'PF', 'C']
    expect(positions).toHaveLength(5)

    const players: Player[] = positions.map((pos, i) => ({
      id: `bbbbbbbb-0000-0000-0000-00000000000${i + 1}`,
      team_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      display_name: `Player ${i}`,
      number: i + 1,
      position: pos,
      avatar_url: null,
      created_at: '2026-01-01T00:00:00Z',
    }))
    expect(players.map(p => p.position)).toEqual(['PG', 'SG', 'SF', 'PF', 'C'])
  })
})

describe('Match type', () => {
  it('accepts a scheduled match', () => {
    const match: Match = {
      id: 'cccccccc-0000-0000-0000-000000000001',
      tournament_id: 'dddddddd-0000-0000-0000-000000000001',
      phase: 'group',
      home_team_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      away_team_id: 'aaaaaaaa-0000-0000-0000-000000000002',
      home_score: 0,
      away_score: 0,
      status: 'scheduled',
      quarter: 1,
      scorekeeper_claimed_by: null,
      started_at: null,
      finished_at: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(match.status).toBe('scheduled')
    expect(match.quarter).toBe(1)
  })

  it('accepts a finished match with all nullable fields populated', () => {
    const match: Match = {
      id: 'cccccccc-0000-0000-0000-000000000002',
      tournament_id: null,
      phase: null,
      home_team_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      away_team_id: 'aaaaaaaa-0000-0000-0000-000000000002',
      home_score: 72,
      away_score: 68,
      status: 'finished',
      quarter: 4,
      scorekeeper_claimed_by: 'anon-session-xyz',
      started_at: '2026-01-01T10:00:00Z',
      finished_at: '2026-01-01T11:30:00Z',
      created_at: '2026-01-01T09:00:00Z',
    }
    expect(match.home_score).toBe(72)
    expect(match.finished_at).not.toBeNull()
  })

  it('accepts all valid MatchStatus values', () => {
    const statuses: MatchStatus[] = ['scheduled', 'running', 'paused', 'quarter_break', 'finished']
    expect(statuses).toHaveLength(5)

    statuses.forEach(status => {
      const match: Match = {
        id: 'cccccccc-0000-0000-0000-000000000003',
        tournament_id: null,
        phase: null,
        home_team_id: 'aaaaaaaa-0000-0000-0000-000000000001',
        away_team_id: 'aaaaaaaa-0000-0000-0000-000000000002',
        home_score: 0,
        away_score: 0,
        status,
        quarter: 1,
        scorekeeper_claimed_by: null,
        started_at: null,
        finished_at: null,
        created_at: '2026-01-01T00:00:00Z',
      }
      expect(match.status).toBe(status)
    })
  })
})

describe('MatchEvent type', () => {
  it('accepts a goal_2 event', () => {
    const event: MatchEvent = {
      id: 'eeeeeeee-0000-0000-0000-000000000001',
      match_id: 'cccccccc-0000-0000-0000-000000000001',
      type: 'goal_2',
      team_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      player_id: 'bbbbbbbb-0000-0000-0000-000000000001',
      quarter: 2,
      time_remaining: 180,
      synced: true,
      created_at: '2026-01-01T10:05:00Z',
    }
    expect(event.type).toBe('goal_2')
    expect(event.quarter).toBe(2)
  })

  it('accepts a foul event with nullable player_id', () => {
    const event: MatchEvent = {
      id: 'eeeeeeee-0000-0000-0000-000000000002',
      match_id: 'cccccccc-0000-0000-0000-000000000001',
      type: 'foul',
      team_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      player_id: null,
      quarter: 1,
      time_remaining: 300,
      synced: false,
      created_at: '2026-01-01T10:02:00Z',
    }
    expect(event.player_id).toBeNull()
    expect(event.synced).toBe(false)
  })

  it('accepts all valid EventType values', () => {
    const eventTypes: EventType[] = ['goal_2', 'goal_3', 'freethrow', 'foul', 'timeout', 'quarter_end']
    expect(eventTypes).toHaveLength(6)

    eventTypes.forEach(type => {
      const event: MatchEvent = {
        id: 'eeeeeeee-0000-0000-0000-000000000003',
        match_id: 'cccccccc-0000-0000-0000-000000000001',
        type,
        team_id: null,
        player_id: null,
        quarter: 1,
        time_remaining: 0,
        synced: true,
        created_at: '2026-01-01T10:00:00Z',
      }
      expect(event.type).toBe(type)
    })
  })
})

describe('Foul derivation contract', () => {
  it('team fouls are derived by counting foul events — no counter columns on Match', () => {
    const events: MatchEvent[] = [
      {
        id: 'e1',
        match_id: 'm1',
        type: 'foul',
        team_id: 'team-home',
        player_id: 'player-1',
        quarter: 1,
        time_remaining: 400,
        synced: true,
        created_at: '2026-01-01T10:01:00Z',
      },
      {
        id: 'e2',
        match_id: 'm1',
        type: 'foul',
        team_id: 'team-home',
        player_id: 'player-2',
        quarter: 1,
        time_remaining: 350,
        synced: true,
        created_at: '2026-01-01T10:02:00Z',
      },
      {
        id: 'e3',
        match_id: 'm1',
        type: 'goal_2',
        team_id: 'team-away',
        player_id: 'player-3',
        quarter: 1,
        time_remaining: 300,
        synced: true,
        created_at: '2026-01-01T10:03:00Z',
      },
    ]

    const homeFouls = events.filter(e => e.type === 'foul' && e.team_id === 'team-home').length
    const awayFouls = events.filter(e => e.type === 'foul' && e.team_id === 'team-away').length

    expect(homeFouls).toBe(2)
    expect(awayFouls).toBe(0)

    // Match type has no home_fouls / away_fouls columns — verify by checking the keys
    const match: Match = {
      id: 'm1',
      tournament_id: null,
      phase: null,
      home_team_id: 'team-home',
      away_team_id: 'team-away',
      home_score: 0,
      away_score: 2,
      status: 'running',
      quarter: 1,
      scorekeeper_claimed_by: null,
      started_at: '2026-01-01T10:00:00Z',
      finished_at: null,
      created_at: '2026-01-01T09:00:00Z',
    }
    expect('home_fouls' in match).toBe(false)
    expect('away_fouls' in match).toBe(false)
  })
})
