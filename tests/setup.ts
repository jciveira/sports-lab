import '@testing-library/jest-dom/vitest'

// Fail fast if Supabase env vars are missing — tests that touch access/matches/sync
// will silently return null/true instead of exercising real logic, hiding bugs.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '\n⚠️  VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.\n' +
    '   Tests that depend on isSupabaseConfigured will use fallback paths.\n' +
    '   Copy .env.example → .env and fill in credentials to run full coverage.\n'
  )
}
