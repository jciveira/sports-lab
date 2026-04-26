import type { Page } from '@playwright/test'

/**
 * Authenticate as admin by setting sessionStorage before navigation.
 * Must be called after an initial page.goto('/') so the browser has a
 * session context, then navigate to the target admin route.
 *
 * Usage:
 *   await authenticateAdmin(page)
 *   await page.goto('/admin/new-match')
 */
export async function authenticateAdmin(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => sessionStorage.setItem('hbl_admin_auth', 'true'))
}
