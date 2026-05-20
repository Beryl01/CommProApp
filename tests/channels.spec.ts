import { test, expect } from '@playwright/test';
import { mockProxy, completeOnboarding, waitForScenarios, UI_TIMEOUT, SCENARIO_LOAD_TIMEOUT } from './helpers';

// ---------------------------------------------------------------------------
// Sidebar channel navigation
// ---------------------------------------------------------------------------

test.describe('Channel sidebar', () => {
  test('only the selected channel appears in the sidebar navigation', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    const modeNav = page.locator('#mode-nav');
    await expect(modeNav.locator('[data-mode="slack"]')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(modeNav.locator('[data-mode="email"]')).not.toBeVisible();
    await expect(modeNav.locator('[data-mode="call"]')).not.toBeVisible();
  });

  test('when two channels are selected both appear in the sidebar', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('HR Specialist');
    await page.getByPlaceholder(/active listening/).fill('giving difficult feedback');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="call"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });

    const modeNav = page.locator('#mode-nav');
    await expect(modeNav.locator('[data-mode="slack"]')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(modeNav.locator('[data-mode="call"]')).toBeVisible();
    await expect(modeNav.locator('[data-mode="email"]')).not.toBeVisible();
  });

  test('the first selected channel is marked as active in the sidebar', async ({ page }) => {
    await completeOnboarding(page, { channel: 'email' });
    await expect(page.locator('#mode-nav [data-mode="email"].a')).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('non-active channels do not have the active class', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Account Manager');
    await page.getByPlaceholder(/active listening/).fill('managing client expectations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="email"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await waitForScenarios(page);

    await expect(page.locator('#mode-nav [data-mode="slack"].a')).toBeVisible({ timeout: UI_TIMEOUT });
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
    await page.getByPlaceholder(/IT Support Specialist/).fill('Account Manager');
    await page.getByPlaceholder(/active listening/).fill('managing client expectations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="email"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await waitForScenarios(page);

    await page.locator('#mode-nav [data-mode="email"]').click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });
  });

  test('the switched-to channel becomes active in the sidebar', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Account Manager');
    await page.getByPlaceholder(/active listening/).fill('managing client expectations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="email"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await waitForScenarios(page);

    await page.locator('#mode-nav [data-mode="email"]').click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });

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
    await expect(page.locator('#hb-mode')).toContainText('Slack', { timeout: UI_TIMEOUT });
  });

  test('the topbar shows the total number of selected channels in brackets', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('HR Specialist');
    await page.getByPlaceholder(/active listening/).fill('giving difficult feedback');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="call"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#hb-mode')).toContainText('(2)', { timeout: UI_TIMEOUT });
  });
});
