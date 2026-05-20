import { test, expect } from '@playwright/test';
import { mockProxy, completeOnboarding, waitForScenarios } from './helpers';

// ---------------------------------------------------------------------------
// Sidebar channel navigation
// ---------------------------------------------------------------------------

test.describe('Channel sidebar', () => {
  test('only selected channels appear in the sidebar navigation', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    const modeNav = page.locator('#mode-nav');
    await expect(modeNav.locator('[data-mode="slack"]')).toBeVisible({ timeout: 5_000 });
    await expect(modeNav.locator('[data-mode="email"]')).not.toBeVisible();
    await expect(modeNav.locator('[data-mode="call"]')).not.toBeVisible();
  });

  test('when two channels are selected both appear in the sidebar', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.fill('#ob-role', 'HR Specialist');
    await page.fill('#ob-learnt', 'giving difficult feedback');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="call"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });

    const modeNav = page.locator('#mode-nav');
    await expect(modeNav.locator('[data-mode="slack"]')).toBeVisible({ timeout: 5_000 });
    await expect(modeNav.locator('[data-mode="call"]')).toBeVisible();
    await expect(modeNav.locator('[data-mode="email"]')).not.toBeVisible();
  });

  test('the first selected channel is active in the sidebar on load', async ({ page }) => {
    await completeOnboarding(page, { channel: 'email' });
    await expect(page.locator('#mode-nav [data-mode="email"].a')).toBeVisible({ timeout: 5_000 });
  });

  test('the active channel item does not have the active class on non-active channels', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.fill('#ob-role', 'Account Manager');
    await page.fill('#ob-learnt', 'managing client expectations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="email"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });
    await waitForScenarios(page);

    // Slack is selected first — Email should not have the active class
    await expect(page.locator('#mode-nav [data-mode="slack"].a')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#mode-nav [data-mode="email"].a')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Switching channels
// ---------------------------------------------------------------------------

test.describe('Switching channels', () => {
  test('clicking a different channel in the sidebar loads that channel\'s scenarios', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.fill('#ob-role', 'Account Manager');
    await page.fill('#ob-learnt', 'managing client expectations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="email"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });
    await waitForScenarios(page);

    // Switch from Slack to Email
    await page.locator('#mode-nav [data-mode="email"]').click();

    // Email scenarios load — may show loading briefly then 3 cards
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 15_000 });
  });

  test('after switching channels the new channel is marked as active in the sidebar', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.fill('#ob-role', 'Account Manager');
    await page.fill('#ob-learnt', 'managing client expectations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="email"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });
    await waitForScenarios(page);

    await page.locator('#mode-nav [data-mode="email"]').click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 15_000 });

    await expect(page.locator('#mode-nav [data-mode="email"].a')).toBeVisible();
    await expect(page.locator('#mode-nav [data-mode="slack"].a')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Topbar channel indicator
// ---------------------------------------------------------------------------

test.describe('Topbar channel display', () => {
  test('the topbar shows the current channel name', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await expect(page.locator('#hb-mode')).toContainText('Slack', { timeout: 5_000 });
  });

  test('the topbar includes the total number of selected channels in brackets', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.fill('#ob-role', 'HR Specialist');
    await page.fill('#ob-learnt', 'giving difficult feedback');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="call"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#hb-mode')).toContainText('(2)', { timeout: 5_000 });
  });
});