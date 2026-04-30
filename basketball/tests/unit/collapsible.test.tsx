import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollapsibleSection } from '../../src/components/CollapsibleSection'

describe('CollapsibleSection', () => {
  it('renders title and children when open by default', () => {
    render(<CollapsibleSection title="Equipos"><p>content</p></CollapsibleSection>)
    expect(screen.getByText('Equipos')).toBeTruthy()
    expect(screen.getByText('content')).toBeTruthy()
  })

  it('hides children when defaultOpen=false', () => {
    render(<CollapsibleSection title="Clasificación" defaultOpen={false}><p>hidden</p></CollapsibleSection>)
    expect(screen.queryByText('hidden')).toBeNull()
  })

  it('toggles content open on button click when initially closed', () => {
    render(<CollapsibleSection title="Torneos" defaultOpen={false}><p>toggled</p></CollapsibleSection>)
    expect(screen.queryByText('toggled')).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('toggled')).toBeTruthy()
  })

  it('toggles content closed on button click when initially open', () => {
    render(<CollapsibleSection title="Partidos"><p>visible</p></CollapsibleSection>)
    expect(screen.getByText('visible')).toBeTruthy()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('visible')).toBeNull()
  })

  it('button has aria-expanded=true when open', () => {
    render(<CollapsibleSection title="Test"><p>x</p></CollapsibleSection>)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
  })

  it('button has aria-expanded=false when closed', () => {
    render(<CollapsibleSection title="Test" defaultOpen={false}><p>x</p></CollapsibleSection>)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })
})
