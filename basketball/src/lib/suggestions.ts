import { supabase, isSupabaseConfigured } from './supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function submitSuggestion(description: string): Promise<void> {
  if (!isSupabaseConfigured) return
  await db.from('suggestions').insert({
    description,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    created_at: new Date().toISOString(),
  })
}
