/**
 * One-off seed script: Load FIFA-style ratings for Dominicos AM players.
 *
 * Idempotent — matches players by team name + jersey number, skips if ratings already set.
 * Run with: npx tsx scripts/seed-dominicos-ratings.ts
 *
 * Source data: GitHub issue #54 (Mateo's roster ratings)
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

const TEAM_NAME = 'BM DOMINICOS'

// Field players: tiro, pase, defensa, fisico, stamina, vision_de_juego
const FIELD_PLAYERS: { number: number; name: string; ratings: Record<string, number> }[] = [
  { number: 2,  name: 'Rubén',       ratings: { tiro: 83, pase: 90, defensa: 80, fisico: 80, stamina: 90, vision_de_juego: 90 } },
  { number: 5,  name: 'Eduardo',     ratings: { tiro: 90, pase: 60, defensa: 80, fisico: 79, stamina: 85, vision_de_juego: 70 } },
  { number: 6,  name: 'Andrés',      ratings: { tiro: 75, pase: 80, defensa: 93, fisico: 79, stamina: 85, vision_de_juego: 90 } },
  { number: 13, name: 'Marcos',      ratings: { tiro: 80, pase: 90, defensa: 85, fisico: 80, stamina: 78, vision_de_juego: 85 } },
  { number: 20, name: 'Alejandro E', ratings: { tiro: 75, pase: 85, defensa: 97, fisico: 90, stamina: 75, vision_de_juego: 77 } },
  { number: 22, name: 'Acher',       ratings: { tiro: 98, pase: 90, defensa: 67, fisico: 80, stamina: 90, vision_de_juego: 70 } },
  { number: 23, name: 'Hugo',        ratings: { tiro: 89, pase: 85, defensa: 90, fisico: 79, stamina: 75, vision_de_juego: 85 } },
  { number: 26, name: 'Mateo',       ratings: { tiro: 70, pase: 88, defensa: 90, fisico: 90, stamina: 75, vision_de_juego: 90 } },
  { number: 30, name: 'Pablo',       ratings: { tiro: 80, pase: 85, defensa: 85, fisico: 80, stamina: 67, vision_de_juego: 90 } },
  { number: 32, name: 'Anibal',      ratings: { tiro: 90, pase: 75, defensa: 98, fisico: 80, stamina: 99, vision_de_juego: 70 } },
  { number: 38, name: 'Lorién',      ratings: { tiro: 98, pase: 98, defensa: 99, fisico: 70, stamina: 75, vision_de_juego: 99 } },
  { number: 47, name: 'Jaime',       ratings: { tiro: 80, pase: 80, defensa: 80, fisico: 81, stamina: 78, vision_de_juego: 80 } },
  { number: 54, name: 'David V',     ratings: { tiro: 80, pase: 80, defensa: 89, fisico: 80, stamina: 70, vision_de_juego: 80 } },
  { number: 57, name: 'Dario',       ratings: { tiro: 83, pase: 80, defensa: 90, fisico: 80, stamina: 83, vision_de_juego: 90 } },
  { number: 59, name: 'David S',     ratings: { tiro: 90, pase: 85, defensa: 85, fisico: 80, stamina: 82, vision_de_juego: 90 } },
  { number: 61, name: 'Alejandro A', ratings: { tiro: 90, pase: 85, defensa: 90, fisico: 95, stamina: 75, vision_de_juego: 90 } },
]

// Goalkeepers: 9m, 6m, ex, pas, med, 7m
const GK_PLAYERS: { number: number; name: string; ratings: Record<string, number> }[] = [
  { number: 16, name: 'Mario',  ratings: { '9m': 85, '6m': 90, ex: 90, pas: 95, med: 80, '7m': 85 } },
  { number: 51, name: 'Miquel', ratings: { '9m': 87, '6m': 91, ex: 90, pas: 96, med: 99, '7m': 93 } },
]

const ALL_PLAYERS = [...FIELD_PLAYERS, ...GK_PLAYERS]

async function main() {
  // Find the team
  const { data: teams, error: teamErr } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', TEAM_NAME)

  if (teamErr) { console.error('Error fetching teams:', teamErr.message); process.exit(1) }
  if (!teams || teams.length === 0) { console.error(`Team "${TEAM_NAME}" not found`); process.exit(1) }

  const team = teams[0]
  console.log(`Found team: ${team.name} (${team.id})`)

  // Fetch all players for this team
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, display_name, number, role, ratings')
    .eq('team_id', team.id)

  if (playersErr) { console.error('Error fetching players:', playersErr.message); process.exit(1) }
  if (!players) { console.error('No players found for team'); process.exit(1) }

  console.log(`Found ${players.length} players in ${team.name}\n`)

  let updated = 0
  let skipped = 0
  let notFound = 0

  for (const entry of ALL_PLAYERS) {
    const player = players.find((p) => p.number === entry.number)
    if (!player) {
      console.log(`  ✗ #${entry.number} ${entry.name} — NOT FOUND in DB`)
      notFound++
      continue
    }

    if (player.ratings !== null) {
      console.log(`  ○ #${entry.number} ${player.display_name} — already has ratings, skipping`)
      skipped++
      continue
    }

    const { error: updateErr } = await supabase
      .from('players')
      .update({ ratings: entry.ratings, card_type: 'toty' })
      .eq('id', player.id)

    if (updateErr) {
      console.error(`  ✗ #${entry.number} ${player.display_name} — ERROR: ${updateErr.message}`)
      continue
    }

    // Spot-check: compute expected media
    const values = Object.values(entry.ratings)
    const expectedMedia = Math.round(values.reduce((s, v) => s + v, 0) / values.length)
    console.log(`  ✓ #${entry.number} ${player.display_name} — ratings set (media: ${expectedMedia})`)
    updated++
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${notFound} not found`)
}

main().catch((err) => { console.error(err); process.exit(1) })
