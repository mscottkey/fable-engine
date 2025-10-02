-- Fix the infinite recursion by dropping policy first, then function, then recreating both

-- Drop the policy that depends on the function
DROP POLICY IF EXISTS "members_insert_policy" ON public.game_members;

-- Now drop the function
DROP FUNCTION IF EXISTS public.can_add_game_member(_game_id uuid, _user_id uuid);

-- Create a simpler security definer function without recursion
CREATE OR REPLACE FUNCTION public.can_add_game_member(_game_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Allow if user is the game creator (simple check without recursion)
  SELECT EXISTS (
    SELECT 1 FROM public.games 
    WHERE id = _game_id AND user_id = _user_id
  );
$$;

-- Recreate the policy with the simpler function
DROP POLICY IF EXISTS "members_insert_policy" ON public.game_members;
CREATE POLICY "members_insert_policy" ON public.game_members
FOR INSERT 
WITH CHECK (public.can_add_game_member(game_id, auth.uid()));
