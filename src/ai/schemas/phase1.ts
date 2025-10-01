// File: src/ai/schemas/phase1.ts
import { z } from 'zod';

// Phase 1: Story Overview

export const NotableLocationSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const ToneLeversSchema = z.object({
  pace: z.string(),
  danger: z.string(),
  morality: z.string(),
  scale: z.string(),
});

export const ToneManifestoSchema = z.object({
  vibe: z.string(),
  levers: ToneLeversSchema,
  expanded: z.string(),
});

export const StoryHookSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const SessionZeroSchema = z.object({
  openQuestions: z.array(z.string()),
  contentAdvisories: z.array(z.string()),
  calibrationLevers: z.array(z.string()),
});

export const BeatCompletionConditionsSchema = z.object({
  requiredInfo: z.array(z.string()).describe('Key information pieces that must be revealed to complete this beat'),
  alternativePaths: z.array(z.string()).optional().describe('Alternative ways to complete this beat'),
});

export const StoryBeatSchema = z.object({
  beatId: z.string().describe('Unique identifier for this beat (e.g., "act1_beat1")'),
  title: z.string().describe('Short title for this beat'),
  description: z.string().describe('What happens in this beat'),
  objectives: z.array(z.string()).describe('What needs to be accomplished'),
  completionConditions: BeatCompletionConditionsSchema,
  estimatedSessions: z.number().describe('Expected number of sessions for this beat'),
});

export const ActSchema = z.object({
  actNumber: z.number().min(1).max(3),
  title: z.string(),
  description: z.string(),
  beats: z.array(StoryBeatSchema),
});

export const EndGameConditionsSchema = z.object({
  successConditions: z.array(z.string()).describe('What constitutes a successful campaign resolution'),
  failureConditions: z.array(z.string()).describe('What could cause campaign failure'),
  openEnded: z.boolean().describe('Whether the campaign has multiple valid endings'),
});

export const CampaignStructureSchema = z.object({
  totalEstimatedSessions: z.number().describe('Total expected campaign length in sessions'),
  acts: z.array(ActSchema).length(3).describe('3-act campaign structure'),
  endGameConditions: EndGameConditionsSchema,
});

export const Phase1OutputSchema = z.object({
  expandedSetting: z.string(),
  notableLocations: z.array(NotableLocationSchema),
  toneManifesto: ToneManifestoSchema,
  storyHooks: z.array(StoryHookSchema),
  coreConflict: z.string(),
  sessionZero: SessionZeroSchema,
  campaignStructure: CampaignStructureSchema,
});

export type NotableLocation = z.infer<typeof NotableLocationSchema>;
export type ToneLevers = z.infer<typeof ToneLeversSchema>;
export type ToneManifesto = z.infer<typeof ToneManifestoSchema>;
export type StoryHook = z.infer<typeof StoryHookSchema>;
export type SessionZero = z.infer<typeof SessionZeroSchema>;
export type BeatCompletionConditions = z.infer<typeof BeatCompletionConditionsSchema>;
export type StoryBeat = z.infer<typeof StoryBeatSchema>;
export type Act = z.infer<typeof ActSchema>;
export type EndGameConditions = z.infer<typeof EndGameConditionsSchema>;
export type CampaignStructure = z.infer<typeof CampaignStructureSchema>;
export type Phase1Output = z.infer<typeof Phase1OutputSchema>;
