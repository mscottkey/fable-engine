-- Fix existing games by adding creators as host members
-- This fixes games where the creator exists but isn't a member
INSERT INTO public.game_members (game_id, user_id, role)
SELECT g.id, g.user_id, 'host'
FROM public.games g
LEFT JOIN public.game_members gm ON g.id = gm.game_id AND g.user_id = gm.user_id
WHERE gm.game_id IS NULL  -- Only games where the creator isn't already a member
  AND g.deleted_at IS NULL  -- Only active games
ON CONFLICT (game_id, user_id) DO NOTHING;  -- Prevent duplicates if constraint exists