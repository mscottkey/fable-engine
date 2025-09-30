// File: src/ai/schemas/phase4.ts
import { z } from 'zod';

// Phase 4: Story Nodes

export const ObstacleSchema = z.object({
  type: z.string(),
  detail: z.string(),
  consequence: z.string(),
});

export const StoryNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum([
    'social',
    'investigation',
    'heist',
    'wilderness',
    'dungeon',
    'downtime',
    'mystic',
    'setpiece'
  ]),
  summary: z.string(),
  factionIds: z.array(z.string()),
  locationRef: z.string().optional(),
  stakes: z.array(z.string()).min(2).max(5),
  obstacles: z.array(ObstacleSchema).min(2).max(4),
  clues: z.array(z.string()).min(1).max(4),
  leads: z.array(z.string()).min(1).max(4),
  entry: z.boolean(),
  setpiece: z.boolean(),
});

export const Phase4OutputSchema = z.object({
  nodes: z.array(StoryNodeSchema).min(6).max(9),
});

export const MicroSceneSchema = z.object({
  microScene: z.object({
    gmNotes: z.string(),
    boxedText: z.string().optional(),
  }),
});

export type Obstacle = z.infer<typeof ObstacleSchema>;
export type StoryNode = z.infer<typeof StoryNodeSchema>;
export type Phase4Output = z.infer<typeof Phase4OutputSchema>;
export type MicroScene = z.infer<typeof MicroSceneSchema>;