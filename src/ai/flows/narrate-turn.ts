// Client-side narrative turn flow
// Replaces edge function for real-time gameplay responses

import { callGoogleAI, type AIMessage } from '@/ai/client';
import { getPrompt } from '@/ai/prompts';
import { renderTemplate } from '@/ai/templateRenderer';

export interface NarrativeTurnContext {
  storyOverview: any;
  storyState: any;
  characters: any[];
  recentEvents: any[];
  lastEvent?: any;
  currentBeat?: any;
  campaignStructure?: any;
}

export interface NarrativeTurnResult {
  narration: string;
  consequences: string[];
  decisionPoint: {
    prompt: string;
    options: Array<{
      label: string;
      description: string;
      estimatedConsequences: string[];
    }>;
  };
  stateChanges: {
    worldFacts?: Record<string, any>;
    locationStates?: Record<string, any>;
    npcStates?: Record<string, any>;
    characterRelationships?: Record<string, any>;
  };
  diceRolls?: Array<{
    character: string;
    skill: string;
    result: number;
    outcome: string;
  }>;
  gmNotes: string;
  beatProgress?: {
    keyInfoRevealed?: string[];
    beatComplete?: boolean;
  };
}

/**
 * Client-side narrative turn generation
 * Calls Google AI directly for instant response (no edge function cold start)
 */
export async function generateNarrativeTurn(
  context: NarrativeTurnContext,
  playerAction: string,
  characterId: string
): Promise<NarrativeTurnResult> {
  // Find character name
  const character = context.characters.find(c => c.id === characterId);
  const characterName = character?.pc_json?.name || 'Unknown';

  // Load prompts
  const systemPrompt = getPrompt('gm/narrate-turn/system@v1');
  const userTemplate = getPrompt('gm/narrate-turn@v1');

  // Render user prompt with context
  const userPrompt = renderTemplate(userTemplate, {
    context,
    characterName,
    playerAction
  });

  // Build messages
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Call AI with JSON response format
  const response = await callGoogleAI(messages, {
    temperature: 0.7,
    maxTokens: 2048,
    responseFormat: 'json'
  });

  // Parse and validate response
  let result: NarrativeTurnResult;
  try {
    result = JSON.parse(response.content);
  } catch (error) {
    console.error('Failed to parse narrative turn JSON:', error);
    console.error('Raw response:', response.content);
    throw new Error('AI returned invalid JSON for narrative turn');
  }

  // Validate required fields
  if (!result.narration || !result.decisionPoint || !result.stateChanges) {
    throw new Error('AI response missing required fields');
  }

  return result;
}
