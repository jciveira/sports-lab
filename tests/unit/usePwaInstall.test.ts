import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePwaInstall } from '../../src/hooks/usePwaInstall'

// Helpers to control matchMedia mock
function setStandalone(value: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? value : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { writable: true, value: ua })
}

describe('usePwaInstall', () => {
  beforeEach(() => {
    setStandalone(false)
    setUserAgent('Mozilla/5.0 (Linux; Android 12) AppleWebKit Chrome/120')
    // Clear standalone Safari property
    Object.defineProperty(navigator, 'standalone', { writable: true, value: undefined })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows android-tip by default on Android (no prompt event yet)', () => {
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.state).toBe('android-tip')
  })

  it('shows desktop-tip on desktop browsers', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit Chrome/120')
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.state).toBe('desktop-tip')
  })

  it('upgrades to android-prompt after beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePwaInstall())

    const mockPrompt = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' as const }), preventDefault: vi.fn() }
    act(() => {
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), mockPrompt))
    })

    expect(result.current.state).toBe('android-prompt')
  })

  it('triggerInstall calls prompt() and resets to hidden when accepted', async () => {
    const { result } = renderHook(() => usePwaInstall())

    const mockPromptFn = vi.fn().mockResolvedValue(undefined)
    const mockEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt: mockPromptFn,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
      preventDefault: vi.fn(),
    })

    act(() => { window.dispatchEvent(mockEvent) })
    expect(result.current.state).toBe('android-prompt')

    await act(async () => { await result.current.triggerInstall() })

    expect(mockPromptFn).toHaveBeenCalledOnce()
    expect(result.current.state).toBe('hidden')
  })

  it('triggerInstall falls back to android-tip when dismissed', async () => {
    const { result } = renderHook(() => usePwaInstall())

    const mockPromptFn = vi.fn().mockResolvedValue(undefined)
    const mockEvent = Object.assign(new Event('beforeinstallprompt'), {
      prompt: mockPromptFn,
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
      preventDefault: vi.fn(),
    })

    act(() => { window.dispatchEvent(mockEvent) })
    await act(async () => { await result.current.triggerInstall() })

    expect(result.current.state).toBe('android-tip')
  })

  it('shows ios-tip on iOS Safari (not standalone)', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604.1')
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.state).toBe('ios-tip')
  })

  it('stays hidden when already installed (standalone mode)', () => {
    setStandalone(true)
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.state).toBe('hidden')
  })

  it('stays hidden on iOS when already installed (navigator.standalone)', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604.1')
    Object.defineProperty(navigator, 'standalone', { writable: true, value: true })
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.state).toBe('hidden')
  })
})
