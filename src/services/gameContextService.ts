import { supabase } from '@/integrations/supabase/client';

export interface GameContext {
  game: any;
  storyOverview: any;
  characters: any[];
  storyState: any;
  recentEvents: any[];
  currentSession: any;
}

/**
 * Load complete game context for AI narration
 * Fetches last N events and current story state
 */
export async function loadGameContext(
  gameId: string,
  eventLimit: number = 20
): Promise<GameContext> {
  try {
    // Fetch game data
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;

    // Fetch story overview
    const { data: storyOverview, error: storyError } = await supabase
      .from('story_overviews')
      .select('*')
      .eq('seed_id', game.seed_id)
      .single();

    if (storyError) throw storyError;

    // Fetch characters
    const { data: characters, error: charactersError } = await supabase
      .from('characters')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'approved');

    if (charactersError) throw charactersError;

    // Fetch story state
    const { data: storyState, error: stateError } = await (supabase as any)
      .from('story_state')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (stateError) throw stateError;

    // Fetch recent narrative events
    const { data: recentEvents, error: eventsError } = await (supabase as any)
      .from('narrative_events')
      .select('*')
      .eq('game_id', gameId)
      .order('timestamp', { ascending: false })
      .limit(eventLimit);

    if (eventsError) throw eventsError;

    // Fetch current session
    const { data: currentSession, error: sessionError } = await (supabase as any)
      .from('game_sessions')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      game,
      storyOverview,
      characters: characters || [],
      storyState,
      recentEvents: (recentEvents || []).reverse(), // Chronological order
      currentSession
    };
  } catch (error) {
    console.error('Failed to load game context:', error);
    throw error;
  }
}

/**
 * Get the most recent event for a game
 */
export async function getLastEvent(gameId: string) {
  const { data, error } = await (supabase as any)
    .from('narrative_events')
    .select('*')
    .eq('game_id', gameId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get all events for a specific session
 */
export async function getSessionEvents(sessionId: string) {
  const { data, error } = await (supabase as any)
    .from('narrative_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('event_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Load the current story beat from campaign structure
 * Returns the beat definition based on current_beat_id in story_state
 */
export async function loadCurrentBeat(gameId: string) {
  try {
    // Get story state
    const { data: storyState, error: stateError } = await (supabase as any)
      .from('story_state')
      .select('current_beat_id, current_act_number')
      .eq('game_id', gameId)
      .single();

    if (stateError) throw stateError;

    if (!storyState?.current_beat_id) {
      return null;
    }

    // Get game and seed to access campaign structure
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('seed_id')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;

    // Get story overview with campaign structure
    const { data: storyOverview, error: overviewError } = await supabase
      .from('story_overviews')
      .select('campaign_structure')
      .eq('seed_id', game.seed_id)
      .single();

    if (overviewError) throw overviewError;

    // Extract current beat from campaign structure
    const campaignStructure = storyOverview?.campaign_structure;
    if (!campaignStructure?.acts) {
      return null;
    }

    const currentAct = campaignStructure.acts.find(
      (act: any) => act.actNumber === storyState.current_act_number
    );

    if (!currentAct?.beats) {
      return null;
    }

    const currentBeat = currentAct.beats.find(
      (beat: any) => beat.beatId === storyState.current_beat_id
    );

    return currentBeat || null;
  } catch (error) {
    console.error('Failed to load current beat:', error);
    throw error;
  }
}
