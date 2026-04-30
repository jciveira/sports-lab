import { supabase, isSupabaseConfigured } from './supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/** Submit a bug report to Supabase. Silently no-ops when Supabase is not configured. */
export async function submitBugReport(
  description: string,
  screenshot?: File | null,
): Promise<void> {
  if (!isSupabaseConfigured) return

  const pageUrl = window.location.href
  const userAgent = navigator.userAgent

  let screenshotUrl: string | null = null
  if (screenshot) {
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { error } = await supabase.storage
      .from('bug-screenshots')
      .upload(filename, screenshot, { contentType: screenshot.type })
    if (!error) {
      const { data } = supabase.storage.from('bug-screenshots').getPublicUrl(filename)
      screenshotUrl = data.publicUrl
    }
  }

  await db.from('bug_reports').insert({
    description,
    page_url: pageUrl,
    user_agent: userAgent,
    screenshot_url: screenshotUrl,
    created_at: new Date().toISOString(),
  })
}
