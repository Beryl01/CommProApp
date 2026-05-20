import { test, expect } from '@playwright/test';
import {
  completeOnboarding, waitForScenarios, startConversation, scoreScenario,
  UI_TIMEOUT, AI_RESPONSE_TIMEOUT, SCORE_PANEL_TIMEOUT,
} from './helpers';

// ---------------------------------------------------------------------------
// Starting a conversation
// ---------------------------------------------------------------------------

test.describe('Starting a conversation', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
  });

  test('clicking the gate button hides the gate and shows the conversation area', async ({ page }) => {
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#gate-0')).not.toBeVisible();
    await expect(page.locator('#conv-0')).toBeVisible();
  });

  test('the AI sends an opening message as soon as the conversation starts', async ({ page }) => {
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#msgs-0 .msg.ai')).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
  });

  test('focus moves to the message input after the AI opening message appears', async ({ page }) => {
    await startConversation(page, 0);
    await expect(page.locator('#inp-0')).toBeFocused({ timeout: UI_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// Sending messages
// ---------------------------------------------------------------------------

test.describe('Sending messages', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);
  });

  test('the user message appears in the chat after clicking Send', async ({ page }) => {
    await page.locator('#inp-0').fill('I understand and will fix this right away.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('pressing Enter sends the message', async ({ page }) => {
    await page.locator('#inp-0').fill('Apologies for the delay — here is my plan.');
    await page.locator('#inp-0').press('Enter');
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('pressing Shift+Enter adds a new line without sending the message', async ({ page }) => {
    await page.locator('#inp-0').fill('First line');
    await page.locator('#inp-0').press('Shift+Enter');
    await expect(page.locator('#msgs-0 .msg.you')).toHaveCount(0);
    const inputValue = await page.locator('#inp-0').inputValue();
    expect(inputValue).toContain('First line');
  });

  test('the input field is cleared after the message is sent', async ({ page }) => {
    await page.locator('#inp-0').fill('Hello, I will handle this now.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: UI_TIMEOUT });
    expect(await page.locator('#inp-0').inputValue()).toBe('');
  });

  test('the turn counter updates after each message is sent', async ({ page }) => {
    await expect(page.locator('#hint-0')).toContainText('Turn 0/2');
    await page.locator('#inp-0').fill('First response.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#hint-0')).toContainText('Turn 1/2', { timeout: UI_TIMEOUT });
  });

  test('the AI replies after the user sends a message', async ({ page }) => {
    await page.locator('#inp-0').fill('I acknowledge the issue and will escalate immediately.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.ai')).toHaveCount(2, { timeout: AI_RESPONSE_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// Auto-scoring after the final turn
// ---------------------------------------------------------------------------

test.describe('Auto-scoring after 2 turns', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);
  });

  test('a system message appears after the second turn announcing scoring has started', async ({ page }) => {
    await page.locator('#inp-0').fill('I acknowledge the issue and will escalate immediately.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.ai')).toHaveCount(2, { timeout: AI_RESPONSE_TIMEOUT });

    await page.locator('#inp-0').fill('I will have a full status update to you within 30 minutes.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.sys')).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
  });

  test('the score panel appears automatically once the final turn is complete', async ({ page }) => {
    await page.locator('#inp-0').fill('Understood. I will escalate this immediately.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.ai')).toHaveCount(2, { timeout: AI_RESPONSE_TIMEOUT });

    await page.locator('#inp-0').fill('The issue has been resolved. Thank you for flagging it.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: SCORE_PANEL_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// End & Score
// ---------------------------------------------------------------------------

test.describe('End & Score', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);
  });

  test('End & Score triggers scoring without waiting for 2 turns', async ({ page }) => {
    await page.locator('#end-0').click();
    await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: SCORE_PANEL_TIMEOUT });
  });

  test('the input area is hidden after scoring completes', async ({ page }) => {
    await scoreScenario(page, 0);
    await expect(page.locator('#foot-0')).not.toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('the scenario card gets the done class after scoring', async ({ page }) => {
    await scoreScenario(page, 0);
    await expect(page.locator('#scc-0')).toHaveClass(/done/, { timeout: UI_TIMEOUT });
  });

  test('the next scenario card auto-expands after the previous one is scored', async ({ page }) => {
    await scoreScenario(page, 0);
    await expect(page.locator('#scb-1')).toBeVisible({ timeout: UI_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// Score panel contents
// ---------------------------------------------------------------------------

test.describe('Score panel contents', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);
    await scoreScenario(page, 0);
  });

  test('shows the Feedback heading', async ({ page }) => {
    await expect(page.locator('#score-0 .sp-title')).toContainText('Feedback');
  });

  test('shows the Readiness label', async ({ page }) => {
    await expect(page.locator('#score-0 .sp-nlbl')).toContainText('Readiness');
  });

  test('shows one of the four valid readiness levels', async ({ page }) => {
    const validLevels   = ['Highly Ready', 'Ready', 'Partially Ready', 'Needs Development'];
    const panelText     = await page.locator('#score-0').textContent() ?? '';
    const hasValidLevel = validLevels.some((level) => panelText.includes(level));
    expect(hasValidLevel).toBe(true);
  });

  test('shows five dimension rows', async ({ page }) => {
    await expect(page.locator('#score-0 .sp-dim')).toHaveCount(5);
  });

  test('shows the strongest moment section', async ({ page }) => {
    await expect(page.locator('#score-0 .ins.g')).toContainText('Strongest moment');
  });

  test('shows the biggest gap section', async ({ page }) => {
    await expect(page.locator('#score-0 .ins.r')).toContainText('Biggest gap');
  });

  test('shows the habit to build section', async ({ page }) => {
    await expect(page.locator('#score-0 .ins.b')).toContainText('Habit to build');
  });

  test('shows the better version rewrite section', async ({ page }) => {
    await expect(page.locator('#score-0 .ins.b2')).toContainText('Better version');
  });
});
