export type Channel = 'slack' | 'email' | 'call';
export type ScenarioType = 'hostile' | 'vague' | 'upward' | 'pushback' | 'escalation';
export type Intensity = 'medium' | 'high';
export type ReadinessLevel = 'highly_ready' | 'ready' | 'partially_ready' | 'needs_development';
export type DimensionLevel = 'strong' | 'adequate' | 'needs_work';
export type ConversationStatus = 'idle' | 'opening' | 'active' | 'scoring' | 'completed' | 'error';

export interface ScoringDimension {
  name: string;
  desc: string;
}

export interface ScoreDimension {
  name: string;
  level: DimensionLevel;
  explanation: string;
}

export interface ScoreData {
  level: ReadinessLevel;
  dimensions: ScoreDimension[];
  strongestMoment: string;
  biggestGap: string;
  habitToBuild: string;
  rewrite?: string;
}

export interface Scenario {
  title: string;
  type: ScenarioType;
  intensity: Intensity;
  desc: string;
  counterpartName: string;
  counterpartPersona: string;
  task: string;
  context?: string;
  inboundMessage: string;
  systemPrompt: string;
  scoringDimensions: ScoringDimension[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Session {
  msgs: Message[];
  done: boolean;
  level: ReadinessLevel | null;
  scoreData: ScoreData | null;
  turns: number;
  status: ConversationStatus;
}

export interface AppState {
  role: string;
  learnt: string;
  mode: Channel | null;
  selectedChannels: Channel[];
  generatedScenarios: Record<string, Scenario[]>;
  sessions: Record<string, Session>;
  busy: boolean;
}

export interface ChannelReport {
  mode: Channel;
  label: string;
  icon: string;
  level: ReadinessLevel;
  scenarios: Scenario[];
  levels: ReadinessLevel[];
}