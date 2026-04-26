import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BugReportButton } from '../../src/components/BugReportButton'

vi.mock('../../src/lib/bug-reports', () => ({
  submitBugReport: vi.fn().mockResolvedValue(undefined),
}))

import { submitBugReport } from '../../src/lib/bug-reports'

describe('BugReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens modal, submits report, shows confirmation', async () => {
    const user = userEvent.setup()
    render(<BugReportButton />)

    // Open
    await user.click(screen.getByLabelText('Reportar bug'))
    expect(screen.getByText('Enviar')).toBeDisabled()

    // Type and submit
    await user.type(screen.getByPlaceholderText('Describe el problema...'), 'The clock freezes')
    await user.click(screen.getByText('Enviar'))

    await waitFor(() => {
      expect(submitBugReport).toHaveBeenCalledWith('The clock freezes', null)
    })
    expect(screen.getByText('Bug reportado — gracias!')).toBeInTheDocument()
  })

  it('resets form when closing after submission', async () => {
    const user = userEvent.setup()
    render(<BugReportButton />)
    await user.click(screen.getByLabelText('Reportar bug'))
    await user.type(screen.getByPlaceholderText('Describe el problema...'), 'Bug')
    await user.click(screen.getByText('Enviar'))

    await waitFor(() => {
      expect(screen.getByText('Bug reportado — gracias!')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Cerrar'))
    await user.click(screen.getByLabelText('Reportar bug'))
    expect(screen.getByPlaceholderText('Describe el problema...')).toBeInTheDocument()
    expect(screen.queryByText('Bug reportado — gracias!')).not.toBeInTheDocument()
  })

  it('screenshot attach, preview, remove, and submit with file', async () => {
    const user = userEvent.setup()
    render(<BugReportButton />)
    await user.click(screen.getByLabelText('Reportar bug'))

    const file = new File(['fake-image'], 'screenshot.png', { type: 'image/png' })
    const input = screen.getByTestId('screenshot-input') as HTMLInputElement
    await user.upload(input, file)

    expect(screen.getByAltText('Vista previa')).toBeInTheDocument()

    // Remove and re-attach
    await user.click(screen.getByLabelText('Quitar captura'))
    expect(screen.queryByAltText('Vista previa')).not.toBeInTheDocument()

    await user.upload(input, file)
    await user.type(screen.getByPlaceholderText('Describe el problema...'), 'Layout broken')
    await user.click(screen.getByText('Enviar'))

    await waitFor(() => {
      expect(submitBugReport).toHaveBeenCalledWith('Layout broken', file)
    })
  })

  it('screenshot input has no capture attribute (shows picker, not camera-only on iOS)', async () => {
    const user = userEvent.setup()
    render(<BugReportButton />)
    await user.click(screen.getByLabelText('Reportar bug'))
    const input = screen.getByTestId('screenshot-input') as HTMLInputElement
    expect(input).not.toHaveAttribute('capture')
    expect(input).toHaveAttribute('accept', 'image/*')
  })
})
