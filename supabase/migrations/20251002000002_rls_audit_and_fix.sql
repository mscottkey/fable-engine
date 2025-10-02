-- RLS Audit and Fix - Ensure all tables have proper policies
-- This migration checks that all tables with RLS enabled have appropriate policies

-- ============================================================================
-- Tables with RLS that need policies
-- ============================================================================

-- ai_events - READ ONLY for all authenticated users
DROP POLICY IF EXISTS "ai_events_read_all" ON public.ai_events;
CREATE POLICY "ai_events_read_all" ON public.ai_events
FOR SELECT USING (auth.role() = 'authenticated');

-- model_pricing - READ ONLY for all authenticated users
DROP POLICY IF EXISTS "model_pricing_read_all" ON public.model_pricing;
CREATE POLICY "model_pricing_read_all" ON public.model_pricing
FOR SELECT USING (auth.role() = 'authenticated');

-- story_overviews - Game members can read/write
DROP POLICY IF EXISTS "story_overviews_read_members" ON public.story_overviews;
CREATE POLICY "story_overviews_read_members" ON public.story_overviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_members
    WHERE game_members.game_id = story_overviews.game_id
    AND game_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = story_overviews.game_id
    AND games.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "story_overviews_write_host" ON public.story_overviews;
CREATE POLICY "story_overviews_write_host" ON public.story_overviews
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = story_overviews.game_id
    AND games.user_id = auth.uid()
  )
);

-- character_seeds - Only the owner can access
DROP POLICY IF EXISTS "character_seeds_owner_access" ON public.character_seeds;
CREATE POLICY "character_seeds_owner_access" ON public.character_seeds
FOR ALL USING (
  auth.uid() = user_id
);

-- game_invites - Already has policies from earlier migrations
-- game_members - Already has policies from earlier migrations
-- party_slots - Already has policies from earlier migrations
-- characters - Already has policies from earlier migrations
-- character_lineups - Already has policies from earlier migrations
-- factions - Already has policies from earlier migrations
-- story_nodes - Already has policies from earlier migrations
-- campaign_arcs - Already has policies from earlier migrations
-- resolutions - Already has policies from earlier migrations
-- game_sessions - Already has policies from earlier migrations
-- narrative_events - Already has policies from earlier migrations
-- story_state - Already has policies from earlier migrations
-- generation_jobs - Already has policies from earlier migrations
-- games - Fixed in previous migration

-- ============================================================================
-- Ensure games table is the primary one (not campaigns or campaign_seeds)
-- ============================================================================

-- Check if there's a campaigns table that needs RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "campaigns_owner_access" ON public.campaigns;
    CREATE POLICY "campaigns_owner_access" ON public.campaigns
    FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Check if there's a campaign_seeds table that needs RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'campaign_seeds'
  ) THEN
    ALTER TABLE public.campaign_seeds ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "campaign_seeds_owner_access" ON public.campaign_seeds;
    CREATE POLICY "campaign_seeds_owner_access" ON public.campaign_seeds
    FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
