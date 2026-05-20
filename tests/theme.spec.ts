import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Theme toggle — dark / light mode
// ---------------------------------------------------------------------------

test.describe('Default theme on load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dark mode is active by default', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the toggle button shows a sun icon in dark mode', async ({ page }) => {
    await expect(page.locator('#theme-toggle')).toContainText('☀️');
  });
});

test.describe('Toggling the theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking the toggle once switches to light mode', async ({ page }) => {
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  });

  test('the toggle button shows a moon icon in light mode', async ({ page }) => {
    await page.locator('#theme-toggle').click();
    await expect(page.locator('#theme-toggle')).toContainText('🌙');
  });

  test('clicking the toggle a second time returns to dark mode', async ({ page }) => {
    await page.locator('#theme-toggle').click(); // dark → light
    await page.locator('#theme-toggle').click(); // light → dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#theme-toggle')).toContainText('☀️');
  });
});

test.describe('Theme persistence across page reloads', () => {
  test('light mode is remembered after a reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('#theme-toggle').click(); // switch to light
    await page.reload();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#theme-toggle')).toContainText('🌙');
  });

  test('dark mode is the default when local storage is empty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('commskill-theme'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('switching back to dark mode is also persisted on reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('#theme-toggle').click(); // to light
    await page.locator('#theme-toggle').click(); // back to dark
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});