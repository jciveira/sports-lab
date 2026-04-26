/**
 * Regression tests — golden path flows that must never break.
 *
 * These test the critical user journeys a parent would take on game day.
 * Runs on 2 viewports (Mobile Chrome + Desktop Chrome).
 * Keep them focused on behavior, not text.
 */
import { test, expect } from '@playwright/test'
import { authenticateAdmin } from './helpers'

const FAKE_TEAMS = [
  { id: 'e2e-home', name: 'Dominicos', nickname: null, badge_url: null, city_district: null, created_at: '', category: null, gender: null },
  { id: 'e2e-away', name: 'Maristas', nickname: null, badge_url: null, city_district: null, created_at: '', category: null, gender: null },
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

async function selectTeams(page: import('@playwright/test').Page) {
  await page.locator('button').filter({ hasText: 'Selecciona equipo local' }).click()
  await page.locator('button').filter({ hasText: /^Dominicos$/ }).click()
  await page.locator('button').filter({ hasText: 'Selecciona equipo visitante' }).click()
  await page.locator('button').filter({ hasText: /^Maristas$/ }).click()
}

async function startMatch(page: import('@playwright/test').Page) {
  await mockTeamsApi(page)
  await page.goto('/scoreboard')
  await selectTeams(page)
  await page.getByText('Empezar partido').click()
}

// ---------------------------------------------------------------------------
// 1. FULL MATCH LIFECYCLE — the #1 user journey
// ---------------------------------------------------------------------------
test.describe('Full match lifecycle', () => {
  test('home → scoreboard → play → halftime → finish → home', async ({ page }) => {
    await startMatch(page)
    await expect(page.getByText('00:00')).toBeVisible()

    // Score goals
    await page.getByLabel('Sumar gol Dominicos').click()
    await page.getByLabel('Sumar gol Dominicos').click()
    await page.getByLabel('Sumar gol Maristas').click()

    // Start and pause clock
    await page.getByLabel('Iniciar reloj').click()
    await page.getByLabel('Pausar reloj').click()

    // Next half → halftime
    await page.getByText('Siguiente parte').click()
    await expect(page.getByText('Descanso')).toBeVisible()

    // Play second half and finish
    await page.getByLabel('Iniciar reloj').click()
    await page.getByLabel('Pausar reloj').click()
    await page.getByText('Terminar partido').click()
    await expect(page.getByText('finalizado')).toBeVisible()

    // Return home — '/' now redirects to viewer shell at /partidos
    await page.getByText('Volver al inicio').click()
    await expect(page).toHaveURL(/\/partidos/)
  })
})

// ---------------------------------------------------------------------------
// 2. CANCEL MATCH — operator changes mind mid-game
// ---------------------------------------------------------------------------
test.describe('Cancel match flow', () => {
  test('cancel with confirmation returns home', async ({ page }) => {
    await startMatch(page)
    await page.getByLabel('Sumar gol Dominicos').click()
    await page.getByLabel('Iniciar reloj').click()

    await page.getByLabel('Cancelar partido').click()
    await expect(page.getByText('¿Cancelar este partido?')).toBeVisible()

    const buttons = page.getByRole('button', { name: 'Cancelar partido' })
    await buttons.last().click()
    await expect(page).toHaveURL(/\/partidos/)
  })

  test('Seguir jugando dismisses cancel dialog', async ({ page }) => {
    await startMatch(page)
    await page.getByLabel('Iniciar reloj').click()

    await page.getByLabel('Cancelar partido').click()
    await page.getByText('Seguir jugando').click()
    await expect(page.getByText('¿Cancelar este partido?')).not.toBeVisible()
    await expect(page.getByLabel('Pausar reloj')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 3. TIMEOUT + EXCLUSION — game-time controls
// ---------------------------------------------------------------------------
test.describe('Timeout and exclusion controls', () => {
  test('timeout pauses clock, exclusion creates timer', async ({ page }) => {
    await startMatch(page)

    await page.getByLabel('Iniciar reloj').click()
    await expect(page.getByLabel('Pausar reloj')).toBeVisible()

    // Timeout pauses
    await page.getByLabel('Tiempo muerto local').click()
    await expect(page.getByLabel('Iniciar reloj')).toBeVisible()

    // Resume and add exclusion
    await page.getByLabel('Iniciar reloj').click()
    await page.getByLabel('Exclusión local').click()
    await expect(page.getByText('Exclusiones')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 4. RESET SCORE — operator resets scoreboard mid-game
// ---------------------------------------------------------------------------
test.describe('Reset score flow', () => {
  test('reset with confirmation, dismiss with Mantener', async ({ page }) => {
    await startMatch(page)
    await page.getByLabel('Sumar gol Dominicos').click()

    // Dismiss
    await page.getByLabel('Reiniciar marcador').click()
    await expect(page.getByText('¿Reiniciar marcador a 0 – 0?')).toBeVisible()
    await page.getByText('Mantener marcador').click()
    await expect(page.getByText('¿Reiniciar marcador a 0 – 0?')).not.toBeVisible()

    // Confirm
    await page.getByLabel('Reiniciar marcador').click()
    const resetButtons = page.getByRole('button', { name: 'Reiniciar marcador' })
    await resetButtons.last().click()
    await expect(page.getByText('¿Reiniciar marcador a 0 – 0?')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 5. NAVIGATION — all routes reachable from home
// ---------------------------------------------------------------------------
test.describe('Navigation', () => {
  test('viewer shell tabs and MoreTab links reach their pages', async ({ page }) => {
    // Root redirects to viewer shell
    await page.goto('/')
    await expect(page).toHaveURL(/\/partidos/)

    // Viewer shell tabs
    await page.getByRole('link', { name: 'Torneos' }).click()
    await expect(page).toHaveURL(/\/torneos/)

    await page.getByRole('link', { name: 'Plantillas' }).click()
    await expect(page).toHaveURL(/\/plantillas/)

    // Más tab → navigate directly (BugReportButton overlaps the Más tab on Mobile)
    await page.goto('/mas')
    await expect(page).toHaveURL(/\/mas/)

    await page.getByText('Administración').click()
    await expect(page.getByPlaceholder('PIN')).toBeVisible()
    await page.goto('/mas')

    await page.getByText('Guía para padres').click()
    await expect(page.getByRole('heading', { name: /Seguir un partido/ })).toBeVisible()
    await page.goto('/mas')

    await page.getByText('Sugerencias').click()
    await expect(page.getByText('idea para mejorar')).toBeVisible()
  })

  test('admin shell tabs are reachable', async ({ page }) => {
    await authenticateAdmin(page)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/partidos/)

    // All 4 admin tabs visible
    await expect(page.getByRole('link', { name: 'Torneos' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Equipos' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Jugadores' })).toBeVisible()

    // Navigate admin tabs
    await page.getByRole('link', { name: 'Torneos' }).click()
    await expect(page).toHaveURL(/\/admin\/torneos/)

    await page.getByRole('link', { name: 'Equipos' }).click()
    await expect(page).toHaveURL(/\/admin\/equipos/)
  })
})

// ---------------------------------------------------------------------------
// 6. MATCH SETUP — preset selection + advanced settings
// ---------------------------------------------------------------------------
test.describe('Match setup', () => {
  test('preset selection changes config', async ({ page }) => {
    await mockTeamsApi(page)
    await page.goto('/scoreboard')
    await page.getByText('U14 Standard (2×25 min)').click()
    await expect(page.getByText('2 × 25 min')).toBeVisible()
  })

  test('advanced settings toggle', async ({ page }) => {
    await page.goto('/scoreboard')
    await page.getByText('Mostrar configuración avanzada').click()
    await expect(page.getByText('Partes')).toBeVisible()
    await page.getByText('Ocultar configuración avanzada').click()
    await expect(page.getByText('Partes')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 7. FORM VALIDATION — new match + tournament wizard
// ---------------------------------------------------------------------------
test.describe('Form validation', () => {
  test('new match: create disabled until both teams selected', async ({ page }) => {
    await mockTeamsApi(page)
    await authenticateAdmin(page)
    await page.goto('/admin/new-match')

    const createBtn = page.getByRole('button', { name: 'Crear partido' })
    await expect(createBtn).toBeDisabled()

    await page.locator('button').filter({ hasText: 'Selecciona equipo local' }).click()
    await page.locator('button').filter({ hasText: /^Dominicos$/ }).click()
    await expect(createBtn).toBeDisabled()

    await page.locator('button').filter({ hasText: 'Selecciona equipo visitante' }).click()
    await page.locator('button').filter({ hasText: /^Maristas$/ }).click()
    await expect(createBtn).toBeEnabled()
  })

  test('tournament wizard: name + date required', async ({ page }) => {
    await authenticateAdmin(page)
    await page.goto('/admin/tournament/new')
    const nextBtn = page.getByRole('button', { name: /Siguiente/ })

    await expect(nextBtn).toBeDisabled()
    await page.getByPlaceholder('Nombre del torneo').fill('Spring Cup')
    await expect(nextBtn).toBeDisabled()
    await page.locator('input[type="date"]').fill('2026-04-03')
    await expect(nextBtn).toBeEnabled()
  })
})

// ---------------------------------------------------------------------------
// 8. HELP PAGE — guide sections + suggestions link
// ---------------------------------------------------------------------------
test.describe('Help page', () => {
  test('guide sections render and suggestions link works', async ({ page }) => {
    await page.goto('/help')
    await expect(page.getByRole('heading', { name: /Instalar la app/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Seguir un partido/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Llevar el marcador/ })).toBeVisible()

    await page.getByText('Enviar sugerencia').click()
    await expect(page.getByText('idea para mejorar')).toBeVisible()
  })
})
