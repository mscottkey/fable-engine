-- Fix game_members RLS to prevent circular dependency with games table
-- The issue: games policies check game_members, and if game_members policies check games, we get recursion

-- ============================================================================
-- Step 1: Check current game_members policies
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Current game_members policies:';
    FOR r IN (
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'game_members'
    ) LOOP
        RAISE NOTICE '  Policy: % (%) - qual: %, check: %', r.policyname, r.cmd, r.qual, r.with_check;
    END LOOP;
END $$;

-- ============================================================================
-- Step 2: Drop ALL game_members policies
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'game_members'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.game_members', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- Step 3: Create simple game_members policies that DON'T reference games table
-- ============================================================================

-- Policy 1: Users can see memberships they're part of
CREATE POLICY "game_members_select_own"
ON public.game_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users can see all members of games they're a member of
-- This is safe because it only references game_members, not games
CREATE POLICY "game_members_select_peers"
ON public.game_members
FOR SELECT
TO authenticated
USING (
  game_id IN (
    SELECT game_id FROM public.game_members WHERE user_id = auth.uid()
  )
);

-- Policy 3: Host can add new members
-- IMPORTANT: This MUST NOT query the games table or we get recursion
CREATE POLICY "game_members_insert_by_member"
ON public.game_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if the inserter is already a member with 'host' role
  EXISTS (
    SELECT 1 FROM public.game_members
    WHERE game_id = game_members.game_id
    AND user_id = auth.uid()
    AND role = 'host'
  )
);

-- Policy 4: Users can remove themselves
CREATE POLICY "game_members_delete_self"
ON public.game_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Policy 5: Host can remove other members
CREATE POLICY "game_members_delete_by_host"
ON public.game_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.game_members AS gm
    WHERE gm.game_id = game_members.game_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'host'
  )
);

-- ============================================================================
-- Step 4: Verify setup
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_members';

    RAISE NOTICE 'Total policies on game_members table: %', policy_count;
END $$;
