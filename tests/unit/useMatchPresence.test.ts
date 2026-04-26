import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Build a mock Supabase channel that exposes presence event handlers
let syncHandler: (() => void) | null = null
let subscribeCallback: ((status: string) => void) | null = null
let trackedPayload: unknown = null
let presenceState: Record<string, unknown[]> = {}

const mockChannel = {
  on: vi.fn().mockImplementation((_event: string, _opts: unknown, handler: () => void) => {
    syncHandler = handler
    return mockChannel
  }),
  subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
    subscribeCallback = cb
    return mockChannel
  }),
  track: vi.fn().mockImplementation((payload: unknown) => {
    trackedPayload = payload
    return Promise.resolve()
  }),
  presenceState: vi.fn().mockImplementation(() => presenceState),
  unsubscribe: vi.fn(),
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
  },
  isSupabaseConfigured: true,
}))

describe('useMatchPresence', () => {
  beforeEach(() => {
    syncHandler = null
    subscribeCallback = null
    trackedPayload = null
    presenceState = {}
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns adminPresent=false when no admin in channel', async () => {
    const { useMatchPresence } = await import('../../src/hooks/useMatchPresence')

    const { result } = renderHook(() => useMatchPresence('match-1', 'scorekeeper'))

    // Simulate subscription
    act(() => { subscribeCallback?.('SUBSCRIBED') })

    // Simulate presence sync with only scorekeeper
    presenceState = { 'user-1': [{ role: 'scorekeeper' }] }
    act(() => { syncHandler?.() })

    expect(result.current.adminPresent).toBe(false)
  })

  it('returns adminPresent=true when admin joins', async () => {
    const { useMatchPresence } = await import('../../src/hooks/useMatchPresence')

    const { result } = renderHook(() => useMatchPresence('match-1', 'scorekeeper'))

    act(() => { subscribeCallback?.('SUBSCRIBED') })

    presenceState = {
      'user-1': [{ role: 'scorekeeper' }],
      'user-2': [{ role: 'admin' }],
    }
    act(() => { syncHandler?.() })

    expect(result.current.adminPresent).toBe(true)
  })

  it('tracks role on SUBSCRIBED', async () => {
    const { useMatchPresence } = await import('../../src/hooks/useMatchPresence')

    renderHook(() => useMatchPresence('match-1', 'scorekeeper'))

    act(() => { subscribeCallback?.('SUBSCRIBED') })

    expect(mockChannel.track).toHaveBeenCalledWith({ role: 'scorekeeper' })
  })

  it('does not subscribe when matchId is null', async () => {
    const { useMatchPresence } = await import('../../src/hooks/useMatchPresence')
    const { supabase } = await import('../../src/lib/supabase')

    renderHook(() => useMatchPresence(null, 'scorekeeper'))

    expect(supabase.channel).not.toHaveBeenCalled()
  })

  it('does not subscribe when role is undefined', async () => {
    const { useMatchPresence } = await import('../../src/hooks/useMatchPresence')
    const { supabase } = await import('../../src/lib/supabase')

    renderHook(() => useMatchPresence('match-1', undefined))

    expect(supabase.channel).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', async () => {
    const { useMatchPresence } = await import('../../src/hooks/useMatchPresence')

    const { unmount } = renderHook(() => useMatchPresence('match-1', 'admin'))

    unmount()

    expect(mockChannel.unsubscribe).toHaveBeenCalled()
  })

  it('detects admin leaving (adminPresent goes false)', async () => {
    const { useMatchPresence } = await import('../../src/hooks/useMatchPresence')

    const { result } = renderHook(() => useMatchPresence('match-1', 'scorekeeper'))

    act(() => { subscribeCallback?.('SUBSCRIBED') })

    // Admin joins
    presenceState = { 'user-1': [{ role: 'admin' }] }
    act(() => { syncHandler?.() })
    expect(result.current.adminPresent).toBe(true)

    // Admin leaves
    presenceState = {}
    act(() => { syncHandler?.() })
    expect(result.current.adminPresent).toBe(false)
  })
})
