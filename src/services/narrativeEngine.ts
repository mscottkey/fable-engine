import { supabase } from '@/integrations/supabase/client';
import { loadGameContext, loadCurrentBeat } from './gameContextService';
import { generateNarrativeTurn, type NarrativeTurnContext } from '@/ai/flows/narrate-turn';

export interface NarrativeTurn {
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
}

/**
 * Core narrative turn - handles player action and generates AI response
 */
export async function narrateTurn(
  gameId: string,
  sessionId: string,
  playerAction: string,
  characterId: string
): Promise<NarrativeTurn> {
  try {
    // Load full game context
    const context = await loadGameContext(gameId);

    // Load current beat for campaign structure
    const currentBeat = await loadCurrentBeat(gameId);

    // Get last event for continuity
    const lastEvent = context.recentEvents[context.recentEvents.length - 1];

    // Get campaign structure for beat awareness
    // TODO: campaign_structure doesn't exist on story_overviews table yet
    // Skip this query for now to avoid 400 errors
    let campaignStructure = null;

    // Call edge function for secure server-side processing
    const narrativeContext: NarrativeTurnContext = {
      storyOverview: context.storyOverview,
      storyState: context.storyState,
      characters: context.characters,
      recentEvents: context.recentEvents,
      lastEvent,
      currentBeat,
      campaignStructure
    };

    const narrative = await generateNarrativeTurn(gameId, narrativeContext, playerAction, characterId);

    // Check for beat completion
    if (currentBeat && narrative.beatProgress) {
      if (narrative.beatProgress.keyInfoRevealed) {
        for (const info of narrative.beatProgress.keyInfoRevealed) {
          await trackKeyInformationRevealed(gameId, info);
        }
      }

      if (narrative.beatProgress.beatComplete) {
        await checkActTransition(gameId, currentBeat.beatId);
      }
    }

    // Save narrative event
    const eventNumber = context.recentEvents.length;

    await (supabase as any)
      .from('narrative_events')
      .insert({
        session_id: sessionId,
        game_id: gameId,
        event_number: eventNumber,
        event_type: 'player_action',
        player_action: playerAction,
        character_id: characterId,
        narration: narrative.narration,
        decision_prompt: narrative.decisionPoint.prompt,
        available_options: narrative.decisionPoint.options,
        consequences: narrative.consequences,
        world_changes: narrative.stateChanges,
        dice_rolls: narrative.diceRolls,
        gm_notes: narrative.gmNotes
      });

    // Update story state
    await updateStoryState(gameId, narrative.stateChanges);

    return narrative;
  } catch (error) {
    console.error('Narrative turn failed:', error);
    throw error;
  }
}

/**
 * Update persistent story state based on narrative consequences
 */
async function updateStoryState(
  gameId: string,
  stateChanges: NarrativeTurn['stateChanges']
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data: currentState, error: fetchError } = await (supabase as any)
    .from('story_state')
    .select('*')
    .eq('game_id', gameId)
    .single();

  if (fetchError) throw fetchError;

  const updates: any = {
    last_updated: new Date().toISOString(),
    updated_by: user.id
  };

  if (stateChanges.worldFacts) {
    updates.world_facts = {
      ...(currentState.world_facts as any || {}),
      ...stateChanges.worldFacts
    };
  }

  if (stateChanges.locationStates) {
    updates.location_states = {
      ...(currentState.location_states as any || {}),
      ...stateChanges.locationStates
    };
  }

  if (stateChanges.npcStates) {
    updates.npc_states = {
      ...(currentState.npc_states as any || {}),
      ...stateChanges.npcStates
    };
  }

  if (stateChanges.characterRelationships) {
    updates.character_relationships = {
      ...(currentState.character_relationships as any || {}),
      ...stateChanges.characterRelationships
    };
  }

  const { error: updateError } = await (supabase as any)
    .from('story_state')
    .update(updates)
    .eq('game_id', gameId);

  if (updateError) throw updateError;
}

/**
 * Handle player decision selection
 */
export async function recordPlayerDecision(
  eventId: string,
  optionIndex: number
): Promise<void> {
  const { error } = await (supabase as any)
    .from('narrative_events')
    .update({ chosen_option: optionIndex })
    .eq('id', eventId);

  if (error) throw error;
}

/**
 * Track key information revealed to players
 * Updates story_state.key_info_revealed array
 */
export async function trackKeyInformationRevealed(
  gameId: string,
  infoKey: string
): Promise<void> {
  const { data: currentState, error: fetchError } = await (supabase as any)
    .from('story_state')
    .select('key_info_revealed')
    .eq('game_id', gameId)
    .single();

  if (fetchError) throw fetchError;

  const revealed = currentState?.key_info_revealed || [];
  if (!revealed.includes(infoKey)) {
    revealed.push(infoKey);

    const { error: updateError } = await (supabase as any)
      .from('story_state')
      .update({ key_info_revealed: revealed })
      .eq('game_id', gameId);

    if (updateError) throw updateError;
  }
}

/**
 * Check if current beat is completed
 * Returns true if beat completion conditions are met
 */
export async function checkBeatCompletion(
  gameId: string,
  currentBeat: any
): Promise<boolean> {
  if (!currentBeat?.completionConditions) return false;

  const { data: storyState } = await (supabase as any)
    .from('story_state')
    .select('key_info_revealed, world_facts, npc_states')
    .eq('game_id', gameId)
    .single();

  if (!storyState) return false;

  const revealed = storyState.key_info_revealed || [];
  const requiredInfo = currentBeat.completionConditions.requiredInfo || [];

  // Check if all required info has been revealed
  return requiredInfo.every((info: string) => revealed.includes(info));
}

/**
 * Mark beat as completed and check for act transition
 */
export async function checkActTransition(
  gameId: string,
  completedBeatId: string
): Promise<{ actComplete: boolean; newActNumber?: number }> {
  const { data: currentState, error: fetchError } = await (supabase as any)
    .from('story_state')
    .select('current_act_number, act_beats_completed')
    .eq('game_id', gameId)
    .single();

  if (fetchError) throw fetchError;

  const beatsCompleted = currentState?.act_beats_completed || [];
  if (!beatsCompleted.includes(completedBeatId)) {
    beatsCompleted.push(completedBeatId);

    await (supabase as any)
      .from('story_state')
      .update({ act_beats_completed: beatsCompleted })
      .eq('game_id', gameId);
  }

  // Load campaign structure to check if act is complete
  // TODO: campaign_structure doesn't exist on story_overviews table yet
  // For now, skip this check
  const acts: any[] = [];
  const currentAct = acts.find((a: any) => a.actNumber === currentState.current_act_number);

  if (!currentAct) return { actComplete: false };

  const totalBeatsInAct = currentAct.beats?.length || 0;
  const actComplete = beatsCompleted.length >= totalBeatsInAct;

  if (actComplete && currentState.current_act_number < 3) {
    const newActNumber = currentState.current_act_number + 1;
    await (supabase as any)
      .from('story_state')
      .update({
        current_act_number: newActNumber,
        act_beats_completed: [],
        act_progress: 'early'
      })
      .eq('game_id', gameId);

    return { actComplete: true, newActNumber };
  }

  return { actComplete, newActNumber: undefined };
}

/**
 * Update session tracking counters
 */
export async function updateSessionTracking(gameId: string): Promise<void> {
  const { data: currentState } = await (supabase as any)
    .from('story_state')
    .select('sessions_played')
    .eq('game_id', gameId)
    .single();

  const sessionsPlayed = (currentState?.sessions_played || 0) + 1;

  await (supabase as any)
    .from('story_state')
    .update({ sessions_played: sessionsPlayed })
    .eq('game_id', gameId);
}
