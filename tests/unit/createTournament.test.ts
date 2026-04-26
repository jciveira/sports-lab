import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: true,
}))

import { createTournament } from '../../src/lib/tournaments'
import { supabase } from '../../src/lib/supabase'

function mockChain(resolveWith: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const self = () => chain
  chain.insert = vi.fn(self)
  chain.update = vi.fn(self)
  chain.select = vi.fn(self)
  chain.single = vi.fn(() => Promise.resolve(resolveWith))
  chain.eq = vi.fn(self)
  chain.order = vi.fn(self)
  vi.mocked(supabase.from).mockReturnValue(chain as never)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createTournament category/gender', () => {
  it('passes category and gender to the insert call', async () => {
    // First call: tournament insert (returns tournament with id)
    const tournamentId = 'tournament-123'
    const chain = mockChain({ data: { id: tournamentId }, error: null })

    // Override from to handle multiple tables
    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // tournaments table — return tournament with id
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: tournamentId }, error: null })),
            })),
          })),
        } as never
      }
      // All subsequent calls: categories, groups, teams, matches, update
      return chain as never
    })

    await createTournament({
      name: 'Copa Primavera',
      date: '2026-04-15',
      category: 'Alevín',
      gender: 'Masculino',
      categories: [{
        name: 'Grupo Único',
        groups: [{
          label: 'A',
          teamIds: ['t1', 't2', 't3', 't4'],
        }, {
          label: 'B',
          teamIds: ['t5', 't6', 't7', 't8'],
        }],
      }],
    })

    // Verify the first from('tournaments') insert included category and gender
    const firstCall = vi.mocked(supabase.from).mock.results[0]
    const insertCall = (firstCall.value as { insert: ReturnType<typeof vi.fn> }).insert
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Copa Primavera',
        category: 'Alevín',
        gender: 'Masculino',
      }),
    )
  })

  it('passes null when category/gender not provided', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'tid' }, error: null })),
          })),
        })),
        update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      } as never
    })

    // This will fail at category creation but we just need to check the first insert
    try {
      await createTournament({
        name: 'Copa Sin Categoria',
        date: '2026-04-15',
        categories: [{ name: 'Cat1', groups: [{ label: 'A', teamIds: [] }, { label: 'B', teamIds: [] }] }],
      })
    } catch { /* expected — chain mock is incomplete */ }

    const firstCall = vi.mocked(supabase.from).mock.results[0]
    const insertCall = (firstCall.value as { insert: ReturnType<typeof vi.fn> }).insert
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        category: null,
        gender: null,
      }),
    )
  })
})
