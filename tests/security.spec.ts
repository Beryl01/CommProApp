import { test, expect } from '@playwright/test';
import { MOCK_SCENARIOS, mockProxy, completeOnboarding, waitForScenarios, startConversation, UI_TIMEOUT, SCENARIO_LOAD_TIMEOUT } from './helpers';

// ---------------------------------------------------------------------------
// Input sanitisation on the onboarding form
// ---------------------------------------------------------------------------

test.describe('Onboarding form sanitisation', () => {
  test('angle brackets in the role field are stripped before use', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('<b>Senior</b> Engineer');
    await page.getByPlaceholder(/active listening/).fill('active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });

    const badgeText = await page.locator('#hb-role').textContent() ?? '';
    expect(badgeText).not.toContain('<');
    expect(badgeText).not.toContain('>');
  });

  test('a script tag in the role field does not execute', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('<script>window.__roleXSS = 1</script>Engineer');
    await page.getByPlaceholder(/active listening/).fill('handling escalations');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });

    const injected = await page.evaluate(() => (window as { __roleXSS?: number }).__roleXSS);
    expect(injected).toBeUndefined();
  });

  test('role text longer than 100 characters is truncated in the badge', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('A'.repeat(150));
    await page.getByPlaceholder(/active listening/).fill('active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#hb-role')).toBeVisible({ timeout: UI_TIMEOUT });
    const badgeText = await page.locator('#hb-role').textContent() ?? '';
    expect(badgeText.length).toBeLessThanOrEqual(25);
  });
});

// ---------------------------------------------------------------------------
// HTML escaping in scenario card content
// ---------------------------------------------------------------------------

test.describe('HTML escaping in scenario cards', () => {
  test('a script tag in scenario title data is not executed', async ({ page }) => {
    const xssScenarios = [
      { ...MOCK_SCENARIOS[0], title: '<script>window.__scenarioXSS = 1</script>Test Scenario' },
      MOCK_SCENARIOS[1],
      MOCK_SCENARIOS[2],
    ];

    await page.route('/.netlify/functions/proxy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ text: JSON.stringify(xssScenarios) }] }),
      });
    });

    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Engineer');
    await page.getByPlaceholder(/active listening/).fill('active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });

    const injected = await page.evaluate(() => (window as { __scenarioXSS?: number }).__scenarioXSS);
    expect(injected).toBeUndefined();
  });

  test('HTML tags in a scenario title are rendered as visible text not as markup', async ({ page }) => {
    const htmlScenarios = [
      { ...MOCK_SCENARIOS[0], title: '<em>Important</em> Scenario' },
      MOCK_SCENARIOS[1],
      MOCK_SCENARIOS[2],
    ];

    await page.route('/.netlify/functions/proxy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ text: JSON.stringify(htmlScenarios) }] }),
      });
    });

    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Engineer');
    await page.getByPlaceholder(/active listening/).fill('active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });

    await expect(page.locator('.sc-title').first()).toContainText('<em>');
  });

  test('an onerror payload in scenario description data does not execute', async ({ page }) => {
    const xssScenarios = [
      { ...MOCK_SCENARIOS[0], desc: '<img src=x onerror="window.__descXSS=1">' },
      MOCK_SCENARIOS[1],
      MOCK_SCENARIOS[2],
    ];

    await page.route('/.netlify/functions/proxy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ text: JSON.stringify(xssScenarios) }] }),
      });
    });

    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Engineer');
    await page.getByPlaceholder(/active listening/).fill('active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });

    const injected = await page.evaluate(() => (window as { __descXSS?: number }).__descXSS);
    expect(injected).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// User message content in the conversation
// ---------------------------------------------------------------------------

test.describe('User message rendering in conversation', () => {
  test('HTML typed into the message input is rendered as plain text not as markup', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);

    await page.locator('#inp-0').fill('<strong>Important:</strong> fix this now');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: UI_TIMEOUT });

    const bubbleText = await page.locator('#msgs-0 .msg.you .msg-bub').first().textContent() ?? '';
    expect(bubbleText).toContain('<strong>');
  });

  test('a script tag typed in the message input does not execute', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);

    await page.locator('#inp-0').fill('<script>window.__msgXSS = 1</script>Hello');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: UI_TIMEOUT });

    const injected = await page.evaluate(() => (window as { __msgXSS?: number }).__msgXSS);
    expect(injected).toBeUndefined();
  });
});
