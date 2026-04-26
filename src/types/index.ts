// === Core Types ===

export type MatchStatus = 'scheduled' | 'running' | 'paused' | 'halftime' | 'finished'
export type MatchHalf = number // 1-based: 1, 2, ... up to config.halves
export type PlayerRole = 'GK' | 'LW' | 'RW' | 'LB' | 'RB' | 'CB' | 'PV'
export type EventType = 'goal' | 'assist' | 'save' | 'exclusion' | 'timeout' | 'halftime'
export type TournamentPhase = 'group' | 'quarter' | 'semi' | 'third_place' | 'final'
export type AccessRole = 'admin' | 'scorekeeper' | 'stat_tracker' | 'viewer'

// === Teams & Players ===

export interface Team {
  id: string
  name: string
  nickname?: string
  badge_url?: string
  city_district?: string
  region?: string
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  display_name: string // First name or nickname only — no PII
  number: number
  role: PlayerRole
  avatar_url?: string
  strengths: string[] // icon keys
}

// === Matches ===

export interface Match {
  id: string
  tournament_id?: string
  phase?: TournamentPhase
  group_label?: string
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  status: MatchStatus
  half: MatchHalf
  clock_seconds: number
  scorekeeper_code: string
  stat_tracker_code: string
  scorekeeper_claimed_by?: string
  stat_tracker_claimed_by?: string
  venue_id?: string
  started_at?: string
  finished_at?: string
}

export interface MatchEvent {
  id: string
  match_id: string
  type: EventType
  team_id?: string
  player_id?: string
  related_event_id?: string
  minute: number
  half: MatchHalf
  synced: boolean
  created_at: string
}

// === Venues ===

export interface Venue {
  id: string
  tournament_id: string
  name: string
  address?: string
  created_at: string
}

// === Tournaments ===

export interface Tournament {
  id: string
  name: string
  num_teams: number
  status: 'draft' | 'group_stage' | 'knockouts' | 'finished'
  viewer_code: string
  created_at: string
}

// === Aggregated Stats ===

export interface PlayerStats {
  player_id: string
  tournament_id?: string
  goals: number
  assists: number
  saves: number
  exclusions: number
  matches_played: number
}

// === Exclusion tracking (handball-specific) ===

export interface Exclusion {
  player_id: string
  team_id: string
  start_time: number // clock seconds when excluded
  duration: number // seconds (default 120, configurable)
  half: MatchHalf
  dismissed?: boolean // true if ended early (U12 rule)
}
