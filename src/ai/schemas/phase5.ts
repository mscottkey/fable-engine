// File: src/ai/schemas/phase5.ts
import { z } from 'zod';

// Phase 5: Campaign Arcs & Beats

export const BeatTiesSchema = z.object({
  nodeIds: z.array(z.string()),
  factionIds: z.array(z.string()),
  clockRefs: z.array(z.string()),
});

export const BeatSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  ties: BeatTiesSchema,
  conditions: z.array(z.string()),
  outcomes: z.array(z.string()),
  foreshadow: z.string(),
});

export const ArcSchema = z.object({
  id: z.string(),
  name: z.string(),
  theme: z.string(),
  beats: z.array(BeatSchema).min(3).max(6),
});

export const Phase5OutputSchema = z.object({
  arcs: z.array(ArcSchema).min(2).max(3),
});

export type BeatTies = z.infer<typeof BeatTiesSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type Arc = z.infer<typeof ArcSchema>;
export type Phase5Output = z.infer<typeof Phase5OutputSchema>;