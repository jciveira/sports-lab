import { db, type LocalMatchEvent, type LocalMatchState } from './offline'
import { supabase, isSupabaseConfigured } from './supabase'
import { useMatchStore } from '../hooks/useMatchStore'

// ── Event queue ──────────────────────────────────────────────

/** Queue a match event locally. Will be synced to Supabase when online. */
export async function queueEvent(
  matchId: string,
  event: Omit<LocalMatchEvent, 'id' | 'matchId' | 'synced' | 'createdAt'>,
): Promise<void> {
  await db.events.add({
    matchId,
    ...event,
    synced: false,
    createdAt: new Date().toISOString(),
  })
}

/** Push all unsynced events for a match to Supabase. Returns count of synced events. */
export async function syncEvents(matchId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0

  const unsynced = await db.events
    .where('matchId').equals(matchId)
    .filter((e) => !e.synced)
    .sortBy('createdAt')

  if (unsynced.length === 0) return 0

  let syncedCount = 0
  for (const event of unsynced) {
    const { error } = await supabase.from('match_events').insert({
      match_id: event.matchId,
      type: event.type,
      team_id: event.teamId ?? null,
      player_id: event.playerId ?? null,
      related_event_id: event.relatedEventId ?? null,
      minute: event.minute,
      half: event.half,
    })

    if (error) {
      console.error('[sync] failed to insert event:', event.type, error)
    } else if (event.id !== undefined) {
      await db.events.update(event.id, { synced: true })
      syncedCount++
    }
  }

  return syncedCount
}

// ── Match state snapshot ─────────────────────────────────────

/** Save the current Zustand match state to IndexedDB for offline recovery */
export async function saveMatchStateLocally(matchId: string): Promise<void> {
  const state = useMatchStore.getState()
  const snapshot: LocalMatchState = {
    matchId,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    status: state.status,
    currentHalf: state.currentHalf,
    clockSeconds: state.clockSeconds,
    homeTimeoutsLeft: state.homeTimeoutsLeft,
    awayTimeoutsLeft: state.awayTimeoutsLeft,
    updatedAt: new Date().toISOString(),
  }
  await db.matchState.put(snapshot)
}

/** Restore match state from IndexedDB into Zustand store. Returns true if state was found. */
export async function restoreMatchState(matchId: string): Promise<boolean> {
  const snapshot = await db.matchState.get(matchId)
  if (!snapshot) return false

  useMatchStore.setState({
    homeScore: snapshot.homeScore,
    awayScore: snapshot.awayScore,
    status: snapshot.status as ReturnType<typeof useMatchStore.getState>['status'],
    currentHalf: snapshot.currentHalf,
    clockSeconds: snapshot.clockSeconds,
    homeTimeoutsLeft: snapshot.homeTimeoutsLeft,
    awayTimeoutsLeft: snapshot.awayTimeoutsLeft,
  })
  return true
}

/** Push local match state snapshot to Supabase */
export async function syncMatchState(matchId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const snapshot = await db.matchState.get(matchId)
  if (!snapshot) return false

  const { error } = await supabase
    .from('matches')
    .update({
      home_score: snapshot.homeScore,
      away_score: snapshot.awayScore,
      status: snapshot.status,
      current_half: snapshot.currentHalf,
      clock_seconds: snapshot.clockSeconds, // legacy fallback for offline recovery
      home_timeouts_left: snapshot.homeTimeoutsLeft,
      away_timeouts_left: snapshot.awayTimeoutsLeft,
    })
    .eq('id', matchId)

  return !error
}

// ── Full sync ────────────────────────────────────────────────

/** Sync everything for a match: state + events. Returns summary. */
export async function syncAll(matchId: string): Promise<{ events: number; stateOk: boolean }> {
  const [events, stateOk] = await Promise.all([
    syncEvents(matchId),
    syncMatchState(matchId),
  ])
  return { events, stateOk }
}

// ── Unsynced count (for UI indicator) ────────────────────────

/** Get count of unsynced events for a match */
export async function getUnsyncedCount(matchId: string): Promise<number> {
  const unsynced = await db.events
    .where('matchId').equals(matchId)
    .filter((e) => !e.synced)
    .toArray()
  return unsynced.length
}
