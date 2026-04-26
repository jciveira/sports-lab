import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminGuard } from '../../src/components/AdminGuard'

const SESSION_KEY = 'hbl_admin_auth'

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/admin/teams']}>
      <Routes>
        <Route element={<AdminGuard />}>
          <Route path="/admin/teams" element={<div>Admin Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminGuard', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('shows PIN prompt when not authenticated', () => {
    renderGuard()
    expect(screen.getByText('Administración')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('PIN')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('shows error on incorrect PIN', async () => {
    const user = userEvent.setup()
    renderGuard()
    await user.type(screen.getByPlaceholderText('PIN'), '9999')
    await user.click(screen.getByText('Acceder'))
    expect(await screen.findByText('PIN incorrecto')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('grants access on correct PIN and stores in sessionStorage', async () => {
    const user = userEvent.setup()
    renderGuard()
    await user.type(screen.getByPlaceholderText('PIN'), '1234')
    await user.click(screen.getByText('Acceder'))
    expect(await screen.findByText('Admin Content')).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('true')
  })

  it('skips PIN prompt when already authenticated', () => {
    sessionStorage.setItem(SESSION_KEY, 'true')
    renderGuard()
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
    expect(screen.queryByText('Administración')).not.toBeInTheDocument()
  })

  it('disables submit button when PIN is empty', () => {
    renderGuard()
    expect(screen.getByText('Acceder')).toBeDisabled()
  })
})
