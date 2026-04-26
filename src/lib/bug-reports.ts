import { db } from './offline'
import { supabase, isSupabaseConfigured } from './supabase'
import { compressImage } from './image'

export { compressImage }

/** Upload a screenshot to Supabase Storage. Returns the public URL or null on failure. */
async function uploadScreenshot(file: File): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const compressed = await compressImage(file)
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage
    .from('bug-screenshots')
    .upload(filename, compressed, { contentType: 'image/jpeg' })
  if (error) return null
  const { data } = supabase.storage.from('bug-screenshots').getPublicUrl(filename)
  return data.publicUrl
}

/** Submit a bug report — saves locally first, then tries Supabase */
export async function submitBugReport(
  description: string,
  screenshot?: File | null,
): Promise<void> {
  const createdAt = new Date().toISOString()
  const pageUrl = window.location.href
  const userAgent = navigator.userAgent

  // Upload screenshot if provided
  let screenshotUrl: string | undefined
  if (screenshot) {
    const url = await uploadScreenshot(screenshot)
    if (url) screenshotUrl = url
  }

  // Always save locally first (works offline)
  const localId = await db.bugReports.add({
    description,
    pageUrl,
    userAgent,
    screenshotUrl,
    synced: false,
    createdAt,
  })

  // Try to sync to Supabase
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('bug_reports').insert({
      description,
      page_url: pageUrl,
      user_agent: userAgent,
      screenshot_url: screenshotUrl ?? null,
      created_at: createdAt,
    })
    if (!error && localId !== undefined) {
      await db.bugReports.update(localId, { synced: true })
    }
  }
}

/** Sync all unsynced bug reports to Supabase. Returns count synced. */
export async function syncBugReports(): Promise<number> {
  if (!isSupabaseConfigured) return 0

  const unsynced = await db.bugReports
    .filter((r) => !r.synced)
    .sortBy('createdAt')

  let count = 0
  for (const report of unsynced) {
    const { error } = await supabase.from('bug_reports').insert({
      description: report.description,
      page_url: report.pageUrl,
      user_agent: report.userAgent,
      screenshot_url: report.screenshotUrl ?? null,
      created_at: report.createdAt,
    })
    if (!error && report.id !== undefined) {
      await db.bugReports.update(report.id, { synced: true })
      count++
    }
  }
  return count
}
