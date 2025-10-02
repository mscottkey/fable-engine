// Client-side recap generation flow
// Replaces edge function for session recaps

import { callGoogleAI, type AIMessage } from '@/ai/client';
import { getPrompt } from '@/ai/prompts';
import { renderTemplate } from '@/ai/templateRenderer';

/**
 * Client-side session recap generation
 * Creates a narrative summary of the session for players
 */
export async function generateSessionRecap(events: any[]): Promise<string> {
  // Load prompts
  const systemPrompt = getPrompt('gm/generate-recap/system@v1');
  const userTemplate = getPrompt('gm/generate-recap@v1');

  // Render user prompt with events
  const userPrompt = renderTemplate(userTemplate, {
    events
  });

  // Build messages
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Call AI with text response format
  const response = await callGoogleAI(messages, {
    temperature: 0.7,
    maxTokens: 1024,
    responseFormat: 'text'
  });

  return response.content;
}
