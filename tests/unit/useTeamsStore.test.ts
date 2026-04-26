import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTeamsStore } from '../../src/hooks/useTeamsStore'

const mockDeleteTeam = vi.fn()

vi.mock('../../src/lib/teams', () => ({
  listTeams: vi.fn().mockResolvedValue([]),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
}))

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) },
  isSupabaseConfigured: true,
}))

describe('useTeamsStore.remove', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTeamsStore.setState({
      teams: [
        { id: 't1', name: 'Dominicos', badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: null, created_at: '' },
        { id: 't2', name: 'Maristas', badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: null, created_at: '' },
      ],
      error: null,
    })
  })

  it('removes team from state on success', async () => {
    mockDeleteTeam.mockResolvedValue(undefined)
    await useTeamsStore.getState().remove('t1')
    expect(useTeamsStore.getState().teams).toHaveLength(1)
    expect(useTeamsStore.getState().teams[0].id).toBe('t2')
    expect(useTeamsStore.getState().error).toBeNull()
  })

  it('sets generic error and keeps team on unknown failure', async () => {
    mockDeleteTeam.mockRejectedValue(new Error('unknown error'))
    await useTeamsStore.getState().remove('t1')
    expect(useTeamsStore.getState().teams).toHaveLength(2)
    expect(useTeamsStore.getState().error).toBe('No se pudo eliminar el equipo')
  })

  it('sets FK-specific error message when team is referenced in matches (code 23503)', async () => {
    const fkError = Object.assign(new Error('FK violation'), { code: '23503' })
    mockDeleteTeam.mockRejectedValue(fkError)
    await useTeamsStore.getState().remove('t1')
    expect(useTeamsStore.getState().teams).toHaveLength(2)
    expect(useTeamsStore.getState().error).toBe(
      'Este equipo tiene partidos asignados. Elimínalo de los partidos antes de borrarlo.',
    )
  })
})
