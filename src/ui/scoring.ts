import { state, sessionKey, markSessionDone } from '../state';
import { callClaude, SONNET } from '../api';
import { parseJsonObject } from '../utils/json';
import type { ScoreData, Scenario } from '../types';
import { elMaybe, esc } from './dom';
import { renderNav, renderHistory, updateProgress } from './nav';
import { checkAllDone } from './report';
import { LEVEL_LABEL, LEVEL_COLOR, DIM_LABEL, DIM_COLOR } from '../constants';

export function renderScore(targetId: string, data: ScoreData): void {
  const container = elMaybe(targetId);
  if (!container) return;

  const levelColor = LEVEL_COLOR[data.level] ?? 'var(--text-muted)';

  const dims = (data.dimensions ?? []).map((dimension) => {
    const color = DIM_COLOR[dimension.level] ?? 'var(--text-muted)';
    const label = DIM_LABEL[dimension.level] ?? dimension.level;
    return `<div class="sp-dim">
      <div class="sp-dh">
        <span class="sp-dn">${esc(dimension.name)}</span>
        <span class="sp-ds" style="color:${color}">${label}</span>
      </div>
      <div class="sp-de">${esc(dimension.explanation)}</div>
    </div>`;
  }).join('');

  container.innerHTML = `<div class="sp">
    <div class="sp-hd">
      <div>
        <div class="sp-title">Feedback</div>
        <div style="font-size:.64rem;color:var(--text-muted);margin-top:2px">Based on your full conversation</div>
      </div>
      <div style="text-align:right">
        <div class="sp-nlbl">Readiness</div>
        <div style="font-size:.9rem;font-weight:700;color:${levelColor}">${LEVEL_LABEL[data.level]}</div>
      </div>
    </div>
    <div class="sp-body">
      ${dims}
      <div style="display:flex;flex-direction:column;gap:.4rem;margin-top:.1rem">
        <div class="ins g"><div class="ins-lbl">✓ Strongest moment</div><div class="ins-txt">${esc(data.strongestMoment ?? '')}</div></div>
        <div class="ins r"><div class="ins-lbl">↑ Biggest gap</div><div class="ins-txt">${esc(data.biggestGap ?? '')}</div></div>
        <div class="ins b"><div class="ins-lbl">🎯 Habit to build</div><div class="ins-txt">${esc(data.habitToBuild ?? '')}</div></div>
        ${data.rewrite ? `<div class="ins b2"><div class="ins-lbl">✎ Better version</div><div class="ins-txt" style="font-family:'DM Mono',monospace;font-size:.72rem;white-space:pre-wrap">${esc(data.rewrite)}</div></div>` : ''}
      </div>
    </div>
  </div>`;
}

export async function endConv(idx: number, scenario: Scenario): Promise<void> {
  const key     = sessionKey(state.mode!, idx);
  const session = state.sessions[key];
  if (!session || session.done || session.status === 'scoring') return;
  session.status = 'scoring';

  const footEl  = elMaybe(`foot-${idx}`);
  const scoreEl = elMaybe(`score-${idx}`);
  if (footEl)  footEl.style.display  = 'none';
  if (scoreEl) scoreEl.innerHTML = `<div style="padding:.85rem;text-align:center;color:var(--text-muted);font-size:.8rem">Analysing your conversation…</div>`;

  const transcript = session.msgs
    .map((m) => `${m.role === 'user' ? 'TRAINEE' : scenario.counterpartName.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const dims = (scenario.scoringDimensions ?? [])
    .map((d, i) => `${i + 1}. ${d.name}: ${d.desc}`)
    .join('\n') || '1. Clarity\n2. Tone\n3. Effectiveness\n4. Empathy\n5. Resolution';

  const prompt = `You are a communication trainer evaluating a ${state.mode} simulation.
Trainee: ${state.role}. Practising: "${state.learnt}"
Scenario: "${scenario.title}" (${scenario.type}, ${scenario.intensity})
Counterpart: ${scenario.counterpartName} — ${scenario.counterpartPersona}
Task: ${scenario.task}

FULL TRANSCRIPT:
${transcript}

Evaluate honestly. Focus on whether they applied their stated learning goal.
Dimensions to assess:
${dims}

Return ONLY JSON (no markdown, no code fences, no literal newlines inside string values — use \\n if needed):
{"level":"highly_ready|ready|partially_ready|needs_development","dimensions":[{"name":"","level":"strong|adequate|needs_work","explanation":""},{"name":"","level":"strong|adequate|needs_work","explanation":""},{"name":"","level":"strong|adequate|needs_work","explanation":""},{"name":"","level":"strong|adequate|needs_work","explanation":""},{"name":"","level":"strong|adequate|needs_work","explanation":""}],"strongestMoment":"","biggestGap":"","habitToBuild":"","rewrite":""}`;

  try {
    const raw  = await callClaude(
      [{ role: 'user', content: prompt }],
      'Return only valid JSON. No markdown. No extra text. No literal newlines inside JSON string values.',
      SONNET,
      4096,
    );
    const data = parseJsonObject<ScoreData>(raw);
    markSessionDone(key, data.level, data);

    elMaybe(`scc-${idx}`)?.classList.replace('active', 'done');
    renderScore(`score-${idx}`, data);
    renderNav();
    updateProgress();
    renderHistory();
    checkAllDone();

    setTimeout(() => {
      const nextCard = elMaybe(`scc-${idx + 1}`);
      if (nextCard) {
        const nextBody = elMaybe(`scb-${idx + 1}`);
        if (nextBody) nextBody.style.display = 'block';
        nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 600);
  } catch (error) {
    if (scoreEl) scoreEl.innerHTML = `<div style="padding:.85rem;color:var(--red);font-size:.8rem;text-align:center">Feedback failed: ${error instanceof Error ? esc(error.message) : 'Unknown error'}</div>`;
    session.status = 'error';
  }
}
