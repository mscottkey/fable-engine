// File: src/types/phases.ts
// Types for Phases 3-6

import type { Phase3Output, Phase4Output, Phase5Output, Phase6Output } from '@/ai/schemas';

export interface FactionsRecord {
  id: string;
  game_id: string;
  seed_id: string;
  version: number;
  factions_json: Phase3Output['factions'];
  relationships: Phase3Output['relationships'];
  fronts: Phase3Output['fronts'];
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: 'draft' | 'approved';
  created_at: string;
}

export interface StoryNodesRecord {
  id: string;
  game_id: string;
  seed_id: string;
  factions_id: string;
  version: number;
  nodes_json: Phase4Output['nodes'];
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: 'draft' | 'approved';
  created_at: string;
}

export interface CampaignArcsRecord {
  id: string;
  game_id: string;
  seed_id: string;
  story_nodes_id: string;
  version: number;
  arcs_json: Phase5Output['arcs'];
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: 'draft' | 'approved';
  created_at: string;
}

export interface ResolutionsRecord {
  id: string;
  game_id: string;
  seed_id: string;
  campaign_arcs_id: string;
  version: number;
  resolution_paths_json: Phase6Output['resolutionPaths'];
  twist: string | null;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  status: 'draft' | 'approved';
  created_at: string;
}