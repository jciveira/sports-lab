/**
 * Smoke tests — verify every new route from #18 loads without crashing.
 *
 * Runs on 1 viewport (Desktop Chrome). Checks route renders + no console errors.
 * Behavioral tests belong in regression.spec.ts.
 */
import { test, expect } from '@playwright/test'

test.describe('Smoke — basketball shell + new routes', () => {
  test('/ redirects to /partidos (ViewerShell)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await expect(page).toHaveURL(/\/partidos/)
    // Tab bar is rendered
    await expect(page.getByRole('link', { name: 'Torneos' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Jugadores' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Más' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('/partidos tab loads', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/partidos')
    await expect(page.getByRole('heading', { name: 'Partidos' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('/torneos tab loads', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/torneos')
    await expect(page.getByRole('heading', { name: 'Torneos' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('/jugadores tab loads', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/jugadores')
    await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('/mas tab loads with admin link', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/mas')
    await expect(page.getByRole('heading', { name: 'Más' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Administración/ })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('/suggestions page loads', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/suggestions')
    await expect(page.getByRole('heading', { name: 'Sugerencias' })).toBeVisible()
    await expect(page.getByPlaceholder(/sugerencia/i)).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('/admin shows PIN gate (AdminGuard)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Administración' })).toBeVisible()
    await expect(page.getByPlaceholder('PIN')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('/tournament/:id/bracket — not-found state loads without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/tournament/00000000-0000-0000-0000-000000000000/bracket')
    // Page should render something (loading spinner or error), not blank
    await expect(page.locator('body')).not.toBeEmpty()
    expect(errors).toHaveLength(0)
  })

  test('/player/:id/card — not-found state loads without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/player/00000000-0000-0000-0000-000000000000/card')
    await expect(page.locator('body')).not.toBeEmpty()
    expect(errors).toHaveLength(0)
  })
})
