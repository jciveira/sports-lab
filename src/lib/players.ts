import { supabase } from './supabase'
import { compressImage } from './image'
import type { DbPlayer } from './database.types'

const AVATAR_BUCKET = 'player-avatars'
const SIGNED_URL_EXPIRY = 60 * 60 // 1 hour

/** List all players ordered by team, then jersey number */
export async function listPlayers(): Promise<DbPlayer[]> {
  const { data, error } = await supabase
    .from('players')
    .select()
    .order('team_id')
    .order('number', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Create a new player */
export async function createPlayer(player: {
  team_id: string | null
  display_name: string
  number: number
  role: string
}): Promise<DbPlayer> {
  const { data, error } = await supabase
    .from('players')
    .insert(player)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Update an existing player */
export async function updatePlayer(
  id: string,
  updates: Partial<Pick<DbPlayer, 'display_name' | 'number' | 'role' | 'team_id' | 'available' | 'injured' | 'ratings' | 'card_type' | 'avatar_url'>>,
): Promise<DbPlayer> {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Get a single player by ID (with team data) */
export async function getPlayer(id: string): Promise<DbPlayer & { team: { id: string; name: string; badge_url: string | null } | null }> {
  const { data, error } = await supabase
    .from('players')
    .select('*, team:teams(id, name, badge_url)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/** Delete a player by ID */
export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/** Generate a fresh signed URL for a stored avatar path (1 hour expiry).
 *  Returns null for missing paths. Degrades gracefully for legacy stored signed URLs. */
export async function getPlayerAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  // Legacy: signed URL was stored directly — return as-is (will expire but won't crash)
  if (path.startsWith('http')) return path

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/** Upload a player avatar: compress, store in private bucket.
 *  Saves the storage path (not a signed URL) to avatar_url.
 *  Returns { path, previewUrl } — previewUrl is a fresh signed URL for immediate display. */
export async function uploadPlayerAvatar(
  playerId: string,
  file: File,
): Promise<{ path: string; previewUrl: string }> {
  const compressed = await compressImage(file, { maxDim: 600, quality: 0.8 })
  const path = `${playerId}.jpg`

  // Remove old avatar if it exists (replace flow)
  await supabase.storage.from(AVATAR_BUCKET).remove([path])

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw uploadError

  const { data: urlData, error: urlError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)
  if (urlError || !urlData?.signedUrl) throw urlError ?? new Error('Failed to create signed URL')

  // Save the storage path (not the signed URL) so it never expires
  await updatePlayer(playerId, { avatar_url: path })

  return { path, previewUrl: urlData.signedUrl }
}

/** Delete a player's avatar from storage and clear the URL on the row */
export async function deletePlayerAvatar(playerId: string): Promise<void> {
  const path = `${playerId}.jpg`
  await supabase.storage.from(AVATAR_BUCKET).remove([path])
  await updatePlayer(playerId, { avatar_url: null })
}
