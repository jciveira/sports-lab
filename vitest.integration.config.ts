import { defineConfig } from 'vitest/config'

/**
 * Vitest config for integration tests that hit the real Supabase DB.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.
 * NOT run in CI — must be run locally before marking scorekeeper-touching issues in-review.
 *
 * Usage: npm run test:integration
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
