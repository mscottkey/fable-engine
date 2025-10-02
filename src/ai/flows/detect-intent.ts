// Client-side intent detection flow
// Replaces edge function for real-time player action classification

import { callGoogleAI, type AIMessage } from '@/ai/client';
import { getPrompt } from '@/ai/prompts';
import { renderTemplate } from '@/ai/templateRenderer';

export interface IntentDetectionResult {
  classification: 'on-track' | 'tangent' | 'divergent';
  confidence: number;
  reasoning: string;
  alternativeAction?: string;
}

export interface IntentClassification {
  isOnTrack: boolean;
  confidence: number;
  intendedBeat: string | null;
  divergenceReason?: string;
  alternativeAction?: string;
}

/**
 * Client-side intent detection
 * Classifies player actions for off-rails warnings
 */
export async function detectPlayerIntent(
  playerAction: string,
  currentBeat: any,
  recentEvents: any[]
): Promise<IntentClassification> {
  // Load prompts
  const systemPrompt = getPrompt('gm/detect-intent/system@v1');
  const userTemplate = getPrompt('gm/detect-intent@v1');

  // Render user prompt with context
  const userPrompt = renderTemplate(userTemplate, {
    currentBeat,
    recentEvents: recentEvents.slice(-3),
    playerAction
  });

  // Build messages
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    // Call AI with JSON response format
    const response = await callGoogleAI(messages, {
      temperature: 0.7,
      maxTokens: 500,
      responseFormat: 'json'
    });

    // Parse response
    const result: IntentDetectionResult = JSON.parse(response.content);

    // Convert to IntentClassification format
    const isOnTrack = result.classification === 'on-track';

    return {
      isOnTrack,
      confidence: result.confidence,
      intendedBeat: currentBeat?.beatId || null,
      divergenceReason: result.classification === 'divergent' ? result.reasoning : undefined,
      alternativeAction: result.alternativeAction
    };

  } catch (error) {
    console.error('Intent detection failed:', error);

    // Default to allowing action if detection fails
    return {
      isOnTrack: true,
      confidence: 50,
      intendedBeat: currentBeat?.beatId || null
    };
  }
}
