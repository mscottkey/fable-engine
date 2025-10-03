// File: src/ai/schemas/phase2.ts
import { z } from 'zod';

// Phase 2: Character Generation (FATE Core)

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
  bonds: z.array(BondSchema).min(0), // 0 bonds allowed for solo character
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
