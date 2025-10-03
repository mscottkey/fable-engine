-- Fix story_overviews RLS policies to handle NULL game_id (during seed generation)
-- Story overviews can be created during campaign seed phase (before game exists)
-- In this case, game_id is NULL and only user_id check matters

-- Drop existing policies
DROP POLICY IF EXISTS "so_select_member" ON public.story_overviews;
DROP POLICY IF EXISTS "so_insert_member" ON public.story_overviews;
DROP POLICY IF EXISTS "so_update_member" ON public.story_overviews;
DROP POLICY IF EXISTS "so_delete_member" ON public.story_overviews;

-- SELECT: Allow if user owns it (game_id NULL) OR is game member (game_id set)
CREATE POLICY "so_select_owner_or_member"
ON public.story_overviews
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (game_id IS NOT NULL AND public.is_game_member(game_id))
);

-- INSERT: Allow if user matches (game_id can be NULL or user must be game member)
CREATE POLICY "so_insert_owner_or_member"
ON public.story_overviews
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (game_id IS NULL OR public.is_game_member(game_id))
);

-- UPDATE: Allow if user owns it (game_id NULL) OR is game member (game_id set)
CREATE POLICY "so_update_owner_or_member"
ON public.story_overviews
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR (game_id IS NOT NULL AND public.is_game_member(game_id))
);

-- DELETE: Allow if user owns it (game_id NULL) OR is game member (game_id set)
CREATE POLICY "so_delete_owner_or_member"
ON public.story_overviews
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (game_id IS NOT NULL AND public.is_game_member(game_id))
);
