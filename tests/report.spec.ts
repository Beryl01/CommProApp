import { test, expect } from '@playwright/test';
import { completeOnboarding, waitForScenarios, scoreAllScenarios } from './helpers';

// ---------------------------------------------------------------------------
// Session report — appears after all three scenarios are scored
// ---------------------------------------------------------------------------

test.describe('Report visibility', () => {
  test('the session report is hidden before any scenarios are completed', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    // #session-sum exists in the DOM but should not be visible yet
    const sumEl = page.locator('#session-sum');
    const isVisible = await sumEl.isVisible();
    expect(isVisible).toBe(false);
  });

  test('the view report button is hidden before all scenarios are completed', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await expect(page.locator('#view-report-btn')).not.toBeVisible();
  });

  test('the session report appears automatically after all three scenarios are scored', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await scoreAllScenarios(page);
    await expect(page.locator('#session-sum')).toBeVisible({ timeout: 10_000 });
  });

  test('the view report button becomes visible once all scenarios are done', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await scoreAllScenarios(page);
    await expect(page.locator('#view-report-btn')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Report content
// ---------------------------------------------------------------------------

test.describe('Report content', () => {
  // Score all three scenarios once for the whole describe block.
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack', role: 'Support Engineer' });
    await waitForScenarios(page);
    await scoreAllScenarios(page);
    await expect(page.locator('#session-sum')).toBeVisible({ timeout: 10_000 });
  });

  test('the report shows the CommSkill Pro heading', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('CommSkill Pro');
  });

  test('the report shows one of the four valid readiness levels', async ({ page }) => {
    const validLevels  = ['Highly Ready', 'Ready', 'Partially Ready', 'Needs Development'];
    const reportText   = await page.locator('#session-sum').textContent() ?? '';
    const hasLevel     = validLevels.some((level) => reportText.includes(level));
    expect(hasLevel).toBe(true);
  });

  test('the report includes the trainee role in the summary section', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('Support Engineer');
  });

  test('the report shows how many channels were completed', async ({ page }) => {
    // One channel was selected so the completed count should be 1
    await expect(page.locator('#session-sum')).toContainText('1');
  });

  test('the report includes a Strengths section', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('Strengths');
  });

  test('the report includes a Focus Areas section', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('Focus Areas');
  });

  test('the report includes a Next 30 Days section with habits to build', async ({ page }) => {
    await expect(page.locator('#session-sum')).toContainText('Next 30 Days');
  });

  test('the report shows a completion date', async ({ page }) => {
    // Date is formatted as "20 May 2026" style — just check a month name is present
    const months    = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const reportText = await page.locator('#session-sum').textContent() ?? '';
    const hasMonth   = months.some((m) => reportText.includes(m));
    expect(hasMonth).toBe(true);
  });

  test('each channel that was trained shows a result card in the report', async ({ page }) => {
    await expect(page.locator('#session-sum .channel-card')).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// Report actions
// ---------------------------------------------------------------------------

test.describe('Report actions', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await scoreAllScenarios(page);
    await expect(page.locator('#session-sum')).toBeVisible({ timeout: 10_000 });
  });

  test('clicking New Session reloads the page and returns to the onboarding screen', async ({ page }) => {
    await page.locator('#new-session-btn').click();
    await expect(page.locator('#ob')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#app')).not.toBeVisible();
  });

  test('clicking the View Report button in the topbar scrolls to the session report', async ({ page }) => {
    // Scroll to the top first so the report is off-screen
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#view-report-btn').click();
    // After scrollIntoView, the report should be in the visible viewport area
    await expect(page.locator('#session-sum')).toBeInViewport({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

test.describe('Progress bar', () => {
  test('the progress bar fill starts at 0% before any scenarios are done', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    const fill  = page.locator('#prog-fill');
    const width = await fill.evaluate((el) => (el as HTMLElement).style.width);
    expect(width).toBe('0%');
  });

  test('the done count in the topbar updates after each scenario is scored', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await expect(page.locator('#hb-done')).toContainText('0/3', { timeout: 5_000 });

    const { startConversation, scoreScenario } = await import('./helpers');
    await startConversation(page, 0);
    await scoreScenario(page, 0);
    await expect(page.locator('#hb-done')).toContainText('1/3', { timeout: 5_000 });
  });
});
