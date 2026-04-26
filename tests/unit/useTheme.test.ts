import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../../src/hooks/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light')
  })

  it('defaults to dark when no localStorage value is set', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('reads light from localStorage on init', () => {
    localStorage.setItem('hbl-theme', 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('toggles from dark to light and adds html.light class', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.toggle() })
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('toggles from light back to dark and removes html.light class', () => {
    localStorage.setItem('hbl-theme', 'light')
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.toggle() })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('persists selection to localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.toggle() })
    expect(localStorage.getItem('hbl-theme')).toBe('light')
  })
})
