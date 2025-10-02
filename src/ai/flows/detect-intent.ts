// Intent detection flow
// Calls runtime-intent edge function

import { supabase } from '@/integrations/supabase/client';

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
 * Intent detection via edge function
 * Classifies player actions for off-rails warnings
 */
export async function detectPlayerIntent(
  gameId: string,
  playerAction: string,
  currentBeat: any,
  recentEvents: any[]
): Promise<IntentClassification> {
  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  try {
    // Call edge function
    const { data, error } = await supabase.functions.invoke('runtime-intent', {
      body: {
        gameId,
        playerAction,
        currentBeat,
        recentEvents
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error detecting intent');
    }

    return data.data;

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
