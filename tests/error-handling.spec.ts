import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import { MOCK_SCENARIOS, MOCK_AI_REPLY, MOCK_SCORE, completeOnboarding, waitForScenarios, startConversation } from './helpers';

// ---------------------------------------------------------------------------
// Shared route builders
// ---------------------------------------------------------------------------

// Returns 500 to simulate a server-side failure.
async function serverError(route: Route): Promise<void> {
  await route.fulfill({ status: 500, body: 'Internal Server Error' });
}

// Returns a valid scenario generation response.
async function successfulGeneration(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ content: [{ text: JSON.stringify(MOCK_SCENARIOS) }] }),
  });
}

// Returns a valid AI reply (used for opening messages and conversation turns).
async function successfulReply(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ content: [{ text: MOCK_AI_REPLY }] }),
  });
}

// Returns a valid scoring response.
async function successfulScore(route: Route): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ content: [{ text: MOCK_SCORE }] }),
  });
}

// Determines the type of API call from the request body.
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
      if (callType(body) === 'generation') {
        await serverError(route);
      } else {
        await successfulReply(route);
      }
    });

    await page.goto('/');
    await page.fill('#ob-role', 'Project Manager');
    await page.fill('#ob-learnt', 'running difficult meetings');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });

    // The content area should show an error message with an option to reload
    await expect(page.locator('#content')).toContainText(/could not load|reload/i, { timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Conversation opening failures
// ---------------------------------------------------------------------------

test.describe('Conversation opening failure', () => {
  test('shows a connection error in the chat if the AI fails on the opening message', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      if (callType(body) === 'generation') {
        await successfulGeneration(route);
      } else {
        await serverError(route); // fail opening message and everything after
      }
    });

    await page.goto('/');
    await page.fill('#ob-role', 'Support Engineer');
    await page.fill('#ob-learnt', 'handling escalations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10_000 });

    await page.locator('#gatebn-0').click();
    await expect(page.locator('#msgs-0 .msg.sys')).toContainText(/connection error|try again/i, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// In-conversation reply failures
// ---------------------------------------------------------------------------

test.describe('Conversation reply failure', () => {
  test('shows an error in the chat if the AI fails to reply during a turn', async ({ page }) => {
    // Opening message succeeds; subsequent turns (multiple messages in history) fail.
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body        = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      const messageCount = body?.messages?.length ?? 0;
      const type        = callType(body);

      if (type === 'generation') {
        await successfulGeneration(route);
      } else if (messageCount === 1) {
        // Single-message calls are the opening message — let them succeed
        await successfulReply(route);
      } else {
        // Multiple messages means it is a follow-up turn — fail it
        await serverError(route);
      }
    });

    await page.goto('/');
    await page.fill('#ob-role', 'Support Engineer');
    await page.fill('#ob-learnt', 'handling escalations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10_000 });
    await startConversation(page, 0); // opening succeeds

    await page.fill('#inp-0', 'I will look into this immediately.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.sys')).toContainText(/error/i, { timeout: 10_000 });
  });

  test('the send button is re-enabled after a failed turn so the user can retry', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body        = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      const messageCount = body?.messages?.length ?? 0;
      const type        = callType(body);

      if (type === 'generation')  { await successfulGeneration(route); }
      else if (messageCount === 1) { await successfulReply(route); }
      else                         { await serverError(route); }
    });

    await page.goto('/');
    await page.fill('#ob-role', 'Support Engineer');
    await page.fill('#ob-learnt', 'handling escalations');
    await page.locator('[data-mode="slack"]').click();
    await page.locator('#ob-start').click();
    await expect(page.locator('#app')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.sc')).toHaveCount(3, { timeout: 10_000 });
    await startConversation(page, 0);

    await page.fill('#inp-0', 'I will escalate this now.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.sys')).toContainText(/error/i, { timeout: 10_000 });
    // The button must be re-enabled so the user is not stuck
    await expect(page.locator('#snd-0')).toBeEnabled({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Scoring failures
// ---------------------------------------------------------------------------

test.describe('Scoring failure', () => {
  test('shows an error inside the score panel if scoring fails', async ({ page }) => {
    await page.route('/.netlify/functions/proxy', async (route) => {
      const body = await route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
      if (callType(body) === 'scoring') {
        await serverError(route);
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
    await expect(page.locator('#score-0')).toContainText(/failed|error/i, { timeout: 15_000 });
  });

  test('a second End & Score attempt is blocked while scoring is already running', async ({ page }) => {
    // Delay the scoring response to create a window for testing double-submit
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

    // Click End & Score twice in quick succession
    await page.locator('#end-0').click();
    await page.locator('#end-0').click();

    // Only one score panel should render — not two
    await expect(page.locator('#score-0 .sp')).toHaveCount(1, { timeout: 10_000 });
  });
});
