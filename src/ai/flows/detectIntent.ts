// File: src/ai/flows/detectIntent.ts
// Intent Detection Flow - Classifies player actions for off-rails warnings

import { supabase } from '@/integrations/supabase/client';

export interface IntentClassification {
  isOnTrack: boolean;
  confidence: number;
  intendedBeat: string | null;
  divergenceReason?: string;
  alternativeAction?: string;
}

/**
 * Detect if player action aligns with current beat or diverges from campaign
 * Uses AI to classify intent and provide warnings for off-rails actions
 */
export async function detectPlayerIntent(
  gameId: string,
  playerAction: string,
  currentBeat: any,
  recentEvents: any[]
): Promise<IntentClassification> {
  try {
    const systemPrompt = `You are a campaign analyzer for a tabletop RPG. Analyze player actions to determine if they align with the current story beat or diverge from the campaign plan.

Classification Rules:
- "on-track": Action directly advances the current beat's objectives
- "tangent": Action is related but doesn't advance beat (e.g., shopping, side conversations)
- "divergent": Action completely ignores beat and goes in different direction

Return JSON: {
  "classification": "on-track" | "tangent" | "divergent",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "alternativeAction": "suggestion if divergent"
}`;

    const userPrompt = `# Current Beat
**Title**: ${currentBeat?.title || 'Unknown'}
**Description**: ${currentBeat?.description || 'No beat active'}
**Objectives**: ${currentBeat?.objectives?.join(', ') || 'None'}
**Key Info to Reveal**: ${currentBeat?.completionConditions?.requiredInfo?.join(', ') || 'None'}

# Recent Context
${recentEvents.slice(-3).map((e: any) => `- ${e.narration}`).join('\n')}

# Player Action
${playerAction}

Classify this action's intent.`;

    const { data, error } = await supabase.functions.invoke('classify-intent', {
      body: { systemPrompt, userPrompt }
    });

    if (error) throw error;

    const result = data;
    const isOnTrack = result.classification === 'on-track';
    const confidence = result.confidence;

    return {
      isOnTrack,
      confidence,
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

/**
 * Log player divergence for campaign adaptation
 */
export async function logPlayerDivergence(
  gameId: string,
  divergence: {
    beatId: string;
    playerAction: string;
    reason: string;
    timestamp: string;
  }
): Promise<void> {
  const { data: currentState } = await (supabase as any)
    .from('story_state')
    .select('divergence_log')
    .eq('game_id', gameId)
    .single();

  const log = currentState?.divergence_log || [];
  log.push(divergence);

  await (supabase as any)
    .from('story_state')
    .update({ divergence_log: log })
    .eq('game_id', gameId);
}
