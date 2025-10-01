// File: src/ai/schemas/phase3.ts
import { z } from 'zod';

// Phase 3: Factions & Clocks

export const LeaderSchema = z.object({
  name: z.string(),
  pronouns: z.string(),
  profile: z.string(),
  tells: z.array(z.string()).min(1).max(3),
});

export const ProjectClockSchema = z.object({
  name: z.string(),
  clockSize: z.enum(['4', '6', '8']).transform(Number),
  filled: z.number().int().min(0),
  impact: z.string(),
  triggers: z.array(z.string()).min(2).max(6),
});

export const FactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  oneLine: z.string(),
  goal: z.string(),
  methods: z.string(),
  assets: z.array(z.string()).min(2).max(6),
  leader: LeaderSchema,
  heatWithPCs: z.string(),
  projects: z.array(ProjectClockSchema).min(1).max(3),
  secrets: z.array(z.string()).min(1).max(3),
  tags: z.array(z.string()).min(2).max(5),
});

export const RelationshipSchema = z.object({
  a: z.string(),
  b: z.string(),
  type: z.string(),
  why: z.string(),
});

export const Phase3OutputSchema = z.object({
  factions: z.array(FactionSchema).min(3).max(5),
  relationships: z.array(RelationshipSchema),
  fronts: z.array(z.string()).optional().default([]),
});

export type Leader = z.infer<typeof LeaderSchema>;
export type ProjectClock = z.infer<typeof ProjectClockSchema>;
export type Faction = z.infer<typeof FactionSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type Phase3Output = z.infer<typeof Phase3OutputSchema>;