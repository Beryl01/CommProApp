import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';

const MOCK_SCENARIOS = [
  {
    title: 'Angry client complaint',
    type: 'hostile', intensity: 'high',
    desc: 'A client is furious about a missed deadline.',
    counterpartName: 'Sandra Mills', counterpartPersona: 'Frustrated enterprise client',
    task: 'De-escalate and offer a concrete resolution',
    context: '', inboundMessage: 'This is completely unacceptable.',
    systemPrompt: 'You are Sandra Mills, a frustrated enterprise client.',
    scoringDimensions: [{ name: 'Empathy', desc: 'Acknowledge the client frustration' }],
  },
  {
    title: 'Vague requirements request',
    type: 'vague', intensity: 'medium',
    desc: 'Colleague asks you to sort out "the thing".',
    counterpartName: 'Tom Harris', counterpartPersona: 'Busy product manager',
    task: 'Clarify what is being asked',
    context: '', inboundMessage: 'Hey, can you sort out that thing for the launch?',
    systemPrompt: 'You are Tom Harris, a vague product manager.',
    scoringDimensions: [{ name: 'Clarity', desc: 'Ask specific clarifying questions' }],
  },
  {
    title: 'System outage escalation',
    type: 'escalation', intensity: 'high',
    desc: 'Critical system is down.',
    counterpartName: 'James Oduya', counterpartPersona: 'Panicking operations manager',
    task: 'Manage the escalation',
    context: '', inboundMessage: 'The system is completely down!',
    systemPrompt: 'You are James Oduya, panicking.',
    scoringDimensions: [{ name: 'Composure', desc: 'Stay calm under pressure' }],
  },
];

const MOCK_AI_REPLY  = 'I understand your frustration. Let me look into this immediately.';
const MOCK_SCORE_JSON = JSON.stringify({
  level: 'ready',
  dimensions: [
    { name: 'Empathy',    level: 'strong',    explanation: 'You acknowledged the client clearly.' },
    { name: 'Clarity',    level: 'adequate',  explanation: 'Your response was mostly clear.' },
    { name: 'Tone',       level: 'strong',    explanation: 'Professional tone throughout.' },
    { name: 'Resolution', level: 'needs_work', explanation: 'No concrete next step offered.' },
    { name: 'Composure',  level: 'strong',    explanation: 'You stayed calm under pressure.' },
  ],
  strongestMoment: 'Acknowledged the frustration immediately.',
  biggestGap:      'Did not propose a concrete timeline.',
  habitToBuild:    'Always close with a specific action and timeframe.',
  rewrite:         'I hear you, Sandra. This is unacceptable and I take responsibility. I will have an update for you within the hour.',
});

async function mockProxy(route: Route): Promise<void> {
  const body = await route.request().postDataJSON() as { messages?: unknown[] };
  // Scenario generation calls have one message; conversation + scoring calls have more
  const isScenarioGen = Array.isArray(body.messages) && body.messages.length === 1;

  if (isScenarioGen) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ text: JSON.stringify(MOCK_SCENARIOS) }] }),
    });
  } else {
    // Could be opening AI message or scoring
    const isScoring = JSON.stringify(body).includes('FULL TRANSCRIPT');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [{ text: isScoring ? MOCK_SCORE_JSON : MOCK_AI_REPLY }],
      }),
    });
  }
}

async function completeOnboarding(page: import('@playwright/test').Page, channel: string): Promise<void> {
  await page.route('/.netlify/functions/proxy', mockProxy);
  await page.goto('/');
  await page.fill('#ob-role', 'Support Engineer');
  await page.fill('#ob-learnt', 'handling escalations with empathy');
  await page.locator(`[data-mode="${channel}"]`).click();
  await page.locator('#ob-start').click();
  await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
}

test.describe('Scenarios', () => {
  test('renders scenario cards after onboarding', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10000 });
  });

  test('first scenario card is expanded by default', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: 10000 });
  });

  test('clicking card header toggles the scenario body', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#sch-1').click();
    await expect(page.locator('#scb-1')).toBeVisible();
  });

  test('begin conversation shows conversation UI', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#conv-0')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#msgs-0')).toBeVisible();
  });

  test('AI sends opening message after beginning conversation', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#gatebn-0').click();
    // Wait for typing indicator to disappear and a real message to appear
    await expect(page.locator('#msgs-0 .msg.ai .msg-bub')).toBeVisible({ timeout: 8000 });
  });

  test('user can send a message in conversation', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#inp-0')).toBeVisible({ timeout: 8000 });
    await page.fill('#inp-0', 'I understand your concern and will look into this right away.');
    await page.locator('#snd-0').click();
    // User message should appear
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: 5000 });
  });

  test('Enter key sends message', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#inp-0')).toBeVisible({ timeout: 8000 });
    await page.fill('#inp-0', 'Hello, let me help you with this.');
    await page.locator('#inp-0').press('Enter');
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: 5000 });
  });

  test('scenario card title comes from AI (not hardcoded)', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('.sc-title').first()).toContainText('Angry client complaint', { timeout: 10000 });
  });
});

test.describe('Scoring', () => {
  test('score card renders after End & Score is clicked', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#inp-0')).toBeVisible({ timeout: 8000 });
    await page.fill('#inp-0', 'I hear you and will fix this immediately.');
    await page.locator('#end-0').click();
    await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: 10000 });
  });

  test('score shows readiness level', async ({ page }) => {
    await completeOnboarding(page, 'slack');
    await expect(page.locator('#scb-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#inp-0')).toBeVisible({ timeout: 8000 });
    await page.fill('#inp-0', 'I hear you and will fix this immediately.');
    await page.locator('#end-0').click();
    await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#score-0')).toContainText('Ready');
  });
});

test.describe('API integration', () => {
  test('proxy is called for scenario generation', async ({ page }) => {
    let proxyCalled = false;
    await page.route('/.netlify/functions/proxy', async (route) => {
      proxyCalled = true;
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: [{ text: JSON.stringify(MOCK_SCENARIOS) }] }),
      });
    });
    await page.goto('/');
    await page.fill('#ob-role', 'Engineer');
    await page.fill('#ob-learnt', 'active listening');
    await page.locator('[data-mode="email"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
    expect(proxyCalled).toBe(true);
  });
});