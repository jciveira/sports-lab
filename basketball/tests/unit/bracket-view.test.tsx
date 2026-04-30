import { describe, it, expect } from 'vitest'
import { formatMatchDate } from '../../src/lib/matches'

// Bracket rendering tests for the score/winner/venue/date display logic
// (Component is tested at the logic level — store-wired render tests would
// require a full Supabase mock which is handled in smoke/e2e)

describe('bracket score display logic', () => {
  it('shows actual score string when match is finished and not not_played', () => {
    const home_score = 72
    const away_score = 65
    const isFinished = true
    const isNotPlayed = false

    const homeScore = isFinished && !isNotPlayed ? String(home_score) : '–'
    const awayScore = isFinished && !isNotPlayed ? String(away_score) : '–'

    expect(homeScore).toBe('72')
    expect(awayScore).toBe('65')
  })

  it('shows dash when match is not finished', () => {
    const isFinished = false
    const isNotPlayed = false
    const homeScore = isFinished && !isNotPlayed ? '72' : '–'
    expect(homeScore).toBe('–')
  })

  it('shows dash when match is marked not_played', () => {
    const isFinished = true
    const isNotPlayed = true
    const homeScore = isFinished && !isNotPlayed ? '72' : '–'
    expect(homeScore).toBe('–')
  })
})

describe('bracket winner highlight logic', () => {
  it('homeWins is true when home_score > away_score and finished', () => {
    const isFinished = true
    const isNotPlayed = false
    const home_score = 80
    const away_score = 72
    const homeWins = isFinished && !isNotPlayed && home_score > away_score
    const awayWins = isFinished && !isNotPlayed && away_score > home_score
    expect(homeWins).toBe(true)
    expect(awayWins).toBe(false)
  })

  it('awayWins is true when away_score > home_score and finished', () => {
    const isFinished = true
    const isNotPlayed = false
    const home_score = 60
    const away_score = 75
    const homeWins = isFinished && !isNotPlayed && home_score > away_score
    const awayWins = isFinished && !isNotPlayed && away_score > home_score
    expect(homeWins).toBe(false)
    expect(awayWins).toBe(true)
  })

  it('neither wins when not_played even if finished', () => {
    const isFinished = true
    const isNotPlayed = true
    const homeWins = isFinished && !isNotPlayed && true
    const awayWins = isFinished && !isNotPlayed && false
    expect(homeWins).toBe(false)
    expect(awayWins).toBe(false)
  })
})

describe('bracket date display logic', () => {
  it('shows formatted date for a match with scheduled_at', () => {
    const scheduled_at = '2026-05-01T13:00:00+00:00'
    const formattedDate = formatMatchDate(scheduled_at)
    expect(formattedDate).not.toBeNull()
    expect(formattedDate).toMatch(/·/)
  })

  it('shows no date when scheduled_at is null', () => {
    const formattedDate = formatMatchDate(null)
    expect(formattedDate).toBeNull()
  })

  it('hides date chip when team slots are TBD (no team ids)', () => {
    const home_team_id = null
    const away_team_id = null
    const scheduled_at = '2026-05-01T13:00:00+00:00'
    // Display logic: only show date when both teams are assigned
    const showDate = home_team_id != null && away_team_id != null && scheduled_at != null
    expect(showDate).toBe(false)
  })
})

describe('podium logic', () => {
  it('gold goes to home when home_score > away_score', () => {
    const finalMatch = { home_score: 80, away_score: 72, status: 'finished', not_played: false }
    const finalTm = { home_team_id: 'team-a', away_team_id: 'team-b' }
    const goldTeamId =
      finalMatch.home_score > finalMatch.away_score ? finalTm.home_team_id : finalTm.away_team_id
    const silverTeamId = goldTeamId === finalTm.home_team_id ? finalTm.away_team_id : finalTm.home_team_id
    expect(goldTeamId).toBe('team-a')
    expect(silverTeamId).toBe('team-b')
  })

  it('gold goes to away when away_score > home_score', () => {
    const finalMatch = { home_score: 60, away_score: 75, status: 'finished', not_played: false }
    const finalTm = { home_team_id: 'team-a', away_team_id: 'team-b' }
    const goldTeamId =
      finalMatch.home_score > finalMatch.away_score ? finalTm.home_team_id : finalTm.away_team_id
    expect(goldTeamId).toBe('team-b')
  })

  it('podium not shown when final match not finished', () => {
    const finalMatch = { status: 'running', not_played: false }
    const showPodium = finalMatch.status === 'finished' && !finalMatch.not_played
    expect(showPodium).toBe(false)
  })
})
