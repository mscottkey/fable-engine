// Deno-compatible Zod schemas for all phases
// Ported from src/ai/schemas/

import { z } from 'npm:zod@3.22.4';

// =============================================================================
// Phase 1: Story Overview
// =============================================================================

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

// =============================================================================
// Phase 2: Character Generation (FATE Core)
// =============================================================================

export const FateAspectsSchema = z.object({
  highConcept: z.string(),
  trouble: z.string(),
  aspect3: z.string(),
  aspect4: z.string(),
  aspect5: z.string(),
});

export const FateSkillSchema = z.object({
  name: z.string(),
  rating: z.number().int().min(0).max(4),
});

export const FateStressSchema = z.object({
  physical: z.number().int().min(2).max(4),
  mental: z.number().int().min(2).max(4),
});

export const ConnectionsSchema = z.object({
  locations: z.array(z.string()),
  hooks: z.array(z.string()),
});

export const CharacterSchema = z.object({
  name: z.string(),
  pronouns: z.string(),
  concept: z.string(),
  background: z.string(),
  aspects: FateAspectsSchema,
  skills: z.array(FateSkillSchema).min(10).max(10), // 1+2+3+4 = 10 skills
  stunts: z.array(z.string()).length(3),
  stress: FateStressSchema,
  consequences: z.array(z.string()).length(3), // Mild, Moderate, Severe
  refresh: z.number().int().default(3),
  connections: ConnectionsSchema,
  equipment: z.array(z.string()).optional().default([]),
});

export const BondSchema = z.object({
  character1Index: z.number().int().min(0),
  character2Index: z.number().int().min(0),
  relationship: z.string(),
  description: z.string(),
});

export const CoverageSchema = z.object({
  mechanical: z.array(z.string()),
  social: z.array(z.string()),
  exploration: z.array(z.string()),
  gaps: z.array(z.string()),
}).optional();

export const Phase2OutputSchema = z.object({
  characters: z.array(CharacterSchema),
  bonds: z.array(BondSchema).min(2),
  coverage: CoverageSchema,
});

export type FateAspects = z.infer<typeof FateAspectsSchema>;
export type FateSkill = z.infer<typeof FateSkillSchema>;
export type FateStress = z.infer<typeof FateStressSchema>;
export type Connections = z.infer<typeof ConnectionsSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Bond = z.infer<typeof BondSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type Phase2Output = z.infer<typeof Phase2OutputSchema>;

// FATE Pyramid validation
export function validateFateSkillPyramid(skills: FateSkill[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Count skills by rating
  const ratingCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  skills.forEach(skill => {
    ratingCounts[skill.rating]++;
  });

  // Validate FATE pyramid: 1 at +4, 2 at +3, 3 at +2, 4 at +1
  if (ratingCounts[4] !== 1) {
    errors.push(`FATE pyramid requires exactly 1 skill at +4 (found ${ratingCounts[4]})`);
  }
  if (ratingCounts[3] !== 2) {
    errors.push(`FATE pyramid requires exactly 2 skills at +3 (found ${ratingCounts[3]})`);
  }
  if (ratingCounts[2] !== 3) {
    errors.push(`FATE pyramid requires exactly 3 skills at +2 (found ${ratingCounts[2]})`);
  }
  if (ratingCounts[1] !== 4) {
    errors.push(`FATE pyramid requires exactly 4 skills at +1 (found ${ratingCounts[1]})`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// =============================================================================
// Phase 3: Factions & Clocks
// =============================================================================

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

// =============================================================================
// Phase 4: Story Nodes
// =============================================================================

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

// =============================================================================
// Phase 5: Campaign Arcs & Beats
// =============================================================================

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

// =============================================================================
// Phase 6: Resolution Paths & Epilogues
// =============================================================================

export const ResolutionPathSchema = z.object({
  id: z.string(),
  name: z.string(),
  gates: z.array(z.string()),
  finalSetpieces: z.array(z.string()).min(1).max(3),
  outcomes: z.array(z.string()).min(2).max(5),
  epilogues: z.array(z.string()).min(3).max(8),
});

export const Phase6OutputSchema = z.object({
  resolutionPaths: z.array(ResolutionPathSchema).min(3).max(5),
  twist: z.string().optional(),
});

export type ResolutionPath = z.infer<typeof ResolutionPathSchema>;
export type Phase6Output = z.infer<typeof Phase6OutputSchema>;
