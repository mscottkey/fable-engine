// Story Builder Service - Manages Phase 1 story generation and regeneration

import { supabase } from "@/integrations/supabase/client";
import { getPromptTemplate } from '@/ai/prompts';
import type { StoryOverview, AIGenerationRequest, AIGenerationResponse } from "@/types/storyOverview";

const STORY_SCHEMA = {
  type: "object",
  properties: {
    expandedSetting: { type: "string" },
    notableLocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" }
        },
        required: ["name", "description"]
      }
    },
    toneManifesto: {
      type: "object",
      properties: {
        vibe: { type: "string" },
        levers: {
          type: "object",
          properties: {
            pace: { type: "string" },
            danger: { type: "string" },
            morality: { type: "string" },
            scale: { type: "string" }
          },
          required: ["pace", "danger", "morality", "scale"]
        },
        expanded: { type: "string" }
      },
      required: ["vibe", "levers", "expanded"]
    },
    storyHooks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["title", "description"]
      }
    },
    coreConflict: { type: "string" },
    sessionZero: {
      type: "object",
      properties: {
        openQuestions: { type: "array", items: { type: "string" } },
        contentAdvisories: { type: "array", items: { type: "string" } },
        calibrationLevers: { type: "array", items: { type: "string" } }
      },
      required: ["openQuestions", "contentAdvisories", "calibrationLevers"]
    }
  },
  required: ["expandedSetting", "notableLocations", "toneManifesto", "storyHooks", "coreConflict", "sessionZero"]
};

export async function generateStoryOverview(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  try {
    const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-story', {
      body: {
        ...request,
        schema: STORY_SCHEMA
      }
    });

    if (functionError) {
      console.error('Story generation error:', functionError);
      return {
        success: false,
        error: functionError.message || 'Failed to generate story'
      };
    }

    return {
      success: true,
      story: functionData.story,
      data: functionData.story,
      tokensUsed: functionData.tokensUsed,
      cost: functionData.cost,
      latency: functionData.latency
    };
  } catch (error) {
    console.error('Story generation service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function regenerateSection(
  seedId: string,
  overview: StoryOverview,
  section: keyof StoryOverview,
  feedback?: string
): Promise<AIGenerationResponse> {
  return generateStoryOverview({
    seedId,
    type: 'regen',
    section,
    feedback
  });
}

export async function remixStoryOverview(
  seedId: string,
  remixBrief: string,
  keepNouns = false
): Promise<AIGenerationResponse> {
  const finalBrief = keepNouns 
    ? `${remixBrief}. Preserve all existing proper nouns.`
    : remixBrief;
    
  return generateStoryOverview({
    seedId,
    type: 'remix',
    remixBrief: finalBrief
  });
}

export async function saveStoryOverview(
  seedId: string,
  overview: StoryOverview,
  name: string
): Promise<{ success: boolean; id?: string; gameId?: string; error?: string }> {
  try {
    // Start a transaction-like approach - create story overview first
    const { data, error } = await supabase
      .from('story_overviews')
      .insert({
        seed_id: seedId,
        name,
        expanded_setting: overview.expandedSetting,
        notable_locations: overview.notableLocations,
        tone_manifesto: overview.toneManifesto,
        story_hooks: overview.storyHooks,
        core_conflict: overview.coreConflict,
        session_zero: overview.sessionZero
      } as any)
      .select('id')
      .single();

    if (error) {
      console.error('Error saving story overview:', error);
      return { success: false, error: error.message };
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Create a game for this approved story
    console.log('Creating game for approved story overview');
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .insert({
        user_id: userData.user.id,
        seed_id: seedId,
        name: name,
        status: 'lobby',
        party_size: 4
      })
      .select()
      .single();

    if (gameError) {
      console.error('Error creating game:', gameError);
      // Clean up the story overview if game creation fails
      await supabase.from('story_overviews').delete().eq('id', data.id);
      return { success: false, error: 'Failed to create game' };
    }

    // Add the user as the host to game members
    console.log('Adding user as host to game:', { gameId: gameData.id, userId: userData.user.id });
    
    const { error: memberError } = await supabase
      .from('game_members')
      .insert({
        game_id: gameData.id,
        user_id: userData.user.id,
        role: 'host'
      });

    if (memberError) {
      console.error('Error adding host to game:', memberError);
      console.error('Failed to add user as host - Game ID:', gameData.id, 'User ID:', userData.user.id);
      
      // Clean up both game and story overview
      await supabase.from('games').delete().eq('id', gameData.id);
      await supabase.from('story_overviews').delete().eq('id', data.id);
      return { success: false, error: `Failed to add host to game: ${memberError.message}` };
    }

    console.log('Successfully added user as host to game');

    // Create initial party slots for the default party size
    const slotsToCreate = Array.from({ length: 4 }, (_, index) => ({
      game_id: gameData.id,
      index_in_party: index,
      status: 'empty'
    }));

    console.log('Creating party slots:', slotsToCreate);
    const { error: slotsError } = await supabase
      .from('party_slots')
      .insert(slotsToCreate);

    if (slotsError) {
      console.error('Error creating party slots:', slotsError);
      
      // Clean up everything if slots creation fails
      await supabase.from('game_members').delete().eq('game_id', gameData.id);
      await supabase.from('games').delete().eq('id', gameData.id);
      await supabase.from('story_overviews').delete().eq('id', data.id);
      return { success: false, error: 'Failed to create party slots' };
    }

    console.log('Successfully created party slots');

    // Only update campaign seed status after everything succeeds
    const { error: seedError } = await supabase
      .from('campaign_seeds')
      .update({ generation_status: 'story_approved' })
      .eq('id', seedId);

    if (seedError) {
      console.error('Error updating campaign seed status:', seedError);
      // This is less critical, so we don't need to rollback everything
    }

    console.log('Successfully completed story approval process');
    return { success: true, id: data.id, gameId: gameData.id };
  } catch (error) {
    console.error('Save story overview error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save story overview' 
    };
  }
}