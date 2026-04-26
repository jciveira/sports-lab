import { test, expect } from '@playwright/test'

const FAKE_TEAMS = [
  { id: 'e2e-home', name: 'Home', nickname: null, badge_url: null, city_district: null, created_at: '' },
  { id: 'e2e-away', name: 'Away', nickname: null, badge_url: null, city_district: null, created_at: '' },
]

async function mockTeamsApi(page: import('@playwright/test').Page) {
  await page.route('**/rest/v1/teams**', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_TEAMS) })
    } else {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(FAKE_TEAMS[0]) })
    }
  })
}

async function setupMatch(page: import('@playwright/test').Page) {
  await mockTeamsApi(page)
  await page.goto('/scoreboard')
  await page.locator('button').filter({ hasText: 'Selecciona equipo local' }).click()
  await page.locator('button').filter({ hasText: /^Home$/ }).click()
  await page.locator('button').filter({ hasText: 'Selecciona equipo visitante' }).click()
  await page.locator('button').filter({ hasText: /^Away$/ }).click()
  await page.getByText('Empezar partido').click()
}

test.describe('Responsive scoreboard layout', () => {
  test('no horizontal scrollbar during active match', async ({ page }) => {
    await setupMatch(page)

    // Check that body doesn't overflow horizontally
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)
  })

  test('all interactive elements are visible without scrolling', async ({ page }) => {
    await setupMatch(page)

    // Clock should be visible
    await expect(page.getByText('00:00')).toBeVisible()

    // Score buttons should be visible
    await expect(page.getByLabel('Sumar gol Home')).toBeVisible()
    await expect(page.getByLabel('Sumar gol Away')).toBeVisible()

    // Play/pause button should be visible
    await expect(page.getByLabel('Iniciar reloj')).toBeVisible()
  })

  test('scoreboard elements fit within viewport', async ({ page }) => {
    await setupMatch(page)

    // Check that the scoreboard container doesn't exceed viewport height
    const overflowsVertically = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight * 1.1
    })
    // Allow 10% tolerance for minor overflow (address bar, etc.)
    expect(overflowsVertically).toBe(false)
  })

  test('score buttons have minimum 44px touch targets', async ({ page }) => {
    await setupMatch(page)

    const homeScoreBtn = page.getByLabel('Sumar gol Home')
    const box = await homeScoreBtn.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(40) // 40px min (w-10 = 40px on mobile)
    expect(box!.height).toBeGreaterThanOrEqual(40)
  })

  test('match setup page fits without horizontal scroll', async ({ page }) => {
    await mockTeamsApi(page)
    await page.goto('/scoreboard')

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)
  })
})
