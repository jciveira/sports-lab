/** Supabase database row types — mirrors the SQL schema */

export const TEAM_CATEGORIES = ['Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil', 'Senior'] as const
export type TeamCategory = (typeof TEAM_CATEGORIES)[number]

export const TEAM_GENDERS = ['Masculino', 'Femenino', 'Mixto'] as const
export type TeamGender = (typeof TEAM_GENDERS)[number]

export const TEAM_REGIONS = [
  'Andalucía',
  'Aragón',
  'Asturias',
  'Baleares',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Madrid',
  'Murcia',
  'Navarra',
  'País Vasco',
  'Valencia',
] as const
export type TeamRegion = (typeof TEAM_REGIONS)[number]

export interface DbTeam {
  id: string
  name: string
  nickname: string | null
  badge_url: string | null
  city_district: string | null
  category: TeamCategory | null
  gender: TeamGender | null
  region: TeamRegion | null
  created_at: string
}

export interface FieldPlayerRatings {
  tiro: number
  pase: number
  defensa: number
  fisico: number
  stamina: number
  vision_de_juego: number
}

export interface GKRatings {
  '9m': number
  '6m': number
  ex: number
  pas: number
  med: number
  '7m': number
}

export type PlayerRatings = FieldPlayerRatings | GKRatings

export type CardType = 'base' | 'toty'

export interface DbPlayer {
  id: string
  team_id: string | null
  display_name: string
  number: number
  role: string
  avatar_url: string | null
  strengths: string[]
  available: boolean
  injured: boolean
  ratings: PlayerRatings | null
  card_type: CardType
  created_at: string
}

export interface DbTournament {
  id: string
  name: string
  date: string | null
  num_teams: number
  status: string
  viewer_code: string
  category: TeamCategory | null
  gender: TeamGender | null
  created_at: string
}

export interface DbTournamentCategory {
  id: string
  tournament_id: string
  name: string
  created_at: string
}

export interface DbTournamentGroup {
  id: string
  category_id: string
  label: string
  created_at: string
}

export interface DbTournamentGroupTeam {
  id: string
  group_id: string
  team_id: string
  created_at: string
}

export interface DbVenue {
  id: string
  tournament_id: string
  name: string
  address: string | null
  created_at: string
}

export interface DbMatch {
  id: string
  tournament_id: string | null
  phase: string | null
  group_label: string | null
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  status: string
  current_half: number
  clock_seconds: number
  clock_seconds_base: number
  clock_started_at: string | null
  config_halves: number
  config_half_duration_minutes: number
  config_timeouts_per_half: number
  config_exclusion_duration_seconds: number
  scorekeeper_code: string
  stat_tracker_code: string
  viewer_code: string
  scorekeeper_claimed_by: string | null
  scorekeeper_name: string | null
  scorekeeper_last_active_at: string | null
  stat_tracker_claimed_by: string | null
  home_timeouts_left: number
  away_timeouts_left: number
  source: 'live' | 'manual'
  tournament_group_id: string | null
  tournament_category_id: string | null
  home_squad: string[] | null
  away_squad: string[] | null
  penalty_home_score: number | null
  penalty_away_score: number | null
  venue_id: string | null
  starts_at: string | null
  started_at: string | null
  finished_at: string | null
  not_played: boolean
  created_at: string
}

export interface DbMatchEvent {
  id: string
  match_id: string
  type: string
  team_id: string | null
  player_id: string | null
  related_event_id: string | null
  minute: number
  half: number
  synced: boolean
  created_at: string
}
