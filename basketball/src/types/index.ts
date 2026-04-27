// Basketball-lab type definitions

// === Enums ===

export type MatchStatus = 'scheduled' | 'running' | 'paused' | 'quarter_break' | 'finished'

export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C'

export type EventType = 'goal_2' | 'goal_3' | 'freethrow' | 'foul' | 'timeout' | 'quarter_end'

// === Domain Types ===

export interface Team {
  id: string
  name: string
  nickname: string | null
  badge_url: string | null
  city_district: string | null
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  display_name: string
  number: number
  position: PlayerPosition
  avatar_url: string | null
  created_at: string
}

export interface Match {
  id: string
  tournament_id: string | null
  phase: 'group' | 'semi' | 'final' | null
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  status: MatchStatus
  quarter: number
  time_remaining_seconds: number | null
  scorekeeper_claimed_by: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  type: EventType
  team_id: string | null
  player_id: string | null
  quarter: number
  time_remaining: number
  synced: boolean
  created_at: string
}
