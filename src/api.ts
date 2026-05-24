import type { Message } from './types';

// Model constants - Haiku is the default for most calls since it's fast and cheap.
// Sonnet is available for anything that needs more reasoning (scoring, rewrites).
export const SONNET = 'claude-sonnet-4-6';
export const HAIKU  = 'claude-haiku-4-5-20251001';

// All AI requests go through the Netlify proxy function, never directly to Anthropic.
// This keeps the API key server-side and out of the browser bundle.
export async function callClaude(
  messages: Message[],
  system: string,
  model = HAIKU,
  maxTokens = 900,
): Promise<string> {
  const response = await fetch('/.netlify/functions/proxy', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  // shape of what the Anthropic API returns - error on failure, content array on success
  interface ClaudeResponse {
    error?: { message: string };
    content?: { text: string }[];
  }
  const data = await response.json() as ClaudeResponse;
  if (data.error) throw new Error(data.error.message);
  // content is an array of blocks - the actual text is always in the first one
  const firstBlock = data.content && data.content[0];
  return firstBlock ? firstBlock.text : '';
}

// Posts a Slack message via the relay function. Accepts any valid Slack payload -
// plain text { text: "..." } or Block Kit blocks both work.
export async function postToSlack(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch('/.netlify/functions/slack', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to post to Slack');
}
