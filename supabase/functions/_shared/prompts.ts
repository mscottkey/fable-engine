// Centralized prompt loader for edge functions
// Loads .md and .hbs files from the prompts directory

const PROMPTS_DIR = new URL('.', import.meta.url).pathname + 'prompts';

/**
 * Load a prompt file from the prompts directory
 * @param relativePath Path relative to prompts/ (e.g., 'phase1-story/system.v1.md')
 * @returns Prompt content as string
 */
export async function loadPrompt(relativePath: string): Promise<string> {
  try {
    const fullPath = `${PROMPTS_DIR}/${relativePath}`;
    const content = await Deno.readTextFile(fullPath);
    return content;
  } catch (error) {
    console.error(`Failed to load prompt: ${relativePath}`, error);
    throw new Error(`Prompt file not found: ${relativePath}`);
  }
}

/**
 * Centralized prompt template registry
 * Maps template IDs to file paths
 */
export const PROMPT_REGISTRY: Record<string, string> = {
  // Phase 1 prompts
  'phase1/system@v1': 'phase1-story/system.v1.md',
  'phase1/user@v1': 'phase1-story/user.v1.hbs',
  'phase1/repair@v1': 'phase1-story/repair.v1.md',
  'phase1/regen/expandedSetting@v1': 'phase1-story/regen/expandedSetting.v1.hbs',
  'phase1/regen/notableLocations@v1': 'phase1-story/regen/notableLocations.v1.hbs',
  'phase1/regen/toneManifesto@v1': 'phase1-story/regen/toneManifesto.v1.hbs',
  'phase1/regen/storyHooks@v1': 'phase1-story/regen/storyHooks.v1.hbs',
  'phase1/regen/coreConflict@v1': 'phase1-story/regen/coreConflict.v1.hbs',
  'phase1/regen/sessionZero@v1': 'phase1-story/regen/sessionZero.v1.hbs',
  'phase1/remix/system@v1': 'phase1-story/remix/system.v1.md',
  'phase1/remix/user@v1': 'phase1-story/remix/user.v1.hbs',

  // Phase 2: Character Generation
  'phase2/system@v2': 'phase2-characters/system.v2.md',
  'phase2/user@v2': 'phase2-characters/user.v2.hbs',
  'phase2/repair@v2': 'phase2-characters/repair.v2.md',
  'phase2/regen/pc@v1': 'phase2-characters/regen/pc.v1.hbs',
  'phase2/regen/bonds@v1': 'phase2-characters/regen/bonds.v1.hbs',
  'phase2/remix/system@v2': 'phase2-characters/remix/system.v2.md',
  'phase2/remix/user@v2': 'phase2-characters/remix/user.v2.hbs',

  // Phase 3: Factions & Clocks
  'phase3/system@v1': 'phase3-factions/system.v1.md',
  'phase3/user@v1': 'phase3-factions/user.v1.hbs',
  'phase3/repair@v1': 'phase3-factions/repair.v1.md',
  'phase3/regen/faction@v1': 'phase3-factions/regen/faction.v1.hbs',
  'phase3/regen/clock@v1': 'phase3-factions/regen/clock.v1.hbs',
  'phase3/regen/relations@v1': 'phase3-factions/regen/relations.v1.hbs',
  'phase3/remix/system@v1': 'phase3-factions/remix/system.v1.md',
  'phase3/remix/user@v1': 'phase3-factions/remix/user.v1.hbs',

  // Phase 4: Story Nodes
  'phase4/system@v1': 'phase4-nodes/system.v1.md',
  'phase4/user@v1': 'phase4-nodes/user.v1.hbs',
  'phase4/repair@v1': 'phase4-nodes/repair.v1.md',
  'phase4/regen/node@v1': 'phase4-nodes/regen/node.v1.hbs',
  'phase4/regen/scene@v1': 'phase4-nodes/regen/scene.v1.hbs',
  'phase4/remix/system@v1': 'phase4-nodes/remix/system.v1.md',
  'phase4/remix/user@v1': 'phase4-nodes/remix/user.v1.hbs',

  // Phase 5: Campaign Arcs
  'phase5/system@v1': 'phase5-arcs/system.v1.md',
  'phase5/user@v1': 'phase5-arcs/user.v1.hbs',
  'phase5/repair@v1': 'phase5-arcs/repair.v1.md',
  'phase5/regen/beat@v1': 'phase5-arcs/regen/beat.v1.hbs',
  'phase5/regen/arc@v1': 'phase5-arcs/regen/arc.v1.hbs',
  'phase5/remix/system@v1': 'phase5-arcs/remix/system.v1.md',
  'phase5/remix/user@v1': 'phase5-arcs/remix/user.v1.hbs',

  // Phase 6: Resolutions
  'phase6/system@v1': 'phase6-resolution/system.v1.md',
  'phase6/user@v1': 'phase6-resolution/user.v1.hbs',
  'phase6/repair@v1': 'phase6-resolution/repair.v1.md',
  'phase6/regen/branch@v1': 'phase6-resolution/regen/branch.v1.hbs',
  'phase6/regen/epilogue@v1': 'phase6-resolution/regen/epilogue.v1.hbs',
  'phase6/remix/system@v1': 'phase6-resolution/remix/system.v1.md',
  'phase6/remix/user@v1': 'phase6-resolution/remix/user.v1.hbs',

  // GM Prompts for Game Sessions
  'gm/system@v1': 'gm/system.v1.md',
  'gm/narrate-turn@v1': 'gm/narrate-turn.v1.hbs',
};

/**
 * Get a prompt by template ID
 * @param templateId Template identifier (e.g., 'phase1/system@v1')
 * @returns Prompt content as string
 */
export async function getPrompt(templateId: string): Promise<string> {
  const filePath = PROMPT_REGISTRY[templateId];
  if (!filePath) {
    throw new Error(`Unknown prompt template ID: ${templateId}`);
  }
  return await loadPrompt(filePath);
}
