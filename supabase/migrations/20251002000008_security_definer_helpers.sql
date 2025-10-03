-- Replace recursive policies with SECURITY DEFINER helper functions
-- This prevents the planner from detecting circular dependencies

-- ============================================================================
-- Helper 1: Check if current user is a member of a specific game
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_game_member(p_game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_members
    WHERE game_id = p_game_id AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Helper 2: Check if current user is a game peer (for game_members table)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_game_peer(p_game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_members
    WHERE game_id = p_game_id AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Helper 3: Check if current user owns a game
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_game_owner(p_game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games
    WHERE id = p_game_id AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Update games policies to use helper functions
-- ============================================================================
DROP POLICY IF EXISTS "games_select_member" ON public.games;
CREATE POLICY "games_select_member"
ON public.games
FOR SELECT
TO authenticated
USING (public.is_game_member(id));

-- Keep the owner policy simple (no helper needed)
-- games_select_owner already exists with: USING (user_id = auth.uid())

-- ============================================================================
-- Update game_members policies to use helper functions
-- ============================================================================
DROP POLICY IF EXISTS "gm_select_peers" ON public.game_members;
CREATE POLICY "gm_select_peers"
ON public.game_members
FOR SELECT
TO authenticated
USING (public.is_game_peer(game_id));

-- Keep gm_select_own simple (no helper needed)
-- gm_select_own already exists with: USING (user_id = auth.uid())

-- ============================================================================
-- Update story_overviews policies to use helper functions
-- ============================================================================
DROP POLICY IF EXISTS "so_select_member" ON public.story_overviews;
CREATE POLICY "so_select_member"
ON public.story_overviews
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "so_insert_member" ON public.story_overviews;
CREATE POLICY "so_insert_member"
ON public.story_overviews
FOR INSERT
TO authenticated
WITH CHECK (public.is_game_member(game_id));

DROP POLICY IF EXISTS "so_update_member" ON public.story_overviews;
CREATE POLICY "so_update_member"
ON public.story_overviews
FOR UPDATE
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "so_delete_member" ON public.story_overviews;
CREATE POLICY "so_delete_member"
ON public.story_overviews
FOR DELETE
TO authenticated
USING (public.is_game_member(game_id));

-- ============================================================================
-- Update party_slots policies to use helper functions
-- ============================================================================
DROP POLICY IF EXISTS "ps_select_member" ON public.party_slots;
CREATE POLICY "ps_select_member"
ON public.party_slots
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "ps_insert_member" ON public.party_slots;
CREATE POLICY "ps_insert_member"
ON public.party_slots
FOR INSERT
TO authenticated
WITH CHECK (public.is_game_member(game_id));

DROP POLICY IF EXISTS "ps_update_member" ON public.party_slots;
CREATE POLICY "ps_update_member"
ON public.party_slots
FOR UPDATE
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "ps_delete_member" ON public.party_slots;
CREATE POLICY "ps_delete_member"
ON public.party_slots
FOR DELETE
TO authenticated
USING (public.is_game_member(game_id));

-- ============================================================================
-- Update all other game-related table policies
-- ============================================================================

-- Characters
DROP POLICY IF EXISTS "characters_read_members" ON public.characters;
CREATE POLICY "characters_read_members"
ON public.characters
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "characters_write_host" ON public.characters;
CREATE POLICY "characters_write_host"
ON public.characters
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Character lineups
DROP POLICY IF EXISTS "lineups_read_members" ON public.character_lineups;
CREATE POLICY "lineups_read_members"
ON public.character_lineups
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "lineups_write_host" ON public.character_lineups;
CREATE POLICY "lineups_write_host"
ON public.character_lineups
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Factions
DROP POLICY IF EXISTS "factions_read_members" ON public.factions;
CREATE POLICY "factions_read_members"
ON public.factions
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "factions_write_host" ON public.factions;
CREATE POLICY "factions_write_host"
ON public.factions
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Story nodes
DROP POLICY IF EXISTS "story_nodes_read_members" ON public.story_nodes;
CREATE POLICY "story_nodes_read_members"
ON public.story_nodes
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "story_nodes_write_host" ON public.story_nodes;
CREATE POLICY "story_nodes_write_host"
ON public.story_nodes
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Campaign arcs
DROP POLICY IF EXISTS "campaign_arcs_read_members" ON public.campaign_arcs;
CREATE POLICY "campaign_arcs_read_members"
ON public.campaign_arcs
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "campaign_arcs_write_host" ON public.campaign_arcs;
CREATE POLICY "campaign_arcs_write_host"
ON public.campaign_arcs
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Resolutions
DROP POLICY IF EXISTS "resolutions_read_members" ON public.resolutions;
CREATE POLICY "resolutions_read_members"
ON public.resolutions
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "resolutions_write_host" ON public.resolutions;
CREATE POLICY "resolutions_write_host"
ON public.resolutions
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Game sessions
DROP POLICY IF EXISTS "sessions_read_members" ON public.game_sessions;
CREATE POLICY "sessions_read_members"
ON public.game_sessions
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "sessions_write_host" ON public.game_sessions;
CREATE POLICY "sessions_write_host"
ON public.game_sessions
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Narrative events
DROP POLICY IF EXISTS "events_read_members" ON public.narrative_events;
CREATE POLICY "events_read_members"
ON public.narrative_events
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "events_write_host" ON public.narrative_events;
CREATE POLICY "events_write_host"
ON public.narrative_events
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Story state
DROP POLICY IF EXISTS "state_read_members" ON public.story_state;
CREATE POLICY "state_read_members"
ON public.story_state
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

DROP POLICY IF EXISTS "state_write_host" ON public.story_state;
CREATE POLICY "state_write_host"
ON public.story_state
FOR ALL
TO authenticated
USING (public.is_game_owner(game_id))
WITH CHECK (public.is_game_owner(game_id));

-- Generation jobs
DROP POLICY IF EXISTS "generation_jobs_read_members" ON public.generation_jobs;
CREATE POLICY "generation_jobs_read_members"
ON public.generation_jobs
FOR SELECT
TO authenticated
USING (public.is_game_member(game_id));

-- ============================================================================
-- Grant execute permissions on helper functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.is_game_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_game_peer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_game_owner(uuid) TO authenticated;
