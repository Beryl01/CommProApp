import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import {
  MOCK_SCENARIOS, MOCK_AI_REPLY, MOCK_SCORE,
  completeOnboarding, waitForScenarios, startConversation,
  UI_TIMEOUT, SCENARIO_LOAD_TIMEOUT, AI_RESPONSE_TIMEOUT, SCORE_PANEL_TIMEOUT,
} from './helpers';

// ---------------------------------------------------------------------------
// Shared route helpers
// ---------------------------------------------------------------------------

async function serverError(route: Route): Promise<void> {
  await route.fulfill({ status: 500, body: 'Internal Server Error' });
}

async function successfulGeneration(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ content: [{ text: JSON.stringify(MOCK_SCENARIOS) }] }),
  });
}

async function successfulReply(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ content: [{ text: MOCK_AI_REPLY }] }),
  });
}

async function successfulScore(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ content: [{ text: MOCK_SCORE }] }),
  });
}

function callType(body: { messages?: Array<{ role: string; content: string }> }): 'generation' | 'scoring' | 'conversation' {
  const first = body?.messages?.[0]?.content ?? '';
  if (first.startsWith('Generate 3 workplace')) return 'generation';
  if (first.includes('FULL TRANSCRIPT'))       return 'scoring';
  return 'conversation';
}

// ---------------------------------------------------------------------------
// Scenario generation failures
// ---------------------------------------------------------------------------

test.describe('Scenario generation failure', () => {
  test('shows an error state in the content area when generation fails', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      callType(body) === 'generation' ? await serverError(route) : await successfulReply(route);
    });

    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Project Manager');
    await page.getByPlaceholder(/active listening/).fill('running difficult meetings');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#content')).toContainText(/could not load|reload/i, { timeout: SCENARIO_LOAD_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// Conversation opening failures
// ---------------------------------------------------------------------------

test.describe('Conversation opening failure', () => {
  test('shows a connection error in the chat when the AI fails on the opening message', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      callType(body) === 'generation' ? await successfulGeneration(route) : await serverError(route);
    });

    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Support Engineer');
    await page.getByPlaceholder(/active listening/).fill('handling escalations');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });

    await page.locator('#gatebn-0').click();
    await expect(page.locator('#msgs-0 .msg.sys')).toContainText(/connection error|try again/i, { timeout: AI_RESPONSE_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// In-conversation reply failures
// ---------------------------------------------------------------------------

test.describe('Conversation reply failure', () => {
  test('shows an error in the chat when the AI fails to reply during a turn', async ({ page }) => {
    // Single-message calls = opening message (allow). Multiple = conversation turn (fail).
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body         = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      const messageCount = body?.messages?.length ?? 0;
      if      (callType(body) === 'generation') { await successfulGeneration(route); }
      else if (messageCount === 1)               { await successfulReply(route); }
      else                                       { await serverError(route); }
    });

    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Support Engineer');
    await page.getByPlaceholder(/active listening/).fill('handling escalations');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });
    await startConversation(page, 0);

    await page.locator('#inp-0').fill('I will look into this immediately.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.sys')).toContainText(/error/i, { timeout: AI_RESPONSE_TIMEOUT });
  });

  test('the Send button is re-enabled after a failed turn so the user can retry', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body         = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      const messageCount = body?.messages?.length ?? 0;
      if      (callType(body) === 'generation') { await successfulGeneration(route); }
      else if (messageCount === 1)               { await successfulReply(route); }
      else                                       { await serverError(route); }
    });

    await page.goto('/');
    await page.getByPlaceholder(/IT Support Specialist/).fill('Support Engineer');
    await page.getByPlaceholder(/active listening/).fill('handling escalations');
    await page.locator('[data-mode="slack"]').click();
    await page.getByRole('button', { name: 'Start Training →' }).click();
    await expect(page.locator('#app')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: SCENARIO_LOAD_TIMEOUT });
    await startConversation(page, 0);

    await page.locator('#inp-0').fill('I will escalate this now.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.sys')).toContainText(/error/i, { timeout: AI_RESPONSE_TIMEOUT });
    await expect(page.locator('#snd-0')).toBeEnabled({ timeout: UI_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// Scoring failures
// ---------------------------------------------------------------------------

test.describe('Scoring failure', () => {
  test('shows an error inside the score panel when scoring fails', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      if      (callType(body) === 'scoring')    { await serverError(route); }
      else if (callType(body) === 'generation') { await successfulGeneration(route); }
      else                                       { await successfulReply(route); }
    });

    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);
    await page.locator('#end-0').click();
    await expect(page.locator('#score-0')).toContainText(/failed|error/i, { timeout: SCORE_PANEL_TIMEOUT });
  });

  test('a second End & Score click is ignored while scoring is already running', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      if (callType(body) === 'scoring') {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        await successfulScore(route);
      } else if (callType(body) === 'generation') {
        await successfulGeneration(route);
      } else {
        await successfulReply(route);
      }
    });

    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);

    await page.locator('#end-0').click();
    await page.locator('#end-0').click();
    await expect(page.locator('#score-0 .sp')).toHaveCount(1, { timeout: SCORE_PANEL_TIMEOUT });
  });
});
