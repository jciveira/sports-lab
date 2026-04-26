import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

// Chainable Supabase query builder mock
function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const terminal = () => Promise.resolve({ data, error })
  chain.select = (..._a: unknown[]) => ({ single: terminal, order: () => ({ data, error }) })
  chain.eq = (_c: string, _v: unknown) => chain
  chain.order = () => Promise.resolve({ data, error })
  chain.single = terminal
  return chain
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_c: string, _v: unknown) => ({
          order: (_col: string) => Promise.resolve({ data: mockInsert.mock.results[0]?.value ?? [], error: null }),
        }),
      }),
      insert: (payload: unknown) => {
        mockInsert(payload)
        return makeChain(mockInsert.mock.results[0]?.value ?? null)
      },
      update: (payload: unknown) => {
        mockUpdate(payload)
        return makeChain(null)
      },
      delete: () => {
        mockDelete()
        return makeChain(null)
      },
    }),
  },
}))

describe('venues lib (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('getVenuesByTournament', () => {
    it('queries venues filtered by tournament_id', async () => {
      const fakeVenues = [{ id: 'v1', tournament_id: 't1', name: 'Pabellón', address: null, created_at: '' }]

      vi.doMock('../../src/lib/supabase', () => ({
        supabase: {
          from: (_table: string) => ({
            select: (_cols: string) => ({
              eq: (_c: string, _v: unknown) => ({
                order: (_col: string) => Promise.resolve({ data: fakeVenues, error: null }),
              }),
            }),
          }),
        },
      }))

      const { getVenuesByTournament } = await import('../../src/lib/venues')
      const result = await getVenuesByTournament('t1')
      expect(result).toEqual(fakeVenues)
    })

    it('returns empty array when no venues', async () => {
      vi.doMock('../../src/lib/supabase', () => ({
        supabase: {
          from: (_table: string) => ({
            select: (_cols: string) => ({
              eq: (_c: string, _v: unknown) => ({
                order: (_col: string) => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        },
      }))

      const { getVenuesByTournament } = await import('../../src/lib/venues')
      const result = await getVenuesByTournament('t1')
      expect(result).toEqual([])
    })
  })

  describe('createVenue', () => {
    it('inserts with tournament_id, name, and address', async () => {
      const fakeVenue = { id: 'v1', tournament_id: 't1', name: 'Pabellón', address: 'Calle Mayor 1', created_at: '' }
      const mockInsertFn = vi.fn()

      vi.doMock('../../src/lib/supabase', () => ({
        supabase: {
          from: (_table: string) => ({
            insert: (payload: unknown) => {
              mockInsertFn(payload)
              return {
                select: () => ({ single: () => Promise.resolve({ data: fakeVenue, error: null }) }),
              }
            },
          }),
        },
      }))

      const { createVenue } = await import('../../src/lib/venues')
      const result = await createVenue('t1', 'Pabellón', 'Calle Mayor 1')

      expect(mockInsertFn).toHaveBeenCalledWith({
        tournament_id: 't1',
        name: 'Pabellón',
        address: 'Calle Mayor 1',
      })
      expect(result).toEqual(fakeVenue)
    })

    it('sets address to null when not provided', async () => {
      const mockInsertFn = vi.fn()
      const fakeVenue = { id: 'v2', tournament_id: 't1', name: 'Gym', address: null, created_at: '' }

      vi.doMock('../../src/lib/supabase', () => ({
        supabase: {
          from: (_table: string) => ({
            insert: (payload: unknown) => {
              mockInsertFn(payload)
              return {
                select: () => ({ single: () => Promise.resolve({ data: fakeVenue, error: null }) }),
              }
            },
          }),
        },
      }))

      const { createVenue } = await import('../../src/lib/venues')
      await createVenue('t1', 'Gym')

      expect(mockInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ address: null }),
      )
    })
  })

  describe('updateVenue', () => {
    it('updates name and address by id', async () => {
      const mockUpdateFn = vi.fn()
      const mockEqFn = vi.fn()

      vi.doMock('../../src/lib/supabase', () => ({
        supabase: {
          from: (_table: string) => ({
            update: (payload: unknown) => {
              mockUpdateFn(payload)
              return { eq: (col: string, val: unknown) => { mockEqFn(col, val); return Promise.resolve({ data: null, error: null }) } }
            },
          }),
        },
      }))

      const { updateVenue } = await import('../../src/lib/venues')
      await updateVenue('v1', 'Pabellón Nuevo', 'Calle 2')

      expect(mockUpdateFn).toHaveBeenCalledWith({ name: 'Pabellón Nuevo', address: 'Calle 2' })
      expect(mockEqFn).toHaveBeenCalledWith('id', 'v1')
    })
  })

  describe('deleteVenue', () => {
    it('deletes venue by id', async () => {
      const mockEqFn = vi.fn()

      vi.doMock('../../src/lib/supabase', () => ({
        supabase: {
          from: (_table: string) => ({
            delete: () => ({ eq: (col: string, val: unknown) => { mockEqFn(col, val); return Promise.resolve({ data: null, error: null }) } }),
          }),
        },
      }))

      const { deleteVenue } = await import('../../src/lib/venues')
      await deleteVenue('v1')

      expect(mockEqFn).toHaveBeenCalledWith('id', 'v1')
    })
  })
})
