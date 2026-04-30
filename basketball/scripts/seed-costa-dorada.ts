/**
 * Seed script — Costa Dorada Basket Cup 2026
 * Two categories: 06AMP2 (CD Romareda A) and 07AMB (CD Romareda B)
 *
 * Usage:
 *   cd basketball && npx tsx scripts/seed-costa-dorada.ts
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in basketball/.env
 * Safe to re-run — deletes existing Costa Dorada tournaments first.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = createClient(supabaseUrl, supabaseKey) as any

// ─── UTC helpers ──────────────────────────────────────────────────────────────
// All times from PDF are CEST (UTC+2). Subtract 2h for UTC.
function utc(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const utcH = h - 2
  return `2026-${date}T${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+00:00`
}
const MAY1 = '05-01'
const MAY2 = '05-02'
const MAY3 = '05-03'

// ─── Clean up previous runs ───────────────────────────────────────────────────
async function cleanup() {
  const { data: existing } = await db
    .from('tournaments')
    .select('id')
    .or('name.ilike.%Costa Dorada%,name.ilike.%06AMP2%,name.ilike.%07AMB%')
  if (existing?.length) {
    const ids = existing.map((t: { id: string }) => t.id)
    // Cascade deletes tournament_teams and tournament_matches
    await db.from('tournaments').delete().in('id', ids)
    console.log(`Cleaned up ${ids.length} existing tournament(s)`)
  }
}

// ─── Upsert team (insert or find by exact name) ───────────────────────────────
async function upsertTeam(name: string, highlight = false): Promise<string> {
  const { data: existing } = await db.from('teams').select('id').eq('name', name).maybeSingle()
  if (existing) return existing.id as string
  const { data, error } = await db
    .from('teams')
    .insert({ name, nickname: highlight ? name : null, badge_url: null, city_district: null })
    .select('id')
    .single()
  if (error) throw new Error(`upsertTeam(${name}): ${error.message}`)
  return data.id as string
}

// ─── Insert a scheduled match, return match id ────────────────────────────────
async function insertMatch(
  tournamentId: string,
  homeTeamId: string,
  awayTeamId: string,
  startsAt: string,
  phase: 'group' | 'qf' | 'sf' | 'final',
): Promise<string> {
  const { data, error } = await db
    .from('matches')
    .insert({
      tournament_id: tournamentId,
      phase,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_score: 0,
      away_score: 0,
      status: 'scheduled',
      quarter: 1,
      starts_at: startsAt,
    })
    .select('id')
    .single()
  if (error) throw new Error(`insertMatch: ${error.message}`)
  return data.id as string
}

// ─── Insert tournament_match row linking a match ──────────────────────────────
async function insertTournamentMatch(opts: {
  tournamentId: string
  phase: 'group' | 'qf' | 'sf' | 'final'
  roundIndex: number
  matchSlot: number
  homeTeamId: string | null
  awayTeamId: string | null
  matchId: string | null
}) {
  const { error } = await db.from('tournament_matches').insert({
    tournament_id: opts.tournamentId,
    phase: opts.phase,
    round_index: opts.roundIndex,
    match_slot: opts.matchSlot,
    home_team_id: opts.homeTeamId,
    away_team_id: opts.awayTeamId,
    match_id: opts.matchId,
  })
  if (error) throw new Error(`insertTournamentMatch: ${error.message}`)
}

async function insertTournamentTeam(tournamentId: string, teamId: string, group: string) {
  const { error } = await db.from('tournament_teams').insert({
    tournament_id: tournamentId,
    team_id: teamId,
    group_name: group,
  })
  if (error) throw new Error(`insertTournamentTeam: ${error.message}`)
}

// ─── 06AMP2 — Alevín Masculino Plata-2 (CD Romareda A) ───────────────────────
async function seed06AMP2() {
  console.log('\n── 06AMP2: Alevín Masculino Plata-2 ──────────────────────')

  // Create tournament
  const { data: t, error: tErr } = await db
    .from('tournaments')
    .insert({
      name: 'Alevín Masc. Plata-2 — Costa Dorada 2026',
      format: 'group_knockout',
      num_teams: 8,
      status: 'setup',
      viewer_code: null,
    })
    .select('id')
    .single()
  if (tErr) throw new Error(`create tournament 06AMP2: ${tErr.message}`)
  const tid = t.id as string
  console.log(`Tournament created: ${tid}`)

  // Teams — Group 1
  const romareda_a = await upsertTeam('CD ROMAREDA A', true)
  const perez      = await upsertTeam('DISTRITO OLIMPICO PEREZ')
  const b86        = await upsertTeam('B86 LA SALLE')
  const olivar1    = await upsertTeam('EL OLIVAR 1')
  // Teams — Group 2
  const escuela    = await upsertTeam('ESCUELA FELIPE - FUND. BZ 14')
  const premia     = await upsertTeam('CB PREMIA DE DALT')
  const ricopia15b = await upsertTeam('RICOPIA CBJA 15 B')
  const maria15    = await upsertTeam('MARIANISTAS 15')

  // Enroll with group names
  for (const [id, g] of [
    [romareda_a, 'A'], [perez, 'A'], [b86, 'A'], [olivar1, 'A'],
    [escuela, 'B'], [premia, 'B'], [ricopia15b, 'B'], [maria15, 'B'],
  ] as [string, string][]) {
    await insertTournamentTeam(tid, id, g)
  }

  // Update status to group_phase
  await db.from('tournaments').update({ status: 'group_phase' }).eq('id', tid)

  // ── Group phase matches ─────────────────────────────────────────────────────
  // Viernes 1 Mayo
  let slot = 0
  const groupMatches: Array<{ home: string; away: string; time: string; date: string }> = [
    { home: b86,     away: romareda_a, time: '15:00', date: MAY1 }, // M1: B86 vs Romareda A
    { home: olivar1, away: perez,      time: '15:00', date: MAY1 }, // M2: Olivar vs Perez
    { home: ricopia15b, away: escuela, time: '15:00', date: MAY1 }, // M3: Ricopia vs Escuela
    { home: maria15, away: premia,     time: '16:00', date: MAY1 }, // M4: Marianistas vs Premia
    { home: perez,   away: b86,        time: '18:15', date: MAY1 }, // M5: Perez vs B86
    { home: olivar1, away: romareda_a, time: '18:15', date: MAY1 }, // M6: Olivar vs Romareda A ⭐
    { home: premia,  away: ricopia15b, time: '19:30', date: MAY1 }, // M7: Premia vs Ricopia
    { home: maria15, away: escuela,    time: '19:30', date: MAY1 }, // M8: Marianistas vs Escuela
    // Sábado 2 Mayo
    { home: romareda_a, away: perez,   time: '13:00', date: MAY2 }, // M9: Romareda A ⭐ vs Perez
    { home: escuela,    away: premia,  time: '13:00', date: MAY2 }, // M10: Escuela vs Premia
    { home: b86,        away: olivar1, time: '13:00', date: MAY2 }, // M11: B86 vs Olivar
    { home: ricopia15b, away: maria15, time: '13:00', date: MAY2 }, // M12: Ricopia vs Marianistas
  ]

  for (const m of groupMatches) {
    const matchId = await insertMatch(tid, m.home, m.away, utc(m.date, m.time), 'group')
    await insertTournamentMatch({
      tournamentId: tid, phase: 'group',
      roundIndex: slot, matchSlot: 0,
      homeTeamId: m.home, awayTeamId: m.away, matchId,
    })
    slot++
  }

  // ── Knockout placeholders ───────────────────────────────────────────────────
  // 7th/8th place: Sáb 18:15, Pergola Col Elisabeth 1
  const m7th = await insertMatch(tid, romareda_a, romareda_a, utc(MAY2, '18:15'), 'qf') // placeholders
  await db.from('matches').update({ home_team_id: null, away_team_id: null }).eq('id', m7th).is('home_team_id', romareda_a)
  // Easier: just insert with nulls directly via tournament_matches
  await db.from('matches').delete().eq('id', m7th) // remove the placeholder match

  // Knockout rounds as tournament_match placeholders (no match_id yet — filled when admin activates)
  // qf phase = placement (7th/8th, 5th/6th), sf = 3rd/4th, final
  // slot 0 = 7th/8th (G1-4th vs G2-4th), slot 1 = 5th/6th (G1-3rd vs G2-3rd)
  await insertTournamentMatch({ tournamentId: tid, phase: 'qf', roundIndex: 0, matchSlot: 0, homeTeamId: null, awayTeamId: null, matchId: null })
  await insertTournamentMatch({ tournamentId: tid, phase: 'qf', roundIndex: 0, matchSlot: 1, homeTeamId: null, awayTeamId: null, matchId: null })
  // sf = 3rd/4th (G1-2nd vs G2-2nd)
  await insertTournamentMatch({ tournamentId: tid, phase: 'sf', roundIndex: 1, matchSlot: 0, homeTeamId: null, awayTeamId: null, matchId: null })
  // final = G1-1st vs G2-1st
  await insertTournamentMatch({ tournamentId: tid, phase: 'final', roundIndex: 2, matchSlot: 0, homeTeamId: null, awayTeamId: null, matchId: null })

  console.log(`06AMP2 seeded: 12 group matches + 4 knockout placeholders`)
  return tid
}

// ─── 07AMB — Alevín Masculino Bronce (CD Romareda B) ─────────────────────────
async function seed07AMB() {
  console.log('\n── 07AMB: Alevín Masculino Bronce ────────────────────────')

  const { data: t, error: tErr } = await db
    .from('tournaments')
    .insert({
      name: 'Alevín Masc. Bronce — Costa Dorada 2026',
      format: 'group_knockout',
      num_teams: 12,
      status: 'setup',
      viewer_code: null,
    })
    .select('id')
    .single()
  if (tErr) throw new Error(`create tournament 07AMB: ${tErr.message}`)
  const tid = t.id as string
  console.log(`Tournament created: ${tid}`)

  // Teams — Group 1
  const romareda_b = await upsertTeam('CD ROMAREDA B', true)
  const cde        = await upsertTeam('CDE DINAMICA MADRID')
  const tecla      = await upsertTeam('BC TECLA SALA BLANCO')
  // Teams — Group 2
  const maria14    = await upsertTeam('MARIANISTAS 14')
  const azulejos_b = await upsertTeam('AZULEJOS MONCAYO CBZ B')
  const miramadrid = await upsertTeam('COLEGIO MIRAMADRID')
  // Teams — Group 3
  const olivar2    = await upsertTeam('EL OLIVAR 2')
  const correa     = await upsertTeam('DISTRITO OLIMPICO CORREA')
  const equipo_loc = await upsertTeam('EQUIPO LOCAL')
  // Teams — Group 4
  const old_school = await upsertTeam('OLD SCHOOL BASKET')
  const joventut   = await upsertTeam('JOVENTUT MARIANA')
  const rozas15b   = await upsertTeam('LAS ROZAS 15 B')

  // Enroll with group names
  for (const [id, g] of [
    [romareda_b, '1'], [cde, '1'], [tecla, '1'],
    [maria14, '2'], [azulejos_b, '2'], [miramadrid, '2'],
    [olivar2, '3'], [correa, '3'], [equipo_loc, '3'],
    [old_school, '4'], [joventut, '4'], [rozas15b, '4'],
  ] as [string, string][]) {
    await insertTournamentTeam(tid, id, g)
  }

  await db.from('tournaments').update({ status: 'group_phase' }).eq('id', tid)

  // ── Group phase matches (direct insert — bypassing generateGroupSchedule) ──
  const groupMatches: Array<{ home: string; away: string; time: string; date: string }> = [
    // Viernes 1 Mayo — Group 1
    { home: romareda_b, away: cde,       time: '11:15', date: MAY1 }, // M1 ⭐
    { home: tecla,      away: romareda_b, time: '17:15', date: MAY1 }, // M5 ⭐
    // Sábado 2 Mayo — Group 1 (round 3)
    { home: cde,        away: tecla,     time: '09:00', date: MAY2 }, // M9
    // Viernes 1 Mayo — Group 2
    { home: miramadrid, away: maria14,   time: '11:15', date: MAY1 }, // M2
    { home: azulejos_b, away: miramadrid, time: '17:15', date: MAY1 }, // M6
    { home: maria14,    away: azulejos_b, time: '10:00', date: MAY2 }, // M10
    // Viernes 1 Mayo — Group 3
    { home: equipo_loc, away: olivar2,   time: '11:15', date: MAY1 }, // M3
    { home: correa,     away: equipo_loc, time: '17:15', date: MAY1 }, // M7
    { home: olivar2,    away: correa,    time: '10:00', date: MAY2 }, // M11
    // Viernes 1 Mayo — Group 4
    { home: rozas15b,   away: old_school, time: '12:15', date: MAY1 }, // M4
    { home: joventut,   away: rozas15b,  time: '18:15', date: MAY1 }, // M8
    { home: old_school, away: joventut,  time: '10:00', date: MAY2 }, // M12
  ]

  let slot = 0
  for (const m of groupMatches) {
    const matchId = await insertMatch(tid, m.home, m.away, utc(m.date, m.time), 'group')
    await insertTournamentMatch({
      tournamentId: tid, phase: 'group',
      roundIndex: slot, matchSlot: 0,
      homeTeamId: m.home, awayTeamId: m.away, matchId,
    })
    slot++
  }

  // ── Knockout placeholders ───────────────────────────────────────────────────
  // 4 group winners → 2 semis (Sáb 15:00) → Final (Dom 11:15)
  // sf slot 0: G1 1st vs G2 1st, sf slot 1: G3 1st vs G4 1st
  await insertTournamentMatch({ tournamentId: tid, phase: 'sf', roundIndex: 0, matchSlot: 0, homeTeamId: null, awayTeamId: null, matchId: null })
  await insertTournamentMatch({ tournamentId: tid, phase: 'sf', roundIndex: 0, matchSlot: 1, homeTeamId: null, awayTeamId: null, matchId: null })
  // 3rd/4th
  await insertTournamentMatch({ tournamentId: tid, phase: 'sf', roundIndex: 1, matchSlot: 0, homeTeamId: null, awayTeamId: null, matchId: null })
  // Final
  await insertTournamentMatch({ tournamentId: tid, phase: 'final', roundIndex: 2, matchSlot: 0, homeTeamId: null, awayTeamId: null, matchId: null })

  console.log(`07AMB seeded: 12 group matches + 4 knockout placeholders`)
  return tid
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Costa Dorada Basket Cup 2026 — Seed Script')
  console.log(`Supabase: ${supabaseUrl}`)

  await cleanup()
  const id1 = await seed06AMP2()
  const id2 = await seed07AMB()

  console.log('\n✅ Done!')
  console.log(`  06AMP2 tournament id: ${id1}`)
  console.log(`  07AMB  tournament id: ${id2}`)
  console.log('\nNext steps:')
  console.log('  1. Run migration 002 in Supabase SQL editor first')
  console.log('  2. Check tournaments appear in the app at /torneos')
  console.log('  3. Admin activates each match at game time')
}

main().catch((err) => { console.error(err); process.exit(1) })
