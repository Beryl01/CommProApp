import { test, expect } from '@playwright/test';
import { MOCK_SCENARIOS, mockProxy, completeOnboarding, waitForScenarios, startConversation } from './helpers';

// ---------------------------------------------------------------------------
// Input sanitisation on the onboarding form
// ---------------------------------------------------------------------------

test.describe('Onboarding form sanitisation', () => {
  test('angle brackets typed into the role field are stripped before use', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.fill('#ob-role', '<b>Senior</b> Engineer');
    await page.fill('#ob-learnt', 'active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });

    // sanitise() strips < > " — the badge must not contain angle brackets
    const badgeText = await page.locator('#hb-role').textContent() ?? '';
    expect(badgeText).not.toContain('<');
    expect(badgeText).not.toContain('>');
  });

  test('a script tag in the role field does not execute', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.fill('#ob-role', '<script>window.__roleXSS = 1</script>Engineer');
    await page.fill('#ob-learnt', 'handling escalations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });

    const injected = await page.evaluate(() => (window as { __roleXSS?: number }).__roleXSS);
    expect(injected).toBeUndefined();
  });

  test('role text longer than 100 characters is truncated before use', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockProxy);
    await page.goto('/');
    await page.fill('#ob-role', 'A'.repeat(150));
    await page.fill('#ob-learnt', 'active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#hb-role')).toBeVisible({ timeout: 10_000 });

    // Badge text is further truncated to 22 chars + ellipsis — combined ≤ 25 chars
    const badgeText = await page.locator('#hb-role').textContent() ?? '';
    expect(badgeText.length).toBeLessThanOrEqual(25);
  });
});

// ---------------------------------------------------------------------------
// HTML escaping in scenario card content
// ---------------------------------------------------------------------------

test.describe('HTML escaping in scenario cards', () => {
  test('a script tag embedded in scenario title data is not executed', async ({ page }) => {
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
    await page.fill('#ob-role', 'Engineer');
    await page.fill('#ob-learnt', 'active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10_000 });

    // Script must not have executed
    const injected = await page.evaluate(() => (window as { __scenarioXSS?: number }).__scenarioXSS);
    expect(injected).toBeUndefined();
  });

  test('HTML in a scenario title is rendered as visible text not as markup', async ({ page }) => {
    const htmlTitle = '<em>Important</em> Scenario';
    const htmlScenarios = [
      { ...MOCK_SCENARIOS[0], title: htmlTitle },
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
    await page.fill('#ob-role', 'Engineer');
    await page.fill('#ob-learnt', 'active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10_000 });

    // The card title should display the raw angle-bracket characters, not rendered HTML
    await expect(page.locator('.sc-title').first()).toContainText('<em>');
  });

  test('HTML in scenario description is escaped and not executed', async ({ page }) => {
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
    await page.fill('#ob-role', 'Engineer');
    await page.fill('#ob-learnt', 'active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10_000 });

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

    const htmlMessage = '<strong>Important:</strong> fix this now';
    await page.fill('#inp-0', htmlMessage);
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: 5_000 });

    // textContent of the bubble should contain the literal angle brackets
    const bubbleText = await page.locator('#msgs-0 .msg.you .msg-bub').first().textContent() ?? '';
    expect(bubbleText).toContain('<strong>');
  });

  test('a script tag typed in the message input does not execute', async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);

    await page.fill('#inp-0', '<script>window.__msgXSS = 1</script>Hello');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: 5_000 });

    const injected = await page.evaluate(() => (window as { __msgXSS?: number }).__msgXSS);
    expect(injected).toBeUndefined();
  });
});
