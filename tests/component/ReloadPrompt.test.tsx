import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockUpdateServiceWorker = vi.fn()
let mockNeedRefresh = false

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefresh, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}))

import { ReloadPrompt } from '../../src/components/ReloadPrompt'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ReloadPrompt />
    </MemoryRouter>,
  )
}

describe('ReloadPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNeedRefresh = false
  })

  it('calls updateServiceWorker on click, dismisses on X', async () => {
    mockNeedRefresh = true
    const user = userEvent.setup()
    renderAt('/')

    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByText('Actualizar'))
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('suppresses banner on /match/:id routes', () => {
    mockNeedRefresh = true
    renderAt('/match/abc-123')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
