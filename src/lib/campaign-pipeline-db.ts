// File: src/lib/campaign-pipeline-db.ts
// Database operations for Phases 3-6

import { supabase } from '@/integrations/supabase/client';
import type { 
  Phase3Output, 
  Phase4Output, 
  Phase5Output, 
  Phase6Output 
} from '@/ai/schemas';
import type {
  FactionsRecord,
  StoryNodesRecord,
  CampaignArcsRecord,
  ResolutionsRecord,
} from '@/types/phases';

export async function savePhase3Factions(
  gameId: string,
  seedId: string,
  data: Phase3Output,
  metadata: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {

  try {
    const { data: result, error } = await supabase
      .from('factions')
      .insert({
        game_id: gameId,
        seed_id: seedId,
        version: 1,
        factions_json: data.factions,
        relationships: data.relationships,
        fronts: data.fronts || [],
        provider: metadata.provider,
        model: metadata.model,
        input_tokens: metadata.inputTokens,
        output_tokens: metadata.outputTokens,
        cost_usd: metadata.cost,
        status: 'approved',
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error saving Phase 3 factions:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getLatestPhase3Factions(
  gameId: string
): Promise<{ success: boolean; data?: Phase3Output; factionsId?: string; error?: string }> {

  try {
    const { data: result, error } = await supabase
      .from('factions')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        factions: result.factions_json as any,
        relationships: result.relationships as any,
        fronts: result.fronts as string[],
      },
      factionsId: result.id,
    };
  } catch (error) {
    console.error('Error fetching Phase 3 factions:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function savePhase4Nodes(
  gameId: string,
  seedId: string,
  factionsId: string,
  data: Phase4Output,
  metadata: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {

  try {
    const { data: result, error } = await supabase
      .from('story_nodes')
      .insert({
        game_id: gameId,
        seed_id: seedId,
        factions_id: factionsId,
        version: 1,
        nodes_json: data.nodes,
        provider: metadata.provider,
        model: metadata.model,
        input_tokens: metadata.inputTokens,
        output_tokens: metadata.outputTokens,
        cost_usd: metadata.cost,
        status: 'approved',
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error saving Phase 4 nodes:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function savePhase5Arcs(
  gameId: string,
  seedId: string,
  storyNodesId: string,
  data: Phase5Output,
  metadata: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {

  try {
    const { data: result, error } = await supabase
      .from('campaign_arcs')
      .insert({
        game_id: gameId,
        seed_id: seedId,
        story_nodes_id: storyNodesId,
        version: 1,
        arcs_json: data.arcs,
        provider: metadata.provider,
        model: metadata.model,
        input_tokens: metadata.inputTokens,
        output_tokens: metadata.outputTokens,
        cost_usd: metadata.cost,
        status: 'approved',
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error saving Phase 5 arcs:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function savePhase6Resolutions(
  gameId: string,
  seedId: string,
  campaignArcsId: string,
  data: Phase6Output,
  metadata: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {

  try {
    const { data: result, error } = await supabase
      .from('resolutions')
      .insert({
        game_id: gameId,
        seed_id: seedId,
        campaign_arcs_id: campaignArcsId,
        version: 1,
        resolution_paths_json: data.resolutionPaths,
        twist: data.twist || null,
        provider: metadata.provider,
        model: metadata.model,
        input_tokens: metadata.inputTokens,
        output_tokens: metadata.outputTokens,
        cost_usd: metadata.cost,
        status: 'approved',
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error saving Phase 6 resolutions:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper to check if all phases are complete for a game
export async function checkCampaignCompletion(gameId: string): Promise<{
  phase3: boolean;
  phase4: boolean;
  phase5: boolean;
  phase6: boolean;
  allComplete: boolean;
}> {

  const [p3, p4, p5, p6] = await Promise.all([
    supabase.from('factions').select('id').eq('game_id', gameId).eq('status', 'approved').single(),
    supabase.from('story_nodes').select('id').eq('game_id', gameId).eq('status', 'approved').single(),
    supabase.from('campaign_arcs').select('id').eq('game_id', gameId).eq('status', 'approved').single(),
    supabase.from('resolutions').select('id').eq('game_id', gameId).eq('status', 'approved').single(),
  ]);

  const status = {
    phase3: !p3.error && !!p3.data,
    phase4: !p4.error && !!p4.data,
    phase5: !p5.error && !!p5.data,
    phase6: !p6.error && !!p6.data,
    allComplete: false,
  };

  status.allComplete = status.phase3 && status.phase4 && status.phase5 && status.phase6;

  return status;
}


// File: src/lib/ip-sanitizer.ts
// IP safety check utility

const FRANCHISE_PATTERNS = [
  /star\s*wars/i,
  /harry\s*potter/i,
  /lord\s*of\s*the\s*rings/i,
  /dungeons?\s*(?:and|&)\s*dragons?/i,
  /marvel/i,
  /dc\s*comics/i,
  /pokemon/i,
  /game\s*of\s*thrones/i,
  /tolkien/i,
  /middle\s*earth/i,
  /hogwarts/i,
  /jedi/i,
  /sith/i,
  /avengers/i,
  /batman/i,
  /superman/i,
];

export function checkIPSafety(text: string): {
  isSafe: boolean;
  violations: string[];
  suggestions: string[];
} {
  const violations: string[] = [];
  const suggestions: string[] = [];

  const lowerText = text.toLowerCase();

  for (const pattern of FRANCHISE_PATTERNS) {
    const match = lowerText.match(pattern);
    if (match) {
      violations.push(match[0]);
      suggestions.push(`Consider replacing "${match[0]}" with an original concept`);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
    suggestions,
  };
}

export function sanitizeText(text: string): string {
  let sanitized = text;

  // Generic replacements (simple approach)
  const replacements: Record<string, string> = {
    'star wars': 'stellar conflicts',
    'jedi': 'force wielder',
    'sith': 'dark order member',
    'harry potter': 'young wizard',
    'hogwarts': 'academy of magic',
    'middle earth': 'ancient realm',
    'tolkien': 'fantasy world',
  };

  for (const [original, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(original, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }

  return sanitized;
}