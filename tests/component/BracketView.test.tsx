import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BracketView } from '../../src/components/tournament/BracketView'
import { useTournamentStore } from '../../src/hooks/useTournamentStore'
import type { DbMatch, DbTeam, DbVenue } from '../../src/lib/database.types'

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

function makeTeam(id: string, name: string): DbTeam {
  return { id, name, nickname: null, badge_url: null, city_district: null, category: null, gender: null, region: null, created_at: '' }
}

function makeMatch(overrides: Partial<DbMatch> & { id: string; home_team_id: string; away_team_id: string }): DbMatch {
  return {
    tournament_id: 'tour1',
    phase: 'group',
    group_label: null,
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    current_half: 1,
    clock_seconds: 0,
    config_halves: 2,
    config_half_duration_minutes: 10,
    config_timeouts_per_half: 1,
    config_exclusion_duration_seconds: 120,
    scorekeeper_code: '',
    stat_tracker_code: '',
    viewer_code: '',
    scorekeeper_claimed_by: null,
    stat_tracker_claimed_by: null,
    home_timeouts_left: 1,
    away_timeouts_left: 1,
    source: 'manual',
    tournament_group_id: null,
    tournament_category_id: 'cat1',
    penalty_home_score: null,
    penalty_away_score: null,
    started_at: null,
    finished_at: null,
    venue_id: null,
    starts_at: null,
    not_played: false,
    created_at: '',
    ...overrides,
  }
}

const teams = [
  makeTeam('tA', 'Dominicos'),
  makeTeam('tB', 'Maristas'),
  makeTeam('tC', 'Teucro'),
  makeTeam('tD', 'Cangas'),
]
const teamsMap = new Map(teams.map((t) => [t.id, t]))

const semiMatch1 = makeMatch({ id: 's1', home_team_id: 'tA', away_team_id: 'tB', phase: 'semi' })
const semiMatch2 = makeMatch({ id: 's2', home_team_id: 'tC', away_team_id: 'tD', phase: 'semi' })
const finalMatch = makeMatch({ id: 'f1', home_team_id: 'tA', away_team_id: 'tC', phase: 'final', status: 'finished', home_score: 3, away_score: 2 })
const thirdPlace = makeMatch({ id: 'tp1', home_team_id: 'tB', away_team_id: 'tD', phase: 'third_place', status: 'finished', home_score: 1, away_score: 0 })

const quarterMatch1 = makeMatch({ id: 'q1', home_team_id: 'tA', away_team_id: 'tB', phase: 'quarter' })
const quarterMatch2 = makeMatch({ id: 'q2', home_team_id: 'tC', away_team_id: 'tD', phase: 'quarter' })

function makeVenue(id: string, name: string, address?: string): DbVenue {
  return { id, tournament_id: 'tour1', name, address: address ?? null, created_at: '' }
}

beforeEach(() => {
  vi.clearAllMocks()
  useTournamentStore.setState({
    recordScore: vi.fn(),
    recordPenalties: vi.fn(),
  })
})

describe('BracketView — round display order', () => {
  it('renders Final before Semis (Final → Semis order)', () => {
    render(<BracketView matches={[semiMatch1, semiMatch2, finalMatch]} teamsMap={teamsMap} />)

    const headings = screen.getAllByText(/final|semifinales/i)
    const finalHeading = headings.find((el) => /^final$/i.test(el.textContent ?? ''))
    const semiHeading = headings.find((el) => /semifinales/i.test(el.textContent ?? ''))

    expect(finalHeading).toBeInTheDocument()
    expect(semiHeading).toBeInTheDocument()
    expect(
      finalHeading!.compareDocumentPosition(semiHeading!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders Semis before Quarters (Semis → Quarters order)', () => {
    render(<BracketView matches={[quarterMatch1, quarterMatch2, semiMatch1, semiMatch2]} teamsMap={teamsMap} />)

    const semiHeading = screen.getByText(/semifinales/i)
    const quarterHeading = screen.getByText(/cuartos de final/i)

    expect(
      semiHeading.compareDocumentPosition(quarterHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders Final → 3rd → Semis → Quarters when all rounds present', () => {
    render(
      <BracketView
        matches={[quarterMatch1, quarterMatch2, semiMatch1, semiMatch2, thirdPlace, finalMatch]}
        teamsMap={teamsMap}
      />,
    )

    const allHeadings = Array.from(document.querySelectorAll('.flex.flex-col.gap-2 span'))
      .map((el) => el.textContent?.trim())
      .filter(Boolean)

    const finalIdx = allHeadings.findIndex((t) => /^final$/i.test(t ?? ''))
    const thirdIdx = allHeadings.findIndex((t) => /tercer puesto/i.test(t ?? ''))
    const semiIdx = allHeadings.findIndex((t) => /semifinales/i.test(t ?? ''))
    const quarterIdx = allHeadings.findIndex((t) => /cuartos de final/i.test(t ?? ''))

    expect(finalIdx).toBeLessThan(thirdIdx)
    expect(thirdIdx).toBeLessThan(semiIdx)
    expect(semiIdx).toBeLessThan(quarterIdx)
  })

  it('shows podium after all rounds when final is finished', () => {
    render(
      <BracketView
        matches={[semiMatch1, semiMatch2, thirdPlace, finalMatch]}
        teamsMap={teamsMap}
      />,
    )

    expect(screen.getByText(/podio/i)).toBeInTheDocument()
    // Dominicos won the final (3-2)
    const podiumSection = screen.getByText(/podio/i).closest('div')!
    expect(podiumSection).toBeInTheDocument()
  })
})

describe('BracketView — not-played knockout matches', () => {
  beforeEach(() => {
    useTournamentStore.setState({
      recordScore: vi.fn(),
      recordPenalties: vi.fn(),
    })
  })

  it('shows "No jugado" toggle button on each match when admin + onMarkNotPlayed provided', () => {
    const onMark = vi.fn()
    render(<BracketView matches={[semiMatch1, semiMatch2]} teamsMap={teamsMap} isAdmin onMarkNotPlayed={onMark} />)
    const buttons = screen.getAllByRole('button', { name: /marcar como no jugado/i })
    expect(buttons).toHaveLength(2)
  })

  it('calls onMarkNotPlayed(matchId, true) when "No jugado" is clicked', async () => {
    const onMark = vi.fn()
    render(<BracketView matches={[semiMatch1]} teamsMap={teamsMap} isAdmin onMarkNotPlayed={onMark} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /marcar como no jugado/i }))
    expect(onMark).toHaveBeenCalledWith('s1', true)
  })

  it('shows "Restaurar" button when match is not_played', () => {
    const notPlayedMatch = makeMatch({ id: 's1', home_team_id: 'tA', away_team_id: 'tB', phase: 'semi', not_played: true })
    render(<BracketView matches={[notPlayedMatch]} teamsMap={teamsMap} isAdmin onMarkNotPlayed={vi.fn()} />)
    expect(screen.getByRole('button', { name: /restaurar partido/i })).toBeInTheDocument()
  })

  it('does not show toggle button when onMarkNotPlayed is not provided (viewer mode)', () => {
    render(<BracketView matches={[semiMatch1, semiMatch2]} teamsMap={teamsMap} isAdmin={false} />)
    expect(screen.queryByRole('button', { name: /marcar como no jugado/i })).not.toBeInTheDocument()
  })
})

describe('BracketView — venue location links', () => {
  beforeEach(() => {
    useTournamentStore.setState({
      recordScore: vi.fn(),
      recordPenalties: vi.fn(),
    })
  })

  it('shows venue link on final match when venue has address', () => {
    const venue = makeVenue('v1', 'Pabellón', 'Calle Mayor 1, Madrid')
    const matchWithVenue = makeMatch({ id: 'f1', home_team_id: 'tA', away_team_id: 'tC', phase: 'final', venue_id: 'v1' })

    render(<BracketView matches={[semiMatch1, semiMatch2, matchWithVenue]} teamsMap={teamsMap} venues={[venue]} />)

    const link = screen.getByRole('link', { name: /pabellón/i })
    expect(link.getAttribute('href')).toContain('google.com/maps')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not show venue link when match has no venue assigned', () => {
    const venue = makeVenue('v1', 'Pabellón', 'Calle Mayor 1')

    render(<BracketView matches={[semiMatch1, semiMatch2, finalMatch]} teamsMap={teamsMap} venues={[venue]} />)

    expect(screen.queryByRole('link', { name: /pabellón/i })).not.toBeInTheDocument()
  })

  it('does not show venue link when venue has no address', () => {
    const venue = makeVenue('v1', 'Pabellón')
    const matchWithVenue = makeMatch({ id: 'f1', home_team_id: 'tA', away_team_id: 'tC', phase: 'final', venue_id: 'v1' })

    render(<BracketView matches={[semiMatch1, semiMatch2, matchWithVenue]} teamsMap={teamsMap} venues={[venue]} />)

    expect(screen.queryByRole('link', { name: /pabellón/i })).not.toBeInTheDocument()
  })
})
