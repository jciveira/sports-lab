import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    // Smoke: 1 viewport — just verify pages load without crashing
    {
      name: 'Smoke Desktop',
      testMatch: 'smoke.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Regression: 2 viewports — golden path flows on mobile + desktop
    {
      name: 'Regression Mobile',
      testMatch: 'regression.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Regression Desktop',
      testMatch: 'regression.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Responsive: 3 viewports — layout, touch targets, overflow
    {
      name: 'Responsive Mobile',
      testMatch: 'responsive.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Responsive iPhone SE',
      testMatch: 'responsive.spec.ts',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'Responsive Desktop',
      testMatch: 'responsive.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
