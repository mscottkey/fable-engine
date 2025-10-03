-- FORCE FIX: Aggressively remove all circular dependencies
-- This migration will run the drop commands inline without DO blocks

-- ============================================================================
-- Fix game_members - drop the OLD recursive policies
-- ============================================================================
DROP POLICY IF EXISTS "members_delete_game_owner" ON public.game_members;
DROP POLICY IF EXISTS "members_insert_game_owner" ON public.game_members;
DROP POLICY IF EXISTS "members_insert_policy" ON public.game_members;
DROP POLICY IF EXISTS "members_select_own_or_host" ON public.game_members;
DROP POLICY IF EXISTS "members_update_game_owner" ON public.game_members;
DROP POLICY IF EXISTS "game_members_select_own" ON public.game_members;
DROP POLICY IF EXISTS "game_members_select_peers" ON public.game_members;
DROP POLICY IF EXISTS "game_members_insert_by_member" ON public.game_members;
DROP POLICY IF EXISTS "game_members_delete_self" ON public.game_members;
DROP POLICY IF EXISTS "game_members_delete_by_host" ON public.game_members;

-- Create NEW non-recursive game_members policies
CREATE POLICY "gm_select_own"
ON public.game_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "gm_select_peers"
ON public.game_members
FOR SELECT USING (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);

CREATE POLICY "gm_insert_self"
ON public.game_members
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "gm_delete_self"
ON public.game_members
FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- Fix story_overviews - remove games table references
-- ============================================================================
DROP POLICY IF EXISTS "story_overviews_read_members" ON public.story_overviews;
DROP POLICY IF EXISTS "story_overviews_write_host" ON public.story_overviews;
DROP POLICY IF EXISTS "story_overviews_delete_own" ON public.story_overviews;
DROP POLICY IF EXISTS "story_overviews_insert_own" ON public.story_overviews;
DROP POLICY IF EXISTS "story_overviews_select_by_game_or_user" ON public.story_overviews;
DROP POLICY IF EXISTS "story_overviews_update_own_or_game_host" ON public.story_overviews;

-- Create NEW non-recursive story_overviews policies
CREATE POLICY "so_select_member"
ON public.story_overviews
FOR SELECT USING (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);

CREATE POLICY "so_insert_member"
ON public.story_overviews
FOR INSERT WITH CHECK (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);

CREATE POLICY "so_update_member"
ON public.story_overviews
FOR UPDATE USING (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);

CREATE POLICY "so_delete_member"
ON public.story_overviews
FOR DELETE USING (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);

-- ============================================================================
-- Fix party_slots - check for can_manage_party_slots function
-- ============================================================================
DROP FUNCTION IF EXISTS public.can_manage_party_slots(uuid, uuid) CASCADE;

-- Recreate without games table reference
DROP POLICY IF EXISTS "slots_claim_write" ON public.party_slots;
DROP POLICY IF EXISTS "slots_delete_host" ON public.party_slots;
DROP POLICY IF EXISTS "slots_insert_host" ON public.party_slots;
DROP POLICY IF EXISTS "slots_rw_members" ON public.party_slots;

CREATE POLICY "ps_select_member"
ON public.party_slots
FOR SELECT USING (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);

CREATE POLICY "ps_insert_member"
ON public.party_slots
FOR INSERT WITH CHECK (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);

CREATE POLICY "ps_update_member"
ON public.party_slots
FOR UPDATE USING (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);

CREATE POLICY "ps_delete_member"
ON public.party_slots
FOR DELETE USING (
  game_id IN (SELECT game_id FROM public.game_members WHERE user_id = auth.uid())
);
