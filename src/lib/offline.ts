import Dexie, { type EntityTable } from 'dexie'

/** Local event stored in IndexedDB before syncing to Supabase */
export interface LocalMatchEvent {
  /** Auto-incremented local ID */
  id?: number
  /** The Supabase match ID this event belongs to */
  matchId: string
  /** Event type: goal, assist, save, exclusion, timeout, halftime */
  type: string
  teamId?: string
  playerId?: string
  relatedEventId?: string
  minute: number
  half: number
  /** Whether this event has been pushed to Supabase */
  synced: boolean
  /** When the event was created locally */
  createdAt: string
}

/** Local snapshot of match state for offline recovery */
export interface LocalMatchState {
  /** The Supabase match ID — also the primary key */
  matchId: string
  homeScore: number
  awayScore: number
  status: string
  currentHalf: number
  clockSeconds: number
  homeTimeoutsLeft: number
  awayTimeoutsLeft: number
  /** Last time this snapshot was updated */
  updatedAt: string
}

/** Local suggestion queued for sync to Supabase */
export interface LocalSuggestion {
  /** Auto-incremented local ID */
  id?: number
  /** Suggestion text */
  text: string
  /** Optional name (first name / nickname only) */
  name: string
  /** Whether this has been pushed to Supabase */
  synced: boolean
  /** When the suggestion was created locally */
  createdAt: string
}

/** Local bug report queued for sync to Supabase */
export interface LocalBugReport {
  /** Auto-incremented local ID */
  id?: number
  /** Bug description */
  description: string
  /** Page URL where the bug was reported */
  pageUrl: string
  /** Browser user agent */
  userAgent: string
  /** URL of uploaded screenshot in Supabase Storage (set after upload) */
  screenshotUrl?: string
  /** Whether this has been pushed to Supabase */
  synced: boolean
  /** When the report was created locally */
  createdAt: string
}

class OfflineDB extends Dexie {
  events!: EntityTable<LocalMatchEvent, 'id'>
  matchState!: EntityTable<LocalMatchState, 'matchId'>
  suggestions!: EntityTable<LocalSuggestion, 'id'>
  bugReports!: EntityTable<LocalBugReport, 'id'>

  constructor() {
    super('handball-lab')
    this.version(1).stores({
      events: '++id, matchId, createdAt',
      matchState: 'matchId',
    })
    this.version(2).stores({
      events: '++id, matchId, createdAt',
      matchState: 'matchId',
      suggestions: '++id, synced, createdAt',
    })
    this.version(3).stores({
      events: '++id, matchId, createdAt',
      matchState: 'matchId',
      suggestions: '++id, synced, createdAt',
      bugReports: '++id, synced, createdAt',
    })
  }
}

export const db = new OfflineDB()
