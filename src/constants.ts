import type { Channel, ReadinessLevel, DimensionLevel } from './types';

export interface ChannelConfig {
  color: string;
  bg: string;
  gateLabel: string;
  gateClass: string;
  convIcon: string;
  convLabel: string;
  convBarClass: string;
  btnClass: string;
  shortLabel: (i: number) => string;
  icon: string;
  label: string;
  dotClass: string;
  placeholder: string;
}

export const CHANNEL_CONFIG: Record<Channel, ChannelConfig> = {
  slack: {
    color:       '#e879f9',
    bg:          'rgba(97,31,105,.2)',
    gateLabel:   '🟣 Begin Conversation',
    gateClass:   'gb-s',
    convIcon:    '🟣',
    convLabel:   '#comm-training',
    convBarClass: 'slack-bar',
    btnClass:    'btn-s',
    shortLabel:  (i) => `S${i + 1}`,
    icon:        '🟣',
    label:       'Slack',
    dotClass:    'md-s',
    placeholder: 'Your message…',
  },
  email: {
    color:       '#38bdf8',
    bg:          'rgba(0,120,212,.12)',
    gateLabel:   '📧 Start Email Thread',
    gateClass:   'gb-e',
    convIcon:    '📨',
    convLabel:   'Email Thread',
    convBarClass: 'email-bar',
    btnClass:    'btn-e',
    shortLabel:  (i) => `E${i + 1}`,
    icon:        '📧',
    label:       'Email',
    dotClass:    'md-e',
    placeholder: 'Your message…',
  },
  call: {
    color:       'var(--call)',
    bg:          'rgba(45,212,160,.1)',
    gateLabel:   '📞 Start Call',
    gateClass:   'gb-c',
    convIcon:    '📞',
    convLabel:   'Live Call',
    convBarClass: 'call-bar',
    btnClass:    'btn-c',
    shortLabel:  (i) => `C${i + 1}`,
    icon:        '📞',
    label:       'Call',
    dotClass:    'md-c',
    placeholder: 'Your spoken response…',
  },
};

export const LEVEL_LABEL: Record<ReadinessLevel, string> = {
  highly_ready:      '🚀 Highly Ready',
  ready:             '✅ Ready',
  partially_ready:   '⚠️ Partially Ready',
  needs_development: '📍 Needs Development',
};

export const LEVEL_COLOR: Record<ReadinessLevel, string> = {
  highly_ready:      'var(--green)',
  ready:             'var(--green)',
  partially_ready:   'var(--amber)',
  needs_development: 'var(--red)',
};

export const LEVEL_DESC: Record<ReadinessLevel, string> = {
  highly_ready:      "You're prepared for real-world scenarios across all channels",
  ready:             'Excellent preparation — you can handle complex situations',
  partially_ready:   'Core skills present, but refinement needed across channels',
  needs_development: 'Focus on fundamentals before high-pressure situations',
};

export const LEVEL_ICON: Record<ReadinessLevel, string> = {
  highly_ready:      '🚀',
  ready:             '✅',
  partially_ready:   '⚠️',
  needs_development: '📍',
};

export const DIM_LABEL: Record<DimensionLevel, string> = {
  strong:     '✓ Strong',
  adequate:   '~ Adequate',
  needs_work: '↑ Needs Work',
};

export const DIM_COLOR: Record<DimensionLevel, string> = {
  strong:     'var(--green)',
  adequate:   'var(--amber)',
  needs_work: 'var(--red)',
};

export const SCENARIO_ICONS: Record<string, string> = {
  hostile: '🔥', vague: '🔍', upward: '📊', pushback: '⛔', escalation: '🚨',
};

export const MAX_TURNS: Record<Channel, number> = {
  slack: 2,
  email: 2,
  call:  2,
};

export const LEVEL_RANK: Record<ReadinessLevel, number> = {
  needs_development: 0,
  partially_ready:   1,
  ready:             2,
  highly_ready:      3,
};

export function rankToLevel(avg: number): ReadinessLevel {
  if (avg >= 2.5) return 'highly_ready';
  if (avg >= 1.5) return 'ready';
  if (avg >= 0.5) return 'partially_ready';
  return 'needs_development';
}