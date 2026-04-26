import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminShell } from '../../src/components/AdminShell'

function renderShell(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AdminShell />}>
          <Route path="/admin/partidos" element={<div>Partidos Tab</div>} />
          <Route path="/admin/torneos" element={<div>Torneos Tab</div>} />
          <Route path="/admin/equipos" element={<div>Equipos Tab</div>} />
          <Route path="/admin/jugadores" element={<div>Jugadores Tab</div>} />
          <Route path="/admin/partidos/nuevo" element={<div>Nuevo Partido</div>} />
          <Route path="/admin/match/:matchId" element={<div>Match Detail</div>} />
          <Route path="/admin/equipos/:teamId/roster" element={<div>Roster Detail</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminShell', () => {
  it('renders bottom tab bar with 4 tabs', () => {
    renderShell('/admin/partidos')
    expect(screen.getByText('Partidos')).toBeInTheDocument()
    expect(screen.getByText('Torneos')).toBeInTheDocument()
    expect(screen.getByText('Equipos')).toBeInTheDocument()
    expect(screen.getByText('Jugadores')).toBeInTheDocument()
  })

  it('renders tab content for the active route', () => {
    renderShell('/admin/partidos')
    expect(screen.getByText('Partidos Tab')).toBeInTheDocument()
  })

  it('switches tabs when clicking another tab', async () => {
    const user = userEvent.setup()
    renderShell('/admin/partidos')
    await user.click(screen.getByText('Equipos'))
    expect(screen.getByText('Equipos Tab')).toBeInTheDocument()
  })

  it('hides tab bar on detail pages', () => {
    renderShell('/admin/match/abc-123')
    expect(screen.getByText('Match Detail')).toBeInTheDocument()
    expect(screen.queryByText('Torneos')).not.toBeInTheDocument()
  })

  it('hides tab bar on new match page', () => {
    renderShell('/admin/partidos/nuevo')
    expect(screen.getByText('Nuevo Partido')).toBeInTheDocument()
    expect(screen.queryByText('Torneos')).not.toBeInTheDocument()
  })

  it('hides tab bar on roster detail page', () => {
    renderShell('/admin/equipos/team-123/roster')
    expect(screen.getByText('Roster Detail')).toBeInTheDocument()
    expect(screen.queryByText('Torneos')).not.toBeInTheDocument()
  })
})
