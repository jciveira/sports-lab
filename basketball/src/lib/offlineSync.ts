import { offlineDb, type PendingEvent } from './offline'
import { supabase } from './supabase'

/** Reactive online status — updated by window online/offline events */
export const onlineStatus = { isOnline: true }

/** Call once from main to wire up online/offline listeners */
export function initOnlineListener(): void {
  onlineStatus.isOnline = navigator.onLine

  window.addEventListener('online', () => {
    onlineStatus.isOnline = true
  })

  window.addEventListener('offline', () => {
    onlineStatus.isOnline = false
  })
}

/** Add an event to IndexedDB with synced: false */
export async function queueEvent(
  event: Omit<PendingEvent, 'id' | 'synced' | 'createdAt'>,
): Promise<void> {
  await offlineDb.pendingEvents.add({
    ...event,
    synced: false,
    createdAt: new Date().toISOString(),
  })
}

/** Flush all pending (synced: false) events to Supabase in insertion order.
 *  - On success: marks synced: true
 *  - On duplicate key (23505): marks synced: true silently
 *  - On other errors: stops processing, leaves remaining unsynced
 */
export async function flushPendingEvents(): Promise<void> {
  const pending = await offlineDb.pendingEvents
    .where('synced')
    .equals(0) // Dexie stores booleans as 0/1 in indexes
    .sortBy('id')

  for (const event of pending) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('match_events') as any)
      .insert({
        id: event.eventId,
        match_id: event.matchId,
        type: event.type,
        team_id: event.teamId,
        player_id: null,
        quarter: event.quarter,
        time_remaining: event.timeRemaining,
        synced: true,
      })
      .select()
      .single()

    if (!error) {
      await offlineDb.pendingEvents.update(event.id!, { synced: true })
    } else if ((error as { code?: string }).code === '23505') {
      // Duplicate — skip silently
      await offlineDb.pendingEvents.update(event.id!, { synced: true })
    } else {
      // Unknown error — stop flushing, leave the rest pending
      console.warn('flushPendingEvents: Supabase insert failed, stopping flush', error)
      break
    }
  }
}

/** Count of events not yet synced to Supabase */
export async function getPendingCount(): Promise<number> {
  return offlineDb.pendingEvents.where('synced').equals(0).count()
}
