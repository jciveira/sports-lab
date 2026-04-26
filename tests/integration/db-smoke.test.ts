/**
 * DB write-path integration smoke tests.
 *
 * Exercises the scorekeeper sync path against the real Supabase DB schema.
 * Catches: missing columns, broken constraints, silent sync failures.
 *
 * Requirements: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env
 * Run: npm run test:integration (local only — not in CI)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { syncMatchToServer } from '../../src/hooks/useRealtimeMatch'
import { useMatchStore } from '../../src/hooks/useMatchStore'

// ── Guard: fail fast if env is not configured ──────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '\nMissing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Copy .env.example → .env and fill in credentials before running integration tests.\n',
  )
}

// ── Test fixtures ──────────────────────────────────────────────────────────

const TEST_TEAM_A = 'test-integration-team-a'
const TEST_TEAM_B = 'test-integration-team-b'

let client: SupabaseClient
let testMatchId: string
let testTeamAId: string
let testTeamBId: string

// ── Lifecycle ──────────────────────────────────────────────────────────────

beforeAll(async () => {
  client = createClient(supabaseUrl, supabaseKey)

  // Create test teams
  const { data: teamA, error: errA } = await client
    .from('teams')
    .insert({ name: TEST_TEAM_A })
    .select('id')
    .single()
  if (errA) throw new Error(`Failed to create test team A: ${errA.message}`)
  testTeamAId = teamA.id

  const { data: teamB, error: errB } = await client
    .from('teams')
    .insert({ name: TEST_TEAM_B })
    .select('id')
    .single()
  if (errB) throw new Error(`Failed to create test team B: ${errB.message}`)
  testTeamBId = teamB.id

  // Create test match
  const { data: match, error: errM } = await client
    .from('matches')
    .insert({ home_team_id: testTeamAId, away_team_id: testTeamBId, status: 'running' })
    .select('id')
    .single()
  if (errM) throw new Error(`Failed to create test match: ${errM.message}`)
  testMatchId = match.id
})

afterAll(async () => {
  if (!client) return
  if (testMatchId) {
    await client.from('match_events').delete().eq('match_id', testMatchId)
    await client.from('matches').delete().eq('id', testMatchId)
  }
  if (testTeamAId) await client.from('teams').delete().eq('id', testTeamAId)
  if (testTeamBId) await client.from('teams').delete().eq('id', testTeamBId)
})

// ── Schema smoke ───────────────────────────────────────────────────────────

describe('schema smoke', () => {
  it('matches table has all scorekeeper sync columns', async () => {
    const { error } = await client
      .from('matches')
      .select(
        'clock_seconds_base, clock_started_at, scorekeeper_claimed_by, scorekeeper_name, scorekeeper_last_active_at',
      )
      .limit(0)

    expect(error).toBeNull()
  })
})

// ── Write smoke ────────────────────────────────────────────────────────────

describe('write smoke', () => {
  it('syncMatchToServer writes match state to DB without error', async () => {
    const clockStartedAt = new Date().toISOString()

    useMatchStore.setState({
      homeScore: 3,
      awayScore: 1,
      status: 'running',
      currentHalf: 1,
      clockSecondsBase: 450,
      clockStartedAt,
      homeTimeoutsLeft: 1,
      awayTimeoutsLeft: 0,
    })

    // Call the actual production sync path — this is what we're testing
    await syncMatchToServer(testMatchId)

    const { data, error } = await client
      .from('matches')
      .select('home_score, away_score, clock_seconds_base, clock_started_at')
      .eq('id', testMatchId)
      .single()

    expect(error).toBeNull()
    expect(data.home_score).toBe(3)
    expect(data.away_score).toBe(1)
    expect(data.clock_seconds_base).toBe(450)
    expect(data.clock_started_at).not.toBeNull()
  })
})

// ── Event type smoke ───────────────────────────────────────────────────────

describe('event type smoke', () => {
  const EVENT_TYPES = [
    'goal',
    'assist',
    'save',
    'exclusion',
    'exclusion_end',
    'timeout',
    'halftime',
  ] as const

  for (const type of EVENT_TYPES) {
    it(`inserts '${type}' event without constraint violation`, async () => {
      const { error } = await client.from('match_events').insert({
        match_id: testMatchId,
        type,
        minute: 5,
        half: 1,
      })

      expect(error).toBeNull()
    })
  }
})
