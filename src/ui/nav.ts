import { state, scenarioKey, sessionKey, setMode } from '../state';
import type { Channel, ReadinessLevel } from '../types';
import { createEl, elMaybe } from './dom';
import { LEVEL_ICON, SCENARIO_ICONS, CHANNEL_CONFIG, MAX_TURNS } from '../constants';

export function renderNav(): void {
  const scenarios = state.generatedScenarios[scenarioKey(state.mode!)] ?? [];
  const nav = elMaybe('sc-nav');
  if (!nav) return;
  nav.innerHTML = '';

  scenarios.forEach((scenario, i) => {
    const key   = sessionKey(state.mode!, i);
    const done  = state.sessions[key]?.done;
    const level = state.sessions[key]?.level as ReadinessLevel | undefined;
    const item  = createEl('div', `ni${done ? ' done' : ''}`);
    const badge = done ? (level ? LEVEL_ICON[level] : '✓') : String(i + 1);
    item.innerHTML = `<span class="ni-icon">${SCENARIO_ICONS[scenario.type] ?? '💬'}</span><span class="ni-title">${scenario.title}</span><span class="ni-sc">${badge}</span>`;
    item.addEventListener('click', () => {
      const body = elMaybe(`scb-${i}`);
      if (body) {
        body.style.display = 'block';
        elMaybe(`scc-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    nav.appendChild(item);
  });
}

export function renderHistory(): void {
  const entries = Object.entries(state.sessions).filter(([, s]) => s.done);
  const box  = elMaybe('hist-box');
  const body = elMaybe('hist-body');
  if (!box || !body) return;
  if (!entries.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';

  const shortLabels: Record<Channel, string> = { slack: 'S', email: 'E', call: 'C' };

  body.innerHTML = entries.map(([key, session]) => {
    const parts  = key.split('|');
    const mode   = parts[1] as Channel;
    const index  = parts[2];
    const prefix = shortLabels[mode] ?? mode;
    const sc     = state.generatedScenarios[scenarioKey(mode)]?.[+index];
    const icon   = session.level ? LEVEL_ICON[session.level] : '✓';
    return `<div class="sh-row">
      <span class="sh-lbl">${prefix}${+index + 1}${sc ? ' · ' + sc.title.slice(0, 14) + '…' : ''}</span>
      <span class="sh-sc">${icon}</span>
    </div>`;
  }).join('');
}

export function updateProgress(): void {
  const total = state.selectedChannels.reduce((sum, ch) => {
    return sum + ((state.generatedScenarios[scenarioKey(ch)] ?? []).length || MAX_TURNS[ch]);
  }, 0);
  const done   = Object.values(state.sessions).filter((s) => s.done).length;
  const fill   = elMaybe('prog-fill');
  const doneEl = elMaybe('hb-done');
  const modeEl = elMaybe('hb-mode');
  if (fill)   fill.style.width   = total > 0 ? `${(done / total) * 100}%` : '0%';
  if (doneEl) doneEl.textContent = `${done}/${total}`;
  if (modeEl) modeEl.textContent = CHANNEL_CONFIG[state.mode!]?.label + ` (${state.selectedChannels.length})`;
}

export function updateChannelNav(onModeChange: () => void): void {
  const nav = elMaybe('mode-nav');
  if (!nav) return;
  nav.innerHTML = '';

  state.selectedChannels.forEach((mode) => {
    const cfg  = CHANNEL_CONFIG[mode];
    const item = createEl('div', `mi ${mode}${mode === state.mode ? ' a' : ''}`);
    item.dataset.mode = mode;
    item.innerHTML = `<div class="md ${cfg.dotClass}"></div>${cfg.label}`;
    item.addEventListener('click', () => {
      if (mode === state.mode) return;
      setMode(mode);
      updateChannelNav(onModeChange);
      onModeChange();
    });
    nav.appendChild(item);
  });
  updateProgress();
}
