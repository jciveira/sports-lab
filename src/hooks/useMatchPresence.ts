import { useEffect, useState, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AccessRole } from '../types'

interface PresenceState {
  adminPresent: boolean
}

/**
 * Track who's present on a match channel via Supabase Realtime Presence.
 * Each participant broadcasts their role; consumers can check if admin is online.
 */
export function useMatchPresence(
  matchId: string | null,
  role: AccessRole | undefined,
): PresenceState {
  const [adminPresent, setAdminPresent] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!matchId || !role || !isSupabaseConfigured) return

    const channel = supabase.channel(`presence:match:${matchId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const hasAdmin = Object.values(state)
          .flat()
          .some((p: Record<string, unknown>) => p.role === 'admin')
        setAdminPresent(hasAdmin)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role })
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [matchId, role])

  return { adminPresent }
}
