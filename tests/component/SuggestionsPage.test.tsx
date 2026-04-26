import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SuggestionsPage } from '../../src/pages/SuggestionsPage'

vi.mock('../../src/lib/suggestions', () => ({
  submitSuggestion: vi.fn().mockResolvedValue(undefined),
}))

import { submitSuggestion } from '../../src/lib/suggestions'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/suggestions']}>
      <SuggestionsPage />
    </MemoryRouter>
  )
}

describe('SuggestionsPage', () => {
  beforeEach(() => {
    vi.mocked(submitSuggestion).mockClear()
  })

  it('submit disabled when empty, enabled with text', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByText('Enviar sugerencia').closest('button')).toBeDisabled()
    await user.type(screen.getByLabelText('Tu sugerencia'), 'Add sound effects')
    expect(screen.getByText('Enviar sugerencia').closest('button')).not.toBeDisabled()
  })

  it('submits with name and shows confirmation + reset', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Tu sugerencia'), 'Add sound effects')
    await user.type(screen.getByLabelText(/Tu nombre/), 'Mateo')
    await user.click(screen.getByText('Enviar sugerencia'))

    expect(submitSuggestion).toHaveBeenCalledWith('Add sound effects', 'Mateo')
    expect(screen.getByText('Gracias por tu sugerencia!')).toBeInTheDocument()

    await user.click(screen.getByText('Enviar otra sugerencia'))
    expect(screen.getByLabelText('Tu sugerencia')).toBeInTheDocument()
  })

  it('name field is optional', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('Tu sugerencia'), 'More colors please')
    await user.click(screen.getByText('Enviar sugerencia'))
    expect(submitSuggestion).toHaveBeenCalledWith('More colors please', '')
  })
})
