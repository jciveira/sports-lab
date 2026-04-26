import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MoreTab } from '../../src/pages/MoreTab'

// Prevent actual navigation in tests
Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '/' },
})

vi.mock('../../src/hooks/usePwaInstall')
vi.mock('../../src/hooks/useTheme')
vi.mock('../../src/hooks/useFontSize')

import { usePwaInstall } from '../../src/hooks/usePwaInstall'
import { useTheme } from '../../src/hooks/useTheme'
import { useFontSize } from '../../src/hooks/useFontSize'

function renderPage() {
  return render(
    <MemoryRouter>
      <MoreTab />
    </MemoryRouter>,
  )
}

describe('MoreTab', () => {
  const mockTriggerInstall = vi.fn()
  const mockToggle = vi.fn()
  const mockSetFontSize = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'hidden', triggerInstall: mockTriggerInstall })
    vi.mocked(useTheme).mockReturnValue({ theme: 'dark', toggle: mockToggle })
    vi.mocked(useFontSize).mockReturnValue({ fontSize: 'normal', setFontSize: mockSetFontSize })
  })

  it('renders all static links with correct hrefs', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /marcador rápido/i })).toHaveAttribute('href', '/scoreboard')
    expect(screen.getByRole('link', { name: /guía para padres/i })).toHaveAttribute('href', '/help')
    expect(screen.getByRole('link', { name: /sugerencias/i })).toHaveAttribute('href', '/suggestions')
    expect(screen.getByRole('link', { name: /administración/i })).toHaveAttribute('href', '/admin/partidos')
  })

  it('hides install entry when state is hidden', () => {
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'hidden', triggerInstall: mockTriggerInstall })
    renderPage()
    expect(screen.queryByText('Instalar app')).not.toBeInTheDocument()
  })

  it('shows install button and calls triggerInstall when state is android-prompt', async () => {
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'android-prompt', triggerInstall: mockTriggerInstall })
    renderPage()
    const btn = screen.getByRole('button', { name: /instalar app/i })
    expect(btn).toBeInTheDocument()
    await userEvent.click(btn)
    expect(mockTriggerInstall).toHaveBeenCalledOnce()
  })

  it('shows ios install button that opens step-by-step modal when state is ios-tip', async () => {
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'ios-tip', triggerInstall: mockTriggerInstall })
    const user = userEvent.setup()
    renderPage()
    const btn = screen.getByRole('button', { name: /instalar app/i })
    expect(btn).toBeInTheDocument()
    await user.click(btn)
    expect(screen.getByRole('dialog', { name: /añadir a pantalla de inicio/i })).toBeInTheDocument()
    expect(screen.getByText(/compartir/i)).toBeInTheDocument()
    expect(screen.getByText(/confirma pulsando/i)).toBeInTheDocument()
  })

  it('closes ios guide modal on X button', async () => {
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'ios-tip', triggerInstall: mockTriggerInstall })
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /instalar app/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(screen.queryByRole('dialog', { name: /añadir a pantalla de inicio/i })).not.toBeInTheDocument()
  })

  it('shows desktop install tip when state is desktop-tip', () => {
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'desktop-tip', triggerInstall: mockTriggerInstall })
    renderPage()
    expect(screen.getByText('Instalar app')).toBeInTheDocument()
    expect(screen.getByText(/menú del navegador.*busca/i)).toBeInTheDocument()
  })

  it('shows Limpiar caché button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /limpiar caché/i })).toBeInTheDocument()
  })

  it('shows confirmation dialog when Limpiar caché is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /limpiar caché/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/seguro|cerrarán|reiniciará/i)).toBeInTheDocument()
  })

  it('hides confirmation dialog on cancel', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /limpiar caché/i }))
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clears localStorage and navigates to / on confirm', async () => {
    localStorage.setItem('hbl-test', 'value')
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /limpiar caché/i }))
    await user.click(screen.getByRole('button', { name: /^limpiar$/i }))
    expect(localStorage.getItem('hbl-test')).toBeNull()
    expect(window.location.href).toBe('/')
  })

  it('shows theme toggle button in dark mode (label: Tema claro)', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'dark', toggle: mockToggle })
    renderPage()
    expect(screen.getByRole('button', { name: /cambiar a tema claro/i })).toBeInTheDocument()
  })

  it('shows theme toggle button in light mode (label: Tema oscuro)', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', toggle: mockToggle })
    renderPage()
    expect(screen.getByRole('button', { name: /cambiar a tema oscuro/i })).toBeInTheDocument()
  })

  it('calls toggle when theme button is clicked', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /cambiar a tema/i }))
    expect(mockToggle).toHaveBeenCalledOnce()
  })

  describe('font size picker', () => {
    it('renders all three font size options', () => {
      renderPage()
      expect(screen.getByRole('button', { name: 'Pequeño' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Normal' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Grande' })).toBeInTheDocument()
    })

    it('marks current fontSize as pressed', () => {
      vi.mocked(useFontSize).mockReturnValue({ fontSize: 'large', setFontSize: mockSetFontSize })
      renderPage()
      expect(screen.getByRole('button', { name: 'Grande' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Normal' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('calls setFontSize when a size option is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'Grande' }))
      expect(mockSetFontSize).toHaveBeenCalledWith('large')
    })

    it('calls setFontSize with small when Pequeño is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'Pequeño' }))
      expect(mockSetFontSize).toHaveBeenCalledWith('small')
    })
  })
})
