-- Create a security definer function to check if user can add members to a game
CREATE OR REPLACE FUNCTION public.can_add_game_member(_game_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Allow if user is the game creator
  SELECT EXISTS (
    SELECT 1 FROM public.games 
    WHERE id = _game_id AND user_id = _user_id
  )
  OR
  -- Allow if user is already a host/cohost in this game
  EXISTS (
    SELECT 1 FROM public.game_members 
    WHERE game_id = _game_id AND user_id = _user_id AND role IN ('host', 'cohost')
  );
$$;

-- Update the policy to use the security definer function
DROP POLICY IF EXISTS "members_insert_policy" ON public.game_members;

CREATE POLICY "members_insert_policy" ON public.game_members
FOR INSERT 
WITH CHECK (public.can_add_game_member(game_id, auth.uid()));