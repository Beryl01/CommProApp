import { setUserProfile, setMode, setSelectedChannels, toggleChannel, state } from '../state';
import type { Channel } from '../types';
import { requireEl, elMaybe } from './dom';
import { genScenarios, renderMode } from './scenarios';
import { updateChannelNav } from './nav';

const MAX_ROLE_LEN   = 100;
const MAX_LEARNT_LEN = 500;

function sanitise(input: string, maxLen: number): string {
  return input.slice(0, maxLen).replace(/[<>"]/g, '');
}

export function initOnboarding(): void {
  document.querySelectorAll<HTMLElement>('.mc').forEach((card) => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode as Channel;
      if (card.classList.contains('sel')) {
        card.classList.remove('sel');
        toggleChannel(mode);
      } else {
        card.classList.add('sel');
        toggleChannel(mode);
      }
    });
  });

  requireEl('ob-start').addEventListener('click', async () => {
    const rawRole   = requireEl<HTMLInputElement>('ob-role').value.trim();
    const rawLearnt = requireEl<HTMLTextAreaElement>('ob-learnt').value.trim();
    if (!rawRole)                        { alert('Please enter your role.');             return; }
    if (!rawLearnt)                      { alert('Please describe what you want to practise.'); return; }
    if (state.selectedChannels.length === 0) { alert('Please select at least one channel.'); return; }

    const role   = sanitise(rawRole,   MAX_ROLE_LEN);
    const learnt = sanitise(rawLearnt, MAX_LEARNT_LEN);

    setUserProfile(role, learnt);
    setMode(state.selectedChannels[0]);
    setSelectedChannels(state.selectedChannels);

    requireEl('ob').style.display  = 'none';
    requireEl('app').style.display = 'block';

    const roleEl = elMaybe('hb-role');
    if (roleEl) roleEl.textContent = role.length > 22 ? role.slice(0, 22) + '…' : role;

    const [first, ...rest] = state.selectedChannels;

    await genScenarios(first);
    updateChannelNav(renderMode);
    renderMode();

    if (rest.length > 0) void Promise.all(rest.map((ch) => genScenarios(ch)));
  });
}