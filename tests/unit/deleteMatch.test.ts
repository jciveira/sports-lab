import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDelete = vi.fn()
const mockEq = vi.fn()

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      delete: () => {
        mockDelete(table)
        return {
          eq: (_col: string, _val: string) => {
            mockEq(table)
            return Promise.resolve({ error: null })
          },
        }
      },
    }),
  },
  isSupabaseConfigured: true,
}))

describe('deleteMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes match_events before matches (FK order)', async () => {
    const { deleteMatch } = await import('../../src/lib/matches')
    await deleteMatch('match-123')

    // match_events deleted first, then matches
    expect(mockDelete).toHaveBeenCalledTimes(2)
    expect(mockDelete.mock.calls[0][0]).toBe('match_events')
    expect(mockDelete.mock.calls[1][0]).toBe('matches')
  })

  it('throws when match_events delete fails', async () => {
    vi.resetModules()

    vi.doMock('../../src/lib/supabase', () => ({
      supabase: {
        from: (table: string) => ({
          delete: () => ({
            eq: () =>
              Promise.resolve({
                error: table === 'match_events' ? new Error('RLS denied') : null,
              }),
          }),
        }),
      },
      isSupabaseConfigured: true,
    }))

    const { deleteMatch } = await import('../../src/lib/matches')
    await expect(deleteMatch('match-123')).rejects.toThrow()
  })
})
