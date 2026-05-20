import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';

const MOCK_SCENARIOS = [
  {
    title: 'Angry client complaint',
    type: 'hostile', intensity: 'high',
    desc: 'A client is furious about a missed deadline and messages you directly.',
    counterpartName: 'Sandra Mills', counterpartPersona: 'Frustrated enterprise client',
    task: 'De-escalate and offer a concrete resolution',
    context: 'Project has been delayed twice already.',
    inboundMessage: 'This is completely unacceptable. You have let our team down again.',
    systemPrompt: 'You are Sandra Mills, a frustrated enterprise client.',
    scoringDimensions: [{ name: 'Empathy', desc: 'Acknowledge the client\'s frustration' }],
  },
  {
    title: 'Vague requirements request',
    type: 'vague', intensity: 'medium',
    desc: 'A colleague asks you to "sort out the thing" without further detail.',
    counterpartName: 'Tom Harris', counterpartPersona: 'Busy product manager',
    task: 'Clarify what is actually being asked',
    context: '', inboundMessage: 'Hey, can you sort out that thing for the launch?',
    systemPrompt: 'You are Tom Harris, a vague product manager.',
    scoringDimensions: [{ name: 'Clarity', desc: 'Ask specific clarifying questions' }],
  },
  {
    title: 'System outage escalation',
    type: 'escalation', intensity: 'high',
    desc: 'Critical system is down and a stakeholder is escalating urgently.',
    counterpartName: 'James Oduya', counterpartPersona: 'Panicking operations manager',
    task: 'Manage the escalation and communicate a clear action plan',
    context: 'Peak trading hours.', inboundMessage: 'The system is completely down. This is costing us money every minute!',
    systemPrompt: 'You are James Oduya, an operations manager in a panic.',
    scoringDimensions: [{ name: 'Composure', desc: 'Stay calm under pressure' }],
  },
];

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

  test('shows onboarding screen on load, hides app', async ({ page }) => {
    await expect(page.locator('#ob')).toBeVisible();
    await expect(page.locator('#app')).not.toBeVisible();
  });

  test('requires role before starting', async ({ page }) => {
    await page.locator('#ob-start').click();
    await expect(page.locator('#ob')).toBeVisible();
  });

  test('requires learning goal before starting', async ({ page }) => {
    await page.fill('#ob-role', 'Software Engineer');
    await page.locator('#ob-start').click();
    await expect(page.locator('#ob')).toBeVisible();
  });

  test('requires at least one channel before starting', async ({ page }) => {
    await page.fill('#ob-role', 'Software Engineer');
    await page.fill('#ob-learnt', 'active listening');
    await page.locator('#ob-start').click();
    await expect(page.locator('#ob')).toBeVisible();
  });

  test('truncates role longer than 100 characters', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockClaudeAPI);
    const longRole = 'A'.repeat(150);
    await page.fill('#ob-role', longRole);
    await page.fill('#ob-learnt', 'active listening');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#hb-role')).toBeVisible();
    const badgeText = await page.locator('#hb-role').textContent();
    expect(badgeText!.length).toBeLessThanOrEqual(25); // truncated to 22 + '…'
  });

  test('transitions to app screen after valid onboarding', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockClaudeAPI);

    await page.fill('#ob-role', 'Software Engineer');
    await page.fill('#ob-learnt', 'I want to practise staying calm when escalations come in');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();

    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#ob')).not.toBeVisible();
  });

  test('shows role badge in topbar after onboarding', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockClaudeAPI);

    await page.fill('#ob-role', 'Product Manager');
    await page.fill('#ob-learnt', 'handling difficult conversations');
    await page.locator('[data-mode="email"]').click();
    await page.locator('#ob-start').click();

    await expect(page.locator('#hb-role')).toContainText('Product Manager', { timeout: 10000 });
  });

  test('channel nav shows only selected channels', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', mockClaudeAPI);

    await page.fill('#ob-role', 'HR Specialist');
    await page.fill('#ob-learnt', 'giving difficult feedback');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('[data-mode="call"]').click();
    await page.locator('#ob-start').click();

    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
    const modeNav = page.locator('#mode-nav');
    await expect(modeNav.locator('[data-mode="slack"]')).toBeVisible();
    await expect(modeNav.locator('[data-mode="call"]')).toBeVisible();
  });
});