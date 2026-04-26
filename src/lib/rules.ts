import type { PlayerRole } from '../types'

/** Match configuration — editable before starting a game */
export interface MatchConfig {
  halves: number
  halfDurationMinutes: number
  timeoutsPerHalf: number
  timeoutDurationSeconds: number
  exclusionDurationSeconds: number
  maxExclusionsPerTeam: number
  playersOnCourt: number
  maxSquadSize: number
}

/** Default config — standard youth handball (U12) */
export const DEFAULT_CONFIG: MatchConfig = {
  halves: 2,
  halfDurationMinutes: 20,
  timeoutsPerHalf: 1,
  timeoutDurationSeconds: 60,
  exclusionDurationSeconds: 120,
  maxExclusionsPerTeam: 3,
  playersOnCourt: 7,
  maxSquadSize: 14,
}

/** Common presets for quick selection */
export const CONFIG_PRESETS: Record<string, { label: string; config: Partial<MatchConfig> }> = {
  'u12-standard': { label: 'U12 Standard (2×20 min)', config: { halves: 2, halfDurationMinutes: 20 } },
  'u14-standard': { label: 'U14 Standard (2×25 min)', config: { halves: 2, halfDurationMinutes: 25 } },
  'senior': { label: 'Senior (2×30 min)', config: { halves: 2, halfDurationMinutes: 30 } },
  'mini-4x12': { label: 'Mini (4×12 min)', config: { halves: 4, halfDurationMinutes: 12 } },
  'friendly-2x15': { label: 'Friendly (2×15 min)', config: { halves: 2, halfDurationMinutes: 15 } },
}

/** Position labels — code + full name for tooltips */
export const POSITION_LABELS: Record<PlayerRole, { en: string; es: string }> = {
  GK: { en: 'Goalkeeper', es: 'Portero' },
  LW: { en: 'Left Wing', es: 'Extremo Izquierdo' },
  RW: { en: 'Right Wing', es: 'Extremo Derecho' },
  LB: { en: 'Left Back', es: 'Lateral Izquierdo' },
  RB: { en: 'Right Back', es: 'Lateral Derecho' },
  CB: { en: 'Center Back', es: 'Central' },
  PV: { en: 'Pivot', es: 'Pivote' },
}

/** Get the full position name for display/tooltip */
export function getPositionLabel(role: PlayerRole, lang: 'en' | 'es' = 'en'): string {
  return POSITION_LABELS[role]?.[lang] ?? role
}
