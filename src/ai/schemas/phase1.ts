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

export const Phase1OutputSchema = z.object({
  expandedSetting: z.string(),
  notableLocations: z.array(NotableLocationSchema),
  toneManifesto: ToneManifestoSchema,
  storyHooks: z.array(StoryHookSchema),
  coreConflict: z.string(),
  sessionZero: SessionZeroSchema,
});

export type NotableLocation = z.infer<typeof NotableLocationSchema>;
export type ToneLevers = z.infer<typeof ToneLeversSchema>;
export type ToneManifesto = z.infer<typeof ToneManifestoSchema>;
export type StoryHook = z.infer<typeof StoryHookSchema>;
export type SessionZero = z.infer<typeof SessionZeroSchema>;
export type Phase1Output = z.infer<typeof Phase1OutputSchema>;
