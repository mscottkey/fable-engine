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
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
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

    return { success: true, id: data.id };
  } catch (error) {
    console.error('Save story overview error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save story overview' 
    };
  }
}