// Prompt Registry - Maps template IDs to content
// Never edit prompts in place - create new versions (v2, v3, etc.)

import systemV1 from './phase1/system.v1.md?raw';
import userV1 from './phase1/user.v1.hbs?raw';
import repairV1 from './phase1/repair.v1.md?raw';

// Regeneration prompts
import regenExpandedSettingV1 from './phase1/regen/expandedSetting.v1.hbs?raw';
import regenNotableLocationsV1 from './phase1/regen/notableLocations.v1.hbs?raw';
import regenToneManifestoV1 from './phase1/regen/toneManifesto.v1.hbs?raw';
import regenStoryHooksV1 from './phase1/regen/storyHooks.v1.hbs?raw';
import regenCoreConflictV1 from './phase1/regen/coreConflict.v1.hbs?raw';
import regenSessionZeroV1 from './phase1/regen/sessionZero.v1.hbs?raw';

// Remix prompts
import remixSystemV1 from './phase1/remix/system.v1.md?raw';
import remixUserV1 from './phase1/remix/user.v1.hbs?raw';

export const PROMPT_REGISTRY: Record<string, string> = {
  // Base prompts
  'phase1/system@v1': systemV1,
  'phase1/user@v1': userV1,
  'phase1/repair@v1': repairV1,
  
  // Regeneration prompts
  'phase1/regen/expandedSetting@v1': regenExpandedSettingV1,
  'phase1/regen/notableLocations@v1': regenNotableLocationsV1,
  'phase1/regen/toneManifesto@v1': regenToneManifestoV1,
  'phase1/regen/storyHooks@v1': regenStoryHooksV1,
  'phase1/regen/coreConflict@v1': regenCoreConflictV1,
  'phase1/regen/sessionZero@v1': regenSessionZeroV1,
  
  // Remix prompts
  'phase1/remix/system@v1': remixSystemV1,
  'phase1/remix/user@v1': remixUserV1,
};

export function getPrompt(templateId: string): string {
  const prompt = PROMPT_REGISTRY[templateId];
  if (!prompt) {
    throw new Error(`Prompt template not found: ${templateId}`);
  }
  return prompt;
}