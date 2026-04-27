import Dexie, { type EntityTable } from 'dexie'

/** Local event stored in IndexedDB before syncing to Supabase */
export interface PendingEvent {
  /** Auto-incremented local ID */
  id?: number
  /** The Supabase match ID this event belongs to */
  matchId: string
  /** The UUID we'll use when inserting to Supabase — pre-generated */
  eventId: string
  /** Event type: goal_2, goal_3, freethrow, foul, timeout, quarter_end */
  type: string
  teamId: string | null
  quarter: number
  timeRemaining: number
  /** Whether this event has been pushed to Supabase */
  synced: boolean
  /** When the event was created locally */
  createdAt: string
}

class BasketballOfflineDB extends Dexie {
  pendingEvents!: EntityTable<PendingEvent, 'id'>

  constructor() {
    super('basketball-lab')
    this.version(1).stores({
      pendingEvents: '++id, matchId, synced, createdAt',
    })
  }
}

export const offlineDb = new BasketballOfflineDB()
