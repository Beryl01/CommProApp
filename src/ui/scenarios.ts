import { state, scenarioKey, sessionKey, setGenerated } from '../state';
import { callClaude, HAIKU } from '../api';
import { parseJsonArray } from '../utils/json';
import type { Scenario, Channel } from '../types';
import { createEl, requireEl, elMaybe, esc, appendMsg } from './dom';
import { renderNav, renderHistory, updateProgress } from './nav';
import { renderScore, endConv } from './scoring';
import { openConv, sendTurn } from './conversation';
import { checkAllDone } from './report';
import { stopSpeak, isVoiceOn, setVoiceOn } from '../voice';
import { CHANNEL_CONFIG, SCENARIO_ICONS, MAX_TURNS } from '../constants';

export function renderMode(): void {
  renderList();
  renderNav();
  updateProgress();
}

export function renderList(): void {
  const activeMode = state.mode!;              // capture now — mode may change while a background load is in flight
  const key        = scenarioKey(activeMode);
  const scenarios  = state.generatedScenarios[key] ?? [];
  const area       = requireEl('content');
  area.innerHTML   = '';

  if (scenarios.length === 0) {
    area.innerHTML = `<div class="welcome"><div class="welcome-icon">⚙️</div><div class="welcome-title">Loading ${activeMode} scenarios…</div><div class="welcome-desc">Generating scenarios for <strong>${esc(state.role)}</strong></div></div>`;
    const showError = () => {
      if (state.mode !== activeMode) return;
      requireEl('content').innerHTML = `<div class="welcome"><div class="welcome-icon">⚠️</div><div class="welcome-title">Could not load ${activeMode} scenarios</div><div class="welcome-desc"><button onclick="location.reload()" class="reload-btn">Reload page</button></div></div>`;
    };
    void genScenarios(activeMode)
      .then(() => {
        if (state.mode !== activeMode) return;
        if (state.generatedScenarios[key]?.length) {
          renderList();
        } else {
          showError();
        }
      })
      .catch(showError);
    return;
  }

  const cfg    = CHANNEL_CONFIG[activeMode];
  const banner = createEl('div', 'banner');
  banner.innerHTML = `<span class="btag" style="background:${cfg.bg};color:${cfg.color}">${activeMode.toUpperCase()}</span>
    <span class="btext">Role: <strong style="color:var(--text-heading)">${esc(state.role)}</strong> · 3 scenarios · 2 exchanges each · scored after each</span>`;
  area.appendChild(banner);

  const list = createEl('div', 'sc-list');
  area.appendChild(list);  // attach to DOM before building cards so restoreSession can use getElementById

  scenarios.forEach((scenario, i) => {
    list.appendChild(buildCard(scenario, i));
    restoreSession(i, scenario);  // card is now in the document — safe to getElementById
  });

  const sumDiv = createEl('div');
  sumDiv.id = 'session-sum';
  sumDiv.style.display = 'none';
  area.appendChild(sumDiv);

  const doneCount = scenarios.filter((_, i) => state.sessions[sessionKey(activeMode, i)]?.done).length;
  const openIdx   = Math.min(doneCount, scenarios.length - 1);
  const nextBody  = elMaybe(`scb-${openIdx}`);
  if (nextBody) nextBody.style.display = 'block';

  checkAllDone();
}

function buildCard(scenario: Scenario, idx: number): HTMLElement {
  const key     = sessionKey(state.mode!, idx);
  const session = state.sessions[key] ?? null;
  const done    = session?.done ?? false;
  const cfg     = CHANNEL_CONFIG[state.mode!];

  const card = createEl('div', `sc${done ? ' done' : ''}`);
  card.id = `scc-${idx}`;

  card.innerHTML = `
    <div class="sc-head" id="sch-${idx}">
      <span class="sc-num">${cfg.shortLabel(idx)}</span>
      <span style="font-size:.85rem">${SCENARIO_ICONS[scenario.type] ?? '💬'}</span>
      <span class="sc-title">${esc(scenario.title)}</span>
      ${done
        ? `<span style="font-size:.64rem;font-weight:700;color:var(--green)">✓ Done</span>`
        : `<span style="font-size:.61rem;color:var(--text-muted)">tap to open</span>`}
    </div>
    <div class="sc-body" id="scb-${idx}">
      <div class="brief">
        <div class="brief-desc">${esc(scenario.desc)}</div>
        ${scenario.context ? `<div class="pill pill-ctx"><strong>Context:</strong> ${esc(scenario.context)}</div>` : ''}
        <div class="pill pill-task"><strong>Your task:</strong> ${esc(scenario.task)}</div>
        <div class="pill-who">Speaking with: <strong style="color:var(--text-hint)">${esc(scenario.counterpartName)}</strong> · ${esc(scenario.counterpartPersona)}</div>
        ${scenario.inboundMessage ? `<div class="inbound">
          <div class="ib-bar">
            <div class="ib-dots"><div class="ib-dot" style="background:#f87171"></div><div class="ib-dot" style="background:#fbbf24"></div><div class="ib-dot" style="background:#34d399"></div></div>
            <span class="ib-lbl">incoming message</span>
          </div>
          <div class="ib-body">${esc(scenario.inboundMessage)}</div>
        </div>` : ''}
      </div>
      <div id="gate-${idx}" class="gate"${done ? ' style="display:none"' : ''}>
        <button class="gate-btn ${cfg.gateClass}" id="gatebn-${idx}">${cfg.gateLabel}</button>
        <div class="gate-hint">Live back-and-forth with ${esc(scenario.counterpartName)} · max ${MAX_TURNS[state.mode!]} exchanges</div>
      </div>
      <div class="conv" id="conv-${idx}">
        ${state.mode === 'email' ? `<div class="email-header">
          <div class="email-field">
            <span class="email-field-label">To:</span>
            <input id="ef-to-${idx}" class="email-field-input" placeholder="Recipient…"/>
          </div>
          <div class="email-field-divider"></div>
          <div class="email-field">
            <span class="email-field-label">Sub:</span>
            <input id="ef-sub-${idx}" class="email-field-input" placeholder="Subject…"/>
          </div>
        </div>` : ''}
        <div class="conv-bar ${cfg.convBarClass}">
          <span style="font-size:.8rem">${cfg.convIcon}</span>
          <span style="font-size:.74rem;font-weight:600;color:${cfg.color}">${cfg.convLabel}</span>
          <span style="font-size:.64rem;color:var(--text-muted);margin-left:auto">${esc(scenario.counterpartName)}</span>
          ${state.mode === 'call' ? `<button class="mute-btn" id="mute-${idx}">🔊 On</button>` : ''}
        </div>
        <div class="conv-msgs" id="msgs-${idx}"></div>
        <div class="conv-foot" id="foot-${idx}"${done ? ' style="display:none"' : ''}>
          <div class="conv-hint" id="hint-${idx}">Turn 0/${MAX_TURNS[state.mode!]} · Enter to send · Shift+Enter for new line</div>
          <div class="conv-actions">
            <textarea class="conv-inp" id="inp-${idx}" rows="2" placeholder="${cfg.placeholder}"></textarea>
            <button class="send-btn ${cfg.btnClass}" id="snd-${idx}">Send</button>
            <button class="end-btn" id="end-${idx}">End &amp; Score</button>
          </div>
        </div>
      </div>
      <div id="score-${idx}"></div>
    </div>`;

  // Wire all events directly on card elements — querySelector works on detached nodes,
  // so no setTimeout needed. The card does not have to be in the document yet.
  (card.querySelector(`#sch-${idx}`) as HTMLElement | null)?.addEventListener('click', () => {
    const body = card.querySelector(`#scb-${idx}`) as HTMLElement | null;
    if (body) body.style.display = body.style.display === 'none' || !body.style.display ? 'block' : 'none';
  });

  (card.querySelector(`#gatebn-${idx}`) as HTMLElement | null)?.addEventListener('click', () => void openConv(idx, scenario));

  const inputEl = card.querySelector<HTMLTextAreaElement>(`#inp-${idx}`);
  inputEl?.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px';
  });
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendTurn(idx, scenario); }
  });

  (card.querySelector(`#snd-${idx}`) as HTMLElement | null)?.addEventListener('click', () => void sendTurn(idx, scenario));
  (card.querySelector(`#end-${idx}`) as HTMLElement | null)?.addEventListener('click', () => {
    if (state.mode === 'call') stopSpeak();
    void endConv(idx, scenario);
  });

  const muteBtn = card.querySelector<HTMLButtonElement>(`#mute-${idx}`);
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      setVoiceOn(!isVoiceOn());
      muteBtn.textContent = isVoiceOn() ? '🔊 On' : '🔇 Off';
      muteBtn.classList.toggle('off', !isVoiceOn());
      if (!isVoiceOn()) stopSpeak();
    });
  }

  return card;
}

function restoreSession(idx: number, scenario: Scenario): void {
  const key     = sessionKey(state.mode!, idx);
  const session = state.sessions[key] ?? null;
  if (!session?.msgs?.length) return;

  const gateEl = elMaybe(`gate-${idx}`);
  const convEl = elMaybe(`conv-${idx}`);
  if (gateEl) gateEl.style.display = 'none';
  if (convEl) convEl.style.display = 'flex';
  session.msgs.forEach((m) => appendMsg(idx, m.role === 'user' ? 'you' : 'ai', m.content, scenario.counterpartName));
  if (session.done && session.scoreData) renderScore(`score-${idx}`, session.scoreData);
}

const pendingGenerations = new Map<string, Promise<void>>();
const failedGenerations  = new Set<string>();

export function genScenarios(mode: Channel): Promise<void> {
  const key = scenarioKey(mode);
  if (state.generatedScenarios[key]) return Promise.resolve();
  if (failedGenerations.has(key))    return Promise.reject(new Error(`Generation failed for ${mode} — reload to retry`));
  if (pendingGenerations.has(key))   return pendingGenerations.get(key)!;

  const promise = (async () => {
    if (mode === state.mode) {
      const area = elMaybe('content');
      if (area) area.innerHTML = `<div class="welcome"><div class="welcome-icon">⚙️</div><div class="welcome-title">Building scenarios…</div><div class="welcome-desc">Tailoring ${mode} scenarios for <strong>${esc(state.role)}</strong></div></div>`;
    }
    try {
      await fetchScenarios(mode, key);
    } catch {
      failedGenerations.add(key);
    } finally {
      pendingGenerations.delete(key);
    }
  })();

  pendingGenerations.set(key, promise);
  return promise;
}

async function fetchScenarios(mode: Channel, key: string): Promise<void> {
  const channelNote: Record<Channel, string> = {
    slack: 'SLACK — counterpart replies as plain typed Slack messages. No stage directions, no asterisk actions (*sighs*, *leans in*), no physical descriptions. Short, direct text only.',
    email: 'EMAIL — counterpart replies as proper work emails with greeting, body paragraphs, and a sign-off. Subject line on first reply or new topic. No stage directions. Professional tone.',
    call:  'LIVE CALL — counterpart speaks naturally as on a phone call. Very brief tone cues (pausing) are allowed but keep them rare. No elaborate stage directions.',
  };

  const prompt = `Generate 3 workplace communication training scenarios for a ${state.role} practising: "${state.learnt}". Channel: ${mode}.

Channel format rule: ${channelNote[mode]}

Required types (one each): hostile, vague, escalation.

INBOUND MESSAGE RULE — inboundMessage is always what the COUNTERPART sends to the TRAINEE at the start. The trainee has not spoken yet:
- hostile: counterpart sends a rude/aggressive message directed at the trainee
- vague: counterpart sends an unclear/underspecified request to the trainee
- escalation: an urgent problem that has just landed in the trainee's inbox
NEVER write inboundMessage as what the trainee should respond with.

Other rules:
- Scenarios must be specifically relevant to the role "${state.role}" and the goal "${state.learnt}"
- Counterpart must feel real: specific mood, concrete objections, reacts to HOW trainee speaks
- Hostile counterpart only softens with genuine de-escalation — not immediately
- Vague counterpart only clarifies when asked the right specific question
- systemPrompt must include the channel format rule above so the counterpart always responds in the correct format
- Max reply length for counterpart: 2 sentences

Return ONLY a valid JSON array of exactly 3 objects, no markdown, no code fences:
[{"title":"","type":"hostile|vague|escalation","intensity":"medium|high","desc":"","counterpartName":"","counterpartPersona":"","task":"","context":"","inboundMessage":"","systemPrompt":"","scoringDimensions":[{"name":"","desc":""}]}]`;

  const raw = await callClaude(
    [{ role: 'user', content: prompt }],
    'Return only a valid JSON array. No markdown, no code fences.',
    HAIKU,
    2500,
  );
  setGenerated(key, parseJsonArray<Scenario>(raw));
}

export { renderNav, renderHistory, updateProgress };
