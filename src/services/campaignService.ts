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

export async function softDeleteGame(gameId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to delete game');
  }

  const { error } = await supabase
    .from('games')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', gameId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to delete game: ${error.message}`);
  }
}

export async function softDeleteCampaignSeed(seedId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to delete campaign seed');
  }

  const { error } = await supabase
    .from('campaign_seeds')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', seedId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to delete campaign seed: ${error.message}`);
  }
}

export async function getUserGames() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to fetch games');
  }

  // Get completed games (excluding soft-deleted ones) - only include games where user is actually a member
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select(`
      id,
      name,
      created_at,
      status,
      campaign_seeds!inner (
        id,
        name,
        genre,
        scenario_title,
        scenario_description
      ),
      game_members!inner (
        role
      )
    `)
    .eq('user_id', user.id)
    .eq('game_members.user_id', user.id)  // Ensure user is a member
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (gamesError) {
    console.error('Error fetching games:', gamesError);
    throw new Error(`Failed to fetch games: ${gamesError.message}`);
  }

  // Get campaign seeds that haven't become full games yet (excluding soft-deleted ones)
  const { data: seeds, error: seedsError } = await supabase
    .from('campaign_seeds')
    .select('id, name, created_at, generation_status, genre, scenario_title, scenario_description')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .neq('generation_status', 'story_approved')
    .order('created_at', { ascending: false });

  if (seedsError) {
    console.error('Error fetching seeds:', seedsError);
    throw new Error(`Failed to fetch campaign seeds: ${seedsError.message}`);
  }

  // Combine and format the results
  const combinedResults = [
    // Completed games
    ...(games || []).map(game => ({
      id: game.id,
      name: game.name,
      created_at: game.created_at,
      type: 'game' as const,
      status: game.status === 'setup' ? 'setup' : game.status || 'lobby', // Preserve actual game status
      campaign_seed: Array.isArray(game.campaign_seeds) ? game.campaign_seeds[0] : game.campaign_seeds
    })),
    // In-progress campaign seeds
    ...(seeds || []).map(seed => ({
      id: seed.id,
      name: seed.name,
      created_at: seed.created_at,
      type: 'seed' as const,
      status: seed.generation_status || 'seed_created',
      campaign_seed: seed
    }))
  ];

  // Remove duplicates based on ID and type
  const uniqueResults = combinedResults.filter((item, index, self) => 
    index === self.findIndex(t => t.id === item.id && t.type === item.type)
  );

  // Sort by creation date (most recent first)
  uniqueResults.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  console.log('Fetched games and seeds:', { 
    gamesCount: games?.length || 0, 
    seedsCount: seeds?.length || 0,
    totalResults: uniqueResults.length 
  });

  return uniqueResults;
}