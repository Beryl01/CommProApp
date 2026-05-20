import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  waitForScenarios,
  startConversation,
  scoreScenario,
} from './helpers';

// ---------------------------------------------------------------------------
// Conversation flow
// ---------------------------------------------------------------------------

test.describe('Starting a conversation', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
  });

  test('clicking the gate button hides the gate and shows the conversation', async ({ page }) => {
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#gate-0')).not.toBeVisible();
    await expect(page.locator('#conv-0')).toBeVisible();
  });

  test('the AI sends an opening message as soon as the conversation starts', async ({ page }) => {
    await page.locator('#gatebn-0').click();
    await expect(page.locator('#msgs-0 .msg.ai')).toBeVisible({ timeout: 10_000 });
  });

  test('focus moves to the input field after the AI opening message appears', async ({ page }) => {
    await startConversation(page, 0);
    await expect(page.locator('#inp-0')).toBeFocused({ timeout: 3_000 });
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
    await page.fill('#inp-0', 'I understand and will fix this right away.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: 5_000 });
  });

  test('pressing Enter sends the message', async ({ page }) => {
    await page.fill('#inp-0', 'Apologies for the delay — here is my plan.');
    await page.locator('#inp-0').press('Enter');
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: 5_000 });
  });

  test('pressing Shift+Enter adds a new line without sending', async ({ page }) => {
    await page.fill('#inp-0', 'First line');
    await page.locator('#inp-0').press('Shift+Enter');
    // No message bubble should have appeared yet
    await expect(page.locator('#msgs-0 .msg.you')).toHaveCount(0);
    // The textarea still holds the unsent text
    const inputValue = await page.locator('#inp-0').inputValue();
    expect(inputValue).toContain('First line');
  });

  test('the input field is cleared after the message is sent', async ({ page }) => {
    await page.fill('#inp-0', 'Hello, I will handle this now.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: 5_000 });
    const inputValue = await page.locator('#inp-0').inputValue();
    expect(inputValue).toBe('');
  });

  test('the turn counter updates after each message is sent', async ({ page }) => {
    await expect(page.locator('#hint-0')).toContainText('Turn 0/2');
    await page.fill('#inp-0', 'First response.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.you').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#hint-0')).toContainText('Turn 1/2', { timeout: 5_000 });
  });

  test('the AI replies after the user sends a message', async ({ page }) => {
    await page.fill('#inp-0', 'I acknowledge the issue and will escalate immediately.');
    await page.locator('#snd-0').click();
    // There should now be 2 AI messages (opening + reply)
    await expect(page.locator('#msgs-0 .msg.ai')).toHaveCount(2, { timeout: 10_000 });
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

  test('a system message appears after the second turn announcing scoring', async ({ page }) => {
    await page.fill('#inp-0', 'I acknowledge the issue and will escalate immediately.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.ai')).toHaveCount(2, { timeout: 10_000 });

    await page.fill('#inp-0', 'I will have a full status update to you within 30 minutes.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.sys')).toBeVisible({ timeout: 10_000 });
  });

  test('the score panel appears automatically once the final turn is complete', async ({ page }) => {
    await page.fill('#inp-0', 'Understood. I will escalate this immediately.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#msgs-0 .msg.ai')).toHaveCount(2, { timeout: 10_000 });

    await page.fill('#inp-0', 'The issue has been resolved. Thank you for flagging it.');
    await page.locator('#snd-0').click();
    await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Ending early with End & Score
// ---------------------------------------------------------------------------

test.describe('End & Score', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);
  });

  test('End & Score triggers scoring immediately without waiting for 2 turns', async ({ page }) => {
    await page.locator('#end-0').click();
    await expect(page.locator('#score-0 .sp')).toBeVisible({ timeout: 15_000 });
  });

  test('the input area is hidden after scoring completes', async ({ page }) => {
    await scoreScenario(page, 0);
    await expect(page.locator('#foot-0')).not.toBeVisible({ timeout: 5_000 });
  });

  test('the scenario card is marked as done after scoring', async ({ page }) => {
    await scoreScenario(page, 0);
    await expect(page.locator('#scc-0')).toHaveClass(/done/, { timeout: 5_000 });
  });

  test('the next scenario card auto-expands after the previous one is scored', async ({ page }) => {
    await scoreScenario(page, 0);
    await expect(page.locator('#scb-1')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Score panel content
// ---------------------------------------------------------------------------

test.describe('Score panel contents', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page, { channel: 'slack' });
    await waitForScenarios(page);
    await startConversation(page, 0);
    await scoreScenario(page, 0);
  });

  test('the score panel shows a Feedback heading', async ({ page }) => {
    await expect(page.locator('#score-0 .sp-title')).toContainText('Feedback');
  });

  test('the score panel shows a Readiness label', async ({ page }) => {
    await expect(page.locator('#score-0 .sp-nlbl')).toContainText('Readiness');
  });

  test('the readiness level is one of the four valid levels', async ({ page }) => {
    const validLevels = ['Highly Ready', 'Ready', 'Partially Ready', 'Needs Development'];
    const panelText   = await page.locator('#score-0').textContent() ?? '';
    const hasValidLevel = validLevels.some((level) => panelText.includes(level));
    expect(hasValidLevel).toBe(true);
  });

  test('five dimension rows are shown in the score panel', async ({ page }) => {
    await expect(page.locator('#score-0 .sp-dim')).toHaveCount(5);
  });

  test('the strongest moment section is present', async ({ page }) => {
    await expect(page.locator('#score-0 .ins.g')).toContainText('Strongest moment');
  });

  test('the biggest gap section is present', async ({ page }) => {
    await expect(page.locator('#score-0 .ins.r')).toContainText('Biggest gap');
  });

  test('the habit to build section is present', async ({ page }) => {
    await expect(page.locator('#score-0 .ins.b')).toContainText('Habit to build');
  });

  test('the better version rewrite section is present', async ({ page }) => {
    await expect(page.locator('#score-0 .ins.b2')).toContainText('Better version');
  });
});
