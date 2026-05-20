import { state, setBusy, getOrCreateSession, sessionKey } from '../state';
import { callClaude, SONNET } from '../api';
import { speak } from '../voice';
import { appendMsg, showTyping, removeTyping, requireEl, elMaybe } from './dom';
import { endConv } from './scoring';
import type { Channel, Scenario } from '../types';
import { MAX_TURNS } from '../constants';

function counterpartRules(): string {
  return `COUNTERPART BEHAVIOUR:
- You are a real person in a real workplace — NOT a training facilitator or coach.
- Do NOT say "great", "good point", "well done", "nice", "exactly", or any praise unless the trainee has genuinely used excellent communication technique.
- If the trainee sends no reply, a vague reply, or avoids the issue entirely — respond with authentic frustration, impatience, or bluntness. Do NOT soften.
- Only change your tone if the trainee has specifically used active listening, precise clarifying questions, or genuine de-escalation. A mediocre response does not earn any warmth.
- React only to what the trainee ACTUALLY wrote — not to what they should have written.
- Every reply: 2 sentences maximum.`;
}

function channelRules(mode: Channel): string {
  switch (mode) {
    case 'slack':
      return `CHANNEL FORMAT — SLACK:
You are typing in a Slack channel, not speaking face to face.
- Write plain text exactly as someone would type in Slack: short, direct, no fluff.
- NEVER use stage directions, asterisk actions (*sighs*, *leans in*), or physical descriptions.
- No bold headers, no bullet-point lists unless they are genuinely part of the message.
- React as a person typing on a keyboard, not performing in a room.`;
    case 'email':
      return `CHANNEL FORMAT — EMAIL:
You are writing a professional work email, not a chat message.
- Always start with a greeting: Hi [Name], or Hello [Name],
- Write the body in clear short paragraphs.
- Always end with a sign-off: Best regards, / Thanks, / Regards, followed by your name.
- Use a Subject line only when starting a new thread or replying to a different topic.
- No asterisk actions, no stage directions, no Slack-style shorthand.`;
    case 'call':
      return `CHANNEL FORMAT — LIVE CALL:
You are speaking on a phone or video call, not writing.
- Use natural spoken language — conversational, direct.
- You may use very brief tone notes in parentheses (pausing, firmly) but keep them rare.
- No elaborate stage directions or long physical descriptions.`;
  }
}

export async function openConv(idx: number, scenario: Scenario): Promise<void> {
  const key     = sessionKey(state.mode!, idx);
  const session = getOrCreateSession(key);
  session.status = 'opening';

  requireEl(`gate-${idx}`).style.display = 'none';
  requireEl(`conv-${idx}`).style.display = 'flex';
  elMaybe(`scc-${idx}`)?.classList.add('active');

  showTyping(idx);
  try {
    const openingSystem = `${channelRules(state.mode!)}\n\n${counterpartRules()}\n\n${scenario.systemPrompt}\n\nOpen with or naturally adapt: "${scenario.inboundMessage}"`;
    const reply = await callClaude(
      [{ role: 'user', content: '[Conversation begins. Send your opening message.]' }],
      openingSystem,
      SONNET,
      400,
    );
    removeTyping(idx);
    appendMsg(idx, 'ai', reply, scenario.counterpartName);
    if (state.mode === 'call') speak(reply);
    session.msgs.push({ role: 'assistant', content: reply });
    session.status = 'active';
  } catch {
    removeTyping(idx);
    appendMsg(idx, 'sys', 'Connection error — please try again.', '');
    session.status = 'error';
  }
  elMaybe<HTMLTextAreaElement>(`inp-${idx}`)?.focus();
}

export async function sendTurn(idx: number, scenario: Scenario): Promise<void> {
  if (state.busy) return;
  const key     = sessionKey(state.mode!, idx);
  const session = getOrCreateSession(key);
  if (session.done) return;

  const inputEl = elMaybe<HTMLTextAreaElement>(`inp-${idx}`);
  const text    = inputEl?.value.trim();
  if (!text || !inputEl) return;
  inputEl.value        = '';
  inputEl.style.height = 'auto';

  let fullText = text;
  if (state.mode === 'email' && session.msgs.filter((m) => m.role === 'user').length === 0) {
    const toVal  = elMaybe<HTMLInputElement>(`ef-to-${idx}`)?.value  ?? '';
    const subVal = elMaybe<HTMLInputElement>(`ef-sub-${idx}`)?.value ?? '';
    if (toVal || subVal) fullText = `To: ${toVal}\nSubject: ${subVal}\n\n${text}`;
  }

  appendMsg(idx, 'you', fullText, '');
  session.msgs.push({ role: 'user', content: fullText });
  session.turns++;

  const maxTurns = MAX_TURNS[state.mode!];
  const hintEl   = elMaybe(`hint-${idx}`);
  if (hintEl) hintEl.textContent = `Turn ${session.turns}/${maxTurns} · Enter to send · Shift+Enter new line`;

  setBusy(true);
  const sendButton = elMaybe<HTMLButtonElement>(`snd-${idx}`);
  if (sendButton) sendButton.disabled = true;
  showTyping(idx);

  try {
    const nearEnd   = session.turns >= maxTurns - 1;
    const systemCtx = `${channelRules(state.mode!)}\n\n${counterpartRules()}\n\n${scenario.systemPrompt}${nearEnd ? '\n\n[Final exchange. Wrap up naturally — but only if the trainee has earned it through genuine communication skill.]' : ''}`;
    const reply     = await callClaude(session.msgs, systemCtx, SONNET, 350);
    removeTyping(idx);
    appendMsg(idx, 'ai', reply, scenario.counterpartName);
    if (state.mode === 'call') speak(reply);
    session.msgs.push({ role: 'assistant', content: reply });

    if (session.turns >= maxTurns) {
      appendMsg(idx, 'sys', `${maxTurns} exchanges reached — scoring your conversation…`, '');
      void endConv(idx, scenario);
    }
  } catch {
    removeTyping(idx);
    appendMsg(idx, 'sys', 'Error — try again.', '');
  } finally {
    setBusy(false);
    if (sendButton) sendButton.disabled = false;
    elMaybe<HTMLTextAreaElement>(`inp-${idx}`)?.focus();
  }
}
