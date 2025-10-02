// Opening scene generation flow
// Calls runtime-opening edge function

import { supabase } from '@/integrations/supabase/client';

export interface OpeningScene {
  narration: string;
  options: Array<{
    label: string;
    description: string;
  }>;
}

/**
 * Opening scene generation via edge function
 * Creates the first narrative scene for a new campaign
 */
export async function generateOpeningScene(
  gameId: string,
  storyOverview: any,
  characters: any[]
): Promise<OpeningScene> {
  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Call edge function
  const { data, error } = await supabase.functions.invoke('runtime-opening', {
    body: {
      gameId,
      storyOverview,
      characters
    }
  });

  if (error) {
    console.error('Edge function error:', error);
    throw new Error(`Failed to generate opening scene: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Unknown error generating opening scene');
  }

  return data.data;
}
