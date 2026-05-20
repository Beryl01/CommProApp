import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_SCENARIOS = [
  {
    title: 'Angry client complaint',
    type: 'hostile',
    intensity: 'high',
    desc: 'A client is furious about a missed deadline and messages you directly.',
    counterpartName: 'Sandra Mills',
    counterpartPersona: 'Frustrated enterprise client, expects immediate accountability',
    task: 'De-escalate and offer a concrete resolution path',
    context: 'The project has been delayed twice already.',
    inboundMessage: 'This is completely unacceptable. You have let our team down again.',
    systemPrompt: 'You are Sandra Mills, a frustrated enterprise client. Max 2 sentences.',
    scoringDimensions: [
      { name: 'Empathy',    desc: 'Did the trainee acknowledge the frustration?' },
      { name: 'Clarity',    desc: 'Was the response clear and direct?' },
      { name: 'Tone',       desc: 'Was the tone professional throughout?' },
      { name: 'Resolution', desc: 'Was a concrete next step offered?' },
      { name: 'Composure',  desc: 'Did the trainee stay calm?' },
    ],
  },
  {
    title: 'Vague requirements request',
    type: 'vague',
    intensity: 'medium',
    desc: 'A colleague asks you to sort out the thing without any further detail.',
    counterpartName: 'Tom Harris',
    counterpartPersona: 'Busy product manager who rarely provides full context',
    task: 'Ask the right clarifying questions to unblock the work',
    context: '',
    inboundMessage: 'Hey, can you sort out that thing for the launch?',
    systemPrompt: 'You are Tom Harris, a busy product manager. Be vague. Max 2 sentences.',
    scoringDimensions: [
      { name: 'Clarity',    desc: 'Did the trainee ask specific clarifying questions?' },
      { name: 'Empathy',    desc: 'Did the trainee acknowledge the urgency?' },
      { name: 'Tone',       desc: 'Was the tone constructive?' },
      { name: 'Resolution', desc: 'Did the conversation move forward?' },
      { name: 'Composure',  desc: 'Did the trainee remain patient?' },
    ],
  },
  {
    title: 'System outage escalation',
    type: 'escalation',
    intensity: 'high',
    desc: 'A critical system is down and a stakeholder is escalating urgently.',
    counterpartName: 'James Oduya',
    counterpartPersona: 'Panicking operations manager during peak trading hours',
    task: 'Manage the escalation and communicate a clear action plan',
    context: 'Peak trading hours — every minute costs the business.',
    inboundMessage: 'The system is completely down. This is costing us money every minute!',
    systemPrompt: 'You are James Oduya, an operations manager in a panic. Max 2 sentences.',
    scoringDimensions: [
      { name: 'Composure',  desc: 'Did the trainee stay calm under pressure?' },
      { name: 'Clarity',    desc: 'Was the update clear and specific?' },
      { name: 'Empathy',    desc: 'Did the trainee acknowledge the business impact?' },
      { name: 'Resolution', desc: 'Was a concrete action committed to?' },
      { name: 'Tone',       desc: 'Was the tone professional throughout?' },
    ],
  },
];

export const MOCK_AI_REPLY = 'I understand your frustration. Let me look into this immediately.';

export const MOCK_SCORE = JSON.stringify({
  level: 'ready',
  dimensions: [
    { name: 'Empathy',    level: 'strong',     explanation: 'You acknowledged the frustration right away.' },
    { name: 'Clarity',    level: 'adequate',   explanation: 'Your response was mostly clear.' },
    { name: 'Tone',       level: 'strong',     explanation: 'Professional tone throughout the exchange.' },
    { name: 'Resolution', level: 'needs_work', explanation: 'No concrete next step was offered.' },
    { name: 'Composure',  level: 'strong',     explanation: 'You stayed calm under pressure.' },
  ],
  strongestMoment: 'You acknowledged the frustration immediately and took responsibility.',
  biggestGap:      'You did not propose a concrete timeline or follow-up action.',
  habitToBuild:    'Always close every difficult exchange with a specific action and timeframe.',
  rewrite:         'I hear you, Sandra. I take full responsibility. I will have a status update for you within the hour.',
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

// Routes all API proxy calls to the correct mock response based on message content.
// Scenario generation → MOCK_SCENARIOS JSON
// Scoring            → MOCK_SCORE JSON
// Everything else    → MOCK_AI_REPLY string (opening message or conversation reply)
export async function mockProxy(route: Route): Promise<void> {
  const body         = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
  const firstContent = body?.messages?.[0]?.content ?? '';

  if (firstContent.startsWith('Generate 3 workplace')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ text: JSON.stringify(MOCK_SCENARIOS) }] }),
    });
  } else if (firstContent.includes('FULL TRANSCRIPT')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ text: MOCK_SCORE }] }),
    });
  } else {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ text: MOCK_AI_REPLY }] }),
    });
  }
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

export interface OnboardingOptions {
  channel: string;
  role?: string;
  goal?: string;
}

// Fills in the onboarding form with the provided options and clicks Start.
// Registers mockProxy for all API calls and waits until the main app is visible.
export async function completeOnboarding(page: Page, options: OnboardingOptions): Promise<void> {
  const { channel, role = 'Support Engineer', goal = 'handling escalations with empathy' } = options;
  await page.route('/.netlify/functions/proxy', mockProxy);
  await page.goto('/');
  await page.fill('#ob-role', role);
  await page.fill('#ob-learnt', goal);
  await page.locator(`[data-mode="${channel}"]`).click();
  await page.locator('#ob-start').click();
  await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });
}

// Waits until all three scenario cards have rendered in the content area.
export async function waitForScenarios(page: Page): Promise<void> {
  await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10_000 });
}

// Opens the conversation for a scenario card.
// If the card body is collapsed it opens it first, then clicks the gate button
// and waits for the AI's opening message to appear.
export async function startConversation(page: Page, idx: number): Promise<void> {
  const cardBody = page.locator(`#scb-${idx}`);
  if (!await cardBody.isVisible()) {
    await page.locator(`#sch-${idx}`).click();
    await expect(cardBody).toBeVisible({ timeout: 5_000 });
  }
  await page.locator(`#gatebn-${idx}`).click();
  await expect(page.locator(`#msgs-${idx} .msg.ai`)).toBeVisible({ timeout: 10_000 });
}

// Clicks End & Score and waits for the feedback panel to fully render.
export async function scoreScenario(page: Page, idx: number): Promise<void> {
  await page.locator(`#end-${idx}`).click();
  await expect(page.locator(`#score-${idx} .sp`)).toBeVisible({ timeout: 15_000 });
}

// Runs through all three scenario cards: opens conversation, ends early, waits for score.
// Used by tests that need to trigger the full session report.
export async function scoreAllScenarios(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await startConversation(page, i);
    await scoreScenario(page, i);
    if (i < 2) {
      await expect(page.locator(`#scb-${i + 1}`)).toBeVisible({ timeout: 5_000 });
    }
  }
}
