import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ViewerShell } from '../../src/components/ViewerShell'

function renderShell(initialPath = '/partidos') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ViewerShell />}>
          <Route path="/partidos" element={<div>matches-content</div>} />
          <Route path="/torneos" element={<div>tournaments-content</div>} />
          <Route path="/plantillas" element={<div>rosters-content</div>} />
          <Route path="/mas" element={<div>more-content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ViewerShell', () => {
  it('renders all four tab labels', () => {
    renderShell()
    expect(screen.getByText('Partidos')).toBeInTheDocument()
    expect(screen.getByText('Torneos')).toBeInTheDocument()
    expect(screen.getByText('Plantillas')).toBeInTheDocument()
    expect(screen.getByText('Más')).toBeInTheDocument()
  })

  it('renders the active tab content', () => {
    renderShell('/partidos')
    expect(screen.getByText('matches-content')).toBeInTheDocument()
  })

  it('navigates between tabs on click', async () => {
    const user = userEvent.setup()
    renderShell('/partidos')

    expect(screen.getByText('matches-content')).toBeInTheDocument()

    await user.click(screen.getByText('Torneos'))
    expect(screen.getByText('tournaments-content')).toBeInTheDocument()
    expect(screen.queryByText('matches-content')).not.toBeInTheDocument()

    await user.click(screen.getByText('Plantillas'))
    expect(screen.getByText('rosters-content')).toBeInTheDocument()

    await user.click(screen.getByText('Más'))
    expect(screen.getByText('more-content')).toBeInTheDocument()
  })

  it('highlights the active tab with accent color', () => {
    renderShell('/torneos')
    const torneosLink = screen.getByText('Torneos').closest('a')
    const partidosLink = screen.getByText('Partidos').closest('a')

    expect(torneosLink?.className).toContain('text-hbl-accent')
    expect(partidosLink?.className).toContain('text-hbl-text-muted')
  })
})
