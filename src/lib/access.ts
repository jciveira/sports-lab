import { supabase, isSupabaseConfigured } from './supabase'

/** Release a claimed role (e.g. on disconnect) */
export async function releaseRole(
  matchId: string,
  role: 'scorekeeper' | 'stat_tracker',
  sessionId: string,
): Promise<void> {
  if (!isSupabaseConfigured) return

  const claimedByColumn = role === 'scorekeeper' ? 'scorekeeper_claimed_by' : 'stat_tracker_claimed_by'
  const additionalNulls = role === 'scorekeeper'
    ? { scorekeeper_name: null, scorekeeper_last_active_at: null }
    : {}

  await supabase
    .from('matches')
    .update({ [claimedByColumn]: null, ...additionalNulls })
    .eq('id', matchId)
    .eq(claimedByColumn, sessionId)
}

/** Pure helper — true if scorekeeper's last heartbeat is older than 2 minutes */
export function isScorekeeperTimedOut(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false
  return Date.now() - new Date(lastActiveAt).getTime() > 2 * 60 * 1000
}

/** Claim the scorekeeper role by display name (no code required).
 *  force=true lets admin override an existing claim unconditionally.
 *  Also handles timed-out claims (last_active_at > 2 min) transparently. */
export async function claimScorekeeperByName(
  matchId: string,
  sessionId: string,
  displayName: string,
  force = false,
): Promise<boolean> {
  if (!isSupabaseConfigured) return true

  const payload = {
    scorekeeper_claimed_by: sessionId,
    scorekeeper_name: displayName,
    scorekeeper_last_active_at: new Date().toISOString(),
  }

  if (force) {
    const { error } = await supabase.from('matches').update(payload).eq('id', matchId)
    return !error
  }

  // First try: claim if currently unclaimed
  const { data, error } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', matchId)
    .is('scorekeeper_claimed_by', null)
    .select()
    .single()

  if (!error && data) return true

  // Second try: claim if existing claim has timed out
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: timedOut } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', matchId)
    .lt('scorekeeper_last_active_at', twoMinutesAgo)
    .select()
    .single()

  if (timedOut) return true

  // Third try: check if we already own the claim (reconnect)
  const { data: existing } = await supabase
    .from('matches')
    .select('scorekeeper_claimed_by')
    .eq('id', matchId)
    .single()

  return existing?.scorekeeper_claimed_by === sessionId
}

/** Update the scorekeeper heartbeat so the 2-min timeout doesn't kick in */
export async function scorekeeperHeartbeat(matchId: string, sessionId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  await supabase
    .from('matches')
    .update({ scorekeeper_last_active_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('scorekeeper_claimed_by', sessionId)
}
