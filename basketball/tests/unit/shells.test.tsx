import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom'
import React from 'react'
import { ViewerShell } from '../../src/components/ViewerShell'
import { AdminShell } from '../../src/components/AdminShell'
import { BackButton } from '../../src/components/BackButton'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: vi.fn() }),
}))

function renderInRouter(element: React.ReactElement, initialPath = '/partidos') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      {element}
    </MemoryRouter>,
  )
}

// ─── ViewerShell ─────────────────────────────────────────────────────────────

describe('ViewerShell', () => {
  it('renders bottom tab bar with 4 tabs', () => {
    renderInRouter(
      <Routes>
        <Route element={<ViewerShell />}>
          <Route path="/partidos" element={<div>Partidos content</div>} />
          <Route path="/torneos" element={<div />} />
          <Route path="/jugadores" element={<div />} />
          <Route path="/mas" element={<div />} />
        </Route>
      </Routes>,
    )
    expect(screen.getByText('Partidos')).toBeInTheDocument()
    expect(screen.getByText('Torneos')).toBeInTheDocument()
    expect(screen.getByText('Jugadores')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  it('renders the outlet content', () => {
    renderInRouter(
      <Routes>
        <Route element={<ViewerShell />}>
          <Route path="/partidos" element={<div>outlet-content</div>} />
        </Route>
      </Routes>,
    )
    expect(screen.getByText('outlet-content')).toBeInTheDocument()
  })
})

// ─── AdminShell ──────────────────────────────────────────────────────────────

describe('AdminShell', () => {
  it('renders tab bar on a top-level admin route', () => {
    renderInRouter(
      <Routes>
        <Route element={<AdminShell />}>
          <Route path="/admin/partidos" element={<div>admin content</div>} />
        </Route>
      </Routes>,
      '/admin/partidos',
    )
    expect(screen.getByText('Partidos')).toBeInTheDocument()
    expect(screen.getByText('Torneos')).toBeInTheDocument()
    expect(screen.getByText('Equipos')).toBeInTheDocument()
    expect(screen.getByText('Jugadores')).toBeInTheDocument()
  })

  it('hides tab bar on detail routes', () => {
    renderInRouter(
      <Routes>
        <Route element={<AdminShell />}>
          <Route path="/admin/match/:id" element={<div>match detail</div>} />
        </Route>
      </Routes>,
      '/admin/match/abc-123',
    )
    expect(screen.queryByText('Equipos')).not.toBeInTheDocument()
  })
})

// ─── BackButton ──────────────────────────────────────────────────────────────

describe('BackButton', () => {
  it('renders a link when "to" prop is provided', () => {
    renderInRouter(<BackButton to="/partidos" label="Volver" />)
    const link = screen.getByRole('link', { name: 'Volver' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/partidos')
  })

  it('renders a button when no "to" prop is given', () => {
    renderInRouter(<BackButton />)
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('renders label text when provided', () => {
    renderInRouter(<BackButton to="/torneos" label="Torneos" />)
    expect(screen.getByText('Torneos')).toBeInTheDocument()
  })
})
