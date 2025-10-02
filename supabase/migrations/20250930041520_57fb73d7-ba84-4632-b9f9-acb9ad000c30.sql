-- Fix the party slots policy to prevent infinite recursion
-- The issue is that party_slots policies check game_members, causing recursion

-- Create a security definer function for party slots access control
CREATE OR REPLACE FUNCTION public.can_manage_party_slots(_game_id uuid, _user_id uuid)
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
  -- Allow if user is a host/cohost in the game (without recursion)
  EXISTS (
    SELECT 1 FROM public.game_members 
    WHERE game_id = _game_id 
    AND user_id = _user_id 
    AND role IN ('host', 'cohost')
  );
$$;

-- Update party slots policies to use the security definer function
DROP POLICY IF EXISTS "slots_insert_host" ON public.party_slots;
DROP POLICY IF EXISTS "slots_claim_write" ON public.party_slots;

DROP POLICY IF EXISTS "slots_insert_host" ON public.party_slots;
CREATE POLICY "slots_insert_host" ON public.party_slots
FOR INSERT 
WITH CHECK (public.can_manage_party_slots(game_id, auth.uid()));

DROP POLICY IF EXISTS "slots_claim_write" ON public.party_slots;
CREATE POLICY "slots_claim_write" ON public.party_slots
FOR UPDATE 
USING (public.can_manage_party_slots(game_id, auth.uid()) OR claimed_by = auth.uid())
WITH CHECK (true);
