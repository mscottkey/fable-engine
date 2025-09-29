import type { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type CampaignSeed = Database['public']['Tables']['campaign_seeds']['Row'];
export type CampaignSeedInsert = Database['public']['Tables']['campaign_seeds']['Insert'];
export type CampaignSeedUpdate = Database['public']['Tables']['campaign_seeds']['Update'];

export type Game = Database['public']['Tables']['games']['Row'];
export type GameInsert = Database['public']['Tables']['games']['Insert'];
export type GameUpdate = Database['public']['Tables']['games']['Update'];

export type Genre = Database['public']['Enums']['genre'];
export type DifficultyLabel = Database['public']['Enums']['difficulty_label'];

export interface Character {
  id: string;
  playerName: string;
  characterName: string;
  concept: string;
}

export interface CampaignSeedData {
  genre: Genre;
  scenarioTitle: string;
  scenarioDescription: string;
  seed: number;
  name: string;
  setting: string;
  notableLocations: string[];
  toneVibe: string;
  toneLevers: {
    pace: string;
    danger: string;
    morality: string;
    scale: string;
  };
  difficultyLabel: DifficultyLabel;
  difficultyDesc: string;
  hooks: string[];
}