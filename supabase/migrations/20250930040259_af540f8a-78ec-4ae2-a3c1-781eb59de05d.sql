-- Fix infinite recursion in game_members RLS policy
-- Allow the game creator (owner) to add themselves as host, and existing hosts to add others
DROP POLICY "members_insert_host" ON public.game_members;

-- Create a new policy that allows:
-- 1. Game creator to add themselves as host
-- 2. Existing hosts to add other members
DROP POLICY IF EXISTS "members_insert_policy" ON public.game_members;
CREATE POLICY "members_insert_policy" ON public.game_members
FOR INSERT 
WITH CHECK (
  -- Allow if user is the game creator (from games table)
  (EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND user_id = auth.uid()))
  OR
  -- Allow if user is already a host/cohost in this game
  (EXISTS (SELECT 1 FROM public.game_members m WHERE m.game_id = game_members.game_id AND m.user_id = auth.uid() AND m.role IN ('host', 'cohost')))
);
