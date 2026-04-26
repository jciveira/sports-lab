import type { FieldPlayerRatings, GKRatings, PlayerRatings } from './database.types'

export const FIELD_STAT_KEYS: (keyof FieldPlayerRatings)[] = ['tiro', 'pase', 'defensa', 'fisico', 'stamina', 'vision_de_juego']
export const GK_STAT_KEYS: (keyof GKRatings)[] = ['9m', '6m', 'ex', 'pas', 'med', '7m']

export const FIELD_STAT_LABELS: Record<keyof FieldPlayerRatings, string> = {
  tiro: 'Tiro',
  pase: 'Pase',
  defensa: 'Defensa',
  fisico: 'Físico',
  stamina: 'Stamina',
  vision_de_juego: 'Visión',
}

export const GK_STAT_LABELS: Record<keyof GKRatings, string> = {
  '9m': '9M',
  '6m': '6M',
  ex: 'EX',
  pas: 'PAS',
  med: 'MED',
  '7m': '7M',
}

export function isGK(role: string): boolean {
  return role === 'GK'
}

export function getStatKeys(role: string): string[] {
  return isGK(role) ? GK_STAT_KEYS : FIELD_STAT_KEYS
}

export function getStatLabels(role: string): Record<string, string> {
  return isGK(role) ? GK_STAT_LABELS : FIELD_STAT_LABELS
}

export function computeMedia(ratings: PlayerRatings | null): number | null {
  if (!ratings) return null
  const values = Object.values(ratings) as number[]
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

export function emptyRatings(role: string): PlayerRatings {
  if (isGK(role)) {
    return { '9m': 50, '6m': 50, ex: 50, pas: 50, med: 50, '7m': 50 }
  }
  return { tiro: 50, pase: 50, defensa: 50, fisico: 50, stamina: 50, vision_de_juego: 50 }
}

export function validateRatings(ratings: PlayerRatings): string | null {
  const values = Object.values(ratings) as number[]
  if (values.length !== 6) return 'Se requieren exactamente 6 estadísticas'
  for (const v of values) {
    if (!Number.isInteger(v) || v < 0 || v > 99) return 'Cada stat debe ser un número entre 0 y 99'
  }
  return null
}
