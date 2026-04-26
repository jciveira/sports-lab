/**
 * Seed script: Load CORRALES XXXIV tournament data into Supabase.
 *
 * Idempotent — checks for existing tournament by name before inserting.
 * Run with: npx tsx scripts/seed-corrales.ts
 *
 * Categories: Alevín Masculino (AM) and Alevín Femenino (AF)
 * Format: 4 groups of 4 teams per category, round-robin group stage
 * Dates: April 2–4, 2026 (Thu–Sat group stage), April 5 (Sun knockouts)
 * Match config: 2×20 min, 1 timeout per half (running clock except last 2 min)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env manually to avoid dotenv dependency
const envPath = resolve(import.meta.dirname, '../.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^(\w+)=(.*)$/)
  if (match) process.env[match[1]] = match[2]
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const TOURNAMENT_NAME = 'XXXIV Torneo Nacional de Balonmano de Los Corrales'
const TOURNAMENT_DATE = '2026-04-02'

// ── Team names (exact as in the official docs) ─────────────────────────

const AM_GROUPS = {
  A: ['C.D.E. DELASALLE', 'OAR CORUÑA', 'BM ODISEA', 'BAIGENE CORAZONISTAS'],
  B: ['BATHCO EDM TORRELAVEGA 1', 'BM LOYOLA', 'PULPO KE', 'CP CALASANCIO'],
  C: ['BM PUENTE VIESGO', 'BM MENESIANOS', 'SM LAGUNAK', 'CD BALOPAL 2'],
  D: ['BATHCO EDM TORRELAVEGA 2', 'CD BALOPAL 1', 'BM DOMINICOS', 'BM ARDOI'],
}

const AF_GROUPS = {
  A: ['C.D.E. DELASALLE 1', 'BM ARDOI', 'CD BALOPAL', 'BM COLINDRES'],
  B: ['C.D.E. DELASALLE 2', 'BAIGENE CORAZONISTAS', 'BM NOAIN', 'BM ODISEA 2'],
  C: ['PULPO KE 1', 'BM DOMINICOS', 'SM LAGUNAK', 'BM LOYOLA'],
  D: ['PULPO KE 2', 'BM ODISEA 1', 'BM PUENTE VIESGO', 'CP CALASANCIO'],
}

// ── Fixtures from official calendar (Thu Apr 2 – Sat Apr 4) ────────────
// Each entry: [home, away] using exact team names from groups above.

const AM_FIXTURES: Record<string, [string, string][]> = {
  A: [
    ['OAR CORUÑA', 'BM ODISEA'],                     // Thu
    ['C.D.E. DELASALLE', 'BAIGENE CORAZONISTAS'],    // Thu
    ['BAIGENE CORAZONISTAS', 'BM ODISEA'],            // Fri
    ['C.D.E. DELASALLE', 'OAR CORUÑA'],              // Fri
    ['BM ODISEA', 'C.D.E. DELASALLE'],                // Sat
    ['OAR CORUÑA', 'BAIGENE CORAZONISTAS'],            // Sat
  ],
  B: [
    ['BM LOYOLA', 'PULPO KE'],                        // Thu
    ['BATHCO EDM TORRELAVEGA 1', 'CP CALASANCIO'],   // Thu
    ['CP CALASANCIO', 'PULPO KE'],                     // Fri
    ['BATHCO EDM TORRELAVEGA 1', 'BM LOYOLA'],       // Fri
    ['BM LOYOLA', 'CP CALASANCIO'],                    // Sat
    ['PULPO KE', 'BATHCO EDM TORRELAVEGA 1'],         // Sat
  ],
  C: [
    ['BM PUENTE VIESGO', 'CD BALOPAL 2'],             // Thu
    ['BM MENESIANOS', 'SM LAGUNAK'],                   // Thu
    ['CD BALOPAL 2', 'SM LAGUNAK'],                    // Fri
    ['BM PUENTE VIESGO', 'BM MENESIANOS'],             // Fri
    ['SM LAGUNAK', 'BM PUENTE VIESGO'],                // Sat
    ['BM MENESIANOS', 'CD BALOPAL 2'],                 // Sat
  ],
  D: [
    ['BATHCO EDM TORRELAVEGA 2', 'BM ARDOI'],         // Thu
    ['CD BALOPAL 1', 'BM DOMINICOS'],                  // Thu
    ['BM ARDOI', 'BM DOMINICOS'],                      // Fri
    ['BATHCO EDM TORRELAVEGA 2', 'CD BALOPAL 1'],     // Fri
    ['CD BALOPAL 1', 'BM ARDOI'],                      // Sat
    ['BM DOMINICOS', 'BATHCO EDM TORRELAVEGA 2'],     // Sat
  ],
}

const AF_FIXTURES: Record<string, [string, string][]> = {
  A: [
    ['BM ARDOI', 'CD BALOPAL'],                        // Thu
    ['C.D.E. DELASALLE 1', 'BM COLINDRES'],           // Thu
    ['BM COLINDRES', 'CD BALOPAL'],                    // Fri
    ['C.D.E. DELASALLE 1', 'BM ARDOI'],               // Fri
    ['BM ARDOI', 'BM COLINDRES'],                      // Sat
    ['CD BALOPAL', 'C.D.E. DELASALLE 1'],             // Sat
  ],
  B: [
    ['C.D.E. DELASALLE 2', 'BM ODISEA 2'],            // Thu
    ['BAIGENE CORAZONISTAS', 'BM NOAIN'],              // Thu
    ['C.D.E. DELASALLE 2', 'BAIGENE CORAZONISTAS'],   // Fri
    ['BM ODISEA 2', 'BM NOAIN'],                       // Fri
    ['BM NOAIN', 'C.D.E. DELASALLE 2'],               // Sat
    ['BAIGENE CORAZONISTAS', 'BM ODISEA 2'],           // Sat
  ],
  C: [
    ['BM DOMINICOS', 'SM LAGUNAK'],                    // Thu
    ['PULPO KE 1', 'BM LOYOLA'],                       // Thu
    ['PULPO KE 1', 'BM DOMINICOS'],                    // Fri
    ['BM LOYOLA', 'SM LAGUNAK'],                       // Fri
    ['BM DOMINICOS', 'BM LOYOLA'],                     // Sat
    ['SM LAGUNAK', 'PULPO KE 1'],                      // Sat
  ],
  D: [
    ['PULPO KE 2', 'CP CALASANCIO'],                   // Thu
    ['BM ODISEA 1', 'BM PUENTE VIESGO'],               // Thu
    ['CP CALASANCIO', 'BM PUENTE VIESGO'],             // Fri
    ['PULPO KE 2', 'BM ODISEA 1'],                     // Fri
    ['BM PUENTE VIESGO', 'PULPO KE 2'],                // Sat
    ['BM ODISEA 1', 'CP CALASANCIO'],                  // Sat
  ],
}

// ── Match config for Alevín ────────────────────────────────────────────

const ALEVIN_CONFIG = {
  config_halves: 2,
  config_half_duration_minutes: 20,
  config_timeouts_per_half: 1,
  config_exclusion_duration_seconds: 120,
  home_timeouts_left: 1,
  away_timeouts_left: 1,
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  // 1. Check if tournament already exists — delete all copies and recreate if incomplete
  const { data: existingList } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', TOURNAMENT_NAME)

  if (existingList && existingList.length > 0) {
    // Check if any copy has all expected data (2 categories × 4 groups × 6 matches = 48 matches)
    for (const existing of existingList) {
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', existing.id)
      if (matches && matches.length === 48) {
        console.log(`Tournament "${TOURNAMENT_NAME}" already exists with all 48 matches (id: ${existing.id}). Skipping.`)
        process.exit(0)
      }
    }

    // No complete copy — delete all and recreate
    console.log(`Found ${existingList.length} incomplete tournament(s). Cleaning up...`)
    for (const existing of existingList) {
      await supabase.from('matches').delete().eq('tournament_id', existing.id)
      await supabase.from('tournament_categories').delete().eq('tournament_id', existing.id)
      await supabase.from('tournaments').delete().eq('id', existing.id)
    }
    console.log('Deleted incomplete tournaments.')
  }

  // 2. Collect all unique team names
  const allTeamNames = new Set<string>()
  for (const teams of Object.values(AM_GROUPS)) teams.forEach((t) => allTeamNames.add(t))
  for (const teams of Object.values(AF_GROUPS)) teams.forEach((t) => allTeamNames.add(t))

  console.log(`Creating ${allTeamNames.size} teams (skipping existing)...`)

  // 3. Ensure all teams exist (idempotent — skip duplicates)
  const teamNameToId = new Map<string, string>()

  for (const name of allTeamNames) {
    // Check if team already exists (case-insensitive match)
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id, name')
      .ilike('name', name)
      .maybeSingle()

    if (existingTeam) {
      teamNameToId.set(name, existingTeam.id)
      continue
    }

    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create team "${name}": ${error.message}`)
    teamNameToId.set(name, newTeam.id)
    console.log(`  Created team: ${name}`)
  }

  // 4. Create tournament
  console.log(`Creating tournament: ${TOURNAMENT_NAME}`)
  const totalTeams = allTeamNames.size
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({ name: TOURNAMENT_NAME, date: TOURNAMENT_DATE, num_teams: totalTeams, status: 'group_stage' })
    .select()
    .single()
  if (tErr) throw new Error(`Failed to create tournament: ${tErr.message}`)

  // 5. Create categories, groups, team assignments, and fixtures
  const categories = [
    { name: 'Alevín Masculino', groups: AM_GROUPS, fixtures: AM_FIXTURES },
    { name: 'Alevín Femenino', groups: AF_GROUPS, fixtures: AF_FIXTURES },
  ]

  for (const cat of categories) {
    console.log(`  Category: ${cat.name}`)

    const { data: category, error: cErr } = await supabase
      .from('tournament_categories')
      .insert({ tournament_id: tournament.id, name: cat.name })
      .select()
      .single()
    if (cErr) throw new Error(`Failed to create category "${cat.name}": ${cErr.message}`)

    for (const [label, teamNames] of Object.entries(cat.groups)) {
      const teamIds = teamNames.map((n) => {
        const id = teamNameToId.get(n)
        if (!id) throw new Error(`Team not found: ${n}`)
        return id
      })

      // Create group
      const { data: group, error: gErr } = await supabase
        .from('tournament_groups')
        .insert({ category_id: category.id, label })
        .select()
        .single()
      if (gErr) throw new Error(`Failed to create group ${label}: ${gErr.message}`)

      // Assign teams to group
      const { error: gtErr } = await supabase
        .from('tournament_group_teams')
        .insert(teamIds.map((teamId) => ({ group_id: group.id, team_id: teamId })))
      if (gtErr) throw new Error(`Failed to assign teams to group ${label}: ${gtErr.message}`)

      // Insert fixtures from official calendar
      const fixtures = cat.fixtures[label]
      const matchInserts = fixtures.map(([home, away]) => ({
        home_team_id: teamNameToId.get(home)!,
        away_team_id: teamNameToId.get(away)!,
        tournament_id: tournament.id,
        tournament_category_id: category.id,
        tournament_group_id: group.id,
        phase: 'group',
        group_label: label,
        source: 'manual',
        ...ALEVIN_CONFIG,
      }))

      const { error: mErr } = await supabase.from('matches').insert(matchInserts)
      if (mErr) throw new Error(`Failed to create matches for group ${label}: ${mErr.message}`)

      console.log(`    Group ${label}: ${teamNames.length} teams, ${fixtures.length} matches`)
    }
  }

  const totalMatches = Object.values(AM_FIXTURES).reduce((s, f) => s + f.length, 0)
    + Object.values(AF_FIXTURES).reduce((s, f) => s + f.length, 0)

  console.log(`\nDone! Tournament "${TOURNAMENT_NAME}" created.`)
  console.log(`  ID: ${tournament.id}`)
  console.log(`  Teams: ${allTeamNames.size}`)
  console.log(`  Categories: ${categories.length}`)
  console.log(`  Groups: ${Object.keys(AM_GROUPS).length + Object.keys(AF_GROUPS).length}`)
  console.log(`  Group matches: ${totalMatches}`)
  console.log(`\nView at: /tournament/${tournament.id}`)
}

main().catch((err) => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
