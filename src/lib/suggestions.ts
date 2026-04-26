import { db } from './offline'
import { supabase, isSupabaseConfigured } from './supabase'

/** Submit a suggestion — saves locally first, then tries Supabase */
export async function submitSuggestion(text: string, name: string): Promise<void> {
  const createdAt = new Date().toISOString()

  // Always save locally first (works offline)
  const localId = await db.suggestions.add({
    text,
    name,
    synced: false,
    createdAt,
  })

  // Try to sync to Supabase
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('suggestions').insert({
      text,
      name: name || null,
      created_at: createdAt,
    })
    if (!error && localId !== undefined) {
      await db.suggestions.update(localId, { synced: true })
    }
  }
}

/** Sync all unsynced suggestions to Supabase. Returns count synced. */
export async function syncSuggestions(): Promise<number> {
  if (!isSupabaseConfigured) return 0

  const unsynced = await db.suggestions
    .filter((s) => !s.synced)
    .sortBy('createdAt')

  let count = 0
  for (const suggestion of unsynced) {
    const { error } = await supabase.from('suggestions').insert({
      text: suggestion.text,
      name: suggestion.name || null,
      created_at: suggestion.createdAt,
    })
    if (!error && suggestion.id !== undefined) {
      await db.suggestions.update(suggestion.id, { synced: true })
      count++
    }
  }
  return count
}
