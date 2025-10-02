-- Add DELETE policy for party slots to allow hosts to delete them
CREATE POLICY "slots_delete_host" 
ON public.party_slots 
FOR DELETE 
USING (can_manage_party_slots(game_id, auth.uid()));
