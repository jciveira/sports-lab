import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { BackButton } from '../../src/components/ui/BackButton'

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn() }
})

function renderButton(props: { to?: string; label?: string } = {}) {
  return render(
    <MemoryRouter>
      <BackButton {...props} />
    </MemoryRouter>
  )
}

describe('BackButton', () => {
  it('renders a link when to prop is provided', () => {
    renderButton({ to: '/home' })
    const link = screen.getByRole('link')
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/home')
  })

  it('renders a button when no to prop', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderButton()
    expect(screen.getByRole('button')).toBeDefined()
  })

  it('calls navigate(-1) when button clicked', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderButton()
    await user.click(screen.getByRole('button'))
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('renders label text when provided', () => {
    renderButton({ to: '/', label: 'Inicio' })
    expect(screen.getByText('Inicio')).toBeDefined()
  })

  it('renders without label by default (icon-only)', () => {
    renderButton({ to: '/' })
    const link = screen.getByRole('link')
    expect(link.textContent?.trim()).toBe('')
  })
})
