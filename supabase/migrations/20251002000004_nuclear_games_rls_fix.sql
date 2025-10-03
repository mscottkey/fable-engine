-- NUCLEAR OPTION: Completely rebuild games RLS from scratch
-- This migration ensures ZERO chance of infinite recursion

-- ============================================================================
-- Step 1: Temporarily disable RLS to clean up
-- ============================================================================
ALTER TABLE public.games DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 2: Drop EVERY policy (use raw SQL to ensure they're gone)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'games'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.games', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- Step 3: Drop any functions that might be referenced by old policies
-- ============================================================================
DROP FUNCTION IF EXISTS public.can_access_game(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_game(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_game_member(uuid) CASCADE;

-- ============================================================================
-- Step 4: Verify games table has the columns we need
-- ============================================================================
-- The games table should have: id, user_id, seed_id, name, status, created_at
-- And optionally: updated_at, status_changed_at, status_changed_by, deleted_at

-- ============================================================================
-- Step 5: Create the SIMPLEST possible policies - NO SUBQUERIES ON GAMES
-- ============================================================================

-- Policy 1: Owner can SELECT their games
CREATE POLICY "games_select_owner"
ON public.games
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Members can SELECT games (only queries game_members, NOT games)
CREATE POLICY "games_select_member"
ON public.games
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT game_id FROM public.game_members WHERE user_id = auth.uid()
  )
);

-- Policy 3: Owner can INSERT games
CREATE POLICY "games_insert_owner"
ON public.games
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 4: Owner can UPDATE their games
CREATE POLICY "games_update_owner"
ON public.games
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 5: Owner can DELETE their games
CREATE POLICY "games_delete_owner"
ON public.games
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- Step 6: Re-enable RLS
-- ============================================================================
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 7: Verify policies exist
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'games';

    RAISE NOTICE 'Total policies on games table: %', policy_count;

    IF policy_count != 5 THEN
        RAISE WARNING 'Expected 5 policies but found %', policy_count;
    END IF;
END $$;

-- ============================================================================
-- Step 8: Fix can_transition_game_state to NOT trigger RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_transition_game_state(
  p_game_id uuid,
  p_new_status text
)
RETURNS TABLE (
  can_transition boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_ready_slots int;
  v_has_story boolean;
  v_has_characters boolean;
BEGIN
  -- Query games table directly (SECURITY DEFINER bypasses RLS, preventing recursion)
  SELECT status INTO v_current_status
  FROM public.games
  WHERE id = p_game_id;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'Game not found';
    RETURN;
  END IF;

  -- Check other requirements
  SELECT COUNT(*) INTO v_ready_slots
  FROM public.party_slots
  WHERE game_id = p_game_id AND status IN ('ready', 'locked');

  SELECT EXISTS (
    SELECT 1 FROM public.story_overviews WHERE game_id = p_game_id LIMIT 1
  ) INTO v_has_story;

  SELECT EXISTS (
    SELECT 1 FROM public.characters WHERE game_id = p_game_id AND status = 'approved' LIMIT 1
  ) INTO v_has_characters;

  -- Validation logic
  CASE p_new_status
    WHEN 'characters' THEN
      IF v_ready_slots < 1 THEN
        RETURN QUERY SELECT false, 'Requires at least 1 ready player';
        RETURN;
      END IF;
      IF NOT v_has_story THEN
        RETURN QUERY SELECT false, 'Story overview must be approved';
        RETURN;
      END IF;

    WHEN 'char_review' THEN
      IF v_ready_slots < 1 THEN
        RETURN QUERY SELECT false, 'Requires at least 1 ready player';
        RETURN;
      END IF;
      IF NOT v_has_story THEN
        RETURN QUERY SELECT false, 'Story overview must be approved';
        RETURN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.characters WHERE game_id = p_game_id LIMIT 1) THEN
        RETURN QUERY SELECT false, 'Characters must be generated';
        RETURN;
      END IF;

    WHEN 'playing' THEN
      IF v_ready_slots < 1 THEN
        RETURN QUERY SELECT false, 'Requires at least 1 ready player';
        RETURN;
      END IF;
      IF NOT v_has_story THEN
        RETURN QUERY SELECT false, 'Story overview must be approved';
        RETURN;
      END IF;
      IF NOT v_has_characters THEN
        RETURN QUERY SELECT false, 'Characters must be approved';
        RETURN;
      END IF;
  END CASE;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ============================================================================
-- Step 9: Fix transition_game_state to NOT trigger RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.transition_game_state(
  p_game_id uuid,
  p_new_status text,
  p_skip_validation boolean DEFAULT false
)
RETURNS TABLE (
  success boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_can_transition boolean;
  v_error_msg text;
BEGIN
  IF NOT p_skip_validation THEN
    SELECT ct.can_transition, ct.error_message
    INTO v_can_transition, v_error_msg
    FROM can_transition_game_state(p_game_id, p_new_status) ct;

    IF NOT v_can_transition THEN
      RETURN QUERY SELECT false, v_error_msg;
      RETURN;
    END IF;
  END IF;

  -- Update directly (SECURITY DEFINER bypasses RLS)
  UPDATE public.games
  SET
    status = p_new_status,
    updated_at = now(),
    status_changed_at = now()
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Game not found';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ============================================================================
-- Done! Games RLS completely rebuilt with 5 simple policies
-- ============================================================================
