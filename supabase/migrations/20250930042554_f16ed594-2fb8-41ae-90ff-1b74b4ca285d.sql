-- Clean up orphaned games that don't have game_members entries
-- These are games that failed during creation and left incomplete records

-- First, let's delete games that don't have corresponding game_members entries
DELETE FROM public.games 
WHERE id IN (
  SELECT g.id 
  FROM public.games g 
  LEFT JOIN public.game_members gm ON g.id = gm.game_id 
  WHERE gm.game_id IS NULL
    AND g.created_at > NOW() - INTERVAL '1 day'  -- Only recent orphaned games
);

-- Also clean up any party_slots for games that don't exist or don't have members
DELETE FROM public.party_slots 
WHERE game_id IN (
  SELECT ps.game_id 
  FROM public.party_slots ps 
  LEFT JOIN public.game_members gm ON ps.game_id = gm.game_id 
  WHERE gm.game_id IS NULL
);
