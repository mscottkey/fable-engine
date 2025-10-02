// Session recap generation flow
// Calls runtime-recap edge function

import { supabase } from '@/integrations/supabase/client';

/**
 * Session recap generation via edge function
 * Creates a narrative summary of the session for players
 */
export async function generateSessionRecap(gameId: string, events: any[]): Promise<string> {
  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Call edge function
  const { data, error } = await supabase.functions.invoke('runtime-recap', {
    body: {
      gameId,
      events
    }
  });

  if (error) {
    console.error('Edge function error:', error);
    throw new Error(`Failed to generate recap: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Unknown error generating recap');
  }

  return data.data;
}
