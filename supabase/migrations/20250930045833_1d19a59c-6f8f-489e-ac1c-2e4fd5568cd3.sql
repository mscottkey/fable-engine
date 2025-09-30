-- Phase 2 Characters: Database Schema
-- Final PCs (one row per slot version)
CREATE TABLE IF NOT EXISTS public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  seed_id uuid NOT NULL REFERENCES public.campaign_seeds(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.party_slots(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- claimant (nullable if unclaimed)
  version int NOT NULL DEFAULT 1,
  pc_json jsonb NOT NULL,               -- matches the PC object from schema
  status text NOT NULL DEFAULT 'draft', -- 'draft'|'approved'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_characters_game_slot_version ON public.characters (game_id, slot_id, version);
CREATE INDEX IF NOT EXISTS idx_characters_game_status ON public.characters (game_id, status);

-- Lineup snapshots (one row per approved lineup)
CREATE TABLE IF NOT EXISTS public.character_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  seed_id uuid NOT NULL REFERENCES public.campaign_seeds(id) ON DELETE CASCADE,
  story_overview_id uuid NOT NULL REFERENCES public.story_overviews(id) ON DELETE CASCADE,
  lineup_json jsonb NOT NULL,        -- the whole schema object
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_character_lineups_game_created ON public.character_lineups (game_id, created_at DESC);

-- Enable RLS on both tables
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_lineups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for characters table
CREATE POLICY "characters_read_members" ON public.characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = characters.game_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "characters_write_host" ON public.characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = characters.game_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('host', 'cohost')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = characters.game_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('host', 'cohost')
    )
  );

-- RLS Policies for character_lineups table
CREATE POLICY "lineups_read_members" ON public.character_lineups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = character_lineups.game_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "lineups_write_host" ON public.character_lineups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = character_lineups.game_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('host', 'cohost')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_members m 
      WHERE m.game_id = character_lineups.game_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('host', 'cohost')
    )
  );