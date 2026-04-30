import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useFontSize } from '../../src/hooks/useFontSize'
import { MasTab } from '../../src/pages/MasTab'

// ---------------------------------------------------------------------------
// useFontSize
// ---------------------------------------------------------------------------

describe('useFontSize', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty('--bbl-score-scale')
  })

  it('defaults to "normal" when localStorage is empty', () => {
    const { result } = renderHook(() => useFontSize())
    expect(result.current.fontSize).toBe('normal')
  })

  it('reads persisted value from localStorage', () => {
    localStorage.setItem('bbl-font-size', 'large')
    const { result } = renderHook(() => useFontSize())
    expect(result.current.fontSize).toBe('large')
  })

  it('defaults to normal for invalid stored value', () => {
    localStorage.setItem('bbl-font-size', 'huge')
    const { result } = renderHook(() => useFontSize())
    expect(result.current.fontSize).toBe('normal')
  })

  it('sets CSS variable when size changes', () => {
    const { result } = renderHook(() => useFontSize())
    act(() => { result.current.setFontSize('small') })
    expect(document.documentElement.style.getPropertyValue('--bbl-score-scale')).toBe('0.75')
  })

  it('persists size to localStorage on change', () => {
    const { result } = renderHook(() => useFontSize())
    act(() => { result.current.setFontSize('large') })
    expect(localStorage.getItem('bbl-font-size')).toBe('large')
  })

  it('applies CSS variable on mount for stored size', () => {
    localStorage.setItem('bbl-font-size', 'small')
    renderHook(() => useFontSize())
    expect(document.documentElement.style.getPropertyValue('--bbl-score-scale')).toBe('0.75')
  })
})

// ---------------------------------------------------------------------------
// MasTab — font size toggle interaction
// ---------------------------------------------------------------------------

vi.mock('../../src/hooks/usePwaInstall', () => ({
  usePwaInstall: () => ({ state: 'hidden', triggerInstall: vi.fn() }),
}))

function renderMasTab() {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(MasTab)),
  )
}

describe('MasTab', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty('--bbl-score-scale')
  })

  it('renders suggestions link', () => {
    renderMasTab()
    expect(screen.getByText('Sugerencias')).toBeTruthy()
  })

  it('renders admin link', () => {
    renderMasTab()
    expect(screen.getByText('Administración')).toBeTruthy()
  })

  it('renders three font size buttons', () => {
    renderMasTab()
    const sizeSection = screen.getByText('Tamaño del marcador')
    expect(sizeSection).toBeTruthy()
    // Three A buttons rendered
    const buttons = screen.getAllByRole('button').filter(b => b.textContent === 'A')
    expect(buttons).toHaveLength(3)
  })

  it('clicking font size button changes persisted value', () => {
    renderMasTab()
    const buttons = screen.getAllByRole('button').filter(b => b.textContent === 'A')
    // buttons are [small, normal, large] — click last (large)
    fireEvent.click(buttons[2])
    expect(localStorage.getItem('bbl-font-size')).toBe('large')
  })

  it('shows clear cache confirmation on click', () => {
    renderMasTab()
    const clearBtn = screen.getByText('Limpiar caché')
    fireEvent.click(clearBtn)
    expect(screen.getByText('¿Limpiar caché?')).toBeTruthy()
    expect(screen.getByText('Cancelar')).toBeTruthy()
  })

  it('hides clear cache modal on cancel', () => {
    renderMasTab()
    fireEvent.click(screen.getByText('Limpiar caché'))
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.queryByText('¿Limpiar caché?')).toBeNull()
  })
})
