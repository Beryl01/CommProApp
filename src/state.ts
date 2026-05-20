import type { AppState, Channel, Session, Scenario, ReadinessLevel, ScoreData } from './types';

const _state: AppState = {
  role:               '',
  learnt:             '',
  mode:               null,
  selectedChannels:   [],
  generatedScenarios: {},
  sessions:           {},
  busy:               false,
};

export const state: Readonly<AppState> = _state;

export function setUserProfile(role: string, learnt: string): void {
  _state.role   = role;
  _state.learnt = learnt;
}

export function setMode(mode: Channel): void {
  _state.mode = mode;
}

export function setBusy(busy: boolean): void {
  _state.busy = busy;
}

export function setSelectedChannels(channels: Channel[]): void {
  _state.selectedChannels = [...channels];
}

export function toggleChannel(channel: Channel): void {
  const index = _state.selectedChannels.indexOf(channel);
  if (index >= 0) {
    _state.selectedChannels.splice(index, 1);
  } else {
    _state.selectedChannels.push(channel);
  }
}

export function setGenerated(key: string, scenarios: Scenario[]): void {
  _state.generatedScenarios[key] = scenarios;
}

export function createSession(): Session {
  return { msgs: [], done: false, level: null, scoreData: null, turns: 0, status: 'idle' };
}

export function getOrCreateSession(key: string): Session {
  if (!_state.sessions[key]) _state.sessions[key] = createSession();
  return _state.sessions[key];
}

export function markSessionDone(key: string, level: ReadinessLevel, scoreData: ScoreData): void {
  const session = _state.sessions[key];
  if (!session) return;
  session.done      = true;
  session.level     = level;
  session.scoreData = scoreData;
  session.status    = 'completed';
}

export function scenarioKey(channel: Channel): string {
  return `${_state.role}|${channel}|scenarios`;
}

export function sessionKey(channel: Channel, index: number): string {
  return `${_state.role}|${channel}|${index}`;
}
