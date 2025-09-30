-- Update RLS policies to allow game access via membership as well as ownership

-- Drop the existing restrictive policy for games selection
DROP POLICY IF EXISTS "games_select_own" ON public.games;

-- Create new policy that allows access by owner OR by membership
CREATE POLICY "games_select_own_or_member" ON public.games
FOR SELECT USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.game_members 
    WHERE game_id = games.id 
    AND user_id = auth.uid()
  )
);