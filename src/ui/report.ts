import { state, scenarioKey, sessionKey } from '../state';
import type { Channel, ChannelReport, ReadinessLevel } from '../types';
import { elMaybe, esc } from './dom';
import { postToSlack } from '../api';
import { LEVEL_LABEL, LEVEL_COLOR, LEVEL_DESC, LEVEL_ICON, SCENARIO_ICONS, LEVEL_RANK, rankToLevel } from '../constants';

export function checkAllDone(): void {
  const allChannelsDone = state.selectedChannels.every((ch) => {
    const scenarios = state.generatedScenarios[scenarioKey(ch)] ?? [];
    return scenarios.length > 0 && scenarios.every((_, i) => state.sessions[sessionKey(ch, i)]?.done);
  });
  if (!allChannelsDone) return;

  const channelReports: ChannelReport[] = state.selectedChannels.map((ch) => {
    const chScenarios = state.generatedScenarios[scenarioKey(ch)]!;
    const levels      = chScenarios.map((_, i) => state.sessions[sessionKey(ch, i)]?.level ?? 'needs_development');
    const chRank      = levels.reduce((sum, l) => sum + LEVEL_RANK[l], 0) / levels.length;
    const icons: Record<Channel, string>  = { slack: '🟣', email: '📧', call: '📞' };
    const labels: Record<Channel, string> = { slack: 'Slack', email: 'Email', call: 'Call' };
    return { mode: ch, label: labels[ch], icon: icons[ch], level: rankToLevel(chRank), scenarios: chScenarios, levels };
  });

  const allLevels    = channelReports.flatMap((r) => r.levels);
  const overallRank  = allLevels.reduce((sum, l) => sum + LEVEL_RANK[l], 0) / allLevels.length;
  const overallLevel = rankToLevel(overallRank);

  const channelCards = channelReports.map((ch) => {
    const typeGroups: Record<string, ReadinessLevel[]> = {};
    ch.scenarios.forEach((scenario, i) => {
      const lvl = state.sessions[sessionKey(ch.mode, i)]?.level ?? 'needs_development';
      (typeGroups[scenario.type] ??= []).push(lvl);
    });
    const typeTags = Object.entries(typeGroups).map(([type, list]) => {
      const typeRank  = list.reduce((sum, l) => sum + LEVEL_RANK[l], 0) / list.length;
      const typeLevel = rankToLevel(typeRank);
      const typeColor = LEVEL_COLOR[typeLevel];
      const levelWord = LEVEL_LABEL[typeLevel].split(' ').slice(1).join(' ');
      return `<span class="report-tag" style="border-color:${typeColor};color:${typeColor}">${SCENARIO_ICONS[type] ?? '💬'} ${levelWord}</span>`;
    }).join(' ');

    return `<div class="channel-card">
      <div class="channel-card-head">
        <span style="font-size:1.2rem">${ch.icon}</span>
        <span style="font-weight:700;color:var(--text-heading)">${ch.label}</span>
        <span style="margin-left:auto;font-size:.85rem;font-weight:600;color:${LEVEL_COLOR[ch.level]}">${LEVEL_LABEL[ch.level]}</span>
      </div>
      <div class="channel-card-tags">${typeTags}</div>
    </div>`;
  }).join('');

  const allStrengths: string[] = [];
  const allWeaknesses: string[] = [];
  const allHabits: string[]    = [];
  channelReports.forEach((ch) => {
    ch.scenarios.forEach((_, i) => {
      const session = state.sessions[sessionKey(ch.mode, i)];
      if (session?.scoreData?.strongestMoment) allStrengths.push(session.scoreData.strongestMoment);
      if (session?.scoreData?.biggestGap)      allWeaknesses.push(session.scoreData.biggestGap);
      if (session?.scoreData?.habitToBuild)    allHabits.push(session.scoreData.habitToBuild);
    });
  });

  const strengths = [...new Set(allStrengths)].slice(0, 3)
    .map((s) => `<div class="dim-row dim-green">✓ ${esc(s)}</div>`).join('');
  const weaknesses = [...new Set(allWeaknesses)].slice(0, 3)
    .map((w) => `<div class="dim-row dim-red">△ ${esc(w)}</div>`).join('');
  const nextSteps = [...new Set(allHabits)].slice(0, 4)
    .map((h, i) => `<div class="next-step"><span class="next-step-num">${i + 1}</span><span class="next-step-txt">${esc(h)}</span></div>`).join('');

  const sumEl = elMaybe('session-sum');
  if (!sumEl) return;
  sumEl.style.display = 'block';

  const viewBtn = elMaybe('view-report-btn');
  if (viewBtn) viewBtn.style.display = 'block';

  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  sumEl.innerHTML = `<div class="sum-card">
    <div class="sum-hd" style="background:linear-gradient(135deg,var(--teal-light),var(--green-light));padding:1rem .9rem">
      <div>
        <div style="font-size:.63rem;color:var(--text-muted);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.3rem">📊 CommSkill Pro — Readiness Report</div>
        <div class="sum-title" style="font-size:1.2rem;margin-bottom:.2rem;font-weight:700;color:${LEVEL_COLOR[overallLevel]}">${LEVEL_LABEL[overallLevel]}</div>
        <div style="font-size:.75rem;color:var(--text-body);line-height:1.5">${LEVEL_DESC[overallLevel]}</div>
        <div style="font-size:.65rem;color:var(--text-muted);margin-top:.35rem">Completed ${reportDate}</div>
      </div>
      <div style="text-align:right">
        <div class="sp-nlbl">Channels</div>
        <div style="font-size:1.8rem;font-weight:700;color:var(--text-heading);line-height:1">${channelReports.length}</div>
        <div style="font-size:.65rem;color:var(--text-muted);margin-top:.25rem">completed</div>
      </div>
    </div>
    <div class="report-section">
      <div class="report-section-label">Channel Readiness</div>
      ${channelCards}
    </div>
    <div class="report-section">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        <div>
          <div class="report-section-label" style="color:var(--green)">✓ Strengths</div>
          <div style="display:flex;flex-direction:column;gap:.35rem">${strengths || '<div style="color:var(--text-muted);font-size:.75rem">Consistent strong performance</div>'}</div>
        </div>
        <div>
          <div class="report-section-label" style="color:var(--red)">△ Focus Areas</div>
          <div style="display:flex;flex-direction:column;gap:.35rem">${weaknesses || '<div style="color:var(--text-muted);font-size:.75rem">Excellent across the board</div>'}</div>
        </div>
      </div>
    </div>
    <div class="report-section">
      <div class="report-section-label" style="color:var(--teal)">🎯 Next 30 Days</div>
      <div style="display:flex;flex-direction:column;gap:.4rem">${nextSteps || '<div style="font-size:.75rem;color:var(--text-muted)">Maintain your excellent performance</div>'}</div>
    </div>
    <div class="report-section" style="background:var(--bg-subtle)">
      <div style="font-size:.75rem;color:var(--text-body);line-height:1.6">
        <strong style="color:var(--text-heading)">Summary:</strong> ${esc(state.role)} completed ${channelReports.length} channel(s). Overall readiness: ${LEVEL_LABEL[overallLevel]}. ${LEVEL_DESC[overallLevel]}.
      </div>
    </div>
    <div class="sum-acts">
      <button class="sd-btn" id="slack-send-btn">📤 Send to Slack</button>
      <button class="sd-btn p" id="new-session-btn">🔄 New Session</button>
    </div>
  </div>`;

  const slackBtn = elMaybe<HTMLButtonElement>('slack-send-btn');
  if (slackBtn) {
    slackBtn.addEventListener('click', () => void sendReportToSlack(slackBtn, {
      role: state.role,
      overallLevel,
      overallLabel: LEVEL_LABEL[overallLevel],
      overallDesc:  LEVEL_DESC[overallLevel],
      channelReports,
      reportDate,
    }));
  }

  elMaybe('new-session-btn')?.addEventListener('click', () => location.reload());
  sumEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

interface ReportPayload {
  role: string;
  overallLevel: ReadinessLevel;
  overallLabel: string;
  overallDesc: string;
  channelReports: ChannelReport[];
  reportDate: string;
}

async function sendReportToSlack(button: HTMLButtonElement, report: ReportPayload): Promise<void> {
  button.disabled    = true;
  button.textContent = '📤 Sending…';

  const levelIcon    = LEVEL_ICON[report.overallLevel];
  const channelLines = report.channelReports
    .map((ch) => `• ${ch.icon} *${ch.label}:* ${LEVEL_LABEL[ch.level]}`)
    .join('\n');

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📊 CommSkill Pro — Readiness Report', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Trainee:*\n${report.role}` },
          { type: 'mrkdwn', text: `*Overall:*\n${levelIcon} ${report.overallLabel}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Channel Results:*\n${channelLines}` },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `${report.overallDesc} · Completed ${report.reportDate}` },
        ],
      },
    ],
  };

  try {
    await postToSlack(payload);
    button.textContent       = '✅ Sent to Slack!';
    button.style.background  = 'var(--green)';
    button.style.color       = 'white';
    button.style.border      = '1px solid var(--green)';
  } catch {
    button.textContent = '❌ Failed — try again';
    button.disabled    = false;
  }
}
