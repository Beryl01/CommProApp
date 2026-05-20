import type { Message } from './types';

export const SONNET = 'claude-sonnet-4-6';
export const HAIKU  = 'claude-haiku-4-5-20251001';

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
  const data = await response.json() as { error?: { message: string }; content?: { text: string }[] };
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text ?? '';
}

export async function postToSlack(payload: Record<string, unknown>): Promise<void> {
  const response = await fetch('/.netlify/functions/slack', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to post to Slack');
}