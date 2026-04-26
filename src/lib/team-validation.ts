import type { DbTeam } from './database.types'

export function isDuplicateTeamName(
  name: string,
  teams: DbTeam[],
  excludeId?: string
): boolean {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return false
  return teams.some(
    (t) => t.name.trim().toLowerCase() === normalized && t.id !== excludeId
  )
}
