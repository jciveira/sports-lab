import type { AccessRole } from '../types'
import { supabase, isSupabaseConfigured } from './supabase'

const SESSION_KEY = 'hbl_session'

interface SessionData {
  matchId: string
  role: AccessRole
  sessionId: string // unique per browser tab
  displayName?: string // scorekeeper display name
}

function generateSessionId(): string {
  return crypto.randomUUID()
}

function storageFor(role: AccessRole): Storage {
  return role === 'viewer' || role === 'scorekeeper' ? sessionStorage : localStorage
}

/** Save match session — admin/stat_tracker persist in localStorage; scorekeeper/viewer in sessionStorage */
export function saveSession(matchId: string, role: AccessRole, displayName?: string): string {
  const sessionId = generateSessionId()
  const data: SessionData = { matchId, role, sessionId, ...(displayName ? { displayName } : {}) }
  storageFor(role).setItem(SESSION_KEY, JSON.stringify(data))
  return sessionId
}

/** Get current session (checks localStorage first, then sessionStorage) */
export function getSession(): SessionData | null {
  // admin/stat_tracker in localStorage; scorekeeper/viewer in sessionStorage
  const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Clear session from both storages */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: 'reassigned' | 'finished' | 'not_found' }

/** Verify that a stored operator session is still valid against the DB */
export async function verifySession(session: SessionData): Promise<VerifyResult> {
  if (!isSupabaseConfigured) return { valid: true }

  const { data: match } = await supabase
    .from('matches')
    .select('status, scorekeeper_claimed_by, stat_tracker_claimed_by')
    .eq('id', session.matchId)
    .single()

  if (!match) return { valid: false, reason: 'not_found' }

  if (match.status === 'finished') return { valid: false, reason: 'finished' }

  // For operator roles, verify our claim is still active
  if (session.role === 'scorekeeper' || session.role === 'stat_tracker') {
    const claimedBy = session.role === 'scorekeeper'
      ? match.scorekeeper_claimed_by
      : match.stat_tracker_claimed_by

    if (claimedBy !== session.sessionId) {
      return { valid: false, reason: 'reassigned' }
    }
  }

  return { valid: true }
}
