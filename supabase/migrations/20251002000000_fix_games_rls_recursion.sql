-- Fix infinite recursion in games RLS policies
-- This migration ensures clean state by removing all problematic policies and functions

-- Drop ALL existing games policies (including any orphaned ones)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname FROM pg_policies WHERE tablename = 'games' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.games', policy_record.policyname);
    END LOOP;
END $$;

-- Drop the problematic security definer function that causes recursion
DROP FUNCTION IF EXISTS public.can_access_game(uuid, uuid);

-- Create simple, non-recursive policies

-- Policy 1: Game owners can access their own games
CREATE POLICY "games_owner_access" ON public.games
FOR SELECT USING (
  auth.uid() = user_id
);

-- Policy 2: Game members can access games they're members of
-- This does NOT reference games table in the EXISTS, preventing recursion
CREATE POLICY "games_member_access" ON public.games
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_members
    WHERE game_members.game_id = games.id
    AND game_members.user_id = auth.uid()
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
