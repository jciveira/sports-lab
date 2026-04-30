/**
 * Regression tests — critical user journeys on Mobile + Desktop.
 * Placeholder: will grow as features are added.
 */
import { test, expect } from '@playwright/test'

test.describe('Regression — viewer shell navigation', () => {
  test('tab navigation works end-to-end', async ({ page }) => {
    await page.goto('/partidos')

    // Navigate to Torneos via tab bar
    await page.getByRole('link', { name: 'Torneos' }).click()
    await expect(page).toHaveURL(/\/torneos/)
    await expect(page.getByRole('heading', { name: 'Torneos' })).toBeVisible()

    // Navigate to Jugadores
    await page.getByRole('link', { name: 'Jugadores' }).click()
    await expect(page).toHaveURL(/\/jugadores/)

    // Navigate to Más
    await page.getByRole('link', { name: 'Más' }).click()
    await expect(page).toHaveURL(/\/mas/)
  })

  test('admin PIN gate blocks access', async ({ page }) => {
    await page.goto('/admin')
    // PIN form visible
    await expect(page.getByPlaceholder('PIN')).toBeVisible()
    // Wrong PIN shows error
    await page.getByPlaceholder('PIN').fill('0000')
    await page.getByRole('button', { name: 'Acceder' }).click()
    await expect(page.getByText('PIN incorrecto')).toBeVisible()
  })
})
