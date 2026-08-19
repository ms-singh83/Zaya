import { expect, test } from '@playwright/test';

/**
 * M0 smoke check. Proves the Playwright wiring and the CI gate work.
 * E2E-1 and E2E-2 arrive with M4 and M6, where there is a loop to exercise.
 */
test('the app serves a page and sets its security headers', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  await expect(page.getByRole('heading', { name: 'Zaya' })).toBeVisible();
});
