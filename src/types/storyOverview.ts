// Types for Phase 1 Story Overview

export interface StoryOverview {
  expandedSetting: string;
  notableLocations: NotableLocation[];
  toneManifesto: ToneManifesto;
  storyHooks: StoryHook[];
  coreConflict: string;
  sessionZero: SessionZero;
}

export interface NotableLocation {
  name: string;
  description: string;
}

export interface ToneManifesto {
  vibe: string;
  levers: ToneLevers;
  expanded: string;
}

export interface ToneLevers {
  pace: string;
  danger: string;
  morality: string;
  scale: string;
}

export interface StoryHook {
  title: string;
  description: string;
}

export interface SessionZero {
  openQuestions: string[];
  contentAdvisories: string[];
  calibrationLevers: string[];
}

export interface AIGenerationRequest {
  seedId: string;
  type?: 'initial' | 'regen' | 'remix';
  section?: keyof StoryOverview;
  feedback?: string;
  remixBrief?: string;
  schema?: any;
}

export interface AIGenerationResponse {
  success: boolean;
  story?: StoryOverview;
  data?: Partial<StoryOverview>;
  error?: string;
  tokensUsed?: number;
  cost?: number;
  latency?: number;
  cached?: boolean;
}