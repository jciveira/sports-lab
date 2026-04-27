// Basketball-lab type definitions

// === Enums ===

export type MatchStatus = 'scheduled' | 'running' | 'paused' | 'quarter_break' | 'finished'

export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C'

export type EventType = 'goal_2' | 'goal_3' | 'freethrow' | 'foul' | 'timeout' | 'quarter_end'

export type TournamentStatus = 'setup' | 'group_phase' | 'knockout' | 'finished'

// === Tournament Types ===

export interface Tournament {
  id: string
  name: string
  format: 'group_knockout'
  num_teams: number
  status: TournamentStatus
  viewer_code: string | null
  created_at: string
}

export interface TournamentTeam {
  id: string
  tournament_id: string
  team_id: string
  group_name: string | null  // e.g. 'A', 'B' — null until group phase
  created_at: string
}

export interface TournamentMatch {
  id: string
  tournament_id: string
  phase: 'group' | 'qf' | 'sf' | 'final'
  round_index: number        // for knockout: 0=QF, 1=SF, 2=final; for group: sequence number
  match_slot: number         // position within round (0-based)
  home_team_id: string | null  // null = TBD
  away_team_id: string | null  // null = TBD
  match_id: string | null    // link to matches table when match is created
  created_at: string
}

// === Domain Types ===

export interface Team {
  id: string
  name: string
  nickname: string | null
  badge_url: string | null
  city_district: string | null
  created_at: string
}

export interface PlayerAttributes {
  tiro: number
  pase: number
  defensa: number
  fisico: number
  stamina: number
  vision: number
}

export interface Player {
  id: string
  team_id: string
  display_name: string
  number: number
  position: PlayerPosition
  avatar_url: string | null
  attributes: PlayerAttributes | null
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
