import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  isSupabaseConfigured: true,
}))

import { activateMatch, finishMatch, setMatchResult, autoActivateMatches } from '../../src/lib/matches'
import { supabase } from '../../src/lib/supabase'

function mockChain(resolveWith: { data?: unknown; error?: unknown } = { data: [], error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const self = () => chain
  chain.update = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.neq = vi.fn(self)
  chain.not = vi.fn(self)
  chain.lte = vi.fn(self)
  chain.select = vi.fn(() => Promise.resolve(resolveWith))
  // For finishMatch/activateMatch that don't call select — make the chain itself thenable
  ;(chain as Record<string, unknown>).then = (fn: (v: unknown) => void) => Promise.resolve(resolveWith).then(fn)
  vi.mocked(supabase.from).mockReturnValue(chain as never)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('activateMatch', () => {
  it('updates scheduled match to paused', async () => {
    const chain = mockChain()
    await activateMatch('match-1')
    expect(supabase.from).toHaveBeenCalledWith('matches')
    expect(chain.update).toHaveBeenCalledWith({ status: 'paused' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'match-1')
    expect(chain.eq).toHaveBeenCalledWith('status', 'scheduled')
  })
})

describe('finishMatch', () => {
  it('updates match to finished with timestamp', async () => {
    const chain = mockChain()
    await finishMatch('match-2')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'finished', finished_at: expect.any(String) }),
    )
    expect(chain.eq).toHaveBeenCalledWith('id', 'match-2')
    expect(chain.neq).toHaveBeenCalledWith('status', 'finished')
  })
})

describe('setMatchResult', () => {
  it('sets score and finishes match', async () => {
    const chain = mockChain()
    await setMatchResult('match-3', 5, 3)
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        home_score: 5,
        away_score: 3,
        status: 'finished',
        finished_at: expect.any(String),
      }),
    )
    expect(chain.eq).toHaveBeenCalledWith('id', 'match-3')
  })
})

describe('autoActivateMatches', () => {
  it('activates scheduled matches with starts_at within 30 min', async () => {
    const chain = mockChain({ data: [], error: null })
    await autoActivateMatches()
    expect(chain.update).toHaveBeenCalledWith({ status: 'paused' })
    expect(chain.eq).toHaveBeenCalledWith('status', 'scheduled')
    expect(chain.not).toHaveBeenCalledWith('starts_at', 'is', null)
    expect(chain.lte).toHaveBeenCalledWith('starts_at', expect.any(String))
  })

  it('returns count of activated matches', async () => {
    mockChain({ data: [{ id: '1' }, { id: '2' }], error: null })
    const count = await autoActivateMatches()
    expect(count).toBe(2)
  })
})
