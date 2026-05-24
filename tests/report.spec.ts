import { test, expect } from '@playwright/test';
import {
  completeOnboarding, waitForScenarios, scoreAllScenarios, startConversation, scoreScenario,
  UI_TIMEOUT, SCORE_PANEL_TIMEOUT,
} from './helpers';


// Report visibility

test.describe('Report visibility', () => {
  test('the session report is hidden before any scenarios are completed', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    expect(await page.locator('#session-sum').isVisible()).toBe(false);
  });

  test('the View Report button is hidden before all scenarios are completed', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await expect(page.getByRole('button', { name: 'View Report' })).not.toBeVisible();
  });

  test('the session report appears automatically after all three scenarios are scored', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await scoreAllScenarios(page);
    await expect(page.locator('#session-sum')).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('the View Report button becomes visible once all scenarios are done', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await scoreAllScenarios(page);
    await expect(page.getByRole('button', { name: 'View Report' })).toBeVisible({ timeout: UI_TIMEOUT });
  });
});


// Report content

test.describe('Report content', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack', role: 'Support Engineer' });
    await waitForScenarios(page);
    await scoreAllScenarios(page);
    await expect(page.locator('#session-sum')).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('the report shows the CommSkill Pro heading', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('CommSkill Pro');
  });

  test('the report shows one of the four valid readiness levels', async ({ page }) => {
    const validLevels = ['Highly Ready', 'Ready', 'Partially Ready', 'Needs Development'];
    const reportText  = await page.locator('#session-sum').textContent() ?? '';
    expect(validLevels.some((level) => reportText.includes(level))).toBe(true);
  });

  test('the report includes the trainee role in the summary section', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('Support Engineer');
  });

  test('the report shows a channel result card for the completed channel', async ({ page }) => {
    await expect(page.locator('#session-sum .channel-card')).toHaveCount(1);
  });

  test('the report includes a Strengths section', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('Strengths');
  });

  test('the report includes a Focus Areas section', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('Focus Areas');
  });

  test('the report includes a Next 30 Days section', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('Next 30 Days');
  });

  test('the report shows a completion date with a month name', async ({ page }) => {
    const months     = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const reportText = await page.locator('#session-sum').textContent() ?? '';
    expect(months.some((m) => reportText.includes(m))).toBe(true);
  });
});


// Report actions

test.describe('Report actions', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await scoreAllScenarios(page);
    await expect(page.locator('#session-sum')).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('clicking New Session reloads the page and returns to the onboarding screen', async ({ page }) => {
    await page.getByRole('button', { name: /new session/i }).click();
    await expect(page.locator('#ob')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#app')).not.toBeVisible();
  });

  test('clicking View Report scrolls the report into the viewport', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'View Report' }).click();
    await expect(page.locator('#session-sum')).toBeInViewport({ timeout: UI_TIMEOUT });
  });
});


// Progress tracking

test.describe('Progress bar and done counter', () => {
  test('the progress bar starts at 0% before any scenarios are scored', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    const width = await page.locator('#prog-fill').evaluate((el) => (el as HTMLElement).style.width);
    expect(width).toBe('0%');
  });

  test('the done counter in the topbar increments after each scenario is scored', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await expect(page.locator('#hb-done')).toContainText('0/3', { timeout: UI_TIMEOUT });

    await startConversation(page, 0);
    await scoreScenario(page, 0);
    await expect(page.locator('#hb-done')).toContainText('1/3', { timeout: SCORE_PANEL_TIMEOUT });
  });
});
