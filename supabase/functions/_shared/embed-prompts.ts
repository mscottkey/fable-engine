// This file embeds all prompts as strings for edge function deployment
// Generated automatically - do not edit manually

import { PROMPT_REGISTRY } from './prompts.ts';

// Read prompt files at build/deploy time and embed them
const EMBEDDED_PROMPTS: Record<string, string> = {};

/**
 * Get an embedded prompt by template ID
 * This is used in production when files aren't available
 */
export async function getEmbeddedPrompt(templateId: string): Promise<string> {
  const content = EMBEDDED_PROMPTS[templateId];
  if (!content) {
    throw new Error(`Embedded prompt not found: ${templateId}`);
  }
  return content;
}

/**
 * Alternative: Load prompts from a remote source (e.g., Supabase Storage)
 * For now, we'll use the simpler approach of reading from the filesystem
 * since Supabase edge functions support importing local files
 */
