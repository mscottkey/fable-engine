-- Fix infinite recursion by using a security definer function approach

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "games_select_own_or_member" ON public.games;

-- Create a security definer function to check game membership without recursion
CREATE OR REPLACE FUNCTION public.can_access_game(_game_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Allow if user is the game creator
  SELECT EXISTS (
    SELECT 1 FROM public.games 
    WHERE id = _game_id AND user_id = _user_id
  )
  OR
  -- Allow if user is a member of the game
  EXISTS (
    SELECT 1 FROM public.game_members 
    WHERE game_id = _game_id AND user_id = _user_id
  );
$$;

-- Create new policy that uses the security definer function
DROP POLICY IF EXISTS "games_select_access" ON public.games;
CREATE POLICY "games_select_access" ON public.games
FOR SELECT USING (
  public.can_access_game(id, auth.uid())
);
