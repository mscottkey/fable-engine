import { supabase } from '@/integrations/supabase/client';

export interface CharacterSeed {
  index: number;
  mode: 'respect' | 'suggest' | 'decide';
  displayName?: string;
  pronouns?: string;
  archetypePrefs?: string[];
  roleTagsInterest?: string[];
  toneComfort?: Record<string, number>;
  violenceComfort?: string;
  complexity?: string;
  mechanicsComfort?: string;
  concept?: string;
  mustHave?: string[];
  noThanks?: string[];
  keepName?: boolean;
}

export interface Character {
  name: string;
  pronouns: string;
  concept: string;
  background: string;
  mechanicalRole: string;
  socialRole: string;
  explorationRole: string;
  primaryArchetype: string;
  secondaryArchetype?: string;
  personalityTraits: string[];
  motivations: string[];
  flaws: string[];
  connections: {
    locations: string[];
    hooks: string[];
  };
  equipment: string[];
  abilities: string[];
}

export interface CharacterLineup {
  characters: Character[];
  bonds: Array<{
    character1Index: number;
    character2Index: number;
    relationship: string;
    description: string;
  }>;
  coverage: {
    mechanical: string[];
    social: string[];
    exploration: string[];
    gaps: string[];
  };
}

// Generate character lineup using AI
export async function generateCharacterLineup(
  gameId: string,
  seeds: CharacterSeed[],
  overview: any
): Promise<CharacterLineup> {
  const { data, error } = await supabase.functions.invoke('generate-characters', {
    body: {
      gameId,
      seeds,
      overview,
      type: 'lineup'
    }
  });

  if (error) throw error;
  return data.lineup;
}

// Regenerate a single character
export async function regenerateCharacter(
  gameId: string,
  characterIndex: number,
  seed: CharacterSeed,
  currentParty: Character[],
  overview: any,
  feedback?: string
): Promise<Character> {
  const { data, error } = await supabase.functions.invoke('generate-characters', {
    body: {
      gameId,
      characterIndex,
      seed,
      currentParty,
      overview,
      feedback,
      type: 'regen-character'
    }
  });

  if (error) throw error;
  return data.character;
}

// Regenerate character bonds
export async function regenerateBonds(
  gameId: string,
  characters: Character[],
  overview: any
): Promise<Array<{
  character1Index: number;
  character2Index: number;
  relationship: string;
  description: string;
}>> {
  const { data, error } = await supabase.functions.invoke('generate-characters', {
    body: {
      gameId,
      characters,
      overview,
      type: 'regen-bonds'
    }
  });

  if (error) throw error;
  return data.bonds;
}

// Full lineup remix
export async function remixLineup(
  gameId: string,
  seeds: CharacterSeed[],
  overview: any,
  currentLineup: CharacterLineup,
  brief: string
): Promise<CharacterLineup> {
  const { data, error } = await supabase.functions.invoke('generate-characters', {
    body: {
      gameId,
      seeds,
      overview,
      currentLineup,
      brief,
      type: 'remix'
    }
  });

  if (error) throw error;
  return data.lineup;
}

// Save character lineup to database
export async function saveCharacterLineup(
  gameId: string,
  seedId: string,
  storyOverviewId: string,
  lineup: CharacterLineup,
  metadata: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }
): Promise<string> {
  // Check for existing lineup first
  const { data: existingLineup } = await supabase
    .from('character_lineups')
    .select('id')
    .eq('game_id', gameId)
    .maybeSingle();

  if (existingLineup) {
    // Update existing lineup
    const { data, error } = await supabase
      .from('character_lineups')
      .update({
        lineup_json: lineup as any,
        provider: metadata.provider,
        model: metadata.model,
        input_tokens: metadata.inputTokens,
        output_tokens: metadata.outputTokens,
        cost_usd: metadata.costUsd
      })
      .eq('id', existingLineup.id)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } else {
    // Insert new lineup
    const { data, error } = await supabase
      .from('character_lineups')
      .insert({
        game_id: gameId,
        seed_id: seedId,
        story_overview_id: storyOverviewId,
        lineup_json: lineup as any,
        provider: metadata.provider,
        model: metadata.model,
        input_tokens: metadata.inputTokens,
        output_tokens: metadata.outputTokens,
        cost_usd: metadata.costUsd
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }
}

// Save individual characters
export async function saveCharacters(
  gameId: string,
  seedId: string,
  lineup: CharacterLineup,
  slots: any[]
): Promise<void> {
  // Check for existing characters for this game
  const { data: existingChars } = await supabase
    .from('characters')
    .select('id, slot_id')
    .eq('game_id', gameId);

  const existingSlotIds = new Set(existingChars?.map(c => c.slot_id) || []);

  const characters = lineup.characters.map((character, index) => ({
    game_id: gameId,
    seed_id: seedId,
    slot_id: slots[index]?.id,
    user_id: slots[index]?.claimed_by,
    pc_json: character as any,
    status: 'approved' as const
  }));

  // Update existing characters and insert new ones
  for (const character of characters) {
    if (existingSlotIds.has(character.slot_id)) {
      // Update existing character
      const { error } = await supabase
        .from('characters')
        .update({
          pc_json: character.pc_json,
          status: character.status
        })
        .eq('game_id', gameId)
        .eq('slot_id', character.slot_id);

      if (error) throw error;
    } else {
      // Insert new character
      const { error } = await supabase
        .from('characters')
        .insert(character);

      if (error) throw error;
    }
  }
}

// Get character lineup for a game
export async function getCharacterLineup(gameId: string): Promise<CharacterLineup | null> {
  const { data, error } = await supabase
    .from('character_lineups')
    .select('lineup_json')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.lineup_json ? (data.lineup_json as unknown as CharacterLineup) : null;
}

// Transform character seeds from database format
export function transformSeedsToCharacterSeeds(
  slots: any[],
  defaultMode: 'respect' | 'suggest' | 'decide' = 'suggest'
): CharacterSeed[] {
  return slots.map((slot, index) => {
    const seed = slot.character_seeds?.[0];
    if (!seed) {
      return {
        index,
        mode: defaultMode,
      };
    }

    return {
      index,
      mode: defaultMode, // Could be derived from user preferences
      displayName: seed.display_name,
      pronouns: seed.pronouns,
      archetypePrefs: seed.archetype_prefs || [],
      roleTagsInterest: seed.role_tags_interest || [],
      toneComfort: seed.tone_comfort || {},
      violenceComfort: seed.violence_comfort,
      complexity: seed.complexity,
      mechanicsComfort: seed.mechanics_comfort,
      concept: seed.concept,
      mustHave: seed.must_have || [],
      noThanks: seed.no_thanks || [],
      keepName: seed.keep_name || false,
    };
  });
}