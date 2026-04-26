import { supabase } from './supabase'
import type { DbVenue } from './database.types'

export async function getVenuesByTournament(tournamentId: string): Promise<DbVenue[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function createVenue(
  tournamentId: string,
  name: string,
  address?: string,
): Promise<DbVenue> {
  const { data, error } = await supabase
    .from('venues')
    .insert({ tournament_id: tournamentId, name, address: address ?? null })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateVenue(
  id: string,
  name: string,
  address?: string,
): Promise<void> {
  const { error } = await supabase
    .from('venues')
    .update({ name, address: address ?? null })
    .eq('id', id)

  if (error) throw error
}

export async function deleteVenue(id: string): Promise<void> {
  const { error } = await supabase
    .from('venues')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function assignMatchVenue(matchId: string, venueId: string | null): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ venue_id: venueId })
    .eq('id', matchId)

  if (error) throw error
}
