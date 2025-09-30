// File: src/ai/schemas/phase6.ts
import { z } from 'zod';

// Phase 6: Resolution Paths & Epilogues

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