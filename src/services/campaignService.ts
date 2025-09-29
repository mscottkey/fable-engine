import { supabase } from '@/integrations/supabase/client';
import type { CampaignSeedData, Character, CampaignSeedInsert, GameInsert } from '@/types/database';

export async function saveCampaignSeed(campaignData: CampaignSeedData): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to save campaign');
  }

  const campaignSeedInsert: CampaignSeedInsert = {
    user_id: user.id,
    genre: campaignData.genre,
    scenario_title: campaignData.scenarioTitle,
    scenario_description: campaignData.scenarioDescription,
    seed: campaignData.seed,
    name: campaignData.name,
    setting: campaignData.setting,
    notable_locations: campaignData.notableLocations,
    tone_vibe: campaignData.toneVibe,
    tone_levers: campaignData.toneLevers,
    difficulty_label: campaignData.difficultyLabel,
    difficulty_desc: campaignData.difficultyDesc,
    hooks: campaignData.hooks,
  };

  const { data, error } = await supabase
    .from('campaign_seeds')
    .insert(campaignSeedInsert)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save campaign seed: ${error.message}`);
  }

  return data.id;
}

export async function createGame(seedId: string, name: string, characters: Character[]): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to create game');
  }

  const gameInsert: GameInsert = {
    user_id: user.id,
    seed_id: seedId,
    name,
    status: 'setup',
  };

  const { data, error } = await supabase
    .from('games')
    .insert(gameInsert)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create game: ${error.message}`);
  }

  // TODO: Store characters when we add characters table
  // For now, characters are handled in the front-end

  return data.id;
}

export async function getUserGames() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to fetch games');
  }

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      campaign_seeds (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch games: ${error.message}`);
  }

  return data;
}