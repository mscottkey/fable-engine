// Client-side opening scene generation flow
// Replaces edge function for session 1 opening

import { callGoogleAI, type AIMessage } from '@/ai/client';
import { getPrompt } from '@/ai/prompts';
import { renderTemplate } from '@/ai/templateRenderer';

export interface OpeningScene {
  narration: string;
  options: Array<{
    label: string;
    description: string;
  }>;
}

/**
 * Client-side opening scene generation
 * Creates the first narrative scene for a new campaign
 */
export async function generateOpeningScene(
  storyOverview: any,
  characters: any[]
): Promise<OpeningScene> {
  // Load prompts
  const systemPrompt = getPrompt('gm/generate-opening/system@v1');
  const userTemplate = getPrompt('gm/generate-opening@v1');

  // Render user prompt with context
  const userPrompt = renderTemplate(userTemplate, {
    storyOverview,
    characters
  });

  // Build messages
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Call AI with JSON response format
  const response = await callGoogleAI(messages, {
    temperature: 0.8,
    maxTokens: 1024,
    responseFormat: 'json'
  });

  // Parse and validate response
  let result: OpeningScene;
  try {
    result = JSON.parse(response.content);
  } catch (error) {
    console.error('Failed to parse opening scene JSON:', error);
    console.error('Raw response:', response.content);
    throw new Error('AI returned invalid JSON for opening scene');
  }

  // Validate required fields
  if (!result.narration || !result.options) {
    throw new Error('AI response missing required fields');
  }

  return result;
}
