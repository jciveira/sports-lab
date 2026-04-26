import { supabase } from './supabase'
import type { DbTeam } from './database.types'

/** List all teams ordered by name */
export async function listTeams(): Promise<DbTeam[]> {
  const { data, error } = await supabase
    .from('teams')
    .select()
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Get a single team by ID */
export async function getTeam(id: string): Promise<DbTeam | null> {
  const { data, error } = await supabase
    .from('teams')
    .select()
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

/** Create a new team */
export async function createTeam(team: {
  name: string
  badge_url?: string
  nickname?: string
  city_district?: string
  category?: string
  gender?: string
  region?: string
}): Promise<DbTeam> {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Update an existing team */
export async function updateTeam(
  id: string,
  updates: Partial<Pick<DbTeam, 'name' | 'badge_url' | 'nickname' | 'city_district' | 'category' | 'gender' | 'region'>>,
): Promise<DbTeam> {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Delete a team by ID */
export async function deleteTeam(id: string): Promise<void> {
  const { error, count } = await supabase
    .from('teams')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) throw error
  if (count === 0) throw new Error('Delete blocked by server')
}
