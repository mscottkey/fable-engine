import { supabase } from '@/integrations/supabase/client';
import { loadGameContext, getSessionEvents } from './gameContextService';
import { generateSessionRecap as generateRecapFlow } from '@/ai/flows/generate-recap';
import { generateOpeningScene as generateOpeningFlow } from '@/ai/flows/generate-opening';
import { updateSessionTracking } from './narrativeEngine';

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
  } else {
    // For session 2+, generate "Previously on..." recap
    try {
      await generatePreviouslyOn(gameId, data.id);
    } catch (error) {
      console.error('Failed to generate recap, continuing anyway:', error);
      // Don't block session creation if recap fails
    }
  }

  // Update story_state.sessions_played counter
  await updateSessionTracking(gameId);

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
  const hooks = context.storyOverview?.story_hooks || [];
  let missionText = 'Discover what lies ahead';

  if (hooks.length > 0) {
    const firstHook = hooks[0];

    // Handle object format {title, description} from StoryHookSchema
    if (typeof firstHook === 'object' && firstHook !== null) {
      // Standard format from Phase 1 schema
      if (firstHook.description) {
        missionText = firstHook.description;
      } else if (firstHook.title) {
        // Fallback to title if description missing
        missionText = firstHook.title;
      } else if (firstHook.hook) {
        // Legacy format
        missionText = firstHook.hook;
      } else if (firstHook.text) {
        // Alternative legacy format
        missionText = firstHook.text;
      }
    } else if (typeof firstHook === 'string') {
      missionText = firstHook;
    }
  }

  const storyIntro = `**${context.storyOverview?.name || 'The Adventure Begins'}**

${context.storyOverview?.expanded_setting || 'Your story begins...'}

**The Stakes:** ${context.storyOverview?.core_conflict || 'Unknown dangers await'}

**Your Mission:** ${missionText}`;

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

/**
 * Regenerate the initial story overview message for current session
 * Useful if host wants to reset the opening
 */
export async function regenerateStoryIntro(gameId: string, sessionId: string): Promise<void> {
  const context = await loadGameContext(gameId, 0);

  console.log('[DEBUG regenerateStoryIntro] Full storyOverview:', JSON.stringify(context.storyOverview, null, 2));

  // Create intro message with story overview
  const hooks = context.storyOverview?.story_hooks || [];
  let missionText = 'Discover what lies ahead';

  console.log('[DEBUG regenerateStoryIntro] story_hooks raw data:', JSON.stringify(hooks, null, 2));
  console.log('[DEBUG regenerateStoryIntro] hooks.length:', hooks.length);

  if (hooks.length > 0) {
    const firstHook = hooks[0];
    console.log('[DEBUG regenerateStoryIntro] First hook type:', typeof firstHook);
    console.log('[DEBUG regenerateStoryIntro] First hook value:', firstHook);

    // Handle object format {title, description} from StoryHookSchema
    if (typeof firstHook === 'object' && firstHook !== null) {
      // Standard format from Phase 1 schema
      if (firstHook.description) {
        missionText = firstHook.description;
      } else if (firstHook.title) {
        // Fallback to title if description missing
        missionText = firstHook.title;
      } else if (firstHook.hook) {
        // Legacy format
        missionText = firstHook.hook;
      } else if (firstHook.text) {
        // Alternative legacy format
        missionText = firstHook.text;
      } else {
        // Last resort - stringify the object to see what's in it
        console.warn('[WARN regenerateStoryIntro] Unknown hook object structure:', firstHook);
        missionText = JSON.stringify(firstHook);
      }
    } else if (typeof firstHook === 'string') {
      missionText = firstHook;
    }
  }

  console.log('[DEBUG regenerateStoryIntro] Final mission text:', missionText);

  const storyIntro = `**${context.storyOverview?.name || 'The Adventure Begins'}**

${context.storyOverview?.expanded_setting || 'Your story begins...'}

**The Stakes:** ${context.storyOverview?.core_conflict || 'Unknown dangers await'}

**Your Mission:** ${missionText}`;

  // Get next event number
  const { data: events } = await (supabase as any)
    .from('narrative_events')
    .select('event_number')
    .eq('session_id', sessionId)
    .order('event_number', { ascending: false })
    .limit(1);

  const nextEventNumber = events && events.length > 0 ? events[0].event_number + 1 : 0;

  // Save story intro as new event
  await (supabase as any)
    .from('narrative_events')
    .insert({
      session_id: sessionId,
      game_id: gameId,
      event_number: nextEventNumber,
      event_type: 'narration',
      narration: storyIntro
    });
}

/**
 * Generate "Previously on..." recap for current session
 * Summarizes events from previous session(s)
 */
export async function generatePreviouslyOn(gameId: string, sessionId: string): Promise<void> {
  // Get current session number
  const { data: currentSession } = await (supabase as any)
    .from('game_sessions')
    .select('session_number')
    .eq('id', sessionId)
    .single();

  if (!currentSession) throw new Error('Session not found');

  // If this is session 1, no recap needed
  if (currentSession.session_number === 1) {
    throw new Error('Cannot generate recap for first session');
  }

  // Get events from previous session
  const { data: previousSession } = await (supabase as any)
    .from('game_sessions')
    .select('id')
    .eq('game_id', gameId)
    .eq('session_number', currentSession.session_number - 1)
    .single();

  if (!previousSession) {
    throw new Error('Previous session not found');
  }

  const previousEvents = await getSessionEvents(previousSession.id);

  if (previousEvents.length === 0) {
    throw new Error('No events found in previous session');
  }

  // Generate recap using AI
  const recap = await generateRecapFlow(gameId, previousEvents);

  // Get next event number for current session
  const { data: events } = await (supabase as any)
    .from('narrative_events')
    .select('event_number')
    .eq('session_id', sessionId)
    .order('event_number', { ascending: false })
    .limit(1);

  const nextEventNumber = events && events.length > 0 ? events[0].event_number + 1 : 0;

  // Save recap as narrative event
  const recapMessage = `**Previously on...**

${recap}

---

**Session ${currentSession.session_number} begins...**`;

  await (supabase as any)
    .from('narrative_events')
    .insert({
      session_id: sessionId,
      game_id: gameId,
      event_number: nextEventNumber,
      event_type: 'narration',
      narration: recapMessage
    });
}
