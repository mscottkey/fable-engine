// Prompt registry for version management and governance
// Prompts are stored in separate files to enable versioning and prevent inline embedding

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
};

// Template loading would be implemented here in a production system
// For now, prompts are managed as separate files in the prompts directory
export function getPromptTemplate(templateId: string): string {
  return PROMPT_TEMPLATES[templateId] || '';
}

export function listPromptTemplates(): string[] {
  return Object.keys(PROMPT_TEMPLATES);
}