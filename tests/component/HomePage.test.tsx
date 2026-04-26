import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '../../src/pages/HomePage'

vi.mock('../../src/hooks/usePwaInstall')

import { usePwaInstall } from '../../src/hooks/usePwaInstall'

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage install prompt', () => {
  const mockTriggerInstall = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows nothing when install state is hidden', () => {
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'hidden', triggerInstall: mockTriggerInstall })
    renderPage()
    expect(screen.queryByText(/instalar app en tu móvil/i)).not.toBeInTheDocument()
  })

  it('calls triggerInstall when install button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'android-prompt', triggerInstall: mockTriggerInstall })
    renderPage()
    await user.click(screen.getByText(/instalar app en tu móvil/i))
    expect(mockTriggerInstall).toHaveBeenCalledOnce()
  })

  it('shows iOS tip when state is ios-tip', () => {
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'ios-tip', triggerInstall: mockTriggerInstall })
    renderPage()
    expect(screen.getByText(/Añadir a pantalla de inicio/)).toBeInTheDocument()
  })
})

describe('HomePage navigation', () => {
  beforeEach(() => {
    vi.mocked(usePwaInstall).mockReturnValue({ state: 'hidden', triggerInstall: vi.fn() })
  })

  it('shows admin links when Administración is expanded and collapses on second click', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.queryByText('Partidos')).not.toBeInTheDocument()
    await user.click(screen.getByText('Administración'))
    expect(screen.getByText('Partidos')).toBeInTheDocument()
    expect(screen.getByText('Equipos')).toBeInTheDocument()
    expect(screen.getByText('Jugadores')).toBeInTheDocument()
    await user.click(screen.getByText('Administración'))
    expect(screen.queryByText('Partidos')).not.toBeInTheDocument()
  })
})
