// File: src/ai/prompts/index.ts
// Centralized prompt registry mapping prompt_template_id -> string content

import { readFileSync } from 'fs';
import { join } from 'path';

const PROMPTS_DIR = join(__dirname);

// Helper to load prompt file
function loadPrompt(relativePath: string): string {
  try {
    return readFileSync(join(PROMPTS_DIR, relativePath), 'utf-8');
  } catch (error) {
    console.error(`Failed to load prompt: ${relativePath}`, error);
    throw new Error(`Prompt file not found: ${relativePath}`);
  }
}

export const PROMPT_TEMPLATES: Record<string, string> = {
  // Phase 1 prompts
  'phase1/system@v1': '',
  'phase1/user@v1': '',
  'phase1/repair@v1': '',
  
  // Phase 1 regeneration prompts
  'phase1/regen/expandedSetting@v1': '',
  'phase1/regen/notableLocations@v1': '',
  'phase1/regen/toneManifesto@v1': '',
  'phase1/regen/storyHooks@v1': '',
  'phase1/regen/coreConflict@v1': '',
  'phase1/regen/sessionZero@v1': '',
  
  // Phase 1 remix prompts
  'phase1/remix/system@v1': '',
  'phase1/remix/user@v1': '',
  
   // Phase 3: Factions & Clocks
  'phase3/system@v1': loadPrompt('phase3-factions/system.v1.md'),
  'phase3/user@v1': loadPrompt('phase3-factions/user.v1.hbs'),
  'phase3/repair@v1': loadPrompt('phase3-factions/repair.v1.md'),
  'phase3/regen/faction@v1': loadPrompt('phase3-factions/regen/faction.v1.hbs'),
  'phase3/regen/clock@v1': loadPrompt('phase3-factions/regen/clock.v1.hbs'),
  'phase3/regen/relations@v1': loadPrompt('phase3-factions/regen/relations.v1.hbs'),
  'phase3/remix/system@v1': loadPrompt('phase3-factions/remix/system.v1.md'),
  'phase3/remix/user@v1': loadPrompt('phase3-factions/remix/user.v1.hbs'),

  // Phase 4: Story Nodes
  'phase4/system@v1': loadPrompt('phase4-nodes/system.v1.md'),
  'phase4/user@v1': loadPrompt('phase4-nodes/user.v1.hbs'),
  'phase4/repair@v1': loadPrompt('phase4-nodes/repair.v1.md'),
  'phase4/regen/node@v1': loadPrompt('phase4-nodes/regen/node.v1.hbs'),
  'phase4/regen/scene@v1': loadPrompt('phase4-nodes/regen/scene.v1.hbs'),
  'phase4/remix/system@v1': loadPrompt('phase4-nodes/remix/system.v1.md'),
  'phase4/remix/user@v1': loadPrompt('phase4-nodes/remix/user.v1.hbs'),

  // Phase 5: Campaign Arcs
  'phase5/system@v1': loadPrompt('phase5-arcs/system.v1.md'),
  'phase5/user@v1': loadPrompt('phase5-arcs/user.v1.hbs'),
  'phase5/repair@v1': loadPrompt('phase5-arcs/repair.v1.md'),
  'phase5/regen/beat@v1': loadPrompt('phase5-arcs/regen/beat.v1.hbs'),
  'phase5/regen/arc@v1': loadPrompt('phase5-arcs/regen/arc.v1.hbs'),
  'phase5/remix/system@v1': loadPrompt('phase5-arcs/remix/system.v1.md'),
  'phase5/remix/user@v1': loadPrompt('phase5-arcs/remix/user.v1.hbs'),

  // Phase 6: Resolutions
  'phase6/system@v1': loadPrompt('phase6-resolution/system.v1.md'),
  'phase6/user@v1': loadPrompt('phase6-resolution/user.v1.hbs'),
  'phase6/repair@v1': loadPrompt('phase6-resolution/repair.v1.md'),
  'phase6/regen/branch@v1': loadPrompt('phase6-resolution/regen/branch.v1.hbs'),
  'phase6/regen/epilogue@v1': loadPrompt('phase6-resolution/regen/epilogue.v1.hbs'),
  'phase6/remix/system@v1': loadPrompt('phase6-resolution/remix/system.v1.md'),
  'phase6/remix/user@v1': loadPrompt('phase6-resolution/remix/user.v1.hbs'),
};

// Template loading would be implemented here in a production system
// For now, prompts are managed as separate files in the prompts directory
export function listPromptTemplates(): string[] {
  return Object.keys(PROMPT_TEMPLATES);
}

// Type-safe access to prompts
export function getPromptTemplate(templateId: string): string {
  const prompt = PROMPT_TEMPLATES[templateId];
  if (!prompt) {
    throw new Error(`Unknown prompt template ID: ${templateId}`);
  }
  return prompt;
}

// Extract version from template ID (e.g., "phase3/system@v1" -> "v1")
export function getPromptVersion(templateId: string): string {
  const match = templateId.match(/@v(\d+)$/);
  return match ? `v${match[1]}` : 'v1';
}

// Get schema version for a phase (used in logging)
export function getSchemaVersion(phase: string): string {
  const phaseNum = phase.match(/phase(\d+)/)?.[1];
  return phaseNum ? `phase${phaseNum}@v1` : 'unknown';
}