-- Complete RLS redesign for games access - simplified and robust approach

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "games_select_access" ON public.games;
DROP POLICY IF EXISTS "games_select_own" ON public.games;
DROP POLICY IF EXISTS "games_select_own_or_member" ON public.games;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.can_access_game(uuid, uuid);

-- Simple, straightforward policies that won't cause recursion
-- Policy 1: Game owners can always access their games
CREATE POLICY "games_select_by_owner" ON public.games
FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Game members can access games they're members of
-- Use a simple EXISTS query that doesn't reference the games table
CREATE POLICY "games_select_by_membership" ON public.games  
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_members 
    WHERE game_members.game_id = games.id 
    AND game_members.user_id = auth.uid()
  )
);

-- Ensure the policies are enabled
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;