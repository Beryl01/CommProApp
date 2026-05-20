import { test, expect } from '@playwright/test';

// The toggle button has title="Toggle dark mode" — getByTitle is the
// semantic locator recommended by Playwright for elements with a title attribute.

test.describe('Default theme on load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dark mode is active by default', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the toggle button shows a sun icon in dark mode', async ({ page }) => {
    await expect(page.getByTitle('Toggle dark mode')).toContainText('☀️');
  });
});

test.describe('Toggling the theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking the toggle once switches to light mode', async ({ page }) => {
    await page.getByTitle('Toggle dark mode').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  });

  test('the toggle button shows a moon icon in light mode', async ({ page }) => {
    await page.getByTitle('Toggle dark mode').click();
    await expect(page.getByTitle('Toggle dark mode')).toContainText('🌙');
  });

  test('clicking the toggle a second time returns to dark mode', async ({ page }) => {
    await page.getByTitle('Toggle dark mode').click(); // dark → light
    await page.getByTitle('Toggle dark mode').click(); // light → dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTitle('Toggle dark mode')).toContainText('☀️');
  });
});

test.describe('Theme persistence across reloads', () => {
  test('light mode is remembered after a page reload', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Toggle dark mode').click();
    await page.reload();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTitle('Toggle dark mode')).toContainText('🌙');
  });

  test('dark mode is the default when local storage has been cleared', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('commskill-theme'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('switching back to dark is also persisted on reload', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Toggle dark mode').click(); // to light
    await page.getByTitle('Toggle dark mode').click(); // back to dark
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
