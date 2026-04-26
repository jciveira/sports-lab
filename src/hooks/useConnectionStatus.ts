import { useState, useEffect, useCallback, useRef } from 'react'
import { syncAll } from '../lib/sync'

export type ConnectionState = 'online' | 'offline' | 'syncing'

interface UseConnectionStatusOptions {
  matchId: string | null
}

export function useConnectionStatus({ matchId }: UseConnectionStatusOptions) {
  const [state, setState] = useState<ConnectionState>(
    navigator.onLine ? 'online' : 'offline',
  )
  const [pendingCount, setPendingCount] = useState(0)
  const syncingRef = useRef(false)

  const doSync = useCallback(async () => {
    if (!matchId || syncingRef.current) return
    syncingRef.current = true
    setState('syncing')

    try {
      const result = await syncAll(matchId)
      setPendingCount(0)
      console.debug('[sync] completed:', result)
    } catch (err) {
      console.error('[sync] failed:', err)
    } finally {
      syncingRef.current = false
      setState(navigator.onLine ? 'online' : 'offline')
    }
  }, [matchId])

  useEffect(() => {
    function handleOnline() {
      setState('online')
      doSync()
    }

    function handleOffline() {
      setState('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [doSync])

  const incrementPending = useCallback(() => {
    setPendingCount((c) => c + 1)
  }, [])

  return { state, pendingCount, incrementPending, doSync }
}
