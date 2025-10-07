// Narrative turn flow
// Calls runtime-narration edge function

import { supabase } from '@/integrations/supabase/client';

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
 * Narrative turn generation via edge function
 * Secure server-side AI processing
 */
export async function generateNarrativeTurn(
  gameId: string,
  context: NarrativeTurnContext,
  playerAction: string,
  characterId: string
): Promise<NarrativeTurnResult> {
  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Call edge function
  const { data, error } = await supabase.functions.invoke('runtime-narration', {
    body: {
      gameId,
      context,
      playerAction,
      characterId
    }
  });

  if (error) {
    console.error('Edge function error:', error);
    console.error('Edge function error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to generate narrative turn: ${error.message}`);
  }

  if (!data) {
    console.error('No data returned from edge function');
    throw new Error('No data returned from edge function');
  }

  if (!data.success) {
    console.error('Edge function returned error:', data);
    throw new Error(data.error || 'Unknown error generating narrative turn');
  }

  return data.data;
}
