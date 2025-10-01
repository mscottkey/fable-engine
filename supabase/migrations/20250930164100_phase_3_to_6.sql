-- Phase 3-6 Database Schema
-- File: supabase/migrations/[timestamp]_phases_3_to_6.sql

-- Phase 3: Factions & Clocks (Power Map)
CREATE TABLE IF NOT EXISTS public.factions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  seed_id uuid NOT NULL REFERENCES public.campaign_seeds(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  factions_json jsonb NOT NULL,          -- full factions array from schema
  relationships jsonb NOT NULL,          -- relationship graph
  fronts jsonb DEFAULT '[]'::jsonb,      -- optional thematic fronts
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',  -- 'draft'|'approved'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_factions_game_version ON public.factions (game_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_factions_game_status ON public.factions (game_id, status);

-- Phase 4: Story Nodes & Scenes Web (Leads Map)
CREATE TABLE IF NOT EXISTS public.story_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  seed_id uuid NOT NULL REFERENCES public.campaign_seeds(id) ON DELETE CASCADE,
  factions_id uuid NOT NULL REFERENCES public.factions(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  nodes_json jsonb NOT NULL,             -- full nodes array from schema
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',  -- 'draft'|'approved'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_nodes_game_version ON public.story_nodes (game_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_story_nodes_game_status ON public.story_nodes (game_id, status);

-- Phase 5: Campaign Arcs & Beats (Escalation Map)
CREATE TABLE IF NOT EXISTS public.campaign_arcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  seed_id uuid NOT NULL REFERENCES public.campaign_seeds(id) ON DELETE CASCADE,
  story_nodes_id uuid NOT NULL REFERENCES public.story_nodes(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  arcs_json jsonb NOT NULL,              -- full arcs array from schema
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',  -- 'draft'|'approved'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_arcs_game_version ON public.campaign_arcs (game_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_arcs_game_status ON public.campaign_arcs (game_id, status);

-- Phase 6: Resolution Paths & Epilogues
CREATE TABLE IF NOT EXISTS public.resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  seed_id uuid NOT NULL REFERENCES public.campaign_seeds(id) ON DELETE CASCADE,
  campaign_arcs_id uuid NOT NULL REFERENCES public.campaign_arcs(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  resolution_paths_json jsonb NOT NULL,  -- full resolutionPaths array
  twist text,                            -- optional hidden truth payoff
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',  -- 'draft'|'approved'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resolutions_game_version ON public.resolutions (game_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_resolutions_game_status ON public.resolutions (game_id, status);

-- Enable RLS on all tables
ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (standard pattern for all phase tables)
CREATE POLICY "factions_read_members" ON public.factions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = factions.game_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "factions_write_host" ON public.factions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = factions.game_id 
      AND m.user_id = auth.uid() 
      AND m.role = 'host'
    )
  );

CREATE POLICY "story_nodes_read_members" ON public.story_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = story_nodes.game_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "story_nodes_write_host" ON public.story_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = story_nodes.game_id 
      AND m.user_id = auth.uid() 
      AND m.role = 'host'
    )
  );

CREATE POLICY "campaign_arcs_read_members" ON public.campaign_arcs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = campaign_arcs.game_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "campaign_arcs_write_host" ON public.campaign_arcs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = campaign_arcs.game_id 
      AND m.user_id = auth.uid() 
      AND m.role = 'host'
    )
  );

CREATE POLICY "resolutions_read_members" ON public.resolutions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = resolutions.game_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "resolutions_write_host" ON public.resolutions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = resolutions.game_id 
      AND m.user_id = auth.uid() 
      AND m.role = 'host'
    )
  );