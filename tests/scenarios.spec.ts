import { test, expect } from '@playwright/test';
import {
  MOCK_SCENARIOS,
  UI_TIMEOUT, SCENARIO_LOAD_TIMEOUT, AI_RESPONSE_TIMEOUT, SCORE_PANEL_TIMEOUT,
  completeOnboarding,
} from './helpers';


async function setupSlack(page: import('@playwright/test').Page): Promise<void> {
  await completeOnboarding(page, { channel: 'slack' });
}

test.describe('Scenarios', () => {
  test('renders three scenario cards after onboarding', async ({ page }) => {
    await setupSlack(page);
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });
  });

  test('the first scenario card is expanded by default', async ({ page }) => {
    await setupSlack(page);
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
  });

  test('clicking a collapsed card header expands its body', async ({ page }) => {
    await setupSlack(page);
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
    await page.locator('#sch-1').click();
    await expect(page.locator('#scb-1')).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('clicking the gate button opens the conversation view', async ({ page }) => {
    await setupSlack(page);
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#conv-0')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#msgs-0')).toBeVisible();
  });

  test('the AI sends an opening message after the conversation starts', async ({ page }) => {
    await setupSlack(page);
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#msgs-0 .msg.ai .msg-bub')).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
  });

  test('the user can send a message using the Send button', async ({ page }) => {
    await setupSlack(page);
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#inp-0')).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
    await page.locator('#inp-0').fill('I understand your concern and will look into this right away.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('pressing Enter sends the message', async ({ page }) => {
    await setupSlack(page);
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#inp-0')).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
    await page.locator('#inp-0').fill('Hello, let me help you with this.');
    await page.locator('#inp-0').press('Enter');
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('scenario card titles come from the AI response', async ({ page }) => {
    await setupSlack(page);
    await expect(page.locator('.sc-title').first()).toContainText('Angry client complaint', { timeout: SCENARIO_LOAD_TIMEOUT });
  });
});

test.describe('Scoring', () => {
  test('score card renders after End & Score is clicked', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#inp-0')).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
    await page.locator('#inp-0').fill('I hear you and will fix this immediately.');
    await page.locator('#end-0').click();
    await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: SCORE_PANEL_TIMEOUT });
  });

  test('score panel shows a readiness level', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: SCENARIO_LOAD_TIMEOUT });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#inp-0')).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
    await page.locator('#inp-0').fill('I hear you and will fix this immediately.');
    await page.locator('#end-0').click();
    await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: SCORE_PANEL_TIMEOUT });
    await expect(page.locator('#score-0')).toContainText('Ready');
  });
});

test.describe('API integration', () => {
  test('the proxy is called when scenarios are generated', async ({ page }) => {
    let proxyCalled = false;
    await page.route('/.netlify/functions/proxy', async (route) => {
      proxyCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ text: JSON.stringify(MOCK_SCENARIOS) }] }),
      });
    });
    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Engineer');
    await page.getByPlaceholder(/active listening/).fill('active listening');
    await page.locator('[data-mode="email"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    expect(proxyCalled).toBe(true);
  });
});
