import { supabase } from '@/integrations/supabase/client';
import { loadGameContext, getSessionEvents } from './gameContextService';
import { generateSessionRecap as generateRecapFlow } from '@/ai/flows/generate-recap';
import { generateOpeningScene as generateOpeningFlow } from '@/ai/flows/generate-opening';

/**
 * Start a new game session
 */
export async function startSession(gameId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get session number
  const { data: sessions, error: countError } = await (supabase as any)
    .from('game_sessions')
    .select('session_number')
    .eq('game_id', gameId)
    .order('session_number', { ascending: false })
    .limit(1);

  if (countError) throw countError;

  const sessionNumber = sessions && sessions.length > 0
    ? sessions[0].session_number + 1
    : 1;

  // Create new session
  const { data, error } = await (supabase as any)
    .from('game_sessions')
    .insert({
      game_id: gameId,
      session_number: sessionNumber,
      status: 'active',
      active_players: [user.id]
    })
    .select()
    .single();

  if (error) throw error;

  // If session 1, create opening narration
  if (sessionNumber === 1) {
    await generateOpeningScene(gameId, data.id);
  }

  return data.id;
}

/**
 * Resume an existing session
 */
export async function resumeSession(gameId: string): Promise<any> {
  // Get active session
  const { data: session, error } = await (supabase as any)
    .from('game_sessions')
    .select('*')
    .eq('game_id', gameId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!session) {
    return null;
  }

  // Generate session recap
  const recap = await generateSessionRecap(session.id);

  return { session, recap };
}

/**
 * Pause current session
 */
export async function pauseSession(sessionId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('game_sessions')
    .update({
      status: 'paused',
      ended_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) throw error;
}

/**
 * End current session
 */
export async function endSession(sessionId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('game_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (error) throw error;
}

/**
 * Generate session recap for returning players
 */
export async function generateSessionRecap(sessionId: string): Promise<string> {
  const events = await getSessionEvents(sessionId);

  if (events.length === 0) {
    return "You're at the start of your adventure. The story awaits!";
  }

  const { data: session } = await (supabase as any)
    .from('game_sessions')
    .select('*, game_id')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error('Session not found');

  // Use edge function for secure recap generation
  const recap = await generateRecapFlow(session.game_id, events.slice(-10));
  return recap;
}

/**
 * Generate opening scene for session 1
 */
async function generateOpeningScene(gameId: string, sessionId: string): Promise<void> {
  const context = await loadGameContext(gameId, 0);

  // Create intro message with story overview
  const storyIntro = `**${context.storyOverview?.name || 'The Adventure Begins'}**

${context.storyOverview?.expanded_setting || 'Your story begins...'}

**The Stakes:** ${context.storyOverview?.core_conflict || 'Unknown dangers await'}

**Your Mission:** ${context.storyOverview?.story_hooks?.[0]?.hook || context.storyOverview?.story_hooks?.[0] || 'Discover what lies ahead'}`;

  // Save story intro
  await (supabase as any)
    .from('narrative_events')
    .insert({
      session_id: sessionId,
      game_id: gameId,
      event_number: 0,
      event_type: 'narration',
      narration: storyIntro
    });

  // Use edge function for secure opening scene generation
  const opening = await generateOpeningFlow(
    gameId,
    context.storyOverview,
    context.characters
  );

  // Save opening scene
  await (supabase as any)
    .from('narrative_events')
    .insert({
      session_id: sessionId,
      game_id: gameId,
      event_number: 1,
      event_type: 'narration',
      narration: opening.narration,
      available_options: opening.options
    });
}
