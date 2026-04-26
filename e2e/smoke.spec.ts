/**
 * Smoke tests — verify every page loads without crashing.
 *
 * Runs on 1 viewport (Desktop Chrome). These are NOT behavioral tests —
 * they only check that routes render their key element and produce no
 * console errors. Behavioral tests belong in regression.spec.ts.
 */
import { test, expect } from '@playwright/test'
import { authenticateAdmin } from './helpers'

test.describe('Smoke — every page loads', () => {
  test('home redirects to /partidos (viewer shell)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await expect(page).toHaveURL(/\/partidos/)
    await expect(page.getByRole('heading', { name: 'Partidos' })).toBeVisible()
    // Tab bar visible
    await expect(page.getByRole('link', { name: 'Torneos' })).toBeVisible()
    // PWA infra: theme-color + apple-touch-icon present
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#6ee7b7')
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png')
    expect(errors).toHaveLength(0)
  })

  test('torneos tab', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/torneos')
    await expect(page.getByRole('heading', { name: 'Torneos' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('viewer tournament detail — not found state', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/torneos/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText('Torneo no encontrado')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('plantillas tab', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/plantillas')
    await expect(page.getByRole('heading', { name: 'Plantillas' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('más tab', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/mas')
    await expect(page.getByRole('heading', { name: 'Más' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('scoreboard setup', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/scoreboard')
    await expect(page.getByText('Configuración del partido')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('admin PIN gate blocks unauthenticated access', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/admin/new-match')
    await expect(page.getByText('Administración')).toBeVisible()
    await expect(page.getByPlaceholder('PIN')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('new match page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/new-match')
    await expect(page.getByText('Nuevo partido')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('help page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/help')
    await expect(page.getByText('Guia para padres')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('create tournament page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/tournament/new')
    await expect(page.getByText('Nuevo torneo')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('suggestions page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/suggestions')
    await expect(page.getByText('Sugerencias')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('teams page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/teams')
    await expect(page.getByRole('heading', { name: 'Equipos' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('players page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/players')
    await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('roster page (fake team)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/equipos/fake-team-id/roster')
    await expect(page.getByRole('heading', { name: 'Equipo' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('player card page (invalid player)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/player/fake-player-id')
    await expect(page.getByText(/jugador no encontrado|cargando/i)).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('admin match page (invalid match)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/match/fake-match-id')
    await expect(page.getByText('Partido no encontrado')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('admin matches page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/matches')
    await expect(page.getByRole('heading', { name: 'Partidos' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('admin partidos tab', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/partidos')
    await expect(page.getByRole('heading', { name: 'Partidos' })).toBeVisible()
    // Admin tab bar visible
    await expect(page.getByText('Equipos')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('admin torneos tab', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/torneos')
    await expect(page.getByRole('heading', { name: 'Torneos' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('admin equipos tab', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/equipos')
    await expect(page.getByRole('heading', { name: 'Equipos' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('admin jugadores tab', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await authenticateAdmin(page)
    await page.goto('/admin/jugadores')
    await expect(page.getByRole('heading', { name: 'Jugadores' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('games page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/games')
    await expect(page.getByText('Centro de partidos')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('direct match URL (viewer access, no code prompt)', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/match/fake-match-id')
    await expect(page.getByText('Partido no encontrado')).toBeVisible()
    await expect(page.locator('input[placeholder*="Código"]')).not.toBeVisible()
    expect(errors).toHaveLength(0)
  })
})
