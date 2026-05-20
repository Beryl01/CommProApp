import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import { MOCK_SCENARIOS, UI_TIMEOUT, SCENARIO_LOAD_TIMEOUT } from './helpers';

async function mockClaudeAPI(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      content: [{ text: JSON.stringify(MOCK_SCENARIOS) }],
    }),
  });
}

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the onboarding screen on load and hides the main app', async ({ page }) => {
    await expect(page.locator('#ob')).toBeVisible();
    await expect(page.locator('#app')).not.toBeVisible();
  });

  test('blocks start when role field is empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#ob')).toBeVisible();
  });

  test('blocks start when learning goal is empty', async ({ page }) => {
    await page.getByPlaceholder(/IT Support Specialist/).fill('Software Engineer');
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#ob')).toBeVisible();
  });

  test('blocks start when no channel is selected', async ({ page }) => {
    await page.getByPlaceholder(/IT Support Specialist/).fill('Software Engineer');
    await page.getByPlaceholder(/active listening/).fill('active listening');
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#ob')).toBeVisible();
  });

  test('truncates a role longer than 100 characters in the badge', async ({ page }) => {
    await page.route('**/.netlify/functions/proxy', mockClaudeAPI);
    await page.getByPlaceholder(/IT Support Specialist/).fill('A'.repeat(150));
    await page.getByPlaceholder(/active listening/).fill('active listening');
    await page.locator('#ob [data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#hb-role')).toBeVisible({ timeout: UI_TIMEOUT });
    const badgeText = await page.locator('#hb-role').textContent() ?? '';
    expect(badgeText.length).toBeLessThanOrEqual(25); // capped at 22 chars + ellipsis
  });

  test('transitions to the main app after valid onboarding', async ({ page }) => {
    await page.route('**/.netlify/functions/proxy', mockClaudeAPI);
    await page.getByPlaceholder(/IT Support Specialist/).fill('Software Engineer');
    await page.getByPlaceholder(/active listening/).fill('I want to practise staying calm when escalations come in');
    await page.locator('#ob [data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#ob')).not.toBeVisible();
  });

  test('shows the role in the topbar badge after onboarding', async ({ page }) => {
    await page.route('**/.netlify/functions/proxy', mockClaudeAPI);
    await page.getByPlaceholder(/IT Support Specialist/).fill('Product Manager');
    await page.getByPlaceholder(/active listening/).fill('handling difficult conversations');
    await page.locator('#ob [data-mode="email"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#hb-role')).toContainText('Product Manager', { timeout: UI_TIMEOUT });
  });

  test('sidebar shows only the channels selected during onboarding', async ({ page }) => {
    await page.route('**/.netlify/functions/proxy', mockClaudeAPI);
    await page.getByPlaceholder(/IT Support Specialist/).fill('HR Specialist');
    await page.getByPlaceholder(/active listening/).fill('giving difficult feedback');
    await page.locator('#ob [data-mode="slack"]').click();
    await page.locator('#ob [data-mode="call"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    const modeNav = page.locator('#mode-nav');
    await expect(modeNav.locator('[data-mode="slack"]')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
    await expect(modeNav.locator('[data-mode="call"]')).toBeVisible();
  });
});
