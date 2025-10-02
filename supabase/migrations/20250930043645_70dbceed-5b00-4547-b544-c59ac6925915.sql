-- Fix infinite recursion in game_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "members_rw_self_host" ON public.game_members;

-- Create new simple policies that don't cause recursion
CREATE POLICY "members_select_own_or_host" 
ON public.game_members 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.games g 
    WHERE g.id = game_members.game_id 
    AND g.user_id = auth.uid()
  )
);

CREATE POLICY "members_insert_game_owner" 
ON public.game_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.games g 
    WHERE g.id = game_members.game_id 
    AND g.user_id = auth.uid()
  )
);

CREATE POLICY "members_update_game_owner" 
ON public.game_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.games g 
    WHERE g.id = game_members.game_id 
    AND g.user_id = auth.uid()
  )
);

CREATE POLICY "members_delete_game_owner" 
ON public.game_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.games g 
    WHERE g.id = game_members.game_id 
    AND g.user_id = auth.uid()
  )
);
