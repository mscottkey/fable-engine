-- Comprehensive fix for games RLS infinite recursion
-- The issue: SECURITY DEFINER functions that query games table trigger RLS policies,
-- which can create infinite loops if policies reference the table being queried.

-- ============================================================================
-- Step 1: Drop ALL existing games policies completely
-- ============================================================================
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'games' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.games', policy_record.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- Step 2: Recreate helper functions with proper RLS bypass
-- ============================================================================

-- This function bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION can_transition_game_state(
  p_game_id uuid,
  p_new_status text
)
RETURNS TABLE (
  can_transition boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_ready_slots int;
  v_has_story boolean;
  v_has_characters boolean;
BEGIN
  -- SECURITY DEFINER bypasses RLS, preventing recursion
  SELECT status INTO v_current_status
  FROM public.games
  WHERE id = p_game_id;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'Game not found';
    RETURN;
  END IF;

  -- Count ready slots
  SELECT COUNT(*) INTO v_ready_slots
  FROM public.party_slots
  WHERE game_id = p_game_id
  AND status IN ('ready', 'locked');

  -- Check for story
  SELECT EXISTS (
    SELECT 1 FROM public.story_overviews
    WHERE game_id = p_game_id
    LIMIT 1
  ) INTO v_has_story;

  -- Check for approved characters
  SELECT EXISTS (
    SELECT 1 FROM public.characters
    WHERE game_id = p_game_id
    AND status = 'approved'
    LIMIT 1
  ) INTO v_has_characters;

  -- Validate state requirements based on target status
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
      IF NOT EXISTS (
        SELECT 1 FROM public.characters WHERE game_id = p_game_id LIMIT 1
      ) THEN
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
-- Step 3: Fix the trigger function to not call auth.uid() during trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_and_status_change()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Track status changes (removed auth.uid() call which can cause issues)
  IF TG_TABLE_NAME = 'games' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_changed_at = now();
    -- Note: status_changed_by should be set by the application, not the trigger
  END IF;

  IF TG_TABLE_NAME IN ('party_slots', 'characters') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_changed_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 4: Create simple, non-recursive RLS policies
-- ============================================================================

-- Policy 1: Users can see games they own
CREATE POLICY "games_owner_select" ON public.games
FOR SELECT USING (
  auth.uid() = user_id
);

-- Policy 2: Users can see games they are members of
-- This is safe because it only queries game_members, not games
CREATE POLICY "games_member_select" ON public.games
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_members
    WHERE game_members.game_id = games.id
    AND game_members.user_id = auth.uid()
  )
);

-- Policy 3: Users can insert their own games
CREATE POLICY "games_owner_insert" ON public.games
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Policy 4: Users can update their own games
CREATE POLICY "games_owner_update" ON public.games
FOR UPDATE USING (
  auth.uid() = user_id
);

-- Policy 5: Users can delete their own games
CREATE POLICY "games_owner_delete" ON public.games
FOR DELETE USING (
  auth.uid() = user_id
);

-- ============================================================================
-- Step 5: Ensure RLS is enabled
-- ============================================================================
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
